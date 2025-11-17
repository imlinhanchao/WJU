import { UserRepo } from '../entities';
import { srand} from '../utils';
import { FingerTo } from 'fishpi';
import utils from '../utils';
import { estimateDifficulty } from './difficulty';
import { IGame } from './core';


export default class WJU {
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

  create(seed = Date.now(), source = ''): IGame & { actions: string[] } {
    let text = 'W';
    this.random = srand(seed);
    if (!source) {
      const randLen = this.random(5) + 1;
      const getLetter = () => {
        const list = ['J', 'U'];
        return list[this.random(2)];
      };
      for (let i = 0; i < randLen; i++) {
        text += getLetter();
      }
    } else {
      text = source;
    }
    const begin = text;
    const actions = [];
    for (let i = 0; i < 20 || ( i >= 20 && text.length < 15); i++) {
      const fns = this.canUse(text, true, i);
      const index = Math.ceil(this.random((fns.length - 1) * 5) / 5);
      if (fns.length === 0) break;
      const fn = fns[index];
      const last = text;
      text = fn(text);
      actions.push(fn.name);
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
    
    return { ...this.options, actions };
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

  async setUserPoint(userId: string, point: number, memo?: string) {
    const user = await UserRepo.findOne({ where: { id: userId } });
    if (!user) return;
    if (user.from == 'fishpi' && utils.config.secret.goldenKey) {
      FingerTo(utils.config.secret.goldenKey).editUserPoints(user.username, point, memo || 'WJU游戏奖励').catch(console.error);
    }
    return UserRepo.update({ id: userId }, { point: () => `point + (${point})` });
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

  async doAction(action: string) {
    try {
      let newText = this.options.current;
      const fns = this.canUse(this.options.current);
      const fn = fns.find(f => f.name === action);
      if (!fn) {
        throw new Error("无效的游戏操作");
      }
      newText = fn(newText);
      this.options.history.push(this.options.current);
      this.options.current = newText;
      if (this.options.current === this.options.target) {
        return true;
      }
      return false;
    } catch (err) {
      throw new Error("游戏操作失败: " + (err as Error).message);
    }
  }

  async doRevoke() {
    if (this.options.history.length === 0) {
      throw new Error("当前无可撤销的操作");
    }
    const lastText = this.options.history.pop() as string;
    this.options.current = lastText;
    return this;
  }
}
