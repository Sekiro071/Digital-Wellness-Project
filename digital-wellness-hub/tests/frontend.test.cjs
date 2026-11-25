const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
async function mount(file, script = 'js/app.js', storage) {
  const dom = new JSDOM(read(file), { url: 'http://localhost/' + file, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLElement.prototype.getClientRects = function () { return [1]; };
  w.fetch = async () => ({ ok: true, json: async () => JSON.parse(read('data/resources.json')) });
  if (storage) storage(w);
  w.eval(read('js/data.js'));
  w.eval(read(script));
  await new Promise(resolve => setImmediate(resolve));
  return dom;
}
const select = (w, selector, value) => { const el = w.document.querySelector(selector); el.value = value; el.dispatchEvent(new w.Event(el.type === 'search' ? 'input' : 'change', { bubbles: true })); };
test('bundled catalogue matches canonical data and has comparable source fields', () => {
  const dom = new JSDOM('', { runScripts: 'outside-only' });
  try {
    dom.window.eval(read('js/data.js'));
    const bundled = JSON.parse(JSON.stringify(dom.window.DW_RESOURCES));
    const canonical = JSON.parse(read('data/resources.json'));
    assert.deepEqual(bundled, canonical); assert.ok(canonical.length >= 8 && canonical.length <= 12);
    for (const resource of canonical) for (const key of ['purpose', 'platforms', 'pricing', 'privacy', 'accessibility', 'limitations', 'dateChecked', 'sourceType']) assert.ok(resource[key], `${resource.id}: ${key}`);
  } finally { dom.window.close(); }
});
test('price filters distinguish free open-source from freemium', async () => {
  const dom = await mount('pages/resources.html'); const w = dom.window, d = w.document;
  try {
    select(w, '#resource-pricing', 'free');
    const names = d.querySelector('[data-resource-grid]').textContent;
    assert.match(names, /uBlock Origin/); assert.match(names, /StayFocusd/); assert.doesNotMatch(names, /Cold Turkey/);
    select(w, '#resource-pricing', 'open-source');
    assert.match(d.querySelector('[data-resource-grid]').textContent, /Privacy Badger/);
    assert.doesNotMatch(d.querySelector('[data-resource-grid]').textContent, /StayFocusd/);
  } finally { w.close(); }
});
test('directory filters, saves, resets and enforces three comparison items', async () => {
  const dom = await mount('pages/resources.html'); const w = dom.window, d = w.document;
  try {
    assert.equal(d.querySelectorAll('.resource-card').length, 10);
    assert.equal(d.querySelector('[data-compare-modal]').hidden, true);
    select(w, '#resource-category', 'focus'); assert.equal(d.querySelectorAll('.resource-card').length, 3);
    select(w, '#resource-platform', 'Android'); assert.equal(d.querySelectorAll('.resource-card').length, 1);
    d.querySelector('.save-toggle').click();
    d.querySelector('[data-reset-filters]').click();
    const saved = d.querySelector('#resource-saved'); saved.checked = true; saved.dispatchEvent(new w.Event('change'));
    assert.equal(d.querySelectorAll('.resource-card').length, 1);
    d.querySelector('.save-toggle').click(); assert.equal(d.querySelectorAll('.resource-card').length, 0);
    d.querySelector('[data-reset-filters]').click();
    const buttons = d.querySelectorAll('.compare-toggle'); for (let i = 0; i < 4; i++) buttons[i].click();
    assert.equal(d.querySelector('[data-compare-count]').textContent, '3');
    d.querySelector('[data-open-compare]').focus();
    d.querySelector('[data-open-compare]').click();
    const modal = d.querySelector('[data-compare-modal]'); assert.equal(modal.hidden, false);
    assert.equal(d.activeElement, d.querySelector('[data-close-compare]'));
    assert.equal(d.querySelector('main').inert, true);
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(modal.hidden, true); assert.equal(d.querySelector('main').inert, false);
    assert.equal(d.activeElement, d.querySelector('[data-open-compare]'));
  } finally { w.close(); }
});
test('unavailable or malformed browser storage does not break directory actions', async () => {
  for (const broken of [false, true]) {
    const dom = await mount('pages/resources.html', 'js/app.js', w => {
      if (broken) Object.defineProperty(w, 'localStorage', { get() { throw new Error('blocked'); } });
      else w.localStorage.setItem('dw-saved', '{}');
    });
    try { dom.window.document.querySelector('.save-toggle').click(); assert.equal(dom.window.document.querySelector('.save-toggle').getAttribute('aria-pressed'), 'true'); }
    finally { dom.window.close(); }
  }
});
test('recommendations respect goal, platform and free budget together', async () => {
  const dom = await mount('pages/recommendations.html'); const w = dom.window, d = w.document;
  try {
    select(w, '#quiz-goal', 'focus'); select(w, '#quiz-device', 'Windows'); select(w, '#quiz-budget', 'free');
    d.querySelector('[data-quiz]').dispatchEvent(new w.Event('submit', { cancelable: true }));
    assert.equal(d.querySelectorAll('.result-card').length, 0);
    assert.match(d.querySelector('[data-recommendation-results]').textContent, /No exact fit/);
    select(w, '#quiz-device', 'Chrome');
    d.querySelector('[data-quiz]').dispatchEvent(new w.Event('submit', { cancelable: true }));
    assert.equal(d.querySelectorAll('.result-card').length, 1); assert.match(d.querySelector('.result-card').textContent, /StayFocusd/);
  } finally { w.close(); }
});
test('feedback preserves input after network failure and blocks duplicate submits', async () => {
  const dom = await mount('pages/feedback.html'); const w = dom.window, d = w.document;
  try {
    let calls = 0, reject;
    w.fetch = () => { calls++; return new Promise((_, no) => { reject = no; }); };
    for (const id of ['ease', 'found', 'guide']) d.querySelector('#' + id).selectedIndex = 1;
    d.querySelector('#improve').value = 'The filter was useful.';
    const form = d.querySelector('form');
    form.dispatchEvent(new w.Event('submit', { cancelable: true })); form.dispatchEvent(new w.Event('submit', { cancelable: true }));
    assert.equal(calls, 1); assert.equal(d.querySelector('button[type=submit]').disabled, true);
    reject(new w.TypeError('offline')); await new Promise(resolve => setImmediate(resolve));
    assert.equal(d.querySelector('#improve').value, 'The filter was useful.'); assert.equal(d.querySelector('button[type=submit]').disabled, false);
    assert.match(d.querySelector('[data-form-success]').textContent, /could not be reached/);
  } finally { w.close(); }
});
test('feedback requires deliberate answers and focuses the first missing response', async () => {
  const dom = await mount('pages/feedback.html'); const w = dom.window, d = w.document;
  try {
    let calls = 0; w.fetch = () => { calls++; };
    for (const id of ['ease', 'found', 'guide']) assert.equal(d.querySelector('#' + id).value, '');
    d.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
    assert.equal(calls, 0); assert.equal(d.activeElement.id, 'ease');
    assert.equal(d.querySelector('#ease').getAttribute('aria-invalid'), 'true');
  } finally { w.close(); }
});
test('theme follows system initially, persists a choice, and survives blocked storage', async () => {
  for (const blocked of [false, true]) {
    const dom = new JSDOM(read('pages/focus.html'), { url: 'http://localhost/focus', runScripts: 'outside-only' });
    const w = dom.window, d = w.document; let change;
    try {
      w.matchMedia = () => ({ matches: true, addEventListener: (_, callback) => { change = callback; } });
      if (blocked) Object.defineProperty(w, 'localStorage', { get() { throw new Error('blocked'); } });
      w.eval(read('js/theme.js'));
      assert.equal(d.documentElement.dataset.theme, 'dark');
      d.dispatchEvent(new w.Event('DOMContentLoaded'));
      const toggle = d.querySelector('.theme-toggle'); assert.ok(toggle);
      assert.match(toggle.getAttribute('aria-label'), /light mode/);
      toggle.click(); assert.equal(d.documentElement.dataset.theme, 'light');
      if (!blocked) assert.equal(w.localStorage.getItem('good-signal-theme'), 'light');
      change(); assert.equal(d.documentElement.dataset.theme, 'light');
    } finally { w.close(); }
  }
  const dom = new JSDOM(read('pages/feedback.html'), { url: 'http://localhost/feedback', runScripts: 'outside-only' });
  try { dom.window.localStorage.setItem('good-signal-theme', 'dark'); dom.window.eval(read('js/theme.js')); assert.equal(dom.window.document.documentElement.dataset.theme, 'dark'); }
  finally { dom.window.close(); }
});
test('focus uses elapsed wall time, freezes while paused and saves partial sessions', async () => {
  const dom = await mount('pages/focus.html', 'js/focus.js'); const w = dom.window, d = w.document;
  try {
    let now = 100000, tick;
    w.Date.now = () => now; w.setInterval = cb => { tick = cb; return 1; }; w.clearInterval = () => {};
    const task = d.querySelector('#focus-task'); task.value = 'Read chapter 3';
    d.querySelector('[data-timer-start]').focus(); d.querySelector('[data-timer-start]').click(); assert.equal(task.disabled, true);
    assert.equal(d.activeElement, d.querySelector('[data-timer-pause]'));
    now += 125000; tick(); assert.equal(d.querySelector('[data-timer-display]').textContent, '22:55');
    d.querySelector('[data-timer-pause]').click(); now += 900000; tick();
    assert.equal(d.querySelector('[data-timer-display]').textContent, '22:55');
    d.querySelector('[data-timer-finish]').click();
    assert.equal(d.activeElement, d.querySelector('[data-timer-start]'));
    const sessions = JSON.parse(w.localStorage.getItem('good-signal-focus-sessions'));
    assert.equal(sessions.length, 1); assert.equal(sessions[0].completed, false); assert.equal(sessions[0].task, 'Read chapter 3');
    assert.equal(task.disabled, false);
  } finally { w.close(); }
});
test('focus completion transitions to break and history clearing requires confirmation', async () => {
  const dom = await mount('pages/focus.html', 'js/focus.js'); const w = dom.window, d = w.document;
  try {
    let now = 0, tick; w.Date.now = () => now; w.setInterval = cb => { tick = cb; return 1; }; w.clearInterval = () => {};
    d.querySelector('#focus-task').value = 'Practice'; d.querySelector('[data-timer-start]').click();
    now = 1500000; tick();
    assert.equal(d.querySelector('[data-focus-mode]').textContent, 'Break');
    assert.equal(d.querySelector('[data-timer-display]').textContent, '05:00');
    assert.equal(JSON.parse(w.localStorage.getItem('good-signal-focus-sessions'))[0].minutes, 25);
    d.querySelector('[data-history-clear]').click();
    assert.equal(JSON.parse(w.localStorage.getItem('good-signal-focus-sessions')).length, 1);
    d.querySelector('[data-history-clear-confirm]').click();
    assert.equal(JSON.parse(w.localStorage.getItem('good-signal-focus-sessions')).length, 0);
  } finally { w.close(); }
});
test('focus does not fabricate a minute for an immediate finish', async () => {
  const dom = await mount('pages/focus.html', 'js/focus.js'); const w = dom.window, d = w.document;
  try {
    w.Date.now = () => 0; w.setInterval = () => 1; w.clearInterval = () => {};
    d.querySelector('#focus-task').value = 'Start reading';
    assert.equal(d.querySelector('[data-distraction]').disabled, true);
    d.querySelector('[data-timer-start]').click(); d.querySelector('[data-timer-finish]').click();
    const sessions = JSON.parse(w.localStorage.getItem('good-signal-focus-sessions'));
    assert.equal(sessions[0].minutes, 0); assert.equal(sessions[0].seconds, 0);
  } finally { w.close(); }
});
test('mobile Today shows useful empty states and never invents usage history', () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  try {
    const w = dom.window, d = w.document;
    w.eval(read('mobile/dashboard.js'));
    assert.equal(d.querySelector('[data-total-usage]').textContent, '—');
    assert.match(d.querySelector('[data-usage-message]').textContent, /Android device/);
    assert.match(d.querySelector('[data-week-content]').textContent, /No usage history/);
    assert.equal(d.querySelector('[data-request-notifications]').hidden, false);
  } finally { dom.window.close(); }
});
test('mobile daily screen goal is local and progress appears only with real Android usage', async () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/', runScripts: 'outside-only' });
  try {
    const w = dom.window, d = w.document; let state = { usageGranted: false, notificationsGranted: false, today: { totalMs: 0, apps: [] }, week: [], reminder: { enabled: false, hour: 22, minute: 0 } };
    w.GoodSignalAndroid = { getWellnessState: () => state };
    w.eval(read('mobile/dashboard.js'));
    assert.equal(d.querySelector('[data-goal-progress]').hidden, true);
    d.querySelector('[data-goal-input]').value = '3'; d.querySelector('[data-goal-form]').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(w.localStorage.getItem('good-signal-screen-goal-v1'), '180');
    assert.match(d.querySelector('[data-goal-progress]').textContent, /Connect usage access/);
    state = { ...state, usageGranted: true, today: { totalMs: 90 * 60 * 1000, apps: [] } };
    w.dispatchEvent(new w.Event('goodsignal-native-update')); await new Promise(r => w.setTimeout(r, 220));
    assert.equal(d.querySelector('[data-goal-progress] [role=progressbar]').getAttribute('aria-valuenow'), '90');
    assert.match(d.querySelector('[data-goal-progress]').textContent, /1 hr 30 min of 3 hr/);
  } finally { dom.window.close(); }
});
test('mobile Android usage permission denial and empty real week are explicit', async () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/', runScripts: 'outside-only' });
  try {
    const w = dom.window, d = w.document; let opened = 0;
    w.GoodSignalAndroid = { getWellnessState: () => JSON.stringify({ usageGranted: false, notificationsGranted: false, today: { totalMs: 0, apps: [] }, week: [], reminder: { enabled: false, hour: 22, minute: 0 } }), openUsageSettings: () => opened++, requestNotifications() { return JSON.stringify({ ok: true, message: 'Permission requested.' }); }, openNotificationSettings() {} };
    w.eval(read('mobile/dashboard.js'));
    assert.equal(d.querySelector('[data-usage-state]').textContent, 'Access off');
    assert.match(d.querySelector('[data-week-content]').textContent, /Allow Usage Access/);
    assert.equal(d.querySelector('[data-total-usage]').textContent, '—');
    d.querySelector('[data-connect-usage]').click(); assert.equal(opened, 1);
    assert.equal(d.querySelector('[data-sleep-time]').value, '22:00');
    assert.match(d.querySelector('[data-notification-state]').textContent, /Notifications are off/);
    d.querySelector('[data-request-notifications]').click(); assert.match(d.querySelector('[data-sleep-message]').textContent, /Android will ask/);
  } finally { dom.window.close(); }
});
test('mobile usage uses native totals and accessible seven day rows, and refresh does not reopen settings', async () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/', runScripts: 'outside-only' });
  try {
    const w = dom.window, d = w.document; let opened = 0, total = 2 * 60 * 60 * 1000;
    w.localStorage.setItem('good-signal-sleep-v1', JSON.stringify({ enabled: false, time: '22:00' }));
    const day = new Date(), date = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    w.GoodSignalAndroid = { getWellnessState: () => ({ usageGranted: true, notificationsGranted: true, today: { totalMs: total, apps: [{ packageName: 'app', name: 'Reader', foregroundMs: total }] }, week: [{ date, totalMs: total }], reminder: { enabled: true, hour: 21, minute: 45 } }), openUsageSettings: () => opened++, openNotificationSettings() {} };
    w.eval(read('mobile/dashboard.js'));
    assert.equal(d.querySelector('[data-total-usage]').textContent, '2 hr 0 min');
    assert.match(d.querySelector('[data-week-content]').textContent, /2 hr 0 min/);
    assert.match(d.querySelector('[data-week-content] [role=list]').getAttribute('aria-label'), /last seven days/i);
    assert.match(d.querySelector('[data-apps-content]').textContent, /Reader/);
    assert.equal(d.querySelector('[data-sleep-time]').value, '21:45');
    assert.equal(d.querySelector('[data-sleep-enabled]').checked, true);
    d.querySelector('[data-connect-usage]').click(); assert.equal(opened, 0);
    d.querySelector('[data-sleep-time]').value = '20:15'; d.querySelector('[data-sleep-time]').dispatchEvent(new w.Event('input', { bubbles: true }));
    w.GoodSignalAndroid.getWellnessState = () => ({ usageGranted: true, notificationsGranted: false, today: { totalMs: total, apps: [] }, week: [], reminder: { enabled: false, hour: 18, minute: 30 } });
    w.dispatchEvent(new w.Event('goodsignal-native-update'));
    await new Promise(resolve => w.setTimeout(resolve, 220)); assert.equal(d.querySelector('[data-sleep-time]').value, '20:15'); assert.match(d.querySelector('[data-notification-state]').textContent, /off/);
  } finally { dom.window.close(); }
});
test('mobile usage query errors never render zero usage and clear after a successful refresh', async () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/', runScripts: 'outside-only' });
  try {
    const w = dom.window, d = w.document;
    let state = { usageGranted: true, notificationsGranted: true, error: 'Usage query failed.', today: { totalMs: 0, apps: [] }, week: [], reminder: { enabled: false, hour: 22, minute: 0 } };
    w.localStorage.setItem('good-signal-screen-goal-v1', '180');
    w.GoodSignalAndroid = { getWellnessState: () => state };
    w.eval(read('mobile/dashboard.js'));
    assert.equal(d.querySelector('[data-usage-state]').textContent, 'Access on');
    assert.equal(d.querySelector('[data-connect-usage]').textContent, 'Refresh screen time');
    assert.equal(d.querySelector('[data-manage-usage]').hidden, false);
    assert.equal(d.querySelector('[data-total-usage]').textContent, '—');
    assert.match(d.querySelector('[data-usage-caption]').textContent, /temporarily unavailable/);
    assert.match(d.querySelector('[data-week-content]').textContent, /Could not load/);
    assert.match(d.querySelector('[data-apps-content]').textContent, /temporarily unavailable/);
    assert.equal(d.querySelector('[data-goal-progress]').hidden, true);
    assert.match(d.querySelector('#goal-hint').textContent, /temporarily unavailable/);
    assert.equal(d.querySelector('[data-usage-message]').textContent, 'Usage query failed.');
    const today = new Date(), date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    state = { usageGranted: true, notificationsGranted: true, today: { totalMs: 10 * 60 * 1000, apps: [] }, week: [{ date, totalMs: 10 * 60 * 1000 }], reminder: { enabled: false, hour: 22, minute: 0 } };
    w.dispatchEvent(new w.Event('goodsignal-native-update')); await new Promise(resolve => w.setTimeout(resolve, 220));
    assert.equal(d.querySelector('[data-usage-message]').textContent, '');
    assert.equal(d.querySelector('[data-total-usage]').textContent, '10 min');
    assert.equal(d.querySelector('[data-week-content] [role=list]').getAttribute('aria-label'), 'Screen time for the last seven days');
  } finally { dom.window.close(); }
});
test('mobile habits persist local calendar check-ins, edit, confirm removal and recover malformed storage', () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/habits', runScripts: 'outside-only' });
  try {
    const w = dom.window, d = w.document, key = 'good-signal-habits-v1';
    w.confirm = () => false; w.eval(read('mobile/dashboard.js'));
    assert.equal(d.querySelector('[data-habits-view]').hidden, false);
    assert.equal(d.querySelector('[data-today-view]').hidden, true);
    assert.equal(d.querySelectorAll('[data-habit-id]').length, 0);
    const field = d.querySelector('#habit-title'); field.value = 'Drink water'; d.querySelector('[data-habit-form] button').click();
    assert.equal(d.querySelectorAll('[data-habit-id]').length, 1);
    assert.equal(d.activeElement, d.querySelector('#habit-title'));
    d.querySelector('[data-habit-check]').click();
    assert.equal(d.activeElement.matches('[data-habit-check]'), true);
    const saved = JSON.parse(w.localStorage.getItem(key)); assert.deepEqual(Object.values(saved[0].done), [true]);
    assert.match(d.querySelector('[data-habit-count]').textContent, /1 of 1/);
    assert.match(d.querySelector('[data-habit-week]').textContent, /1\/1/);
    d.querySelector('[data-edit]').click(); const edit = d.querySelector('.habit-edit-input'); edit.value = 'Drink more water'; edit.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.match(d.querySelector('[data-habit-list]').textContent, /Drink more water/);
    d.querySelector('[data-remove]').click(); assert.equal(d.querySelectorAll('[data-habit-id]').length, 1);
  } finally { dom.window.close(); }
  const bad = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/habits', runScripts: 'outside-only' });
  try { bad.window.localStorage.setItem('good-signal-habits-v1', '{broken'); bad.window.eval(read('mobile/dashboard.js')); assert.equal(bad.window.document.querySelectorAll('[data-habit-id]').length, 0); } finally { bad.window.close(); }
});
test('mobile habits remain usable when local storage is blocked and explain the temporary save', () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/habits', runScripts: 'outside-only' });
  try {
    const w = dom.window, d = w.document; Object.defineProperty(w, 'localStorage', { get() { throw new Error('blocked'); } });
    w.eval(read('mobile/dashboard.js'));
    const field = d.querySelector('#habit-title'); field.value = 'Stretch'; d.querySelector('[data-habit-form] button').click();
    assert.equal(d.querySelectorAll('[data-habit-id]').length, 1);
    assert.match(d.querySelector('[data-habit-status]').textContent, /only until you close/);
  } finally { dom.window.close(); }
});
test('mobile habit history advances at local midnight and keeps the current streak honest', () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/habits', runScripts: 'outside-only' });
  try {
    const w = dom.window, d = w.document; let now = new Date(2026, 10, 18, 23, 59).getTime();
    w.Date = class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    Object.defineProperty(d, 'hidden', { configurable: true, get: () => false });
    w.eval(read('mobile/dashboard.js'));
    const field = d.querySelector('#habit-title'); field.value = 'Read'; d.querySelector('[data-habit-form] button').click(); d.querySelector('[data-habit-check]').click();
    assert.match(d.querySelector('[data-habit-count]').textContent, /1 of 1/);
    now += 2 * 60 * 1000; d.dispatchEvent(new w.Event('visibilitychange'));
    assert.match(d.querySelector('[data-habit-count]').textContent, /0 of 1/);
    assert.match(d.querySelector('[data-habit-list]').textContent, /1 day in a row/);
  } finally { dom.window.close(); }
});
test('mobile bottom tabs fit five columns and expose the active route accessibly', () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/habits', runScripts: 'outside-only' });
  try {
    const w = dom.window, d = w.document; w.eval(read('mobile/mobile.js'));
    const tabs = [...d.querySelectorAll('.mobile-bottom-nav a')];
    assert.deepEqual(tabs.map(a => a.textContent.trim()), ['Today', 'Explore', 'Focus', 'Habits', 'Guides']);
    assert.equal(tabs.filter(a => a.getAttribute('aria-current') === 'page').length, 1);
    assert.equal(tabs.find(a => a.getAttribute('aria-current') === 'page').getAttribute('href'), '/habits');
    assert.match(read('mobile/mobile.css'), /grid-template-columns:\s*repeat\(5,/);
    assert.match(read('mobile/dashboard.css'), /--card:var\(--surface\)/);
  } finally { dom.window.close(); }
});
test('mobile reminder saves call native bridge and show its success or failure', async () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url: 'http://localhost/', runScripts: 'outside-only' });
  try {
    const w = dom.window, d = w.document; let args, outcome = { ok: true, message: 'Saved by Android.' }, requested = 0;
    w.GoodSignalAndroid = { getWellnessState: () => ({ usageGranted: false, notificationsGranted: false, today: { totalMs: 0, apps: [] }, week: [], reminder: { enabled: false, hour: 22, minute: 0 } }), saveSleepReminder: (...a) => { args = a; return JSON.stringify(outcome); }, sendTestNotification: () => JSON.stringify(outcome), requestNotifications: () => { requested++; return JSON.stringify(outcome); }, openNotificationSettings() {} };
    w.eval(read('mobile/dashboard.js'));
    d.querySelector('[data-sleep-enabled]').checked = true; d.querySelector('[data-sleep-time]').value = '20:35'; d.querySelector('[data-sleep-time]').dispatchEvent(new w.Event('input', { bubbles: true }));
    d.querySelector('[data-save-sleep]').click(); await new Promise(r => w.setTimeout(r, 0));
    assert.deepEqual(args, [true, 20, 35]); assert.equal(d.querySelector('[data-sleep-message]').textContent, 'Saved by Android.');
    outcome = { ok: false, message: 'Notification channel is blocked.' };
    d.querySelector('[data-test-notification]').click(); await new Promise(r => w.setTimeout(r, 0)); assert.match(d.querySelector('[data-sleep-message]').textContent, /channel is blocked/);
    d.querySelector('[data-request-notifications]').click(); await new Promise(r => w.setTimeout(r, 0)); assert.equal(requested, 1);
  } finally { dom.window.close(); }
});
test('menu opens and Escape restores its closed state', async () => {
  const dom = await mount('pages/resources.html'); const w = dom.window, d = w.document;
  try {
    const button = d.querySelector('.menu-toggle'); button.click();
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(d.activeElement, button);
    assert.equal(d.querySelector('a[aria-current=page]').getAttribute('href'), '/explore');
  } finally { w.close(); }
});

