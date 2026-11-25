const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'pages/focus.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js/focus.js'), 'utf8');
const activeKey = 'good-signal-focus-active-v1';
const historyKey = 'good-signal-focus-sessions';

function mount(storage = new Map(), initialTime = 1000000, blocked = false) {
  const dom = new JSDOM(html, { url: 'https://appassets.androidplatform.net/focus', runScripts: 'outside-only' });
  const w = dom.window, d = w.document;
  let now = initialTime, nextId = 0;
  const intervals = new Map();
  const errors = [];
  w.addEventListener('error', e => errors.push(e.error));
  Object.defineProperty(w, 'localStorage', { value: {
    getItem(key) { if (blocked) throw Error('blocked'); return storage.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error('blocked'); storage.set(key, String(value)); },
    removeItem(key) { if (blocked) throw Error('blocked'); storage.delete(key); }
  } });
  w.Date.now = () => now;
  w.setInterval = callback => { const id = ++nextId; intervals.set(id, callback); return id; };
  w.clearInterval = id => intervals.delete(id);
  w.confirm = () => true;
  w.eval(script);
  const click = selector => d.querySelector(selector).click();
  return { w, d, storage, errors, click, close: () => w.close(),
    advance(ms) { now += ms; for (const callback of [...intervals.values()]) callback(); },
    begin() { d.querySelector('#focus-task').value = 'Read chapter 3'; click('[data-timer-start]'); },
    time: () => d.querySelector('[data-timer-display]').textContent,
    sessions: () => JSON.parse(storage.get(historyKey) || '[]'),
    active: () => JSON.parse(storage.get(activeKey) || 'null')
  };
}

test('running focus survives navigation/process recreation using its absolute deadline', () => {
  const store = new Map();
  let app = mount(store);
  app.begin();
  const id = app.active().id;
  app.click('[data-distraction]');
  app.advance(65000);
  app.close();
  app = mount(store, 1000000 + 125000);
  try {
    assert.equal(app.time(), '22:55');
    assert.equal(app.active().id, id);
    assert.equal(app.d.querySelector('#focus-task').value, 'Read chapter 3');
    assert.equal(app.d.querySelector('#focus-task').disabled, true);
    assert.equal(app.d.querySelector('[data-distraction-count]').textContent, '1');
    assert.equal(app.d.querySelector('[data-timer-pause]').hidden, false);
    const unload = new app.w.Event('beforeunload', { cancelable: true });
    app.w.dispatchEvent(unload);
    assert.equal(unload.defaultPrevented, false);
  } finally { app.close(); }
});

test('paused focus stays frozen over reload and resumes from its saved remaining time', () => {
  const store = new Map(); let app = mount(store);
  app.begin(); app.advance(125000); app.click('[data-timer-pause]'); app.close();
  app = mount(store, 1000000 + 900000);
  try {
    assert.equal(app.time(), '22:55');
    assert.equal(app.d.querySelector('[data-timer-pause]').textContent, 'Resume');
    app.advance(300000); assert.equal(app.time(), '22:55');
    app.click('[data-timer-pause]'); app.advance(60000); assert.equal(app.time(), '21:55');
    app.click('[data-timer-finish]');
    assert.equal(app.sessions().length, 1);
    assert.equal(app.sessions()[0].seconds, 185);
    assert.equal(app.sessions()[0].completed, false);
    assert.equal(app.active(), null);
  } finally { app.close(); }
});

test('expired focus records completion once, including replay after a process death between writes', () => {
  const store = new Map(); let app = mount(store);
  app.begin(); const interruptedSnapshot = store.get(activeKey); app.close();
  app = mount(store, 1000000 + 1800000);
  assert.equal(app.sessions().length, 1);
  assert.equal(app.sessions()[0].completed, true);
  assert.equal(app.sessions()[0].seconds, 1500);
  assert.equal(app.d.querySelector('[data-focus-mode]').textContent, 'Break');
  assert.equal(app.time(), '05:00'); app.close();
  // Simulate history being committed before Android kills the mode-transition write.
  store.set(activeKey, interruptedSnapshot);
  app = mount(store, 1000000 + 1900000);
  try {
    assert.equal(app.sessions().length, 1);
    app.advance(900000); assert.equal(app.sessions().length, 1);
  } finally { app.close(); }
});

