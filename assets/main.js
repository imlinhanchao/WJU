Vue.createApp({
  setup() {
    const { ref, computed, watch, nextTick } = Vue;
    const current = ref('');
    const result = ref('');
    const level = ref(20);
    const history = ref([]);
    const cost = ref(0);
    function startGame() {
      const { begin, end, seed } = GameCore.create(level.value);
      console.log(`Game started: `, seed, begin, '=>', end);
      current.value = begin;
      result.value = end;
      history.value = [];
      cost.value -= 100;
    }
    function revoke() {
      current.value = history.value.pop();
      cost.value -= 10;
    }

    const matchText = computed(() => {
      if (!current.value) return '';
      let matchText = '';
      let matchIndex = 0;
      for (let i = 0; i < result.value.length; i++) {
        if (matchIndex < current.value.length && result.value[i] === current.value[matchIndex]) {
          matchText += result.value[i];
          matchIndex++;
        } else {
          matchText += '_';
        }
      }
      return matchText;
    });

    function addJ() {
      history.value.push(current.value);
      current.value = GameCore.addJ(current.value);
    }

    function addU() {
      history.value.push(current.value);
      current.value = GameCore.addU(current.value);
    }

    function lessJ() {
      history.value.push(current.value);
      current.value = GameCore.lessJ(current.value);
    }

    function lessU() {
      history.value.push(current.value);
      current.value = GameCore.lessU(current.value);
    }

    function double() {
      history.value.push(current.value);
      current.value = GameCore.double(current.value);
    }

    const canAddJ = computed(() => !current.value.endsWith('JJ'));
    const canAddU = computed(() => !current.value.endsWith('UUU'));
    const canLessJ = computed(() => current.value.includes('JJJ'));
    const canLessU = computed(() => current.value.includes('UU'));

    watch(current, (newVal) => {
      if (newVal === result.value) {
        setTimeout(() => {
          alert('恭喜你完成了推导！奖励 500 积分。')
          current.value = '';
        }, 500);
        cost.value += 500;
      }
    });

    const help = ref(false);

    return {
      help,
      cost,
      history,
      current,
      matchText,
      startGame,
      addJ,
      addU,
      lessJ,
      lessU,
      double,
      revoke,
      canAddJ,
      canAddU,
      canLessJ,
      canLessU,
    }
  }
}).mount('#app');