import { Request, Response } from 'express';
import { error, json, render } from '../utils/route';
import { GameRepo, PlaygroundRepo, PlayRecordRepo, UserRepo } from '../entities';
import { srand, random, weightedRandom} from '../utils';
import { And, MoreThan, Not } from 'typeorm';
import { FingerTo } from 'fishpi';
import utils from '../utils';
import { estimateDifficulty } from './difficulty';
import WJU from './wju';
import { Playground } from '@/entities/Playground';
import { PlayRecord } from '@/entities/PlayRecord';
import BagCore from './bag';
import Item, { BagItemType } from './item';

export interface IGame {
  source: string;
  target: string;
  seed: number;
  current: string;
  history: string[];
  difficulty: number;
  mode?: string;
}

export default class GameCore extends WJU {
  constructor(options?: IGame) {
    super(options);
  }

  getTodayGame(userId: string) {
    return GameRepo.findOne({ 
      where: { 
        userId: userId,
        createTime: MoreThan(Math.floor(Date.now() / 86400000) * 86400000),
      },
      order: { updatedTime: 'DESC' } 
    });
  }

  getYesterdayGame(userId: string) {
    const todayStart = Math.floor(Date.now() / 86400000) * 86400000;
    const yesterdayStart = todayStart - 86400000;
    return GameRepo.findOne({ 
      where: { 
        userId: userId,
        createTime: And(MoreThan(yesterdayStart), Not(MoreThan(todayStart))),
      },
      order: { updatedTime: 'DESC' }
    });
  }

  async setUserPoint(userId: string, point: number, memo?: string) {
    const user = await UserRepo.findOne({ where: { id: userId } });
    if (!user) return;
    if (user.from == 'fishpi' && utils.config.secret.goldenKey) {
      FingerTo(utils.config.secret.goldenKey).editUserPoints(user.username, point, memo || 'WJU游戏奖励').catch(console.error);
    }
    return UserRepo.update({ id: userId }, { point: () => `point + (${point})` });
  }