test('mobile restricted-settings recovery is conditional, user driven, and rechecks native access', () => {
  const dom = new JSDOM(read('mobile/dashboard.html'), { url:'http://localhost/', runScripts:'outside-only' });
  try {
    const w=dom.window,d=w.document; let appInfo=0,settings=0;
    let state={usageGranted:false,usageStatus:'needs_access',restrictedSettingsMayApply:true,usageRecoveryAction:'usage_settings',usageMessage:'Choose Good Signal in Usage access.'};
    w.GoodSignalAndroid={getWellnessState:()=>state,openAppSettings:()=>appInfo++,openUsageSettings:()=>settings++};
    w.eval(read('mobile/dashboard.js'));
    assert.equal(d.querySelector('[data-permission-help]').hidden,false);
    assert.match(d.querySelector('[data-permission-help]').textContent,/if shown/);
    assert.match(d.querySelector('[data-permission-help]').textContent,/School or work/);
    assert.equal(appInfo,0); assert.equal(settings,0);
    d.querySelector('[data-open-app-info]').click(); assert.equal(appInfo,1); assert.equal(settings,0);
    d.querySelector('[data-recheck-usage]').click(); assert.equal(d.querySelector('[data-total-usage]').textContent,'—');
    state={usageGranted:true,usageStatus:'ready',today:{totalMs:120000,apps:[]},week:[]};
    d.querySelector('[data-recheck-usage]').click();
    assert.equal(d.querySelector('[data-permission-help]').hidden,true);
    assert.equal(d.querySelector('[data-total-usage]').textContent,'2 min');
    assert.equal(settings,0);
  } finally { dom.window.close(); }
});

