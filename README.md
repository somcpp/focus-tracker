# GrindLog ⏱️

A colorful focus tracker: log what you're working on, hit play, and watch your hours, streaks and calendar fill up.

## Features

- **Today**: categories (DSA, Dev, …) with collapsible task lists. Each task has play / pause / finish, and only one timer runs at a time.
- **Live totals** per task, per category, and for the day, plus a goal progress ring.
- **Task details**: notes, difficulty (easy / medium / hard), and editable sessions. You can add minutes by hand if you forgot to start the timer.
- **Day log** for any date: timeline, category split, a copyable summary, and a journal (mood, reflection, plan for tomorrow).
- **Calendar heatmap**: greener means more hours. Also shows current and best streaks.
- **Stats**: daily/weekly bars, category split, focus-by-hour, longest tasks, a 12-month heatmap.
- Carry over unfinished tasks, "still working?" idle check, optional Pomodoro mode, confetti when you hit your goal.
- Dark mode, the `Space` shortcut to pause/resume, and JSON export/import.

All data is stored in the browser's `localStorage` (key `grindlog-v1`). There is no account or server. Use **Settings → Export backup** to keep a copy.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Stack: Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand (persisted store), Motion, lucide-react.
