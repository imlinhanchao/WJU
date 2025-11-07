import { Request, Response } from 'express';
import { error, json, render } from '../utils/route';
import { GameRepo, UserRepo } from '../entities';
import { srand, random } from '../utils';
import { Equal, MoreThan, Not } from 'typeorm';
import { FingerTo } from 'fishpi';
import utils from '../utils';

export interface IGame {
  source: string;
  target: string;
  seed: number;
  current: string;
  history: string[];
}

export default class GameCore {
  random: (max: number) => number;
  options: IGame;

  constructor(options?: IGame) {
    this.options = options || {
      source: '',
      target: '',
      seed: Date.now(),
      current: '',
      history: [],
    };
  }

  addU(text: string) {
    if (text.endsWith('UUU')) return text;
    return text + 'U'
  }

  addJ(text: string) {
    if (text.endsWith('JJ')) return text;
    return text + 'J'
  }

  double(text: string) {
    const mat = text.match(/(?<=^W)(\w+)$/);
    if (mat) return text + mat[0];
    return text;
  }

  lessJ(text: string) {
    return text.replace(/JJJ/g, 'U')
  }

  lessU(text: string) {
    return text.replace(/UUU/g, 'J')
  }

  canUse(text: string, create: boolean = false, step: number = 0) {
    const fns = [];
    if (create) {
      if (text.length < 15) fns.push(this.double);
      if (!text.endsWith('UUU') && (text.length < 15 || step < 5) && (!text.endsWith('UJ') || this.random(2) == 1)) fns.push(this.addU);
      if (!text.endsWith('JJ') && (text.length < 15 || step < 5) && (!text.endsWith('JU') || this.random(2) == 1)) fns.push(this.addJ);
      if (text.includes('JJJ')) fns.push(this.lessJ);
      if (text.includes('UUU')) fns.push(this.lessU);
    } else {
      fns.push(this.double);
      if (!text.endsWith('UUU')) fns.push(this.addU);
      if (!text.endsWith('JJ')) fns.push(this.addJ);
      if (text.includes('JJJ')) fns.push(this.lessJ);
      if (text.includes('UUU')) fns.push(this.lessU);
    }
    return fns;
  }

  create(seed = Date.now()): IGame {
    let text = 'W';
    this.random = srand(seed);
    const randLen = this.random(5) + 1;
    const getLetter = () => {
      const list = ['J', 'U'];
      return list[this.random(2)];
    };
    for (let i = 0; i < randLen; i++) {
      text += getLetter();
    }
    const begin = text;
    for (let i = 0; i < 20 || ( i >= 20 && text.length < 15); i++) {
      const fns = this.canUse(text, true, i);
      const index = Math.ceil(this.random((fns.length - 1) * 5) / 5);
      if (fns.length === 0) break;
      const fn = fns[index];
      const last = text;
      text = fn(text);
      console.log(`Step ${i + 1}(${fn.name}): ${last} => ${text}`);
    }
    this.options = {
      source: begin,
      target: text,
      seed,
      current: begin,
      history: [],
    };
    
    return this.options;
  }

  get matchText() {
    if (!this.options.current) return '';
    let matchText = '';
    let matchIndex = 0;
    for (let i = 0; i < this.options.target.length; i++) {
      if (matchIndex < this.options.current.length && this.options.target[i] === this.options.current[matchIndex]) {
        matchText += this.options.target[i];
        matchIndex++;
      } else {
        matchText += '_';
      }
    }
    return matchText;
  }

  getTodayGame(userId: string) {
    return GameRepo.findOne({ 
      where: { 
        userId: userId,
        createTime: MoreThan(Math.floor(Date.now() / 864000000) * 864000000),
      },
      order: { updatedTime: 'DESC' } 
    });
  }

  getCurrent(userId: string) {
    return GameRepo.findOne({ 
      where: { 
        userId: userId,
        current: Not(Equal(this.options.target)),
        createTime: MoreThan(Math.floor(Date.now() / 864000000) * 864000000),
      },
      order: { updatedTime: 'DESC' } 
    });
  }

  async setUserPoint(userId: string, point: number, memo?: string) {
    const user = await UserRepo.findOne({ where: { id: userId } });
    if (!user) return;
    if (user.from == 'fishpi') {
      FingerTo(utils.config.secret.goldenKey).editUserPoints(user.username, point, memo || 'WJU游戏奖励').catch(console.error);
    }
    return UserRepo.update({ id: userId }, { point: () => `point + (${point})` });
  }

  async action(req: Request, res: Response) {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        return error(res, "请先登录后再进行游戏操作");
      }
      const currentGame = await this.getCurrent(userId);
      if (!currentGame) {
        return error(res, "当前无进行中的游戏，请先创建新游戏");
      }
      const action = req.params.action as string;
      let newText = currentGame.current;
      const fns = this.canUse(currentGame.current);
      const fn = fns.find(f => f.name === action);
      if (!fn) {
        return error(res, "无效的游戏操作");
      }
      newText = fn(newText);
      currentGame.history.push(currentGame.current);
      currentGame.current = newText;
      this.options = currentGame;
      if (currentGame.current === currentGame.target) {
        const maxPoints = Array(20).fill(256).concat([365, 512, 365, 365, 512, 365, 365, 512, 365, 1024]);
        currentGame.earnedPoint = random(maxPoints[random(maxPoints.length)], 128);
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
      return error(res, "游戏操作失败: " + (err as Error).message);
    }
  }

  async revoke(req: Request, res: Response) {
    const userId = req.session.user?.id;
    if (!userId) {
      return error(res, "请先登录后再进行游戏操作");
    }
    const currentGame = await this.getCurrent(userId);
    if (!currentGame) {
      return error(res, "当前无进行中的游戏，请先创建新游戏");
    }
    if (currentGame.history.length === 0) {
      return error(res, "当前无可撤销的操作");
    }
    const lastText = currentGame.history.pop() as string;
    currentGame.current = lastText;
    this.options = currentGame;
    this.setUserPoint(userId, -10, 'WJU游戏撤销操作扣除');
    if (req.session.user) req.session.user.point -= 10;
    await GameRepo.save(currentGame);
    return json(res, {
      current: currentGame.current,
      history: currentGame.history,
      matchText: this.matchText,
    });
  }

  async start(req: Request, res: Response) {
    const userId = req.session.user?.id;
    const newGameData = this.create(Date.now());
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
    this.setUserPoint(userId, -100, 'WJU游戏开局扣除');
    if (req.session.user) req.session.user.point -= 100;

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

    return render(res, "index", req).render({
      ...currentGame,
      target: undefined,
      seed: undefined,
      todayGame: currentGame,
      matchText: this.matchText,
    });
  }
}
