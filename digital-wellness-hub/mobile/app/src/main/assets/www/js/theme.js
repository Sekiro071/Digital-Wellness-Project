(() => {
  const storageKey = 'good-signal-theme';
  const root = document.documentElement;
  const system = window.matchMedia?.('(prefers-color-scheme: dark)');
  let preference = null;
  let toggle = null;

  function parseTheme(value) {
    return value === 'light' || value === 'dark' ? value : null;
  }

  function restorePreference() {
    try {
      preference = parseTheme(window.localStorage.getItem(storageKey));
    } catch {
      // Retain the session choice if this browser blocks storage.
    }
  }

  function applyTheme() {
    const theme = preference ?? (system?.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    if (!toggle) return;

    const next = theme === 'dark' ? 'light' : 'dark';
    toggle.textContent = next === 'light' ? 'Light mode' : 'Dark mode';
    toggle.setAttribute('aria-label', `Switch to ${next} mode`);
  }

  function mountToggle() {
    toggle = document.querySelector('.theme-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.className = 'theme-toggle';
      const header = document.querySelector('.nav-wrap');
      if (header) {
        header.insertBefore(toggle, header.querySelector('.menu-toggle'));
      } else {
        toggle.classList.add('theme-toggle--standalone');
        (document.querySelector('main .container') ?? document.body).append(toggle);
      }
    }

    toggle.type = 'button';
    toggle.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      try {
        window.localStorage.setItem(storageKey, preference);
      } catch {
        // The current page remains interactive.
      }
    });
    applyTheme();
  }

  restorePreference();
  applyTheme();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggle, { once: true });
  } else {
    mountToggle();
  }

  if (system?.addEventListener) system.addEventListener('change', applyTheme);
  else system?.addListener?.(applyTheme);

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    restorePreference();
    applyTheme();
  });
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    restorePreference();
    applyTheme();
  });
})();
