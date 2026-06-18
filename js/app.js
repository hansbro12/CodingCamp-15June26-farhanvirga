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
   1. GREETING & CLOCK
══════════════════════════════════════════ */
(function initGreeting() {
  const greetingEl = document.getElementById('greeting-text');
  const datetimeEl = document.getElementById('current-datetime');

  const greetings = {
    dawn:      'Good Early Morning! 🌌',
    morning:   'Good Morning! ☀️',
    afternoon: 'Good Afternoon! 🌤️',
    evening:   'Good Evening! 🌆',
    night:     'Good Night! 🌙'
  };

  function getGreeting(hour) {
    if (hour >= 4  && hour < 7)  return greetings.dawn;
    if (hour >= 7  && hour < 12) return greetings.morning;
    if (hour >= 12 && hour < 17) return greetings.afternoon;
    if (hour >= 17 && hour < 21) return greetings.evening;
    return greetings.night;
  }

  function updateClock() {
    const now  = new Date();
    const hour = now.getHours();

    greetingEl.textContent = getGreeting(hour);

    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    datetimeEl.textContent = `${dateStr}  •  ${timeStr}`;
  }

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

  let totalSeconds  = 25 * 60;
  let remaining     = totalSeconds;
  let intervalId    = null;
  let isRunning     = false;
  let sessionCount  = 0;

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

  function setMode(minutes) {
    clearInterval(intervalId);
    isRunning    = false;
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
      // Browser notification if permitted
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
    // Request notification permission on first start
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
      setMode(Number(btn.dataset.minutes));
    });
  });

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
