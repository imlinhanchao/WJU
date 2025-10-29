import { Request, Response } from 'express';
import { error, json, render } from '../utils/route';
import { GameRepo, UserRepo } from '../entities';
import { srand } from '../utils';
import { Equal, MoreThan, Not } from 'typeorm';

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

  canUse(text: string, create: boolean = false) {
    const fns = [];
    if (create) {
      if (text.length < 15) fns.push(this.double);
      if (!text.endsWith('UUU') && (!text.endsWith('UJ') || this.random(2) == 1)) fns.push(this.addU);
      if (!text.endsWith('JJ') && (!text.endsWith('JU') || this.random(2) == 1)) fns.push(this.addJ);
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
    for (let i = 0; i < 20; i++) {
      const fns = this.canUse(text, true);
      const index = Math.ceil(this.random((fns.length - 1) * 5) / 5);
      const fn = fns[index];
      const last = text;
      text = fn(text);
      console.log(`Step ${i + 1}(${fn.name}): ${last} => ${text}`);
      if (text.length > 40) break;
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
    return GameRepo.find({ 
      where: { 
        userId: userId,
        createTime: MoreThan(Math.floor(Date.now() / 864000) * 864000),
      },
      order: { updatedTime: 'DESC' } 
    })
  }

  getCurrent(userId: string) {
    return GameRepo.findOne({ 
      where: { 
        userId: userId,
        current: Not(Equal(this.options.target)),
        createTime: MoreThan(Math.floor(Date.now() / 864000) * 864000),
      },
      order: { updatedTime: 'DESC' } 
    });
  }

  setUserPoint(userId: string, point: number) {
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
        currentGame.earnedPoint = Math.floor(Math.random() * (365 - 168)) + 168;
        this.setUserPoint(userId, currentGame.earnedPoint);
      }
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
    this.setUserPoint(userId, -10);
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
    this.setUserPoint(userId, -100);

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
      return render(res, "index", req).render({ 
        ...this.create(req.query.seed ? Number(req.query.seed) : Date.now()), 
        matchText: this.matchText 
      });
    }
    const todayGames = await this.getTodayGame(userId);
    const currentGame = todayGames.find(g => g.current !== g.target);
    if (currentGame) this.options = { ...currentGame };

    return render(res, "index", req).render({
      ...currentGame,
      target: undefined,
      seed: undefined,
      todayGame: todayGames,
      matchText: this.matchText,
    });
  }
}
