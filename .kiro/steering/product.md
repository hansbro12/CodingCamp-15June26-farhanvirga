# Product: Life Dashboard

A personal productivity dashboard that runs entirely in the browser. It gives users a single page for managing their day with three core widgets:

- **Greeting & Clock** — time-based greeting with live date/time display
- **Focus Timer** — Pomodoro-style countdown with Pomodoro (25 min), Short Break (5 min), and Long Break (15 min) modes; browser notifications on session complete
- **To-Do List** — create, edit, complete, and delete tasks with All/Active/Done filters; persisted to localStorage
- **Quick Links** — save and launch favorite URLs as favicon chips; persisted to localStorage

All data is stored client-side via `localStorage`. There is no backend, no build step, and no external dependencies.
