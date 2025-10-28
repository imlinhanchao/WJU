class GameCore {
  constructor() {

  }

  static action(type) {
    return fetch('/api/game/action/' + type, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(res => res.json()).then(rsp => {
      if (rsp.code) {
        throw new Error(rsp.msg);
      }
      if (rsp.data.win) {
        alert(`恭喜你完成了推导！奖励 ${rsp.data.earned} 积分。`)
      }
      return rsp.data;
    });
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
    return text.replace(/UUU/g, 'J')
  }

  static canUse(text) {
    const fns = [];
    if (text.length < 15) fns.push(GameCore.double);
    if (!text.endsWith('UUU') && (!text.endsWith('UJ') || GameCore.random(2) == 1)) fns.push(GameCore.addU);
    if (!text.endsWith('JJ') && (!text.endsWith('JU') || GameCore.random(2) == 1)) fns.push(GameCore.addJ);
    if (text.includes('JJJ')) fns.push(GameCore.lessJ);
    if (text.includes('UUU')) fns.push(GameCore.lessU);
    return fns;
  }

  static revoke() {
    return fetch('/api/game/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(res => res.json()).then(rsp => {
      if (rsp.code) {
        throw new Error(rsp.msg);
      }
      return rsp.data;
    });
  }

  static start() {
    return fetch('/api/game/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(res => res.json()).then(rsp => {
      if (rsp.code) {
        throw new Error(rsp.msg);
      }
      return rsp.data;
    });
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