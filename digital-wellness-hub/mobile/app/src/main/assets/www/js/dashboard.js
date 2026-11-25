(() => {
  'use strict';
  const d = document, w = window, $ = (s, root = d) => root.querySelector(s), $$ = (s, root = d) => [...root.querySelectorAll(s)];
  const HABIT_KEY = 'good-signal-habits-v1', SLEEP_KEY = 'good-signal-sleep-v1', GOAL_KEY = 'good-signal-screen-goal-v1';
  const todayView = $$('[data-today-view]'), habitsView = $('[data-habits-view]');
  const isHabits = location.pathname.replace(/\/$/, '') === '/habits';
  if (isHabits) { d.title = 'Habits — Good Signal'; todayView.forEach(el => el.hidden = true); habitsView.hidden = false; }
  const pad = n => String(n).padStart(2, '0');
  const localDate = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const shiftDate = (date, amount) => { const x = new Date(date.getFullYear(), date.getMonth(), date.getDate()); x.setDate(x.getDate() + amount); return x; };
  const prettyDate = (date, opts = { weekday: 'long', month: 'long', day: 'numeric' }) => date.toLocaleDateString(undefined, opts);
  const escapeText = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const makeId = () => w.crypto?.randomUUID?.() || `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  let volatileHabits = false, habits = readHabits(), nativeState = null, refreshTimer = 0, sleepDirty = false, seenDate = localDate(), selectedUsageDay = null, showAllApps = false, selectedHabitDay = localDate();
  function readHabits() {
    try {
      const parsed = JSON.parse(w.localStorage.getItem(HABIT_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, 30).filter(h => h && typeof h.id === 'string' && typeof h.title === 'string' && h.title.length <= 56 && h.done && typeof h.done === 'object').map(h => ({ id: h.id, title: h.title, done: Object.fromEntries(Object.entries(h.done).filter(([date, value]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && value === true)) }));
    } catch { return []; }
  }
  function persistHabits() {
    try { w.localStorage.setItem(HABIT_KEY, JSON.stringify(habits)); volatileHabits = false; }
    catch { volatileHabits = true; }
    const notice = $('[data-habit-status]'); if (notice) notice.textContent = volatileHabits ? 'Device storage is unavailable. Changes will last only until you close this screen.' : '';
  }
  function readSleep() {
    try { const p = JSON.parse(w.localStorage.getItem(SLEEP_KEY) || 'null'); if (p && typeof p.enabled === 'boolean' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)) return p; }
    catch { /* Use a sensible form default when storage is unavailable. */ }
    return { enabled: false, time: '22:00' };
  }
  function persistSleep(sleep) { try { w.localStorage.setItem(SLEEP_KEY, JSON.stringify(sleep)); } catch {} }
  function readGoal() { try { const n = Number(w.localStorage.getItem(GOAL_KEY)); return Number.isFinite(n) && n >= 30 && n <= 1080 ? n : null; } catch { return null; } }
  let goalMinutes = readGoal();
  const goalInput = $('[data-goal-input]'); if (goalInput && goalMinutes) goalInput.value = String(goalMinutes / 60);
  function renderGoal(state) {
    const progress = $('[data-goal-progress]'), hint = $('#goal-hint'); if (!progress) return;
    if (state?.error || ['locked','unavailable'].includes(state?.usageStatus)) { progress.hidden = true; hint.textContent = 'Usage data is temporarily unavailable.'; return; }
    const goalLabel = $('[data-goal-label]'); if (goalLabel) goalLabel.textContent = goalMinutes == null ? '' : `${(goalMinutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} hr`;
    if (goalMinutes == null) { progress.hidden = true; hint.textContent = 'Optional, saved on this device.'; return; }
    const total = state?.usageGranted === true && state.today?.totalMs != null && state.today.totalMs !== '' && Number.isFinite(Number(state.today.totalMs)) ? Number(state.today.totalMs) : null;
    if (total == null) { progress.hidden = false; progress.innerHTML = `<span>${(goalMinutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} hour daily goal. Connect usage access to view progress.</span>`; hint.textContent = 'Optional, saved on this device.'; return; }
    const used = Math.round(total / 60000), ratio = Math.min(100, Math.round(used / goalMinutes * 100));
    progress.hidden = false; progress.innerHTML = `<div class="goal-meter" role="progressbar" aria-label="Daily screen time goal" aria-valuemin="0" aria-valuemax="${goalMinutes}" aria-valuenow="${Math.min(used, goalMinutes)}" aria-valuetext="${formatDuration(total)} of ${(goalMinutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} hours"><span style="--goal:${ratio}%"></span></div><span>${formatDuration(total)} of ${(goalMinutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} hr${used > goalMinutes ? ' · over intention' : ' today'}</span>`; hint.textContent = 'Your intention is a guide, not a score.';
  }
  $('[data-goal-form]')?.addEventListener('submit', e => { e.preventDefault(); const hours = Number(goalInput.value), message = $('[data-goal-message]'); if (!Number.isFinite(hours) || hours < .5 || hours > 18) { goalInput.setCustomValidity('Choose between 0.5 and 18 hours.'); goalInput.reportValidity(); goalInput.setCustomValidity(''); return; } goalMinutes = Math.round(hours * 60); try { w.localStorage.setItem(GOAL_KEY, String(goalMinutes)); message.textContent = 'Daily intention saved.'; } catch { message.textContent = 'This goal will stay only until you close the screen because device storage is unavailable.'; } renderGoal(nativeState); });
  const dateLabel = $('[data-date-label]'); if (dateLabel) dateLabel.textContent = prettyDate(new Date());
  const habitDateHeading = $('[data-habit-date-heading]'); if (habitDateHeading) habitDateHeading.textContent = prettyDate(new Date());
  const habitDate = $('[data-habit-date]'); if (habitDate) habitDate.textContent = prettyDate(new Date(), { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

  function renderHabits() {
    const list = $('[data-habit-list]'); if (!list) return;
    const date = localDate(), done = habits.filter(h => h.done[date]).length;
    $('[data-habit-count]').textContent = habits.length ? `${done} of ${habits.length} done` : 'A fresh start';
    $('[data-habit-empty]').hidden = habits.length > 0;
    const completion = $('[data-habit-completion]');
    if (completion) { completion.hidden = !habits.length; completion.innerHTML = '<span style="--completion:' + (habits.length ? done / habits.length * 100 : 0) + '%"></span>'; completion.setAttribute('role', 'progressbar'); completion.setAttribute('aria-label', 'Today’s habit check-ins'); completion.setAttribute('aria-valuemin', '0'); completion.setAttribute('aria-valuemax', String(habits.length)); completion.setAttribute('aria-valuenow', String(done)); }
    const preview = $('[data-habit-preview]'); if (preview) preview.textContent = habits.length ? done + ' of ' + habits.length + ' checked in today' : 'Start with one small practice';
    $$('[data-suggestion]').forEach(button => { const added = habits.some(h => h.title === button.dataset.suggestion); button.disabled = added; button.textContent = added ? 'Added' : 'Add habit +'; });
    const habitForm = $('[data-habit-form]'); if (habitForm) list.parentNode.insertBefore(list, habitForm);
    list.innerHTML = habits.map(h => `<li class="habit-item${h.done[date] ? ' is-done' : ''}" data-habit-id="${escapeText(h.id)}"><label class="habit-check"><input type="checkbox" data-habit-check ${h.done[date] ? 'checked' : ''} aria-label="Mark ${escapeText(h.title)} ${h.done[date] ? 'not done' : 'done'}"><span class="checkmark" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m4 10 4 4 8-9"/></svg></span></label><div class="habit-title-wrap"><span class="habit-title" data-title>${escapeText(h.title)}</span><span class="habit-streak">${streak(h)} day${streak(h) === 1 ? '' : 's'} in a row</span></div><button class="habit-edit" type="button" data-edit aria-label="Edit ${escapeText(h.title)}">Edit</button><button class="habit-remove" type="button" data-remove aria-label="Remove ${escapeText(h.title)}" title="Remove habit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg></button></li>`).join('');
    list.querySelectorAll('[data-habit-check]').forEach(input => input.addEventListener('change', () => {
      const id = input.closest('[data-habit-id]').dataset.habitId;
      const h = habits.find(x => x.id === id);
      if (!h) return;
      const checkedDate = localDate();
      if (input.checked) h.done[checkedDate] = true;
      else delete h.done[checkedDate];
      persistHabits();
      renderHabits();
      [...list.querySelectorAll('[data-habit-check]')]
        .find(next => next.closest('[data-habit-id]').dataset.habitId === id)
        ?.focus();
    }));
    list.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { const row = button.closest('[data-habit-id]'), h = habits.find(x => x.id === row.dataset.habitId); if (!h || !w.confirm(`Remove “${h.title}” and its check-in history?`)) return; habits = habits.filter(x => x.id !== h.id); persistHabits(); renderHabits(); }));
    list.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => editHabit(button.closest('[data-habit-id]'))));
    renderHabitWeek();
  }
  function editHabit(row) {
    const h = habits.find(x => x.id === row.dataset.habitId); if (!h) return;
    const span = $('[data-title]', row), editor = d.createElement('div'), input = d.createElement('input');
    editor.className = 'habit-inline-editor';
    input.type = 'text'; input.maxLength = 56; input.minLength = 2; input.value = h.title; input.setAttribute('aria-label', 'Edit habit name'); input.className = 'habit-edit-input';
    const actions = d.createElement('div'); actions.className = 'habit-editor-actions';
    const save = d.createElement('button'), cancel = d.createElement('button'), error = d.createElement('span');
    save.type = cancel.type = 'button'; save.textContent = 'Save'; cancel.textContent = 'Cancel';
    save.dataset.habitSave = ''; cancel.dataset.habitCancel = ''; error.className = 'habit-editor-error'; error.setAttribute('role', 'status');
    actions.append(save, cancel); editor.append(input, actions, error); span.replaceWith(editor); input.focus(); input.select();
    function finish(commit) {
      if (!input.isConnected) return;
      const value = input.value.trim();
      if (commit && (value.length < 2 || value.length > 56)) { input.setAttribute('aria-invalid', 'true'); error.textContent = 'Use 2 to 56 characters.'; input.focus(); return; }
      if (commit) { h.title = value; persistHabits(); }
      renderHabits();
      const next = $$('[data-habit-id]').find(item => item.dataset.habitId === h.id); $('[data-edit]', next || d)?.focus();
    }
    save.addEventListener('click', () => finish(true)); cancel.addEventListener('click', () => finish(false));
    input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); error.textContent = ''; });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
  }
  function streak(h) {
    let cursor = new Date(); cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (!h.done[localDate(cursor)]) cursor = shiftDate(cursor, -1);
    let n = 0; while (h.done[localDate(cursor)]) { n++; cursor = shiftDate(cursor, -1); } return n;
  }
  function renderHabitWeek() {
    const host = $('[data-habit-week]'); if (!host) return;
    const days = Array.from({ length: 7 }, (_, i) => shiftDate(new Date(), i - 6));
    const selected = days.find(day => localDate(day) === selectedHabitDay) || days[6];
    selectedHabitDay = localDate(selected);
    host.innerHTML = '<div class="habit-week-list" role="list" aria-label="Habit completions by day">' + days.map(day => {
      const date = localDate(day), count = habits.reduce((sum, h) => sum + (h.done[date] ? 1 : 0), 0), ratio = habits.length ? count / habits.length : 0;
      return '<div class="habit-day" role="listitem"><button class="habit-day-button" type="button" data-habit-day="' + date + '" aria-pressed="' + (date === selectedHabitDay) + '" aria-label="' + prettyDate(day, { weekday: 'long', month: 'long', day: 'numeric' }) + ': ' + count + ' of ' + habits.length + ' habits completed"><span class="habit-day-label">' + day.toLocaleDateString(undefined, { weekday: 'short' }) + '</span><span class="habit-track" aria-hidden="true"><span style="--fill:' + ratio * 100 + '%"></span></span><span class="habit-day-count">' + count + '/' + habits.length + '</span></button></div>';
    }).join('') + '</div>';
    const detail = $('[data-habit-day-detail]');
    if (detail) { const done = habits.filter(h => h.done[selectedHabitDay]); detail.textContent = prettyDate(selected, { month: 'short', day: 'numeric' }) + ' · ' + (done.length ? done.map(h => h.title).join(', ') : 'No check-ins recorded'); }
    $$('[data-habit-day]', host).forEach(button => button.addEventListener('click', () => { selectedHabitDay = button.dataset.habitDay; renderHabitWeek(); $$('[data-habit-day]', host).find(next => next.dataset.habitDay === selectedHabitDay)?.focus(); }));
  }
  const form = $('[data-habit-form]'); form?.addEventListener('submit', e => { e.preventDefault(); const field = $('#habit-title'), title = field.value.trim(); if (title.length < 2 || title.length > 56 || habits.length >= 30) { field.setCustomValidity(habits.length >= 30 ? 'You can keep up to 30 habits.' : 'Use 2 to 56 characters.'); field.reportValidity(); field.setCustomValidity(''); return; } habits.push({ id: makeId(), title, done: {} }); persistHabits(); field.value = ''; renderHabits(); $('#habit-title')?.focus(); });
  $$('[data-suggestion]').forEach(button => button.addEventListener('click', () => { if (habits.length >= 30) { $('[data-habit-count]').textContent = 'You can keep up to 30 habits'; return; } habits.push({ id: makeId(), title: button.dataset.suggestion, done: {} }); persistHabits(); renderHabits(); button.textContent = 'Added'; button.disabled = true; }));
  renderHabits();

  function formatDuration(ms) { const minutes = Math.max(0, Math.round(Number(ms) / 60000)); const hours = Math.floor(minutes / 60), remainder = minutes % 60; return hours ? `${hours} hr ${remainder} min` : `${remainder} min`; }
  function bridge() { return w.GoodSignalAndroid && typeof w.GoodSignalAndroid.getWellnessState === 'function' ? w.GoodSignalAndroid : null; }
  function callState() { try { const value = bridge()?.getWellnessState(); if (typeof value === 'string') return JSON.parse(value); return value || null; } catch (error) { return { error: error?.message || 'Could not read Android wellness access.' }; } }
  function renderUsage(state) {
    const total = $('[data-total-usage]'), caption = $('[data-usage-caption]'), status = $('[data-usage-state]'), week = $('[data-week-content]'), apps = $('[data-apps-content]'), message = $('[data-usage-message]'), connect = $('[data-connect-usage]'), manage = $('[data-manage-usage]'), help = $('[data-permission-help]'), selected = $('[data-selected-day]'), appSummary = $('[data-apps-summary]');
    if (selected) selected.textContent = '';
    if (appSummary) appSummary.textContent = '';
    if (help) help.hidden = !state || state.usageGranted === true || state.usageStatus === 'locked' || state.usageStatus === 'unavailable';
    if (!state) { status.textContent = 'Not connected'; total.textContent = '—'; caption.textContent = 'Connect Android usage access to see your real activity.'; week.innerHTML = '<p class="empty-inline">No usage history yet. Connect access to see your week.</p>'; apps.textContent = 'Your app list will appear when Android shares today’s usage.'; message.textContent = 'Android usage access is available in the Good Signal app. Open this screen on your Android device to connect it.'; connect.textContent = 'Connect screen time'; manage.hidden = true; return; }
    const granted = state.usageGranted === true;
    status.textContent = granted ? 'Access on' : 'Access off'; status.classList.toggle('is-connected', granted);
    connect.textContent = granted || state.usageRecoveryAction === 'retry' || state.usageRecoveryAction === 'unlock_device' ? 'Refresh screen time' : 'Connect screen time'; manage.hidden = !granted;
    if (state.error || state.usageStatus === 'locked' || state.usageStatus === 'unavailable') { total.textContent = '—'; caption.textContent = state.usageStatus === 'locked' ? 'Unlock your phone to see usage.' : 'Usage data is temporarily unavailable.'; week.innerHTML = '<p class="empty-inline">Could not load your 7-day usage. Try refreshing.</p>'; apps.innerHTML = '<p class="empty-inline">App usage is temporarily unavailable.</p>'; message.textContent = String(state.usageMessage || state.error || 'Try refreshing in a moment.'); return; }
    message.textContent = '';
    if (!granted) { total.textContent = '—'; caption.textContent = 'Android has not shared usage yet.'; week.innerHTML = '<p class="empty-inline">Allow Usage Access in Android Settings to see your real 7-day history.</p>'; apps.textContent = 'Your app list will appear after you allow usage access.'; message.textContent = state.usageMessage || ''; return; }
    const today = state.today && state.today.totalMs != null && state.today.totalMs !== '' && Number.isFinite(Number(state.today.totalMs)) && Number(state.today.totalMs) >= 0 ? Number(state.today.totalMs) : null;
    total.textContent = today == null ? '—' : formatDuration(today); caption.textContent = today == null ? 'Today’s total is not available yet.' : 'Screen time recorded today';
    const points = Array.isArray(state.week) ? state.week.filter(p => p && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.totalMs != null && p.totalMs !== '' && Number.isFinite(Number(p.totalMs)) && Number(p.totalMs) >= 0).slice(-7) : [];
    if (!points.length) week.innerHTML = '<p class="empty-inline">Android has not shared 7-day usage yet. Your chart will appear when history is available.</p>';
    else {
      const max = Math.max(...points.map(p => Number(p.totalMs)), 1);
      if (!points.some(p => p.date === selectedUsageDay)) selectedUsageDay = points[points.length - 1].date;
      week.innerHTML = '<div class="usage-week" role="list" aria-label="Screen time for the last seven days">' + points.map(p => {
        const date = new Date(p.date + 'T12:00:00'), value = Number(p.totalMs), pct = Math.max(value ? 2 : 0, Math.round(value / max * 100));
        const compact = Math.round(value / 60000) >= 60 ? (value / 3600000).toLocaleString(undefined, {maximumFractionDigits:1}) + 'h' : Math.round(value / 60000) + 'm';
        return '<div class="usage-day" role="listitem"><button class="usage-day-button" type="button" data-usage-day="' + p.date + '" aria-pressed="' + (p.date === selectedUsageDay) + '" aria-label="' + prettyDate(date, {weekday:'long',month:'long',day:'numeric'}) + ': ' + formatDuration(value) + '"><span class="usage-bar-track" aria-hidden="true"><span style="--bar:' + pct + '%"></span></span><span class="usage-day-name">' + date.toLocaleDateString(undefined, {weekday:'short'}) + '</span><span class="usage-day-value">' + compact + '</span></button></div>';
      }).join('') + '</div>';
      const point = points.find(p => p.date === selectedUsageDay);
      if (selected && point) selected.textContent = prettyDate(new Date(point.date + 'T12:00:00'), {weekday:'long',month:'short',day:'numeric'}) + ' · ' + formatDuration(point.totalMs);
      const average = points.reduce((sum,p) => sum + Number(p.totalMs),0) / points.length;
      week.insertAdjacentHTML('beforeend','<p class="week-summary">Daily average · ' + formatDuration(average) + '</p>');
      $$('[data-usage-day]', week).forEach(button => button.addEventListener('click', () => { selectedUsageDay = button.dataset.usageDay; renderUsage(nativeState); $$('[data-usage-day]', week).find(next => next.dataset.usageDay === selectedUsageDay)?.focus(); }));
    }
    const rows = Array.isArray(state.today?.apps) ? state.today.apps.filter(a => a && typeof a.name === 'string' && a.foregroundMs != null && a.foregroundMs !== '' && Number.isFinite(Number(a.foregroundMs)) && Number(a.foregroundMs) >= 0).sort((a,b) => Number(b.foregroundMs) - Number(a.foregroundMs)) : [];
    if (appSummary) appSummary.textContent = rows.length ? rows.length + (rows.length === 1 ? ' app' : ' apps') : '';
    const visible = showAllApps ? rows : rows.slice(0,3), maxApp = Math.max(...rows.map(a => Number(a.foregroundMs)),1);
    apps.innerHTML = visible.length ? '<ul class="app-list">' + visible.map(a => '<li><span class="app-initial" aria-hidden="true">' + escapeText(Array.from(a.name)[0] || 'A') + '</span><span class="app-info"><span class="app-name">' + escapeText(a.name) + '</span><span class="app-rail" aria-hidden="true"><i style="--app-fill:' + Math.round(Number(a.foregroundMs) / maxApp * 100) + '%"></i></span></span><span class="app-time">' + formatDuration(a.foregroundMs) + '</span></li>').join('') + '</ul>' + (rows.length > 3 ? '<button class="text-button apps-toggle" type="button" data-apps-toggle aria-expanded="' + showAllApps + '">' + (showAllApps ? 'Show fewer apps' : 'Show all ' + rows.length + ' apps') + '</button>' : '') : '<p class="empty-inline">No app details are available for today.</p>';
    $('[data-apps-toggle]', apps)?.addEventListener('click', () => { showAllApps = !showAllApps; renderUsage(nativeState); $('[data-apps-toggle]', apps)?.focus(); });
  }
  function renderNotifications(state) {
    const label = $('[data-notification-state]'); if (!label) return;
    const request = $('[data-request-notifications]');
    if (!bridge()) { label.textContent = 'Open on Android to manage notification permission.'; if (request) request.hidden = false; return; }
    const allowed = state?.notificationsGranted === true;
    label.textContent = allowed ? 'Notifications are allowed.' : state?.notificationsGranted === false ? 'Notifications are off. Enable them in Android settings.' : 'Notification permission hasn’t been checked.';
    if (request) { request.hidden = allowed; request.textContent = state?.notificationsGranted === false ? 'Enable notifications' : 'Allow notifications'; }
  }
  function syncReminder(state) {
    const reminder = state?.reminder;
    if (sleepDirty || !reminder || typeof reminder.enabled !== 'boolean' || reminder.hour == null || reminder.minute == null || !Number.isInteger(Number(reminder.hour)) || !Number.isInteger(Number(reminder.minute)) || Number(reminder.hour) < 0 || Number(reminder.hour) > 23 || Number(reminder.minute) < 0 || Number(reminder.minute) > 59) return;
    const time = `${pad(Number(reminder.hour))}:${pad(Number(reminder.minute))}`;
    const preview = $('[data-reminder-preview]'); if (preview) preview.textContent = reminder.enabled ? `Every evening at ${time}` : 'Off · Set an evening reminder';
    if (sleepInput) sleepInput.value = time;
    if (sleepEnabled) sleepEnabled.checked = reminder.enabled;
    persistSleep({ enabled: reminder.enabled, time });
  }
  function refresh() { nativeState = callState(); renderUsage(nativeState); renderNotifications(nativeState); syncReminder(nativeState); renderGoal(nativeState); }
  function scheduleRefresh() { w.clearTimeout(refreshTimer); refreshTimer = w.setTimeout(refresh, 180); }
  const statusResult = result => typeof result === 'string' ? JSON.parse(result) : result;
  $('[data-connect-usage]')?.addEventListener('click', () => { try { if (!bridge()) { refresh(); return; } if (nativeState?.usageGranted === true || ['retry', 'unlock_device'].includes(nativeState?.usageRecoveryAction)) { refresh(); $('[data-usage-message]').textContent = 'Screen time refreshed from Android.'; return; } bridge().openUsageSettings(); $('[data-usage-message]').textContent = 'Allow Usage Access in Android Settings, then return here. You can turn it off there at any time.'; } catch { $('[data-usage-message]').textContent = 'Could not open Android Usage Access settings. In Android, open Settings → Special app access → Usage access.'; } });
  $('[data-open-app-info]')?.addEventListener('click', () => {
    try { const api = bridge(); if (typeof api?.openAppSettings !== 'function') throw new Error(); api.openAppSettings(); $('[data-usage-message]').textContent = 'In App info, check More → Allow restricted settings, if shown. Then enable Usage access.'; }
    catch { $('[data-usage-message]').textContent = 'Open Android Settings → Apps → Good Signal. Check the three-dot menu for Allow restricted settings.'; }
  });
  $('[data-recheck-usage]')?.addEventListener('click', () => { refresh(); if (nativeState?.usageGranted) $('[data-usage-message]').textContent = 'Usage access is connected. Your activity is shown above.'; else $('[data-usage-message]').textContent = nativeState?.usageMessage || 'Usage access is still off. After reviewing the app, follow the steps above in Android settings.'; });
  $('[data-manage-usage]')?.addEventListener('click', () => { try { bridge()?.openUsageSettings(); } catch {} });
  $('[data-notification-settings]')?.addEventListener('click', () => { try { if (bridge()) bridge().openNotificationSettings(); else $('[data-sleep-message]').textContent = 'Open this page in Good Signal on Android to manage notification settings.'; } catch { $('[data-sleep-message]').textContent = 'Could not open notification settings. Check Good Signal under Android Settings → Apps → Notifications.'; } });
  const sleepInput = $('[data-sleep-time]'), sleepEnabled = $('[data-sleep-enabled]'), sleep = readSleep(); if (sleepInput) sleepInput.value = sleep.time; if (sleepEnabled) sleepEnabled.checked = sleep.enabled;
  sleepInput?.addEventListener('input', () => { sleepDirty = true; }); sleepEnabled?.addEventListener('change', () => { sleepDirty = true; });
  async function nativeAction(method, args = []) { const api = bridge(); if (!api || typeof api[method] !== 'function') return { ok: false, message: 'Open this screen in Good Signal on Android to use reminders.' }; try { return statusResult(await api[method](...args)) || { ok: false, message: 'Android did not return a result.' }; } catch (error) { return { ok: false, message: error?.message || 'Android could not complete that action.' }; } }
  $('[data-save-sleep]')?.addEventListener('click', async () => { const time = sleepInput.value; if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { sleepInput.focus(); $('[data-sleep-message]').textContent = 'Choose a valid reminder time.'; return; } const [hour, minute] = time.split(':').map(Number), enabled = sleepEnabled.checked; const result = await nativeAction('saveSleepReminder', [enabled, hour, minute]); if (result.ok) { persistSleep({ enabled, time }); sleepDirty = false; $('[data-sleep-message]').textContent = result.message || (enabled ? `Reminder saved for ${time}.` : 'Reminder turned off.'); } else $('[data-sleep-message]').textContent = result.message || 'Reminder could not be saved.'; scheduleRefresh(); });
  $('[data-test-notification]')?.addEventListener('click', async () => { const result = await nativeAction('sendTestNotification'); $('[data-sleep-message]').textContent = result.message || (result.ok ? 'Test notification sent.' : 'Test notification could not be sent.'); scheduleRefresh(); });
  $('[data-request-notifications]')?.addEventListener('click', () => {
    try {
      const api = bridge();
      if (!api || typeof api.requestNotifications !== 'function') throw new Error('Open this screen in Good Signal on Android to request notifications.');
      api.requestNotifications();
      $('[data-sleep-message]').textContent = 'Android will ask whether Good Signal can send notifications. You can change this later in Settings.';
      scheduleRefresh();
    } catch (error) {
      $('[data-sleep-message]').textContent = error?.message || 'Notification permission could not be requested.';
    }
  });
  w.addEventListener('goodsignal-native-update', scheduleRefresh);
  d.addEventListener('visibilitychange', () => { if (!d.hidden) { if (seenDate !== localDate()) { seenDate = localDate(); if (dateLabel) dateLabel.textContent = prettyDate(new Date()); if (habitDateHeading) habitDateHeading.textContent = prettyDate(new Date()); if (habitDate) habitDate.textContent = prettyDate(new Date(), { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase(); renderHabits(); } scheduleRefresh(); } });
  refresh();
})();
