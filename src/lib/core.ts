import { Request, Response } from 'express';
import { error, json, render } from '../utils/route';
import { GameRepo, UserRepo } from '../entities';
import { srand, random, weightedRandom} from '../utils';
import { And, MoreThan, Not } from 'typeorm';
import { FingerTo } from 'fishpi';
import utils from '../utils';
import { estimateDifficulty } from './difficulty';

export interface IGame {
  source: string;
  target: string;
  seed: number;
  current: string;
  history: string[];
  difficulty: number;
}

export default class GameCore {
  random: (max: number) => number;
  options: IGame;
  MAX_DIFFICULTY : number = 15;

  constructor(options?: IGame) {
    this.options = options || {
      source: '',
      target: '',
      seed: Date.now(),
      current: '',
      history: [],
      difficulty: 0
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

    const difficulty = estimateDifficulty(text, 1.2);

    this.options = {
      source: begin,
      target: text,
      seed,
      current: begin,
      history: [],
      difficulty: difficulty
    };
    
    return this.options;
  }

  createByDifficulty(seed: number, targetDifficulty: number, tolerance: number = 0.5): IGame {
    let text = 'W';
    this.random = srand(seed);

    // --- 初始化随机长度和字母 ---
    const randLen = this.random(5) + 1;
    const letters = ['J', 'U'];
    for (let i = 0; i < randLen; i++) text += letters[this.random(2)];
    const begin = text;

    const beamWidth = 8;          // Beam 宽度
    const MAX_STEPS = 200;        // 最大迭代步数
    const MAX_LEN = 25;           // 字符串长度限制

    type BeamNode = {
      text: string;
      difficulty: number;
      diffToTarget: number;
      lastOp: string | null;
      doubleUsed: boolean;
      operations: Array<(text: string) => string>; // 保存操作函数本身
    };

    let beam: BeamNode[] = [{
      text,
      difficulty: estimateDifficulty(text, 1.2),
      diffToTarget: Math.abs(estimateDifficulty(text, 1.2) - targetDifficulty),
      lastOp: null,
      doubleUsed: false,
      operations: []
    }];

    for (let step = 0; step < MAX_STEPS; step++) {
      let candidates: BeamNode[] = [];

      for (const node of beam) {
        const fns = this.canUse(node.text, true, step);

        for (const fn of fns) {
          // double 概率限制：超过目标 75% 时 30% 概率允许
          if (fn.name === "double" && (node.doubleUsed || node.difficulty > targetDifficulty * 0.75)) {
            if (Math.random() > 0.3) continue;
          }

          const newText = fn(node.text);
          if (newText.length > MAX_LEN) continue;

          const newDifficulty = estimateDifficulty(newText, 1.2);
          const diffToTarget = Math.abs(newDifficulty - targetDifficulty);

          if (diffToTarget > 6 && step > 3) continue;

          candidates.push({
            text: newText,
            difficulty: newDifficulty,
            diffToTarget,
            lastOp: fn.name,
            doubleUsed: node.doubleUsed || fn.name === "double",
            operations: [...node.operations, fn] // 保存操作函数
          });
        }
      }

      if (candidates.length === 0) break;

      // 排序函数，score 越低越好，加入轻微随机扰动增加多样性
      const score = (node: BeamNode) => {
        let s = node.diffToTarget;

        if (node.text.length > 15) s += (node.text.length - 15) * 0.15;
        if (node.text.length > 20) s += (node.text.length - 20) * 0.3;

        if (node.lastOp === 'double') s += 1.5;

        // 误差惩罚
        if (node.difficulty < targetDifficulty - tolerance) s += (targetDifficulty - tolerance - node.difficulty) * 2.0;
        if (node.difficulty > targetDifficulty + tolerance) s += (node.difficulty - targetDifficulty - tolerance) * 2.0;

        // 随机扰动
        s += Math.random() * 0.2 - 0.1;

        return s;
      };

      candidates.sort((a, b) => score(a) - score(b));

      // 随机选 top beamWidth 节点增加多样性
      const topCandidates = candidates.slice(0, beamWidth * 2);
      beam = [];
      while (beam.length < beamWidth && topCandidates.length > 0) {
        const idx = Math.floor(Math.random() * topCandidates.length);
        beam.push(topCandidates[idx]);
        topCandidates.splice(idx, 1);
      }

      // 提前终止：找到满足容差的节点但继续保留随机性
      const inTolerance = beam.find(n => n.diffToTarget <= tolerance);
      if (inTolerance && step > 20) {
        beam = [inTolerance];
        break;
      }
    }

    const best = beam[0];

    // 打印最终操作序列
    const operationsNames = best.operations.map(fn => fn.name);
    console.log(`Need: ${targetDifficulty}, Final difficulty: ${best.difficulty}`);
    console.log(`Operations sequence: ${operationsNames.join(' -> ')}`);

    // 用保存的函数执行一次，保证当前值
    let current = begin;
    for (const fn of best.operations) {
      current = fn(current);
    }

    this.options = {
      source: begin,
      target: best.text,
      seed,
      current,
      history: [],
      difficulty: best.difficulty
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
        return error(res, "请先登录后再进行游戏操作");
      }
      const currentGame = await this.getTodayGame(userId);
      if (!currentGame || currentGame.earnedPoint) {
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
        let basePoint = 128;
        const yesterdayGame = await this.getYesterdayGame(userId);
        if (yesterdayGame && yesterdayGame.earnedPoint) {
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
      return error(res, "游戏操作失败: " + (err as Error).message);
    }
  }

  async revoke(req: Request, res: Response) {
    const userId = req.session.user?.id;
    if (!userId) {
      return error(res, "请先登录后再进行游戏操作");
    }
    const currentGame = await this.getTodayGame(userId);
    if (!currentGame || currentGame.earnedPoint) {
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
    const newGameData = this.createByDifficulty(Date.now(), 10);
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

  async reGenDifficulty(req: Request, res: Response) {
    GameRepo.find({ where: { difficulty: 0 } }).then(async games => {
      for (const game of games) {
        const newDifficulty = estimateDifficulty(game.target, 1.2);
        game.difficulty = newDifficulty;
        await GameRepo.save(game);
        console.log(`Game ${game.id} 重新计算难度为 ${newDifficulty}`);
      }
      return json(res, { updated: games.length });
    }).catch(err => {
      return error(res, "重新计算难度失败: " + (err as Error).message);
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
    });
  }
}