test('mobile unavailable and locked states refresh rather than reopening permission settings', () => {
  for(const usageStatus of ['locked','unavailable']) {
    const dom=new JSDOM(read('mobile/dashboard.html'),{url:'http://localhost/',runScripts:'outside-only'});
    try {
      const w=dom.window,d=w.document;let opened=0;
      w.localStorage.setItem('good-signal-screen-goal-v1','180');
      w.GoodSignalAndroid={getWellnessState:()=>({usageGranted:usageStatus==='locked',usageStatus,usageRecoveryAction:usageStatus==='locked'?'unlock_device':'retry',usageMessage:'Try again later.',today:{totalMs:0,apps:[]},week:[]}),openUsageSettings:()=>opened++};
      w.eval(read('mobile/dashboard.js'));d.querySelector('[data-connect-usage]').click();
      assert.equal(opened,0);assert.equal(d.querySelector('[data-total-usage]').textContent,'—');
      assert.equal(d.querySelector('[data-permission-help]').hidden,true);assert.equal(d.querySelector('[data-goal-progress]').hidden,true);
    } finally {dom.window.close();}
  }
});

test('mobile usage chart selects real days and app list expands without changing totals', () => {
  const dom=new JSDOM(read('mobile/dashboard.html'),{url:'http://localhost/',runScripts:'outside-only'});
  try {
    const w=dom.window,d=w.document;
    w.GoodSignalAndroid={getWellnessState:()=>({usageGranted:true,today:{totalMs:3600000,apps:Array.from({length:6},(_,i)=>({name:i===5?'<Unsafe name>':'App '+i,foregroundMs:(6-i)*60000}))},week:[{date:'2026-11-17',totalMs:120000},{date:'2026-11-18',totalMs:3600000}]})};
    w.eval(read('mobile/dashboard.js'));
    const first=d.querySelector('[data-usage-day]');first.click();
    assert.equal(d.querySelector('[data-usage-day]').getAttribute('aria-pressed'),'true');
    assert.match(d.querySelector('[data-selected-day]').textContent,/2 min/);
    assert.equal(d.querySelector('[data-total-usage]').textContent,'1 hr 0 min');
    assert.equal(d.querySelectorAll('.app-list li').length,3);d.querySelector('[data-apps-toggle]').click();
    assert.equal(d.querySelectorAll('.app-list li').length,6);assert.equal(d.querySelector('[data-apps-toggle]').getAttribute('aria-expanded'),'true');
    assert.match(d.querySelector('[data-apps-content]').textContent,/<Unsafe name>/);assert.equal(d.querySelector('unsafe'),null);
    d.querySelector('[data-apps-toggle]').click();assert.equal(d.querySelectorAll('.app-list li').length,3);
  }finally{dom.window.close();}
});

