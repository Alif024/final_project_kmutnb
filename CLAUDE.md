# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI-NOC — an AI-assisted Network Operation Center dashboard for virtualization platforms
(VMware ESXi / Proxmox VE). KMUTNB senior project. It is a **UI-complete, mock-driven
prototype**: every screen works, but all data comes from `lib/mock-data.json`. The only
live external call is the Gemini chat route. `README.md` (Thai) holds the authoritative
feature/limitation matrix; `bugs.txt` records the findings of a full logic-bug audit
(24 found, 20 fixed, 4 deliberately left).

## Commands

```bash
npm run dev            # dev server on :3000
npm run build          # production build (output: 'standalone')
npm run start          # serve the build
npm run lint           # eslint . — must be run separately, see below
npm run clean          # rm -rf .next (plain node script; `next clean` does not exist)
npx tsc --noEmit       # type check
```

There is **no test framework** in this repo — no test runner, no test files, no CI.
Do not invent an `npm test` invocation. Verification is `npx tsc --noEmit` + `npm run lint`
+ `npm run build`, plus manual browser checks. Past browser verification was driven ad hoc
with `puppeteer-core`; it is intentionally *not* a project dependency.

`next.config.ts` sets `eslint.ignoreDuringBuilds: true` but `typescript.ignoreBuildErrors: false`
— a passing build says nothing about lint, while type errors *do* fail it. Always run
`npm run lint` on its own before calling a change clean.

## Architecture

### Single page, no router

`app/page.tsx` is the entire application. There is no router-based navigation and no state
management library. It owns all mutable state (`activeTab`, `activeSubTab`, `userRole`,
`approvals`, `recommendations`, `auditLogs`, `integrations`, modal targets) and renders one
of seven views by `activeTab` string: `dashboard`, `infrastructure`, `logs`, `ai-analysis`,
`action-center`, `reports`, `settings` (ids defined in `components/Sidebar.tsx`).

Consequences to respect when adding features:

- **Views are conditionally rendered, so they unmount on every tab switch.** Any state that
  must survive navigation has to live in `app/page.tsx` and come down as props — this is
  exactly why `integrations` sits there rather than inside `SettingsView`.
- **Deep links use the `(tab, subtab)` pair.** Views call `onNavigateTab(tab, subtab?)`;
  `page.tsx` stores `activeSubTab` and passes it down as `initialSubTab`, which each view uses
  only as the *initial value* of its own sub-tab `useState`. It is not a controlled prop.
- **Modals are keyed by record id** (`key={approveModalReq?.id}`) to force a fresh instance per
  request, so `isExecuting` state or a typed rejection reason never bleeds across requests.
  Keep that pattern for any new per-record modal.

### Data layer

`lib/mock-data.json` is the single data file. `lib/mock-data.ts` casts it to the interfaces in
`types/ai-noc.ts` (JSON widens unions to `string`, hence `as unknown as MockData`) and
re-exports everything under both `initial*`/`sample*` and `MOCK_*` alias names. To wire real
telemetry, replace the source of `data` in that one file — that is the designed seam.

`types/ai-noc.ts` is the domain source of truth; the JSON conforms to it, not the reverse.

### Log layer — go through `lib/log-source.ts`

Every log consumer (Log Explorer, Log Evidence in AI Analysis, the per-node/host Logs tabs, and
the AI chat system prompt) reads through this adapter. **Do not import syslogs from `mock-data`
directly** — the file exists so a real Graylog REST call can replace it in one place, and its
header documents the intended endpoint and field mapping.

Non-obvious rules encoded there:

- Mock timestamps are `HH:mm:ss` only and all fall on the same simulated day. Time math is
  seconds-from-midnight, and "now" is the constant `TELEMETRY_NOW = '15:42:18'`, not
  `Date.now()`. Anything time-based must use these helpers or it will silently disagree.
- `buildGraylogQuery()` already emits real Graylog query syntax; it drives both the on-screen
  Query Echo and the future API call. Extend it when adding a filter dimension.
