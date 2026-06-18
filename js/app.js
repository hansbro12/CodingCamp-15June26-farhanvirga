/* ═══════════════════════════════════════════
   Life Dashboard — app.js
   Single JS file, Vanilla JS, LocalStorage
═══════════════════════════════════════════ */

/* ─── Storage helpers ─── */
const store = {
  get: (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

/* ══════════════════════════════════════════
   0. SETTINGS (theme, name, pomodoro time)
══════════════════════════════════════════ */
const settings = (function initSettings() {
  const settingsBtn    = document.getElementById('settings-btn');
  const modal          = document.getElementById('settings-modal');
  const saveBtn        = document.getElementById('settings-save');
  const cancelBtn      = document.getElementById('settings-cancel');
  const themeToggle    = document.getElementById('theme-toggle');
  const nameInput      = document.getElementById('name-input');
  const pomodoroInput  = document.getElementById('pomodoro-input');

  // Persisted settings state
  let current = store.get('settings', {
    theme:        'dark',
    name:         '',
    pomodoroMins: 25
  });

  // Pending state while modal is open
  let pending = {};

  /* ── apply theme ── */
  function applyTheme(theme) {
    document.body.classList.toggle('light', theme === 'light');
    themeToggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
  }

  /* ── public getters ── */
  function getName()         { return current.name; }
  function getPomodoroMins() { return current.pomodoroMins; }

  /* ── open modal ── */
  function openModal() {
    pending = { ...current };
    nameInput.value     = current.name;
    pomodoroInput.value = current.pomodoroMins;
    applyTheme(current.theme);       // reflect current in toggle
    modal.classList.remove('hidden');
    nameInput.focus();
  }

  /* ── close modal ── */
  function closeModal() {
    // Revert any live theme preview
    applyTheme(current.theme);
    modal.classList.add('hidden');
  }

  /* ── live theme preview via toggle ── */
  themeToggle.addEventListener('click', () => {
    const next = themeToggle.getAttribute('aria-checked') === 'true' ? 'dark' : 'light';
    themeToggle.setAttribute('aria-checked', next === 'light' ? 'true' : 'false');
    document.body.classList.toggle('light', next === 'light');
    pending.theme = next;
  });

  /* ── save ── */
  saveBtn.addEventListener('click', () => {
    const newName = nameInput.value.trim();
    const newMins = Math.min(99, Math.max(1, parseInt(pomodoroInput.value, 10) || 25));

    current = {
      theme:        pending.theme        ?? current.theme,
      name:         newName,
      pomodoroMins: newMins
    };
    store.set('settings', current);
    applyTheme(current.theme);

    // Notify greeting to re-render
    document.dispatchEvent(new CustomEvent('settings:saved'));
    // Notify timer to update pomodoro duration
    document.dispatchEvent(new CustomEvent('settings:pomodoro', { detail: current.pomodoroMins }));

    modal.classList.add('hidden');
  });

  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  settingsBtn.addEventListener('click', openModal);

  // Apply saved theme immediately on load
  applyTheme(current.theme);

  return { getName, getPomodoroMins };
})();

/* ══════════════════════════════════════════
   1. GREETING & CLOCK
══════════════════════════════════════════ */
(function initGreeting() {
  const greetingEl = document.getElementById('greeting-text');
  const datetimeEl = document.getElementById('current-datetime');

  const greetings = {
    dawn:      'Good Early Morning',
    morning:   'Good Morning',
    afternoon: 'Good Afternoon',
    evening:   'Good Evening',
    night:     'Good Night'
  };

  const emojis = {
    dawn: '🌌', morning: '☀️', afternoon: '🌤️', evening: '🌆', night: '🌙'
  };

  function getPeriod(hour) {
    if (hour >= 4  && hour < 7)  return 'dawn';
    if (hour >= 7  && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  function buildGreeting(hour) {
    const period = getPeriod(hour);
    const name   = settings.getName();
    const suffix = name ? `, ${name}` : '!';
    return `${greetings[period]}${suffix} ${emojis[period]}`;
  }

  function updateClock() {
    const now  = new Date();
    const hour = now.getHours();

    greetingEl.textContent = buildGreeting(hour);

    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    datetimeEl.textContent = `${dateStr}  •  ${timeStr}`;
  }

  // Re-render greeting when settings are saved
  document.addEventListener('settings:saved', () => updateClock());

  updateClock();
  setInterval(updateClock, 1000);
})();

/* ══════════════════════════════════════════
   2. FOCUS TIMER
══════════════════════════════════════════ */
(function initTimer() {
  const displayEl = document.getElementById('timer-display');
  const statusEl  = document.getElementById('timer-status');
  const startBtn  = document.getElementById('timer-start');
  const stopBtn   = document.getElementById('timer-stop');
  const resetBtn  = document.getElementById('timer-reset');
  const modeBtns  = document.querySelectorAll('.mode-btn');

  // Read saved pomodoro duration from settings
  let pomodoroMins  = settings.getPomodoroMins();
  let totalSeconds  = pomodoroMins * 60;
  let remaining     = totalSeconds;
  let intervalId    = null;
  let isRunning     = false;
  let sessionCount  = 0;
  let activeMode    = 'pomodoro'; // 'pomodoro' | 'short' | 'long'

  // Keep the Pomodoro button label in sync
  function syncPomodoroBtn() {
    const pomBtn = document.querySelector('.mode-btn[data-mode="pomodoro"]');
    if (pomBtn) pomBtn.textContent = `Pomodoro (${pomodoroMins}m)`;
  }

  function format(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function render() {
    displayEl.textContent = format(remaining);
    document.title = isRunning
      ? `${format(remaining)} — Focus`
      : 'Life Dashboard';
  }

  function setMode(minutes, mode) {
    clearInterval(intervalId);
    isRunning    = false;
    activeMode   = mode;
    totalSeconds = minutes * 60;
    remaining    = totalSeconds;
    statusEl.textContent = 'Ready to focus!';
    render();
  }

  function tick() {
    if (remaining <= 0) {
      clearInterval(intervalId);
      isRunning = false;
      sessionCount++;
      statusEl.textContent = `🎉 Session complete! Total: ${sessionCount}`;
      render();
      if (Notification.permission === 'granted') {
        new Notification('Focus session complete!', {
          body: 'Time for a break 🎉',
          icon: ''
        });
      }
      return;
    }
    remaining--;
    render();
  }

  startBtn.addEventListener('click', () => {
    if (isRunning) return;
    if (remaining === 0) remaining = totalSeconds;
    isRunning = true;
    statusEl.textContent = 'Stay focused! 💪';
    intervalId = setInterval(tick, 1000);
    render();
    if (Notification.permission === 'default') Notification.requestPermission();
  });

  stopBtn.addEventListener('click', () => {
    if (!isRunning) return;
    clearInterval(intervalId);
    isRunning = false;
    statusEl.textContent = 'Paused — take a breath.';
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(intervalId);
    isRunning = false;
    remaining = totalSeconds;
    statusEl.textContent = 'Ready to focus!';
    render();
  });

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      const mins = mode === 'pomodoro' ? pomodoroMins : Number(btn.dataset.minutes);
      setMode(mins, mode);
    });
  });

  // When settings are saved with a new pomodoro duration
  document.addEventListener('settings:pomodoro', e => {
    pomodoroMins = e.detail;
    syncPomodoroBtn();
    // If currently on pomodoro mode, reset to new duration
    if (activeMode === 'pomodoro') {
      setMode(pomodoroMins, 'pomodoro');
    }
  });

  syncPomodoroBtn();
  render();
})();

/* ══════════════════════════════════════════
   3. TO-DO LIST
══════════════════════════════════════════ */
(function initTodo() {
  const input      = document.getElementById('todo-input');
  const addBtn     = document.getElementById('todo-add');
  const listEl     = document.getElementById('todo-list');
  const countEl    = document.getElementById('todo-count');
  const clearBtn   = document.getElementById('todo-clear-done');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // Modal elements
  const modal      = document.getElementById('edit-modal');
  const editInput  = document.getElementById('edit-input');
  const saveBtn    = document.getElementById('edit-save');
  const cancelBtn  = document.getElementById('edit-cancel');

  let tasks       = store.get('tasks', []);
  let currentFilter = 'all';
  let editingId   = null;

  /* ── helpers ── */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function save() {
    store.set('tasks', tasks);
  }

  function getFiltered() {
    if (currentFilter === 'active') return tasks.filter(t => !t.done);
    if (currentFilter === 'done')   return tasks.filter(t =>  t.done);
    return tasks;
  }

  function updateCount() {
    const active = tasks.filter(t => !t.done).length;
    countEl.textContent = active === 1 ? '1 task left' : `${active} tasks left`;
  }

  /* ── render ── */
  function render() {
    const filtered = getFiltered();
    listEl.innerHTML = '';

    if (filtered.length === 0) {
      listEl.innerHTML = `<li class="todo-empty">No tasks here yet.</li>`;
      updateCount();
      return;
    }

    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `todo-item${task.done ? ' done' : ''}`;
      li.dataset.id = task.id;

      li.innerHTML = `
        <span class="todo-check${task.done ? ' checked' : ''}" title="Toggle done"></span>
        <span class="todo-text">${escHtml(task.text)}</span>
        <div class="todo-actions">
          <button class="todo-action-btn edit" title="Edit">✏️</button>
          <button class="todo-action-btn delete" title="Delete">🗑️</button>
        </div>
      `;

      // Toggle done
      li.querySelector('.todo-check').addEventListener('click', () => {
        const t = tasks.find(x => x.id === task.id);
        if (t) { t.done = !t.done; save(); render(); }
      });

      // Edit
      li.querySelector('.edit').addEventListener('click', () => {
        editingId = task.id;
        editInput.value = task.text;
        modal.classList.remove('hidden');
        editInput.focus();
      });

      // Delete
      li.querySelector('.delete').addEventListener('click', () => {
        tasks = tasks.filter(x => x.id !== task.id);
        save();
        render();
      });

      listEl.appendChild(li);
    });

    updateCount();
  }

  /* ── add task ── */
  function addTask() {
    const text = input.value.trim();
    if (!text) return;
    tasks.push({ id: uid(), text, done: false });
    save();
    input.value = '';
    currentFilter = 'all';
    filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    render();
  }

  addBtn.addEventListener('click', addTask);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

  /* ── clear done ── */
  clearBtn.addEventListener('click', () => {
    tasks = tasks.filter(t => !t.done);
    save();
    render();
  });

  /* ── filters ── */
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  /* ── modal save / cancel ── */
  saveBtn.addEventListener('click', () => {
    const newText = editInput.value.trim();
    if (!newText) return;
    const t = tasks.find(x => x.id === editingId);
    if (t) { t.text = newText; save(); render(); }
    modal.classList.add('hidden');
    editingId = null;
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    editingId = null;
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      editingId = null;
    }
  });

  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn.click();
    if (e.key === 'Escape') cancelBtn.click();
  });

  /* ── XSS escape ── */
  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  render();
})();