  async action(req: Request, res: Response) {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        throw new Error("请先登录后再进行游戏操作");
      }
      const currentGame = await this.getTodayGame(userId);
      if (!currentGame || currentGame.earnedPoint) {
        throw new Error("当前无进行中的游戏，请先创建新游戏");
      }
      this.options = currentGame;
      const action = req.params.action as string;
      if (await this.doAction(action)) {
        let basePoint = 128;
        const yesterdayGame = await this.getYesterdayGame(userId);
        if (yesterdayGame?.earnedPoint) {
          basePoint += Math.floor(yesterdayGame.earnedPoint / 3);
        }
        const maxPoints = Array(20).fill(256).concat([365, 512, 365, 365, 512, 365, 365, 512, 365, 1024])
          .filter((v) => v >= basePoint);
        
        const pointMax = maxPoints[random(maxPoints.length)];
        const pointMin = basePoint;

         // --- 归一化权重 ---
        const cappedDifficulty = Math.min(currentGame.difficulty, this.MAX_DIFFICULTY);
        const normalized = cappedDifficulty / this.MAX_DIFFICULTY; // 0~1
        const earnedPoint = weightedRandom(pointMin, pointMax, normalized);
        
        currentGame.earnedPoint = earnedPoint;
        await this.setUserPoint(userId, currentGame.earnedPoint, 'WJU游戏通关奖励');
        if (req.session.user) req.session.user.point += currentGame.earnedPoint;
        if (this.options.mode === 'difficult') {
          const item = Item.getRandomItem();
          if (item) {
            const bag = new BagCore(userId);
            await bag.addItem(item, 1);
            currentGame.earnedItem = item;
          }
        }
      }
      currentGame.updatedTime = Date.now();
      await GameRepo.save(currentGame);
      return json(res, {
        current: currentGame.current,
        history: currentGame.history,
        matchText: this.matchText,
        win: currentGame.current === currentGame.target,
        earned: currentGame.earnedPoint,
        earnedItem: Item.getName(currentGame.earnedItem as BagItemType | null),
      });
    } catch (err) {
      return error(res, (err as Error).message);
    }
  }

  async revoke(req: Request, res: Response) {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        throw new Error("请先登录后再进行游戏操作");
      }
      const currentGame = await this.getTodayGame(userId);
      if (!currentGame || currentGame.earnedPoint) {
        throw new Error("当前无进行中的游戏，请先创建新游戏");
      }
      this.options = currentGame;
      this.doRevoke();
      currentGame.updatedTime = Date.now();
      await this.setUserPoint(userId, -10, 'WJU游戏撤销操作扣除');
      req.session.user!.point -= 10;
      await GameRepo.save(currentGame);
      return json(res, {
        current: currentGame.current,
        history: currentGame.history,
        matchText: this.matchText,
      });
    } catch (err) {
      return error(res, (err as Error).message);
    }
  }

  async createAndSave(userId: string | undefined, difficulty: number = 0) {
    const newGameData = isNaN(difficulty) || !difficulty ? 
      this.create(Date.now()) : 
      this.createByDifficulty(Date.now(), difficulty);
    if (!userId) {
      return newGameData;
    }
    const newGame = GameRepo.create({
      ...newGameData,
      userId: userId,
    });
    await GameRepo.save(newGame);
    return newGameData;
  }

  async start(req: Request, res: Response) {
    const userId = req.session.user?.id;
    const difficulty = Number(req.query.difficulty ? 15 : 0);
    const newGame = await this.createAndSave(userId, difficulty);
    if (!userId) {
      return json(res, {
        ...newGame,
        matchText: this.matchText,
      });
    }

    this.options = newGame;
    this.setUserPoint(userId, difficulty ? -200 : -100, 'WJU游戏开局扣除');
    if (req.session.user) req.session.user.point -= difficulty ? 200 : 100;

    return json(res, {
      ...newGame,
      target: undefined,
      seed: undefined,
      matchText: this.matchText,
    });
  }

  async run(req: Request, res: Response) {
    const userId = req.session.user?.id;
    if (!userId) {
      return render(res, "index", req).render({
        difficult: req.path.includes('difficult')
      });
    }
    const currentGame = await this.getTodayGame(userId);
    if (currentGame) this.options = { ...currentGame };

    const yesterdayGame = await this.getYesterdayGame(userId);

    return render(res, "index", req).render({
      ...currentGame,
      earnedItem: Item.getName(currentGame?.earnedItem as BagItemType),
      target: undefined,
      seed: undefined,
      todayGame: currentGame,
      matchText: this.matchText,
      yesterday: yesterdayGame,
      difficult: req.path.includes('difficult'),
    });
  }

  async publish(req: Request, res: Response, next: Function) {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return next();
      }
      let currentGame: IGame | null = null;
      if (req.body.id) {
        currentGame = await GameRepo.findOneBy({ id: req.body.id, userId });
      } else {
        currentGame = await this.getTodayGame(userId);
      }
      if (!currentGame) {
        return error(res, "无此可发布游戏");
      }
      if (await PlaygroundRepo.findOneBy({ seed: currentGame.seed, source: currentGame.source })) {
        return error(res, "该游戏已发布至游乐场");
      }
      const playground = Object.assign(new Playground(), {
        source: currentGame.source,
        target: currentGame.target,
        seed: currentGame.seed,
        actions: [],
        difficulty: currentGame.difficulty,
        isPublished: true,
        bestRecord: currentGame.history.length,
        isDaily: true,
      });
      playground.userId = userId;
      const playgroundSaved = await PlaygroundRepo.save(PlaygroundRepo.create(playground))
      const playRecord: PlayRecord = new PlayRecord(playgroundSaved);
      playRecord.userId = userId;
      playRecord.isDaily = true;
      playRecord.playgroundId = playgroundSaved.id;
      playRecord.history = currentGame.history;
      playRecord.current = currentGame.current;
      playRecord.steps = currentGame.history.length;
      await PlayRecordRepo.save(PlayRecordRepo.create(playRecord));
      return json(res, playgroundSaved);
    } catch (err) {
      error(res, "创建失败: " + (err as Error).message);
    }
  }

  async useItem(req: Request, res: Response) {
    const type: BagItemType = req.params.type as BagItemType;
    const data: any = req.body;
    const userId = req.session.user?.id;
    if (!userId) {
      return error(res, "请先登录后再进行游戏操作");
    }
    const bag = new BagCore(userId);
    try {
      const userBag = await bag.getBag();
      if (userBag[`${type}Count`] <= 0) {
        throw new Error("道具数量不足");
      }
      if (type === BagItemType.DailyResetCard) {
        await Item.useDailyResetCard(userId, data.createDate);
      } else if (type === BagItemType.AccountResetCard) {
        await Item.useAccountResetCard(userId);
      } else if (type === BagItemType.FreePlayCard) {
        const currentGame = await this.getTodayGame(userId);
        if (currentGame && currentGame.earnedPoint) {
          throw new Error("今日游戏已完成，无法使用限免游玩卡");
        }
        await this.createAndSave(userId);
      }
      return json(res, await bag.addItem(type, -1));
    } catch (err) {
      return error(res, (err as Error).message);
    }
  }
}