test('break timer and a just-paused break restore without auto-starting a ready break', () => {
  const store = new Map(); let app = mount(store);
  app.begin(); app.advance(1500000); app.close();
  app = mount(store, 3000000);
  assert.equal(app.time(), '05:00');
  assert.equal(app.d.querySelector('[data-timer-start]').hidden, false);
  app.click('[data-timer-start]'); app.click('[data-timer-pause]'); app.close();
  app = mount(store, 4000000);
  assert.equal(app.time(), '05:00');
  assert.equal(app.d.querySelector('[data-timer-pause]').textContent, 'Resume');
  app.click('[data-timer-pause]'); app.close();
  app = mount(store, 4060000);
  try {
    assert.equal(app.time(), '04:00');
    app.advance(240000);
    assert.equal(app.d.querySelector('[data-focus-mode]').textContent, 'Focus');
    assert.equal(app.active(), null);
    assert.equal(app.sessions().length, 1);
  } finally { app.close(); }
});

test('discard removes restoration state and cancelled reset keeps it', () => {
  const store = new Map(); let app = mount(store); app.begin();
  app.w.confirm = () => false; app.click('[data-timer-reset]'); assert.ok(app.active());
  app.w.confirm = () => true; app.click('[data-timer-reset]');
  assert.equal(app.active(), null); app.close();
  app = mount(store, 5000000);
  try { assert.equal(app.time(), '25:00'); assert.equal(app.sessions().length, 0); }
  finally { app.close(); }
});

test('malformed/untrusted snapshots are discarded and task markup remains text', () => {
  for (const raw of ['{', '[]', '{"version":99}', '{"version":1,"id":"bad","mode":"focus","running":true,"deadline":1e300}']) {
    const app = mount(new Map([[activeKey, raw]]));
    try { assert.equal(app.time(), '25:00'); assert.deepEqual(app.errors, []); }
    finally { app.close(); }
  }
  const store = new Map(); let app = mount(store);
  app.d.querySelector('#focus-task').value = '<img src=x onerror=alert(1)>';
  app.click('[data-timer-start]'); app.close(); app = mount(store, 1060000);
  try {
    assert.equal(app.d.querySelector('[data-timer-task] img'), null);
    assert.match(app.d.querySelector('[data-timer-task]').textContent, /<img/);
  } finally { app.close(); }
});

test('blocked storage preserves in-page timer, warns before leaving and fails history gracefully', () => {
  const app = mount(new Map(), 1000000, true);
  try {
    app.begin(); app.advance(60000); assert.equal(app.time(), '24:00');
    assert.match(app.d.querySelector('[data-focus-status]').textContent, /cannot save the active timer/);
    const unload = new app.w.Event('beforeunload', { cancelable: true }); app.w.dispatchEvent(unload);
    assert.equal(unload.defaultPrevented, true);
    app.click('[data-timer-pause]'); app.advance(60000); assert.equal(app.time(), '24:00');
    app.click('[data-timer-finish]');
    assert.match(app.d.querySelector('[data-focus-status]').textContent, /could not save/);
    assert.deepEqual(app.errors, []);
  } finally { app.close(); }
});

test('back-forward cache refreshes from storage and does not resurrect a discarded block', () => {
  const store = new Map(), app = mount(store);
  try {
    app.begin(); store.delete(activeKey);
    const event = new app.w.Event('pageshow'); Object.defineProperty(event, 'persisted', { value: true });
    app.w.dispatchEvent(event);
    assert.equal(app.time(), '25:00'); assert.equal(app.active(), null);
    assert.equal(app.d.querySelector('#focus-task').disabled, false);
  } finally { app.close(); }
});
