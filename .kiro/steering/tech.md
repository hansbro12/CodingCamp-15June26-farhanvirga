# Tech Stack

## Core Technologies

- **HTML5** — semantic markup, single `index.html` entry point
- **CSS3** — custom properties (CSS variables), CSS Grid, Flexbox, keyframe animations
- **Vanilla JavaScript (ES6+)** — no frameworks, no transpilation, no bundler

## Dependencies

None. Zero external libraries, CDN links, or npm packages.

## Browser APIs Used

- `localStorage` — persistent data storage for tasks and quick links
- `Notification` API — browser notifications on focus timer completion
- `setInterval` / `clearInterval` — timer countdown logic
- `URL` constructor — URL validation and favicon lookup

## No Build System

There is no build step, package.json, or compilation required. Open `index.html` directly in a browser or serve with any static file server.

```bash
# Simple local dev server options (any will work)
npx serve .
python -m http.server 8080
```

## Code Style

- **JavaScript**: IIFE pattern per feature module (`(function initX() { ... })()`), `const`/`let` only, arrow functions, template literals
- **CSS**: BEM-influenced class names (`.todo-item`, `.todo-action-btn`), all design tokens as CSS custom properties on `:root`
- **HTML**: Semantic elements (`<header>`, `<main>`, `<section>`), `id` attributes for JS hooks, `class` attributes for styling
- IDs are used exclusively for JavaScript targeting; classes are used for styling
- XSS prevention via `escHtml()` helper before inserting any user content into the DOM