/* ══════════════════════════════════════════
   4. QUICK LINKS
══════════════════════════════════════════ */
(function initLinks() {
  const nameInput = document.getElementById('link-name-input');
  const urlInput  = document.getElementById('link-url-input');
  const addBtn    = document.getElementById('link-add');
  const grid      = document.getElementById('links-grid');

  let links = store.get('quicklinks', []);

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function save() {
    store.set('quicklinks', links);
  }

  function getFaviconUrl(href) {
    try {
      const url = new URL(href);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    } catch { return ''; }
  }

  function render() {
    grid.innerHTML = '';

    if (links.length === 0) {
      grid.innerHTML = `<span class="links-empty">No links yet — add your favorites above.</span>`;
      return;
    }

    links.forEach(link => {
      const chip = document.createElement('a');
      chip.className   = 'link-chip';
      chip.href        = link.url;
      chip.target      = '_blank';
      chip.rel         = 'noopener noreferrer';

      const faviconSrc = getFaviconUrl(link.url);
      chip.innerHTML = `
        ${faviconSrc ? `<img class="link-favicon" src="${faviconSrc}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        <span>${escHtml(link.name)}</span>
        <button class="link-remove" title="Remove link" data-id="${link.id}">✕</button>
      `;

      // Remove button — stop propagation so link doesn't open
      chip.querySelector('.link-remove').addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        links = links.filter(l => l.id !== link.id);
        save();
        render();
      });

      grid.appendChild(chip);
    });
  }

  function addLink() {
    const name = nameInput.value.trim();
    let   url  = urlInput.value.trim();
    if (!name || !url) return;

    // Auto-prepend https:// if missing
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    try { new URL(url); } catch {
      urlInput.focus();
      urlInput.style.borderColor = 'var(--danger)';
      setTimeout(() => urlInput.style.borderColor = '', 1500);
      return;
    }

    links.push({ id: uid(), name, url });
    save();
    nameInput.value = '';
    urlInput.value  = '';
    render();
  }

  addBtn.addEventListener('click', addLink);
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') addLink(); });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') urlInput.focus(); });

  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  render();
})();
