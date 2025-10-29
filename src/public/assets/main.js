Vue.createApp({
  setup() {
    const { ref, computed, watch, onMounted } = Vue;
    const error = ref('');
    const current = ref(window.gamData?.current || '');
    const target = ref('');
    const match = ref('');
    const history = ref(window.gamData?.history || []);
    async function startGame() {
      const { source: begin, target: end, matchText } = await GameCore.start();
      console.log(`Game started: `, begin, '=>', end);
      current.value = begin;
      target.value = end;
      history.value = [];
      match.value = matchText;
    }
    function revoke() {
      current.value = history.value.pop();
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
      if (!window.player) return;
      const { current: newCurrent, matchText } = await GameCore.action('addJ');
      current.value = newCurrent;
      match.value = matchText;
    }

    async function addU() {
      history.value.push(current.value);
      current.value = GameCore.addU(current.value);
      if (!window.player) return;
      const { current: newCurrent, matchText } = await GameCore.action('addU');
      current.value = newCurrent;
      match.value = matchText;
    }

    async function lessJ() {
      history.value.push(current.value);
      current.value = GameCore.lessJ(current.value);
      if (!window.player) return;
      const { current: newCurrent, matchText } = await GameCore.action('lessJ');
      current.value = newCurrent;
      match.value = matchText;
    }

    async function lessU() {
      history.value.push(current.value);
      current.value = GameCore.lessU(current.value);
      if (!window.player) return;
      const { current: newCurrent, matchText } = await GameCore.action('lessU');
      current.value = newCurrent;
      match.value = matchText;
    }

    async function double() {
      history.value.push(current.value);
      current.value = GameCore.double(current.value);
      if (!window.player) return;
      const { current: newCurrent, matchText } = await GameCore.action('double');
      current.value = newCurrent;
      match.value = matchText;
    }

    const canAddJ = computed(() => !current.value.endsWith('JJ'));
    const canAddU = computed(() => !current.value.endsWith('UUU'));
    const canLessJ = computed(() => current.value.includes('JJJ'));
    const canLessU = computed(() => current.value.includes('UUU'));

    if (!window.player) {
      watch(current, (newVal) => {
        if (newVal === target.value) {
          setTimeout(() => {
            alert('恭喜你完成了推导！')
            current.value = '';
          }, 500);
          cost.value += 365;
        }
      });
    }

    const help = ref(false);

    onMounted(() => {
      initDarkMode(darkMode.value);
    });

    const darkMode = ref(localStorage.getItem('vueuse-color-scheme') || 'auto');

    function switchDarkMode() {
      darkMode.value = toggleDarkMode();
    }

    const isDark = computed(() => {
      if (darkMode.value === 'auto') {
        return isDarkModeInSystem;
      }
      return darkMode.value === 'dark';
    });


    return {
      isDark,
      error,
      help,
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
      switchDarkMode,
    }
  }
}).mount('#app');