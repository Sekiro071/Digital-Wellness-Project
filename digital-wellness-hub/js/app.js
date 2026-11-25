(function () {
  let resources = window.DW_RESOURCES || [];
  const categories = window.DW_CATEGORIES || [];
  const guides = window.DW_GUIDES || [];

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  function getPageRoot() {
    return document.body.dataset.page || '';
  }

  function setupNavigation() {
    const current = getPageRoot();
    const nav = $('.main-nav');
    if (nav && !nav.querySelector('a[href="/focus"]')) {
      const focusLink = document.createElement('a');
      focusLink.href = '/focus';
      focusLink.dataset.page = 'focus';
      focusLink.textContent = 'Focus session';
      const guidesLink = nav.querySelector('a[data-page="guides"]');
      nav.insertBefore(focusLink, guidesLink || null);
    }

    $$('.main-nav a').forEach((link) => {
      if (link.dataset.page === current && current) link.setAttribute('aria-current', 'page');
    });

    const toggle = $('.menu-toggle');
    if (toggle && nav) {
      function closeMenu(restoreFocus = false) {
        if (!nav.classList.contains('is-open')) return;
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        if (restoreFocus) toggle.focus();
      }
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && nav.classList.contains('is-open')) {
          closeMenu(true);
        }
      });
      document.addEventListener('click', (event) => {
        if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
      });
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
  }

  function supportsPlatform(resource, platform) {
    return resource.platforms.some((item) => item === platform ||
      (['Mac', 'macOS'].includes(item) && ['Mac', 'macOS'].includes(platform)));
  }

  function categoryIcon(category) {
    const shapes = {
      'screen-time': '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
      focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/>',
      'notifications-sleep': '<path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z"/>',
      privacy: '<path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Z"/><path d="m8 12 3 3 5-6"/>'
    };
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[category] || shapes.focus}</svg>`;
  }

  function resourceCard(resource, options = {}) {
    const compare = Boolean(options.compare);
    const showSource = options.showSource !== false;
    return `
      <article class="resource-card accent-${resource.accent}" data-resource-id="${resource.id}">
        <div class="resource-card-top">
          <a class="resource-icon-link" href="/resource/${resource.id}" aria-label="Open details for ${escapeHtml(resource.name)}"><div class="resource-icon accent-${resource.accent}" aria-hidden="true">${categoryIcon(resource.category)}</div></a>
          <span class="pill pricing-badge">${escapeHtml(resource.pricing)}</span>
        </div>
        <h3>${escapeHtml(resource.name)}</h3>
        <p class="purpose">${escapeHtml(resource.purpose)}</p>
        <div class="tag-row">${resource.platforms.map((platform) => `<span class="tag">${escapeHtml(platform)}</span>`).join('')}</div>
        <div class="resource-meta">
          <div><strong>Best for</strong><span>${escapeHtml(resource.bestFor)}</span></div>
        </div>
        ${showSource ? `<div class="resource-meta"><div><strong>Privacy note</strong><span>${escapeHtml(resource.privacy)}</span></div></div>` : ''}
        <div class="card-actions">
          <a class="btn btn-secondary btn-small" href="/resource/${resource.id}">Details and links</a>
          ${compare ? `<button class="icon-btn compare-toggle" type="button" aria-label="Compare ${escapeHtml(resource.name)}" aria-pressed="false" data-compare-id="${resource.id}">Compare</button>` : ''}
          <button class="icon-btn save-toggle" type="button" aria-label="Save ${escapeHtml(resource.name)}" aria-pressed="false" data-save-id="${resource.id}">Save</button>
        </div>
      </article>`;
  }

  function renderFeatured() {
    const container = $('[data-featured-resources]');
    if (!container) return;
    container.innerHTML = resources.slice(0, 3).map((resource) => resourceCard(resource, { showSource: false })).join('');
    bindSaveButtons(container);
  }

  function renderGuides() {
    const container = $('[data-guides]');
    if (!container) return;
    container.innerHTML = guides.map((guide) => `
      <article class="guide-card">
        <div class="guide-number"><span>${guide.number} / ${escapeHtml(guide.label)}</span><span>${escapeHtml(guide.duration)}</span></div>
        <div class="resource-icon accent-${guide.accent}" aria-hidden="true">${categoryIcon(guide.id === 'android-wellbeing' ? 'screen-time' : guide.id === 'focus-mode' ? 'notifications-sleep' : 'focus')}</div>
        <h3>${escapeHtml(guide.title)}</h3>
        <p>${escapeHtml(guide.summary)}</p>
        <a class="guide-link" href="${guide.path}">Read the guide →</a>
      </article>`).join('');
  }

  let savedFallback = [];
  let storageAvailable = true;

  function readSaved() {
    if (!storageAvailable) return savedFallback;
    try {
      const value = JSON.parse(localStorage.getItem('dw-saved') || '[]');
      savedFallback = Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
    } catch (_) { storageAvailable = false; }
    return savedFallback;
  }

  function saveResource(id) {
    const saved = readSaved();
    savedFallback = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
    if (storageAvailable) {
      try { localStorage.setItem('dw-saved', JSON.stringify(savedFallback)); }
      catch (_) { storageAvailable = false; }
    }
    return savedFallback.includes(id);
  }

  function bindSaveButtons(scope = document, onChange) {
    $$('.save-toggle', scope).forEach((button) => {
      const id = button.dataset.saveId;
      const update = (saved) => {
        button.setAttribute('aria-pressed', String(saved));
        button.textContent = saved ? 'Saved' : 'Save';
        const resource = resources.find((item) => item.id === id);
        button.setAttribute('aria-label', `${saved ? 'Remove' : 'Save'} ${resource?.name || 'resource'}${saved ? ' from saved resources' : ''}`);
      };
      update(readSaved().includes(id));
      button.addEventListener('click', () => {
        const active = saveResource(id);
        update(active);
        showToast(storageAvailable ? (active ? 'Saved to this browser.' : 'Removed from saved resources.') : 'Browser storage is unavailable; changes last only while this page is open.');
        onChange?.();
      });
    });
  }

  function setupResourceDirectory() {
    const grid = $('[data-resource-grid]');
    if (!grid) return;
    const search = $('#resource-search');
    const category = $('#resource-category');
    const platform = $('#resource-platform');
    const pricing = $('#resource-pricing');
    const savedOnly = $('#resource-saved');
    const count = $('[data-resource-count]');
    const noResults = $('[data-no-results]');
    const compareIds = new Set();
    const dock = $('[data-compare-dock]');
    const dockCount = $('[data-compare-count]');
    const modal = $('[data-compare-modal]');
    const modalBody = $('[data-compare-body]');

    function matches(resource) {
      const needle = (search?.value || '').toLowerCase().trim();
      const text = [resource.name, resource.purpose, resource.bestFor, resource.categoryLabel, ...resource.tags].join(' ').toLowerCase();
      const searchMatches = !needle || text.includes(needle);
      const categoryMatches = !category?.value || resource.category === category.value;
      const platformMatches = !platform?.value || supportsPlatform(resource, platform.value);
      const pricingMatches = !pricing?.value || (pricing.value === 'free' ? ['free', 'open-source'].includes(resource.pricingType) : resource.pricingType === pricing.value);
      return searchMatches && categoryMatches && platformMatches && pricingMatches && (!savedOnly?.checked || readSaved().includes(resource.id));
    }

    function render() {
      const visible = resources.filter(matches);
      grid.innerHTML = visible.map((resource) => resourceCard(resource, { compare: true })).join('');
      count.textContent = `${visible.length} of ${resources.length} resources`;
      noResults.hidden = visible.length !== 0;
      bindSaveButtons(grid, () => { if (savedOnly?.checked) render(); });
      bindCompareButtons();
      syncCompareButtons();
    }

    function syncCompareButtons() {
      $$('.compare-toggle', grid).forEach((button) => {
        const active = compareIds.has(button.dataset.compareId);
        button.setAttribute('aria-pressed', String(active));
        button.textContent = active ? 'Comparing' : 'Compare';
        const resource = resources.find((item) => item.id === button.dataset.compareId);
        button.setAttribute('aria-label', `${active ? 'Remove' : 'Compare'} ${resource?.name || 'resource'}${active ? ' from comparison' : ''}`);
      });
      if (dock) dock.hidden = compareIds.size === 0;
      if (dockCount) dockCount.textContent = String(compareIds.size);
    }

    function bindCompareButtons() {
      $$('.compare-toggle', grid).forEach((button) => button.addEventListener('click', () => {
        const id = button.dataset.compareId;
        if (compareIds.has(id)) compareIds.delete(id);
        else if (compareIds.size < 3) compareIds.add(id);
        else showToast('Compare up to three resources at a time.');
        syncCompareButtons();
      }));
    }

    let comparisonOpener = null;
    let inertElements = [];

    function openComparison() {
      const selected = resources.filter((resource) => compareIds.has(resource.id));
      if (!selected.length) return;
      const fields = [
        ['Purpose', 'purpose'],
        ['Platforms', (resource) => resource.platforms.join(', ')],
        ['Pricing', 'pricing'],
        ['Privacy requirements', 'privacy'],
        ['Accessibility', 'accessibility'],
        ['Limitations', 'limitations'],
        ['Best suited for', 'bestFor']
      ];
      modalBody.innerHTML = `<p>Compare cost, access, and trade-offs for your own needs. Accessibility has not been independently tested.</p>${selected.length > 1 ? '<p class="muted">Scroll sideways to compare all columns.</p>' : ''}<table class="compare-table"><thead><tr><th scope="col">Compare</th>${selected.map((resource) => `<th scope="col">${escapeHtml(resource.name)}</th>`).join('')}</tr></thead><tbody>${fields.map(([label, key]) => `<tr><th scope="row">${label}</th>${selected.map((resource) => `<td>${escapeHtml(typeof key === 'function' ? key(resource) : resource[key])}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">Sources and install links</th>${selected.map((resource) => `<td><a href="/resource/${resource.id}">View details and links</a><br><small>Checked ${escapeHtml(resource.dateChecked)}</small></td>`).join('')}</tr></tbody></table>`;
      comparisonOpener = document.activeElement;
      inertElements = [];
      for (let node = modal; node && node !== document.body; node = node.parentElement) {
        Array.from(node.parentElement.children).forEach((sibling) => {
          if (sibling !== node && !sibling.inert) { sibling.inert = true; inertElements.push(sibling); }
        });
      }
      modal.hidden = false;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      $('[data-close-compare]', modal)?.focus();
    }

    [search, category, platform, pricing, savedOnly].filter(Boolean).forEach((control) => control.addEventListener(control === search ? 'input' : 'change', render));
    $('[data-reset-filters]')?.addEventListener('click', () => {
      [search, category, platform, pricing].filter(Boolean).forEach((control) => { control.value = ''; });
      if (savedOnly) savedOnly.checked = false;
      render();
    });
    $('[data-open-compare]')?.addEventListener('click', openComparison);
    function closeComparison() {
      modal.hidden = true;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      inertElements.forEach((element) => { element.inert = false; });
      inertElements = [];
      if (comparisonOpener?.isConnected) comparisonOpener.focus();
    }
    $('[data-close-compare]')?.addEventListener('click', closeComparison);
    modal?.addEventListener('click', (event) => { if (event.target === modal) closeComparison(); });
    document.addEventListener('keydown', (event) => {
      if (!modal || modal.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); closeComparison(); return; }
      if (event.key !== 'Tab') return;
      const focusable = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal).filter((element) => element.getClientRects().length);
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    });
    render();
  }

  function setupQuiz() {
    const form = $('[data-quiz]');
    const results = $('[data-recommendation-results]');
    if (!form || !results) return;

    const query = new URLSearchParams(window.location.search);
    if (query.get('problem')) {
      const map = { distraction: 'focus', 'screen-time': 'screen-time', notifications: 'notifications', sleep: 'sleep', privacy: 'privacy' };
      const goal = map[query.get('problem')] || query.get('problem');
      const goalSelect = $('#quiz-goal');
      if (goalSelect && Array.from(goalSelect.options).some((option) => option.value === goal)) goalSelect.value = goal;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const goal = $('#quiz-goal').value;
      const device = $('#quiz-device').value;
      const budget = $('#quiz-budget').value;
      const matches = resources.filter((resource) =>
        (goal === 'all' || resource.goals.includes(goal)) &&
        (device === 'all' || supportsPlatform(resource, device)) &&
        (budget === 'all' || (budget === 'free' && ['built-in', 'free', 'open-source'].includes(resource.pricingType)))
      ).slice(0, 4);

      if (!matches.length) {
        results.innerHTML = `<div class="empty-state"><strong>No exact fit yet.</strong><p>Try a different goal or device, or relax the budget filter. A mismatch is useful information - you should not force a recommendation.</p></div>`;
        return;
      }
      results.innerHTML = `<div class="eyebrow">Your short list</div><p class="muted">Start with the first match, then check its current official details before you install anything.</p>` + matches.map((resource) => `
        <article class="result-card">
          <a class="resource-icon-link" href="/resource/${resource.id}" aria-label="Open details for ${escapeHtml(resource.name)}"><div class="resource-icon accent-${resource.accent}" aria-hidden="true">${categoryIcon(resource.category)}</div></a>
          <div><h3>${escapeHtml(resource.name)}</h3><p>${escapeHtml(resource.bestFor)} ${device !== 'all' ? `Works with ${escapeHtml(device)} in this shortlist.` : ''}</p></div>
          <span class="match-score">Matches your choices</span>
          <a class="btn btn-secondary btn-small" href="/resource/${resource.id}">See details and trade-offs</a>
        </article>`).join('');
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function setupFeedbackForm() {
    const form = $('[data-feedback-form]');
    const success = $('[data-form-success]');
    if (!form || !success) return;
    const submit = $('button[type="submit"]', form);
    let submitting = false;
    function clearErrors() {
      $$('[data-field-error]', form).forEach((error) => { error.textContent = ''; });
      $$('[aria-invalid]', form).forEach((field) => field.removeAttribute('aria-invalid'));
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting) return;
      clearErrors();
      success.textContent = '';
      success.classList.remove('is-visible');
      const payload = Object.fromEntries(['ease', 'found', 'guide', 'improve'].map((name) => [name, $(`#${name}`, form)?.value.trim() || '']));
      let firstInvalid = null;
      ['ease', 'found', 'guide', 'improve'].forEach((name) => {
        const message = name !== 'improve' && !payload[name] ? 'Please choose an answer.' : payload[name].length > (name === 'improve' ? 1000 : 80) ? `Please enter no more than ${name === 'improve' ? 1000 : 80} characters.` : '';
        if (message) {
          const field = $(`#${name}`, form);
          field.setAttribute('aria-invalid', 'true');
          $(`[data-field-error="${name}"]`, form).textContent = message;
          firstInvalid ||= field;
        }
      });
      if (firstInvalid) { firstInvalid.focus(); return; }
      submitting = true;
      submit.disabled = true;
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (Array.isArray(result.detail)) {
            result.detail.forEach((error) => {
              const name = error.loc?.[error.loc.length - 1];
              const field = $(`#${name}`, form);
              const message = $(`[data-field-error="${name}"]`, form);
              if (field && message) { field.setAttribute('aria-invalid', 'true'); message.textContent = error.msg || 'Please check this answer.'; firstInvalid ||= field; }
            });
          }
          throw new Error(firstInvalid ? 'Please check the highlighted answers.' : 'Could not save your feedback. Please try again.');
        }
        success.textContent = result.message || 'Thanks for your feedback.';
        form.reset();
      } catch (error) {
        success.textContent = error instanceof TypeError ? 'The server could not be reached. Please try again.' : error.message;
        firstInvalid?.focus();
      } finally {
        submitting = false;
        submit.disabled = false;
        success.classList.add('is-visible');
      }
    });
  }

  function showToast(message) {
    let toast = $('.toast');
    if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(window.__dwToast);
    window.__dwToast = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  async function initialize() {
    setupNavigation();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch('/api/resources', { signal: controller.signal });
      if (response.ok) {
        const serverResources = await response.json();
        const byId = new Map(serverResources.map((resource) => [resource.id, resource]));
        resources = resources.map((resource) => ({ ...resource, ...(byId.get(resource.id) || {}) }));
      }
    } catch (_) {
      // The bundled data.js remains a safe fallback for static inspection.
    } finally {
      clearTimeout(timeout);
    }
    renderFeatured();
    renderGuides();
    setupResourceDirectory();
    setupQuiz();
    setupFeedbackForm();
  }

  initialize();
})();