test('mobile native bars follow persisted and changed theme on every route', async () => {
  const dom=new JSDOM(read('pages/resources.html'),{url:'http://localhost/explore',runScripts:'outside-only'});
  try {
    const w=dom.window,d=w.document,calls=[];d.documentElement.dataset.theme='dark';
    w.GoodSignalAndroid={setSystemTheme:dark=>calls.push(dark)};w.eval(read('mobile/mobile.js'));
    assert.deepEqual(calls,[true]);d.documentElement.dataset.theme='light';await new Promise(r=>w.setTimeout(r,0));
    assert.deepEqual(calls,[true,false]);
    assert.equal(d.querySelector('h1').textContent,'Explore');
    assert.equal(d.querySelector('.mobile-bottom-nav a[aria-current=page]').getAttribute('href'),'/explore');
  }finally{dom.window.close();}
});

test('mobile habit history selection and suggestions keep check-ins honest and avoid duplicate habits', () => {
  const dom=new JSDOM(read('mobile/dashboard.html'),{url:'http://localhost/habits',runScripts:'outside-only'});
  try {
    const w=dom.window,d=w.document;w.eval(read('mobile/dashboard.js'));
    d.querySelector('[data-suggestion]').click();assert.equal(d.querySelectorAll('[data-habit-id]').length,1);
    assert.equal(d.querySelector('[data-suggestion]').disabled,true);d.querySelector('[data-suggestion]').click();assert.equal(d.querySelectorAll('[data-habit-id]').length,1);
    d.querySelector('[data-habit-check]').click();assert.equal(d.querySelector('[data-habit-completion]').getAttribute('aria-valuenow'),'1');
    d.querySelector('[data-habit-day]').click();assert.match(d.querySelector('[data-habit-day-detail]').textContent,/No check-ins recorded/);
    assert.equal(d.querySelector('[data-habit-day]').getAttribute('aria-pressed'),'true');assert.equal(d.querySelector('[data-habit-check]').checked,true);
  }finally{dom.window.close();}
});

