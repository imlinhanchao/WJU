class DifficultyCalculator {
  constructor(debug = false) {
    this.debug = debug;
  }

  // 字符串操作
  addJ(text) { return text + 'J'; }
  addU(text) { return text + 'U'; }
  double(text) { return text + text.slice(1); }
  lessJ(text) { return text.replaceAll('JJJ', 'U'); }
  lessU(text) { return text.replaceAll('UUU', 'J'); }

  // 可用操作列表
  canUse(text) {
    const fns = [];
    if (!text.endsWith('UUU')) fns.push({ fn: this.addU.bind(this), name: '+U' });
    if (!text.endsWith('JJ')) fns.push({ fn: this.addJ.bind(this), name: '+J' });
    fns.push({ fn: this.double.bind(this), name: 'double' });
    if (text.includes('JJJ')) fns.push({ fn: this.lessJ.bind(this), name: 'JJJ->U' });
    if (text.includes('UUU')) fns.push({ fn: this.lessU.bind(this), name: 'UUU->J' });
    return fns;
  }

  // BFS 计算最少操作步数
  minStepsToTarget(target, from = 'W') {
    const N = target.length;
    const queue = [{ text: from, steps: 0, path: [] }];
    const seen = new Map();
    seen.set(from, 0);

    while (queue.length > 0) {
      const { text, steps, path } = queue.shift();

      if (text === target) {
        if (this.debug) {
          console.log('找到目标:', text);
          console.log('操作序列:', path.join(' -> '));
        }
        return { minSteps: steps, path };
      }

      const fns = this.canUse(text);
      for (let op of fns) {
        const next = op.fn(text);
        if (next.length > N + 5) continue; // 限制长度避免死循环

        if (!seen.has(next) || steps + 1 < seen.get(next)) {
          seen.set(next, steps + 1);
          queue.push({
            text: next,
            steps: steps + 1,
            path: [...path, `${op.name} (${text}=>${next})`]
          });

          if (this.debug) {
            console.log(`Step ${steps + 1}: ${op.name}, ${text} => ${next}`);
          }
        }
      }
    }

    return { minSteps: Infinity, path: [] };
  }

  // 结构因子
  computeFactor(s) {
    const len = s.length;
    let factor = 1;

    const runs = s.match(/(J+|U+)/g) || [];
    const maxRun = Math.max(...runs.map(r => r.length));
    if (maxRun >= 4) factor += 0.5;

    const switches = s.split('').filter((c, i) => i > 0 && c !== s[i - 1]).length;
    factor += switches / len;

    const jjjCount = (s.match(/JJJ/g) || []).length;
    const uuuCount = (s.match(/UUU/g) || []).length;
    factor += (jjjCount + uuuCount) * 0.3;

    return factor;
  }

  // 最终难度
  calculateDifficulty(target, from = 'W') {
    const { minSteps, path } = this.minStepsToTarget(target, from);
    if (!isFinite(minSteps)) return { difficulty: 999, minSteps };

    const factor = this.computeFactor(target.slice(1));
    const difficulty = Number((minSteps * factor).toFixed(2));

    if (this.debug) {
      console.log(`目标字符串: ${target}`);
      console.log(`最少步骤: ${minSteps}`);
      console.log(`结构因子: ${factor}`);
      console.log(`最终难度: ${difficulty}`);
      console.log('操作路径:');
      path.forEach((step, idx) => console.log(`${idx + 1}: ${step}`));
      console.log('------------------------');
    }

    return { difficulty, minSteps };
  }
}

// ---- 测试 ----
const calculator = new DifficultyCalculator(true); // debug = true
const tests = [
    "WJJUUJJU"
//   "WJUJUJ",
//   "WJUJUJU",
//   "WUUUU",
//   "WUUJUUUUJJUJJUU",
//   "WUUUJUUUUUUJUUU",
//   "WUUJJJUJJJUUJJUUJJJUJJJUUJJ",
//   "WJUJJUJJUJJUJUUJJ"
];

tests.forEach(t => {
  const result = calculator.calculateDifficulty(t, 'WJUJU');
  console.log(`${t}: 最少步骤 = ${result.minSteps}, 难度 = ${result.difficulty}`);
});