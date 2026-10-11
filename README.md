# St. Jude College – Student Appointment Scheduling System

React 19 + Vite + Tailwind CSS v4.

## Run it

```bash
pnpm install        # or: npm install
pnpm dev            # http://localhost:5173
pnpm build          # production build in dist/
pnpm typecheck
```

Requires Node 22 (see `.mise.toml`).

## Demo accounts

| Role    | ID / email                       | Password     |
| ------- | -------------------------------- | ------------ |
| Student | `2026-001` / prince@sjc.edu.ph   | `student123` |
| Student | `2026-002` / mark@sjc.edu.ph     | `student123` |
| Student | `2026-003` / jamaica@sjc.edu.ph  | `student123` |
| Staff   | `STAFF-001` / registrar@sjc.edu.ph | `staff123` |

## How it works

- Students book a slot from **Schedule** or **New Appointment**; bookings start as *Pending*. Double-booking a slot and booking past dates are rejected.
- Students can cancel their own appointments. Staff can **Approve → Confirm** or cancel any appointment, and reset data (Reports page).
- Data is stored in the browser's `localStorage` (or `window.storage` when running inside Figma Make). The list refreshes every 5 seconds and across tabs.
- Passwords are plain text seed data. This is a demo; a real deployment needs a backend with hashed credentials.