- Facet counts mimic Graylog's Fields sidebar: each facet is counted from results filtered by
  *the other* dimensions but not by its own, so picking one option does not zero out its
  siblings. The histogram is likewise built from `beforeBuckets` — results **before** the
  clicked time-bucket filter — so every bar stays visible and more buckets can be added.
  Filtering the histogram by its own selection would trap the user on a single bar.
- Severity is RFC 5424 numeric (`severityLevel <= 3` means error-or-worse); `SEVERITY_META`
  maps the numbers to names and tones.

### AI integration

`app/api/ai/chat/route.ts` is the only API route. It runs server-side, reads `GEMINI_API_KEY`,
and returns a canned Thai mock reply when the key is missing — the app must keep working with
no key set. The Thai system prompt hard-codes hypervisor/VM telemetry inline but pulls real log
lines via `getCriticalLogsForContext()` / `formatLogsForPrompt()`, and instructs the model not
to invent log lines outside that context. `citedEntities` in the response is currently a
constant. AI Diagnosis (RCA) does **not** call a model — it renders `MOCK_DIAGNOSIS_01`.

### Layout / scrolling contract

The shell in `app/page.tsx` is exactly viewport height (`h-screen` + `overflow-hidden`), so the
page itself never scrolls. All scrolling happens inside `<main>` or deeper. TopBar and StatusBar
are `fixed`, and the content column reserves space for them with `pt-14 pb-9`.

Do not reintroduce `min-h-screen` (a *minimum*, which lets content grow past the viewport and
slide under the fixed bars) or `100vh` arithmetic with magic constants. A view that wants to
fill the screen sets `lg:flex-1 lg:min-h-0` on itself and manages scrolling inside its own
columns — `LogExplorerView` is the reference implementation, and `page.tsx` drops the bottom
padding for it (`activeTab === 'logs' ? 'lg:pb-0' : ''`).

### Styling

Tailwind v4 via `@import "tailwindcss"` in `app/globals.css` — there is no `tailwind.config`.
Dark mode is **class-based**, declared with `@custom-variant dark (&:where(.dark, .dark *))`,
not the OS preference. `<html>` ships with `class="dark"`; `ThemeToggle` flips that one class
and saves to `localStorage`, and an inline script in `layout.tsx` re-applies a saved `light`
before paint. There is no theme context, and the toggle's icons are driven by the `dark:`
variant rather than React state, so nothing needs to sync on mount.

Design tokens are CSS custom properties in `globals.css` (`--critical`, `--warning`,
`--healthy`, `--chart-*`, …); the frosted-glass look comes from the `.glass-panel*` utilities.
Because light mode is a real supported mode, **every color utility needs both a light and a
dark value**. Selected/active controls sitting on a saturated blue fill use plain `text-white`
in both themes — `text-slate-900 dark:text-white` on a blue chip renders dark-on-dark in light
mode, a real bug that had to be fixed across `InfrastructureView`.

### Integrations

`lib/integrations.ts` holds per-type metadata (required fields, badge, accent, button labels,
whether the card gets Sync Now) shared by `AddIntegrationModal` and `SettingsView`, so the
wizard and the card can never drift apart. Connection tests are simulated by
`hooks/use-connection-test.ts` and always succeed; nothing is actually dialed.

## Conventions

- **All user-facing strings, code comments, and commit messages are Thai.** Match that when
  editing; do not translate existing Thai comments into English.
- Dates shown to users are Buddhist era (พ.ศ., e.g. 2569) and formatted with `th-TH` locale
  calls. Incident ids follow `INC-<BE year>-<MMDD>-<seq>`.
- Imports use the `@/*` path alias (`tsconfig.json` maps it to the repo root).
- `lib/utils.ts` exports `cn()` (clsx + tailwind-merge) for conditional class names.
- When a change alters a documented behavior, capability, or known limitation, update the
  matching row in `README.md` — it carries detailed status tables that go stale easily.
