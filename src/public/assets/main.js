Vue.createApp({
  setup() {
    const { ref, computed, watch, onMounted } = Vue;
    const error = ref('');
    const current = ref(window.gamData?.current || '');
    const target = ref(window.gamData?.target || 'W');
    const match = ref(window.gamData?.matchText || '');
    const history = ref(window.gamData?.history || []);
    const earnPoint = ref(window.gamData?.earnedPoint || 0);
    async function startGame() {
      const { source: begin, target: end, matchText } = await GameCore.start();
      console.log(`Game started: `, begin, '=>', end);
      current.value = begin;
      target.value = end;
      history.value = [];
      match.value = matchText;
      save();
    }

    async function revoke() {
      if (!window.player) {
        current.value = history.value.pop()
        save();
        return;
      }
      const { current: newCurrent, matchText } = await GameCore.revoke();
      current.value = newCurrent;
      match.value = matchText;
    }

    const matchText = computed(() => {
      if (!current.value) return '';
      if (window.player) return match.value;
      let matchText = '';
      let matchIndex = 0;
      for (let i = 0; i < target.value.length; i++) {
        if (matchIndex < current.value.length && target.value[i] === current.value[matchIndex]) {
          matchText += target.value[i];
          matchIndex++;
        } else {
          matchText += '_';
        }
      }
      return matchText;
    });

    async function addJ() {
      history.value.push(current.value);
      current.value = GameCore.addJ(current.value);
      if (!window.player) return save();
      const { current: newCurrent, matchText, earned } = await GameCore.action('addJ');
      current.value = newCurrent;
      match.value = matchText;
      earnPoint.value = earned;
    }

    async function addU() {
      history.value.push(current.value);
      current.value = GameCore.addU(current.value);
      if (!window.player) return save();
      const { current: newCurrent, matchText, earned } = await GameCore.action('addU');
      current.value = newCurrent;
      match.value = matchText;
      earnPoint.value = earned;
    }

    async function lessJ() {
      history.value.push(current.value);
      current.value = GameCore.lessJ(current.value);
      if (!window.player) return save();
      const { current: newCurrent, matchText, earned } = await GameCore.action('lessJ');
      current.value = newCurrent;
      match.value = matchText;
      earnPoint.value = earned;
    }

    async function lessU() {
      history.value.push(current.value);
      current.value = GameCore.lessU(current.value);
      if (!window.player) return save();
      const { current: newCurrent, matchText, earned } = await GameCore.action('lessU');
      current.value = newCurrent;
      match.value = matchText;
      earnPoint.value = earned;
    }

    async function double() {
      history.value.push(current.value);
      current.value = GameCore.double(current.value);
      if (!window.player) return save();
      const { current: newCurrent, matchText, earned } = await GameCore.action('double');
      current.value = newCurrent;
      match.value = matchText;
      earnPoint.value = earned;
    }

    const canAddJ = computed(() => !current.value.endsWith('JJ'));
    const canAddU = computed(() => !current.value.endsWith('UUU'));
    const canLessJ = computed(() => current.value.includes('JJJ'));
    const canLessU = computed(() => current.value.includes('UUU'));
    const isWin = computed(() => current.value === matchText.value && current.value !== '');

    if (!window.player) {
      watch(current, (newVal) => {
        if (newVal === target.value) {
          setTimeout(() => {
            localStorage.removeItem('gameData')
          }, 500);
          // cost.value += 365;
          // 这东西好像没用？
        }
      });
    }

    const help = ref(false);

    onMounted(() => {
      initDarkMode(darkMode.value);
      document.getElementById('loading').style.display = 'none';
    });

    const darkMode = ref(localStorage.getItem('vueuse-color-scheme') || 'auto');

    function switchDarkMode() {
      darkMode.value = toggleDarkMode(darkMode.value);
    }

    const isDark = computed(() => {
      if (darkMode.value === 'auto') {
        return isDarkModeInSystem;
      }
      return darkMode.value === 'dark';
    });

    function save() {
      const gameData = {
        current: current.value,
        target: target.value,
        matchText: match.value,
        history: history.value,
      };
      localStorage.setItem('gameData', JSON.stringify(gameData));
    }

    const actionText = {
      addJ: '+J',
      addU: '+U',
      lessJ: 'JJJ => U',
      lessU: 'UUU => J',
      double: 'Wx => Wxx',
    }
    const playground = ref({
      source: 'W',
      target: 'W',
      actions: [],
    })
    const targetText= computed(() => {
      let value = playground.value.source;
      playground.value.actions.forEach(action => {
        value = GameCore[action](value);
      });
      return value;
    });
    watch(targetText, (newVal) => {
      current.value = playground.value.target = newVal;
    });
    async function gen(src = '', s = '') {
      try {
        const result = await GameCore.generate(src, s);
        playground.value.source = result.source;
        playground.value.seed = result.seed;
        playground.value.actions = result.actions;
        error.value = '';
      } catch (error) {
        error.value = error.message;
      }
    }
    function addAction(action) {
      playground.value.actions.push(action);
    }
    function removeSource(index) {
      playground.value.source = playground.value.source.slice(0, index) + playground.value.source.slice(index + 1);
    }
    function revokeAction(index) {
      playground.value.actions.splice(index, 1);
    }
    async function save() {
      const gameData = { ...playground.value };
      const data = await GameCore.save(gameData).catch(err => {
        error.value = err.message;
      });
      if (data) {
        location.href = `/playground/game/${data.id}/edit`;
      }
    }

    onMounted(() => {
      if (window.playground) {
        playground.value = window.playground;
      }
    })

    return {
      isDark,
      error,
      help,
      history,
      current,
      matchText,
      earnPoint,
      isWin,
      playground,
      actionText,
      save,
      addAction,
      removeSource,
      revokeAction,
      gen,
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
      switchDarkMode,
    }
  }
}).mount('#app');