(function () {
  let resources = window.DW_RESOURCES || [];
  const categories = window.DW_CATEGORIES || [];
  const guides = window.DW_GUIDES || [];
  const checkedDate = '09 Nov 2026';

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
    $$('.main-nav a').forEach((link) => {
      const page = link.dataset.page;
      if (page && page === current) link.setAttribute('aria-current', 'page');
    });

    const toggle = $('.menu-toggle');
    const nav = $('.main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
  }

  function resourceCard(resource, options = {}) {
    const compare = Boolean(options.compare);
    const showSource = options.showSource !== false;
    return `
      <article class="resource-card accent-${resource.accent}" data-resource-id="${resource.id}">
        <div class="resource-card-top">
          <a class="resource-icon-link" href="/resource/${resource.id}" aria-label="Open details for ${escapeHtml(resource.name)}"><div class="resource-icon accent-${resource.accent}" aria-hidden="true">${resource.icon}</div></a>
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
          <a class="btn btn-secondary btn-small" href="${resource.officialUrl}" target="_blank" rel="noopener">Official source ↗</a>
          ${compare ? `<button class="icon-btn compare-toggle" type="button" aria-label="Compare ${escapeHtml(resource.name)}" aria-pressed="false" data-compare-id="${resource.id}">＋</button>` : ''}
          <button class="icon-btn save-toggle" type="button" aria-label="Save ${escapeHtml(resource.name)}" aria-pressed="false" data-save-id="${resource.id}">♡</button>
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
        <div class="resource-icon accent-${guide.accent}" aria-hidden="true">${guide.icon}</div>
        <h3>${escapeHtml(guide.title)}</h3>
        <p>${escapeHtml(guide.summary)}</p>
        <a class="guide-link" href="${guide.path}">Read the guide →</a>
      </article>`).join('');
  }

  function readSaved() {
    try { return JSON.parse(localStorage.getItem('dw-saved') || '[]'); } catch (_) { return []; }
  }

  function saveResource(id) {
    const saved = readSaved();
    const next = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
    localStorage.setItem('dw-saved', JSON.stringify(next));
    return next.includes(id);
  }

  function bindSaveButtons(scope = document) {
    $$('.save-toggle', scope).forEach((button) => {
      const id = button.dataset.saveId;
      const saved = readSaved().includes(id);
      button.setAttribute('aria-pressed', String(saved));
      button.textContent = saved ? '♥' : '♡';
      button.addEventListener('click', () => {
        const active = saveResource(id);
        button.setAttribute('aria-pressed', String(active));
        button.textContent = active ? '♥' : '♡';
        showToast(active ? 'Saved to this browser.' : 'Removed from saved resources.');
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
      const platformMatches = !platform?.value || resource.platforms.includes(platform.value);
      const pricingMatches = !pricing?.value || resource.pricingType === pricing.value;
      return searchMatches && categoryMatches && platformMatches && pricingMatches;
    }

    function render() {
      const visible = resources.filter(matches);
      grid.innerHTML = visible.map((resource) => resourceCard(resource, { compare: true })).join('');
      count.textContent = `${visible.length} of ${resources.length} resources`;
      noResults.hidden = visible.length !== 0;
      bindSaveButtons(grid);
      bindCompareButtons();
      syncCompareButtons();
    }

    function syncCompareButtons() {
      $$('.compare-toggle', grid).forEach((button) => {
        const active = compareIds.has(button.dataset.compareId);
        button.setAttribute('aria-pressed', String(active));
        button.textContent = active ? '✓' : '＋';
      });
      if (dock) dock.classList.toggle('is-visible', compareIds.size > 0);
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
      modalBody.innerHTML = `<table class="compare-table"><thead><tr><th>Compare</th>${selected.map((resource) => `<th>${escapeHtml(resource.name)}</th>`).join('')}</tr></thead><tbody>${fields.map(([label, key]) => `<tr><td>${label}</td>${selected.map((resource) => `<td>${escapeHtml(typeof key === 'function' ? key(resource) : resource[key])}</td>`).join('')}</tr>`).join('')}<tr><td>Official source</td>${selected.map((resource) => `<td><a href="${resource.officialUrl}" target="_blank" rel="noopener">Open ${escapeHtml(resource.sourceLabel)} ↗</a><br><small>Checked ${checkedDate}</small></td>`).join('')}</tr></tbody></table>`;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }

    [search, category, platform, pricing].filter(Boolean).forEach((control) => control.addEventListener('input', render));
    $('[data-open-compare]')?.addEventListener('click', openComparison);
    $('[data-close-compare]')?.addEventListener('click', () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); });
    modal?.addEventListener('click', (event) => { if (event.target === modal) modal.classList.remove('is-open'); });
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
      let scored = resources.map((resource) => {
        let score = 0;
        if (goal === 'all' || resource.goals.includes(goal)) score += 4;
        if (device === 'all' || resource.platforms.includes(device)) score += 4;
        if (budget === 'all' || (budget === 'free' && ['built-in', 'free', 'open-source'].includes(resource.pricingType))) score += 2;
        return { resource, score };
      }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);

      const exactDevice = device !== 'all';
      if (exactDevice) scored = scored.filter((item) => item.resource.platforms.includes(device));
      if (!scored.length) {
        results.innerHTML = `<div class="empty-state"><strong>No exact fit yet.</strong><p>Try “Any device” or relax the budget filter. A mismatch is useful information - you should not force a recommendation.</p></div>`;
        return;
      }
      results.innerHTML = `<div class="eyebrow">Your short list</div><p class="muted">Start with the first match, then check its current official details before you install anything.</p>` + scored.map(({ resource, score }) => `
        <article class="result-card">
          <a class="resource-icon-link" href="/resource/${resource.id}" aria-label="Open details for ${escapeHtml(resource.name)}"><div class="resource-icon accent-${resource.accent}" aria-hidden="true">${resource.icon}</div></a>
          <div><h3>${escapeHtml(resource.name)}</h3><p>${escapeHtml(resource.bestFor)} ${device !== 'all' ? `Works with ${escapeHtml(device)} in this shortlist.` : ''}</p></div>
          <span class="match-score">${score >= 8 ? 'Strong fit' : 'Worth a look'}</span>
          <a class="btn btn-secondary btn-small" href="${resource.officialUrl}" target="_blank" rel="noopener">Check official details ↗</a>
        </article>`).join('');
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function setupFeedbackForm() {
    const form = $('[data-feedback-form]');
    const success = $('[data-form-success]');
    if (!form || !success) return;
  form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        ease: $('#ease')?.value || '',
        found: $('#found')?.value || '',
        guide: $('#guide')?.value || '',
        improve: $('#improve')?.value || ''
      };
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Feedback request failed');
        const result = await response.json();
        success.textContent = result.message || 'Thanks - your anonymous note was saved locally.';
        form.reset();
      } catch (_) {
        success.textContent = 'The FastAPI server is not reachable yet. Start it with the command in README.md, then submit again.';
      }
      success.classList.add('is-visible');
    });
  }

  function showToast(message) {
    let toast = $('.toast');
    if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(window.__dwToast);
    window.__dwToast = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  async function initialize() {
    setupNavigation();
    try {
      const response = await fetch('/api/resources');
      if (response.ok) {
        const serverResources = await response.json();
        const byId = new Map(serverResources.map((resource) => [resource.id, resource]));
        resources = resources.map((resource) => ({ ...resource, ...(byId.get(resource.id) || {}) }));
      }
    } catch (_) {
      // The bundled data.js remains a safe fallback for static inspection.
    }
    renderFeatured();
    renderGuides();
    setupResourceDirectory();
    setupQuiz();
    setupFeedbackForm();
  }

  initialize();
})();
