(function () {
  const $ = (selector) => document.querySelector(selector);
  const display = $('[data-timer-display]');
  if (!display) return;

  const startButton = $('[data-timer-start]');
  const pauseButton = $('[data-timer-pause]');
  const finishButton = $('[data-timer-finish]');
  const resetButton = $('[data-timer-reset]');
  const distractionButton = $('[data-distraction]');
  const status = $('[data-focus-status]');
  const taskInput = $('#focus-task');
  const breakSelect = $('#break-length');
  const modeLabel = $('[data-focus-mode]');
  const timerLabel = $('[data-timer-label]');
  const timerTask = $('[data-timer-task]');
  const distractionCount = $('[data-distraction-count]');
  const ring = $('[data-timer-ring]');
  const history = $('[data-session-history]');
  const todayTotal = $('[data-today-total]');
  const todayBar = $('[data-today-bar]');
  const todaySummary = $('[data-today-summary]');
  const durationButtons = Array.from(document.querySelectorAll('[data-duration]'));
  const setupControls = [taskInput, breakSelect, ...durationButtons].filter(Boolean);

  const STORAGE_KEY = 'good-signal-focus-sessions';
  const ACTIVE_KEY = 'good-signal-focus-active-v1';
  let focusMinutes = 25;
  let breakMinutes = Number(breakSelect && breakSelect.value) || 5;
  let mode = 'focus';
  let totalSeconds = focusMinutes * 60;
  let remainingSeconds = totalSeconds;
  let deadline = null;
  let timerId = null;
  let distractions = 0;
  let sessionStarted = false;
  let historyClearPending = false;
  let sessionId = null;
  let persistenceOkay = true;

  function newSessionId() {
    return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function persistActive() {
    try {
      if (!sessionStarted && mode !== 'break') {
        window.localStorage.removeItem(ACTIVE_KEY);
      } else {
        window.localStorage.setItem(ACTIVE_KEY, JSON.stringify({
          version: 1, id: sessionId, mode, focusMinutes, breakMinutes,
          totalSeconds, remainingSeconds, deadline, distractions,
          task: taskInput.value.trim(), running: deadline !== null,
          paused: pauseButton.textContent === 'Resume' && !pauseButton.hidden
        }));
      }
      persistenceOkay = true;
    } catch (_) {
      persistenceOkay = false;
    }
    return persistenceOkay;
  }

  function restoreActive() {
    let state;
    try { state = JSON.parse(window.localStorage.getItem(ACTIVE_KEY) || 'null'); }
    catch (_) { return false; }
    if (!state) return false;
    const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
    const valid = state.version === 1 && typeof state.id === 'string' && state.id.length > 0 && state.id.length <= 128 &&
      ['focus', 'break'].includes(state.mode) && typeof state.task === 'string' && state.task.trim().length > 0 && state.task.length <= 2000 &&
      integer(state.focusMinutes, 1, 180) && integer(state.breakMinutes, 1, 60) &&
      state.totalSeconds === (state.mode === 'focus' ? state.focusMinutes : state.breakMinutes) * 60 &&
      integer(state.remainingSeconds, 0, state.totalSeconds) && integer(state.distractions, 0, 1000000) &&
      typeof state.paused === 'boolean' && !(state.running && state.paused) && typeof state.running === 'boolean' && (state.running
        ? Number.isFinite(state.deadline) && state.deadline >= 0 && state.deadline <= Date.now() + state.totalSeconds * 1000
        : state.deadline === null);
    if (!valid) {
      try { window.localStorage.removeItem(ACTIVE_KEY); } catch (_) { }
      return false;
    }
    stopTimer();
    sessionId = state.id;
    mode = state.mode;
    focusMinutes = state.focusMinutes;
    breakMinutes = state.breakMinutes;
    totalSeconds = state.totalSeconds;
    remainingSeconds = state.remainingSeconds;
    distractions = state.distractions;
    taskInput.value = state.task;
    if (breakSelect) breakSelect.value = String(breakMinutes);
    if (distractionCount) distractionCount.textContent = String(distractions);
    durationButtons.forEach((button) => {
      const selected = Number(button.dataset.duration) === focusMinutes;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    sessionStarted = mode === 'focus';
    setSetupLocked(true);
    startButton.textContent = mode === 'break' ? `Start ${breakMinutes}-minute break` : 'Start session';
    if (state.running) {
      setRunning(true);
      runClock(state.deadline);
      if (deadline !== null) setStatus(mode === 'break' ? 'Break restored.' : 'Focus session restored. Your time kept running.');
    } else if (state.paused || mode === 'focus') {
      showPaused();
      setStatus('Paused session restored. Resume when you are ready.');
    } else {
      setRunning(false);
      setStatus('Focus block complete. Your break is ready when you are.');
    }
    updateTimer();
    return true;
  }

  function readSessions() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const value = JSON.parse(raw || '[]');
      if (!Array.isArray(value)) return [];
      return value.filter((item) => item && typeof item === 'object' &&
        typeof item.date === 'string' && typeof item.day === 'string' &&
        typeof item.task === 'string' && Number.isFinite(Number(item.minutes)) &&
        Number.isFinite(Number(item.plannedMinutes)));
    } catch (_) {
      return [];
    }
  }

  function writeSessions(sessions) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 30)));
      return true;
    } catch (_) {
      return false;
    }
  }

  function todayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainder = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  function updateTimer() {
    display.textContent = formatTime(Math.max(0, remainingSeconds));
    const progress = totalSeconds ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100)) : 0;
    if (ring) ring.style.setProperty('--timer-progress', `${progress}%`);
    if (timerTask) timerTask.textContent = mode === 'break' ? 'Step away. Let your brain reset.' : (taskInput.value.trim() || 'Choose one task below.');
    if (modeLabel) modeLabel.textContent = mode === 'break' ? 'Break' : 'Focus';
    if (timerLabel) timerLabel.textContent = mode === 'break' ? 'Break time' : 'Focus time';
    if (distractionButton) distractionButton.hidden = mode === 'break';
    if (distractionCount && distractionCount.parentElement) distractionCount.parentElement.hidden = mode === 'break';
  }

  function setStatus(message) {
    if (status) status.textContent = message + (!persistenceOkay && (sessionStarted || mode === 'break')
      ? ' This browser cannot save the active timer. Keep this page open to retain it.' : '');
  }

  function setSetupLocked(locked) {
    setupControls.forEach((control) => { control.disabled = locked; });
  }

  function setRunning(running) {
    startButton.hidden = running;
    pauseButton.hidden = !running;
    finishButton.hidden = !running || mode !== 'focus';
    pauseButton.textContent = 'Pause';
    if (distractionButton) distractionButton.disabled = !running || mode !== 'focus';
  }

  function stopTimer() {
    if (timerId !== null) window.clearInterval(timerId);
    timerId = null;
    deadline = null;
    setRunning(false);
  }

  function tick() {
    if (deadline === null) return;
    remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    updateTimer();
    if (remainingSeconds <= 0) finishCurrentMode();
  }

  function runClock(restoredDeadline) {
    deadline = restoredDeadline ?? Date.now() + remainingSeconds * 1000;
    persistActive();
    timerId = window.setInterval(tick, 250);
    tick();
  }

  function startTimer() {
    if (mode === 'focus' && !taskInput.value.trim()) {
      taskInput.focus();
      setStatus('Name one task first, so this block has somewhere to go.');
      return;
    }
    if (mode === 'focus') {
      if (!sessionStarted) sessionId = newSessionId();
      sessionStarted = true;
      setSetupLocked(true);
    }
    stopTimer();
    setRunning(true);
    pauseButton.focus();
    runClock();
    if (deadline !== null) setStatus(mode === 'break' ? 'Break started. Leave the screen if you can.' : 'Session started. One task is enough.');
  }

  function showPaused() {
    pauseButton.textContent = 'Resume';
    pauseButton.hidden = false;
    startButton.hidden = true;
    finishButton.hidden = mode !== 'focus';
    if (distractionButton) distractionButton.disabled = true;
  }

  function pauseTimer() {
    if (timerId === null) return;
    remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (timerId !== null) window.clearInterval(timerId);
    timerId = null;
    deadline = null;
    updateTimer();
    showPaused();
    persistActive();
    setStatus('Paused. Resume when you are ready, or reset to choose a new block.');
    if (remainingSeconds === 0) finishCurrentMode();
  }

  function resetTimer() {
    stopTimer();
    mode = 'focus';
    totalSeconds = focusMinutes * 60;
    remainingSeconds = totalSeconds;
    distractions = 0;
    sessionStarted = false;
    sessionId = null;
    persistActive();
    if (distractionCount) distractionCount.textContent = '0';
    startButton.textContent = 'Start session';
    startButton.hidden = false;
    pauseButton.hidden = true;
    finishButton.hidden = true;
    setSetupLocked(false);
    setStatus('A small block is enough to start.');
    updateTimer();
  }

  function finishCurrentMode() {
    const focusWasInControls = document.activeElement === pauseButton || document.activeElement === finishButton;
    stopTimer();
    if (mode === 'break') {
      resetTimer();
      if (focusWasInControls) startButton.focus();
      setStatus('Break complete. You can start another focus block when you are ready.');
      return;
    }
    const saved = saveSession(true);
    mode = 'break';
    totalSeconds = breakMinutes * 60;
    remainingSeconds = totalSeconds;
    sessionStarted = false;
    persistActive();
    setSetupLocked(true);
    startButton.textContent = `Start ${breakMinutes}-minute break`;
    startButton.hidden = false;
    pauseButton.hidden = true;
    finishButton.hidden = true;
    if (focusWasInControls) startButton.focus();
    setStatus(saved ? 'Focus block complete. Take the break - it is part of the work.' : 'Focus block complete, but this browser could not save it to your history.');
    updateTimer();
  }

  function finishEarly() {
    if (!sessionStarted || mode !== 'focus') return;
    if (timerId !== null) {
      remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (timerId !== null) window.clearInterval(timerId);
      timerId = null;
      deadline = null;
    }
    const saved = saveSession(false);
    resetTimer();
    startButton.focus();
    setStatus(saved ? 'Saved as a partial session. That still counts as useful information.' : 'Session ended, but this browser could not save it to your history.');
  }

  function saveSession(completed) {
    const elapsedSeconds = Math.max(0, totalSeconds - remainingSeconds);
    const sessions = readSessions();
    // History is committed first. If the process dies before the mode transition,
    // replaying the same active snapshot cannot append the completion a second time.
    if (sessionId && sessions.some((session) => session.id === sessionId)) return true;
    sessions.unshift({
      id: sessionId,
      date: new Date().toISOString(),
      day: todayKey(),
      task: taskInput.value.trim() || 'Untitled session',
      seconds: elapsedSeconds,
      minutes: Math.floor(elapsedSeconds / 60),
      plannedMinutes: focusMinutes,
      completed,
      distractions
    });
    const stored = writeSessions(sessions);
    renderHistory();
    return stored;
  }

  function renderHistory() {
    const sessions = readSessions();
    const today = sessions.filter((session) => session.day === todayKey());
    const total = today.reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);
    if (todayTotal) todayTotal.textContent = `${total} min`;
    if (todayBar) todayBar.style.width = `${Math.min(100, (total / 120) * 100)}%`;
    if (todaySummary) todaySummary.textContent = total ? `${today.length} block${today.length === 1 ? '' : 's'} logged today. A 2-hour goal is only a guide, not a rule.` : 'Complete one focus block to start your record.';
    if (!history) return;
    if (!sessions.length) {
      history.innerHTML = '<div class="empty-state"><strong>No sessions yet.</strong><p>Your first completed or partial block will appear here.</p></div>';
      return;
    }
    history.innerHTML = sessions.slice(0, 8).map((session) => {
      const parsedDate = new Date(session.date);
      const time = Number.isNaN(parsedDate.getTime()) ? 'Date unavailable' : parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const state = session.completed ? 'Completed' : 'Partial';
      const seconds = Number.isFinite(Number(session.seconds)) ? Math.max(0, Number(session.seconds)) : Math.max(0, Number(session.minutes) || 0) * 60;
      const duration = seconds < 60 ? `${seconds} sec` : `${Math.floor(seconds / 60)} min`;
      return `<article class="session-row"><div class="session-status ${session.completed ? 'is-complete' : ''}">${session.completed ? '✓' : '·'}</div><div><strong>${escapeHtml(session.task)}</strong><span>${time} · ${duration} · ${state}</span></div><span class="session-distractions">${Number(session.distractions) || 0} check-ins</span></article>`;
    }).join('');
  }

  function renderClearConfirmation() {
    if (!history) return;
    const existing = history.querySelector('[data-history-confirmation]');
    if (existing) existing.remove();
    const panel = document.createElement('div');
    panel.dataset.historyConfirmation = '';
    panel.className = 'history-confirmation';
    panel.setAttribute('role', 'status');
    panel.innerHTML = '<span>Clear all focus history stored in this browser?</span> <button type="button" data-history-clear-confirm>Clear history</button> <button type="button" data-history-clear-cancel>Keep history</button>';
    history.prepend(panel);
    panel.querySelector('[data-history-clear-confirm]').addEventListener('click', () => {
      const cleared = writeSessions([]);
      if (cleared) {
        historyClearPending = false;
        renderHistory();
        setStatus('Focus history cleared from this browser.');
      } else {
        panel.textContent = 'This browser could not clear the saved focus history.';
      }
    });
    panel.querySelector('[data-history-clear-cancel]').addEventListener('click', () => {
      historyClearPending = false;
      panel.remove();
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  durationButtons.forEach((button) => button.addEventListener('click', () => {
    if (sessionStarted || mode === 'break') return;
    durationButtons.forEach((item) => {
      item.classList.remove('is-selected');
      item.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('is-selected');
    button.setAttribute('aria-pressed', 'true');
    focusMinutes = Number(button.dataset.duration) || 25;
    totalSeconds = focusMinutes * 60;
    remainingSeconds = totalSeconds;
    updateTimer();
  }));

  if (breakSelect) breakSelect.addEventListener('change', () => { breakMinutes = Number(breakSelect.value) || 5; });
  taskInput.addEventListener('input', updateTimer);
  startButton.addEventListener('click', startTimer);
  pauseButton.addEventListener('click', () => timerId !== null ? pauseTimer() : startTimer());
  finishButton.addEventListener('click', finishEarly);
  resetButton.addEventListener('click', () => {
    if (sessionStarted && !window.confirm('Reset this focus block and discard its unsaved time?')) return;
    resetTimer();
  });
  distractionButton.addEventListener('click', () => {
    if (!sessionStarted || mode !== 'focus' || timerId === null) return;
    distractions += 1;
    if (distractionCount) distractionCount.textContent = String(distractions);
    persistActive();
    setStatus('Noted. Return to the task when you can.');
  });
  document.addEventListener('visibilitychange', () => {
    if (timerId !== null) tick();
    persistActive();
  });
  window.addEventListener('beforeunload', (event) => {
    if (persistActive() || (!sessionStarted && mode !== 'break')) return;
    event.preventDefault();
    event.returnValue = '';
    return '';
  });
  window.addEventListener('pagehide', persistActive);
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    if (!restoreActive()) resetTimer();
    renderHistory();
  });
  const clearHistoryButton = $('[data-history-clear]');
  if (clearHistoryButton) clearHistoryButton.addEventListener('click', () => {
    historyClearPending = !historyClearPending;
    if (historyClearPending) renderClearConfirmation();
    else {
      const panel = history && history.querySelector('[data-history-confirmation]');
      if (panel) panel.remove();
    }
  });

  durationButtons.forEach((button) => button.setAttribute('aria-pressed', button.classList.contains('is-selected') ? 'true' : 'false'));
  if (distractionButton) distractionButton.disabled = true;
  updateTimer();
  renderHistory();
  restoreActive();
})();
