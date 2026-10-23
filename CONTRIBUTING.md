# Contributing to Focus Tracker

Thanks for taking the time to contribute! Bug reports, ideas, docs fixes and code are all welcome.

## Ways to help

- **Report a bug**: [open an issue](https://github.com/somcpp/focus-tracker/issues/new/choose) using the bug template. Steps to reproduce and a screenshot help a lot.
- **Suggest a feature**: use the feature template and describe the problem you're trying to solve, not only the solution.
- **Pick up an issue**: issues labelled `good first issue` or `help wanted` are a good place to start. Comment on the issue so others know you're on it.
- **Improve docs**: README, comments, this guide.

For anything larger than a small fix, please open an issue first so we can agree on the approach before you spend time on it.

## Development setup

Requirements: **Node.js 20.9+** and **npm**.

```bash
git clone https://github.com/<your-username>/focus-tracker.git
cd focus-tracker
npm install
npm run dev
```

The app runs at http://localhost:3000. There's no backend, database or `.env` to configure: all data lives in your browser's `localStorage`.

**Need sample data?** Generate a backup file with ~10 weeks of realistic tasks, sessions and journal entries, then load it through **Settings → Import backup**:

```bash
node -e "import('./scripts/demo-data.mjs').then(m => process.stdout.write(JSON.stringify(m.demoState().state)))" > demo-backup.json
```

## Before you open a pull request

Run all three; CI runs them too:

```bash
npm run lint
npm run typecheck
npm run build
```

Then check your change in the browser in **light and dark mode** and at a **mobile width** (Chrome DevTools → device toolbar).

If you changed something visible, regenerate the screenshots used in the README:

```bash
npm run build && npm start      # terminal 1
npm run screenshots             # terminal 2 (needs Chrome or Edge installed)
```

## Project conventions

### Next.js 16

This project uses Next.js 16, which has breaking changes compared to older versions (for example, `cacheComponents` and instant-navigation validation are enabled). Check the guides bundled in `node_modules/next/dist/docs/` before relying on older patterns.

### Client-only pages

All data is in `localStorage`, so pages render only in the browser. Each route's default export wraps its content in `<ClientOnly>`:

```tsx
export default function Page() {
  return (
    <ClientOnly>
      <MyPage />
    </ClientOnly>
  );
}
```

Hooks like `useParams` must be called inside the wrapped component, not in `Page` itself, or the production build fails.

### State and data model

- The store lives in `src/lib/store.ts` (Zustand + `persist`). Add new actions there; keep components thin.
- Derive values (totals, streaks, grouping) in `src/lib/selectors.ts` instead of storing them.
- **Changing the persisted shape?** Bump `version` in the `persist` options and extend `migrate` so existing users' data upgrades cleanly. Never rename the storage key (`grindlog-v1`), or everyone loses their data.
- Zustand selectors must return stable values. `useStore((s) => s.tasks.filter(...))` creates a new array every render and loops forever; select `s.tasks` and filter outside.

### UI

- Use the existing building blocks: `Button`, `IconButton`, `Modal`, `PageHeader`, `SectionTitle`, `StatCard`, `CategoryIcon`, `RichText` and the `card` utility.
- Colors come from CSS variables in `src/app/globals.css` (`bg-card`, `text-muted`, `border-line`, `text-accent`…) so dark mode works automatically. Avoid hard-coded grays.
- Category colors go through `solid()` / `tint()` in `src/lib/colors.ts`.
- Icons are from [lucide-react](https://lucide.dev). No emoji in the UI.
- Keep it accessible: real buttons or `role="button"` with keyboard handlers, `aria-label` on icon-only buttons, and no buttons nested inside buttons.

### Code style

- TypeScript strict; no `any` unless there's no reasonable alternative.
- Match the surrounding code: naming, comment density, file layout.
- Comments explain *why*, not *what*.

## Commits and pull requests

- Branch from `main`: `feat/journal-search`, `fix/calendar-month-stats`, `docs/readme-typos`.
- Write commit messages in the imperative mood with a short summary line, e.g. `Fix calendar stats ignoring the selected month`.
- Keep PRs focused on one thing. Smaller PRs get reviewed faster.
- Fill in the pull request template, link the issue (`Closes #12`) and add before/after screenshots for UI changes.
- Be patient and kind in review. We're all here to make the app better.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold it.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
