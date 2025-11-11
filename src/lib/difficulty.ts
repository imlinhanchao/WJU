// difficulty.ts
export function estimateDifficulty(target: string, stepFactor: number = 1.0): number {
  if (!target.startsWith('W')) return 999;

  const str: string = target.slice(1);

  // --- 翻倍检测 (只检测末尾) ---
  function findTailRepeat(s: string): string | null {
    const len: number = s.length;
    for (let l = Math.floor(len / 2); l >= 1; l--) {
      const firstPart: string = s.slice(len - 2 * l, len - l);
      const secondPart: string = s.slice(len - l);
      if (firstPart === secondPart) {
        return s.slice(0, len - l);
      }
    }
    return null;
  }

  const pre: string | null = findTailRepeat(str);
  if (pre) {
    return estimateDifficulty('W' + pre, stepFactor);
  }

  // --- 连续段处理 ---
  let difficulty: number = 0;
  let i: number = 0;
  while (i < str.length) {
    const runChar: string = str[i];
    let runLen: number = 1;
    while (i + runLen < str.length && str[i + runLen] === runChar) runLen++;

    if (runLen >= 4) difficulty += runLen * 0.5;
    else if (runLen === 3) difficulty += 0.2;
    else difficulty += runLen * 0.1;

    i += runLen;
  }

  // --- 基础长度加权 ---
  difficulty += str.length * 0.5;

  // --- 最终乘系数 ---
  difficulty *= stepFactor;

  return Number(difficulty.toFixed(2));
}
