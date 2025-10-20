class GameCore {
  constructor() {

  }

  static addU(text) {
    if (text.endsWith('UUU')) return text;
    return text + 'U'
  }

  static addJ(text) {
    if (text.endsWith('JJ')) return text;
    return text + 'J'
  }

  static double(text) {
    const mat = text.match(/(?<=^W)(\w+)$/);
    if (mat) return text + mat[0];
    return text;
  }

  static lessJ(text) {
    return text.replace(/JJJ/g, 'U')
  }

  static lessU(text) {
    return text.replace(/UU/g, 'J')
  }

  static canUse(text) {
    const fns = [];
    if (text.length < 15) fns.push(GameCore.double);
    if (!text.endsWith('UUU') && (!text.endsWith('UJ') || GameCore.random(2) == 1)) fns.push(GameCore.addU);
    if (!text.endsWith('JJ') && (!text.endsWith('JU') || GameCore.random(2) == 1)) fns.push(GameCore.addJ);
    if (text.includes('JJJ')) fns.push(GameCore.lessJ);
    if (text.includes('UU')) fns.push(GameCore.lessU);
    return fns;
  }

  static create(level = 20) {
    let text = 'W';
    const seed = Date.now();
    const random = srand(seed);
    GameCore.random = random;
    const randLen = random(5) + 1;
    function getLetter() {
      const list = ['J', 'U'];
      return list[random(2)];
    }
    for (let i = 0; i < randLen; i++) {
      text += getLetter();
    }
    const begin = text;
    for (let i = 0; i < level; i++) {
      const fns = GameCore.canUse(text);
      const index = Math.ceil(random((fns.length - 1) * 5) / 5);
      const fn = fns[index];
      const last = text;
      text = fn(text);
      console.log(`Step ${i + 1}(${fn.name}): ${last} => ${text}`);
      if (text.length > 40) break;
    }
    return {
      begin,
      end: text,
      seed,
    }
  }
}

function srand(seed){
    function rnd(){
        seed = ( seed * 9301 + 49297 ) % 233280;
        return seed / ( 233280.0 );
    }
    return function(number) { 
        const r = Math.floor(rnd() * number); 
        return r;
    }
}