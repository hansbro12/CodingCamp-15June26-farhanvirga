# Project Structure

```
/
├── index.html          # Single page — all markup and widget scaffolding
├── css/
│   └── style.css       # All styles — reset, design tokens, layout, components
├── js/
│   └── app.js          # All JavaScript — four IIFE modules in one file
└── README.md           # Project info
```

## Conventions

### index.html
- One `<section class="card ...">` per widget inside `<main class="dashboard">`
- Element `id`s follow the pattern `{widget}-{element}` (e.g. `timer-display`, `todo-input`)
- Modals are defined at the bottom of `<body>`, before the `<script>` tag
- The single `<script src="js/app.js">` tag is always last in `<body>`

### style.css
- Organized top-to-bottom: Reset → Design Tokens (`:root`) → Global → per-widget sections
- Each section is separated by a banner comment: `/* ─── SECTION NAME ─── */`
- All colors, radii, shadows, and font are CSS custom properties on `:root`
- Responsive overrides go in a single `@media` block at the end of the file

### app.js
- One IIFE per feature, in this order:
  1. `initGreeting` — clock and greeting
  2. `initTimer` — focus timer
  3. `initTodo` — to-do list
  4. `initLinks` — quick links
- Shared `store` object (`store.get` / `store.set`) at the top handles all localStorage access
- Each IIFE manages its own state, DOM references, and event listeners — no shared globals between modules
- `escHtml()` must be used whenever user-provided text is written into `innerHTML`

## Adding a New Widget

1. Add a `<section class="card {name}-card">` in `index.html` inside `<main class="dashboard">`
2. Add a corresponding `(function init{Name}() { ... })();` block at the bottom of `app.js`
3. Add styles in `style.css` under a new banner comment section
4. Use `store.get` / `store.set` for any data that should persist across page reloads
