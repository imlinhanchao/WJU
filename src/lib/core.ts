import { Request, Response } from 'express';
import { error, json, render } from '../utils/route';
import { GameRepo, UserRepo } from '../entities';
import { srand, random, weightedRandom} from '../utils';
import { And, MoreThan, Not } from 'typeorm';
import { FingerTo } from 'fishpi';
import utils from '../utils';
import { estimateDifficulty } from './difficulty';
import WJU from './wju';

export interface IGame {
  source: string;
  target: string;
  seed: number;
  current: string;
  history: string[];
  difficulty: number;
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
      }
      currentGame.updatedTime = Date.now();
      await GameRepo.save(currentGame);
      return json(res, {
        current: currentGame.current,
        history: currentGame.history,
        matchText: this.matchText,
        win: currentGame.current === currentGame.target,
        earned: currentGame.earnedPoint,
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

  async start(req: Request, res: Response) {
    const userId = req.session.user?.id;
    const difficulty = Number(req.query.difficulty || '0');
    const newGameData = isNaN(difficulty) || !difficulty ? 
      this.create(Date.now()) : 
      this.createByDifficulty(Date.now(), difficulty);
    if (!userId) {
      return json(res, {
        ...newGameData,
        matchText: this.matchText,
      });
    }
    const newGame = GameRepo.create({
      ...newGameData,
      userId: userId,
    });
    await GameRepo.save(newGame);
    this.options = newGameData;
    this.setUserPoint(userId, difficulty ? -200 : -100, 'WJU游戏开局扣除');
    if (req.session.user) req.session.user.point -= difficulty ? 200 : 100;

    return json(res, {
      ...newGameData,
      target: undefined,
      seed: undefined,
      matchText: this.matchText,
    });
  }

  async run(req: Request, res: Response) {
    const userId = req.session.user?.id;
    if (!userId) {
      return render(res, "index", req).render();
    }
    const currentGame = await this.getTodayGame(userId);
    if (currentGame) this.options = { ...currentGame };

    const yesterdayGame = await this.getYesterdayGame(userId);

    return render(res, "index", req).render({
      ...currentGame,
      target: undefined,
      seed: undefined,
      todayGame: currentGame,
      matchText: this.matchText,
      yesterday: yesterdayGame,
      difficult: req.path.includes('difficult'),
    });
  }
}
