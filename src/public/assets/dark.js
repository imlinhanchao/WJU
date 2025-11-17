var isDarkModeInSystem = window.matchMedia("(prefers-color-scheme: dark)").matches;

function initDarkMode(darkMode = localStorage.getItem('vueuse-color-scheme') || 'auto') {
  const body = document.body;
  switch (darkMode) {
    case 'dark':
      body.classList.add('dark');
      localStorage.setItem('dark-mode', 'true');
      break;
    case 'auto':
      if (isDarkModeInSystem) {
        body.classList.add('dark');
        localStorage.setItem('dark-mode', 'true');
      }
      break;
  }
}

function toggleDarkMode(darkMode) {
  const body = document.body;
  // light / dark / auto
  if (darkMode === 'dark') {
    body.classList.remove('dark');
    localStorage.setItem('vueuse-color-scheme', isDarkModeInSystem ? 'light' : 'auto');
    return 'light';
  } else if (darkMode === 'light') {
    body.classList.add('dark');
    localStorage.setItem('vueuse-color-scheme', !isDarkModeInSystem ? 'dark' : 'auto');
    return 'dark';
  } else {
    !isDarkModeInSystem ? body.classList.add('dark') : body.classList.remove('dark');
    localStorage.setItem('vueuse-color-scheme', isDarkModeInSystem ? 'light' : 'dark');
    return isDarkModeInSystem ? 'light' : 'dark';
  }
}