test('mobile More menu closes on outside press and Escape without duplicate app bars', () => {
  const dom=new JSDOM(read('mobile/dashboard.html'),{url:'http://localhost/',runScripts:'outside-only'});
  try {
    const w=dom.window,d=w.document;w.eval(read('mobile/mobile.js'));
    assert.equal(d.querySelectorAll('.app-header').length,1);assert.equal(d.querySelectorAll('.dash-header,.site-header').length,0);
    assert.equal(d.querySelectorAll('.app-header .theme-toggle').length,1);
    const more=d.querySelector('.app-more'),summary=more.querySelector('summary');more.open=true;
    d.body.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(more.open,false);
    more.open=true;d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(more.open,false);assert.equal(d.activeElement,summary);
    assert.deepEqual([...more.querySelectorAll('a')].map(a=>a.getAttribute('href')),['/find','/safety','/about']);
  }finally{dom.window.close();}
});

test('mobile category chips filter actual resources and progressive filters keep original listeners', async () => {
  const dom=await mount('pages/resources.html');
  try {
    const w=dom.window,d=w.document;w.history.replaceState(null,'','/explore');w.eval(read('mobile/mobile.js'));
    const filters=d.querySelector('.app-filters');assert.equal(filters.open,false);assert.ok(filters.contains(d.querySelector('#resource-platform')));
    const allOptions=[...d.querySelector('#resource-category').options].map(option=>option.value);
    const chips=[...d.querySelectorAll('[data-mobile-category]')];assert.deepEqual(chips.map(button=>button.dataset.mobileCategory),allOptions);
    for(const button of chips){button.click();const category=button.dataset.mobileCategory;const expected=w.DW_RESOURCES.filter(r=>!category||r.category===category).length;
      assert.equal(d.querySelectorAll('.resource-card').length,expected);assert.equal(button.getAttribute('aria-pressed'),'true');}
    d.querySelector('[data-mobile-category="focus"]').click();select(w,'#resource-platform','Android');assert.equal(d.querySelectorAll('.resource-card').length,1);
    assert.match(d.querySelector('[data-filter-summary]').textContent,/Android/);
    d.querySelector('[data-reset-filters]').click();await new Promise(r=>w.setTimeout(r,10));
    assert.equal(d.querySelectorAll('.resource-card').length,10);assert.equal(d.querySelector('[data-mobile-category=""]').getAttribute('aria-pressed'),'true');
  }finally{dom.window.close();}
});

test('mobile focus relocation preserves task, duration, start and pause controls', async () => {
  const dom=await mount('pages/focus.html','js/focus.js');
  try {
    const w=dom.window,d=w.document;w.history.replaceState(null,'','/focus');const originalTask=d.querySelector('#focus-task'),originalDuration=d.querySelector('[data-duration="45"]');w.eval(read('mobile/mobile.js'));
    assert.equal(d.querySelector('.app-focus-setup #focus-task'),originalTask);assert.equal(d.querySelector('.app-focus-setup [data-duration="45"]'),originalDuration);
    assert.ok(d.querySelector('.app-focus-options #break-length'));assert.equal(d.querySelector('.app-focus-options').open,false);
    originalTask.value='Read one chapter';originalDuration.click();assert.equal(d.querySelector('[data-timer-display]').textContent,'45:00');
    d.querySelector('[data-timer-start]').click();assert.equal(d.querySelector('[data-timer-pause]').hidden,false);assert.match(d.querySelector('[data-timer-task]').textContent,/Read one chapter/);
    d.querySelector('[data-timer-pause]').click();assert.match(d.querySelector('[data-focus-status]').textContent,/paused/i);
    await new Promise(r=>w.setTimeout(r,0));assert.equal(d.querySelector('#timer-title').textContent,'Session paused');assert.equal(d.querySelector('[data-timer-pause]').classList.contains('is-resume'),true);
    d.querySelector('[data-timer-pause]').click();await new Promise(r=>w.setTimeout(r,0));assert.equal(d.querySelector('#timer-title').textContent,'Focus in progress');assert.equal(d.querySelector('[data-timer-pause]').classList.contains('is-resume'),false);
  }finally{dom.window.close();}
});

test('mobile habit inline edit validates, cancels safely, saves explicitly and restores focus', () => {
  const dom=new JSDOM(read('mobile/dashboard.html'),{url:'http://localhost/habits',runScripts:'outside-only'});
  try {
    const w=dom.window,d=w.document;w.eval(read('mobile/dashboard.js'));d.querySelector('#habit-title').value='Read tonight';d.querySelector('[data-habit-form] button').click();
    d.querySelector('[data-edit]').click();let field=d.querySelector('.habit-edit-input');field.value='x';d.querySelector('[data-habit-save]').click();assert.equal(field.getAttribute('aria-invalid'),'true');assert.equal(d.activeElement,field);
    d.querySelector('[data-habit-cancel]').click();assert.equal(d.querySelector('[data-title]').textContent,'Read tonight');assert.equal(d.activeElement,d.querySelector('[data-edit]'));
    d.querySelector('[data-edit]').click();d.querySelector('.habit-edit-input').value='Read before bed';d.querySelector('[data-habit-save]').click();assert.equal(d.querySelector('[data-title]').textContent,'Read before bed');assert.equal(d.activeElement,d.querySelector('[data-edit]'));
  }finally{dom.window.close();}
});
