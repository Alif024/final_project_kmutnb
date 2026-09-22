# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI-NOC — an AI-assisted Network Operation Center dashboard for virtualization platforms
(VMware ESXi / Proxmox VE). KMUTNB senior project. It is a **UI-complete, mock-driven
prototype**: every screen works, but all data falls back to `lib/mock-data.json`. The two
routes that reach outside are the Gemini chat route and device discovery (Zabbix / vCenter /
Proxmox), and discovery falls back to mock data per source when it is not configured. `README.md` (Thai) holds the authoritative
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

`npm run start` is listed in package.json but **does not work**: `next start` refuses
`output: 'standalone'`. To serve a build, run `node .next/standalone/server.js` after copying
`.next/static` and `public` next to it, or just use `npm run dev`.

There is **no test framework** in this repo — no test runner and no test files.
Do not invent an `npm test` invocation. CI exists but runs only the three checks below
(`.github/workflows/ci.yml`), so a green PR still means nothing was executed. Verification is `npx tsc --noEmit` + `npm run lint`
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

### Device discovery — go through `lib/device-discovery.ts`

Server-only adapter (it reads credentials from env) that unifies three sources into one
`DiscoveredDevice` shape: Zabbix JSON-RPC (`host.get`, SNMP vs Agent decided by interface
`type`), vCenter REST (`/api/session` then `/api/vcenter/host`+`/vm`) and Proxmox
(`/api2/json/nodes` + `/cluster/resources`). Never import it into a client component —
the UI calls `GET /api/discovery`.

Each source is fetched independently and **falls back to mock data on any failure**, reporting
`sources[].live = false` plus the error so the UI can label that batch as simulated. A source
being down never fails the whole request. Device ids are `` `<source>:<nativeId>` `` so they stay
stable across refreshes — the saved topology references them.

The Zabbix path also returns **LLDP/CDP neighbors** (`DiscoveryResult.neighbors`): which device
sits on the far end of each port. Real Zabbix stores these as low-level-discovery items whose key
names depend on the template in use, so there is no fixed key — `ZABBIX_NEIGHBOR_KEYS` (default
`lldp,cdp`) sets the prefixes, items are grouped by the index in `key[...]`, and field roles are
matched loosely (`sysname`/`deviceid`, `portid`/`deviceport`, `manaddr`/`cacheaddress`). Since
Zabbix 5.4 dropped `lastvalue` from `item.get`, values come from a follow-up `history.get`.
A neighbor read that fails never fails the device list — it logs and returns `[]`.

Note that vCenter and Proxmox do not return guest IPs in their list endpoints (that needs
VMware Tools / QEMU Guest Agent and a per-VM call), so `ipAddress` is often `''`; code that
matches devices to records falls back to matching by name.

### Topology is user-drawn, never generated

`TopologyBuilder` + `DeviceInventoryPanel` replace what used to be a hand-written SVG tree.
**Do not add auto-layout or auto-generated topology** — this was an explicit product decision so
the diagram reflects real cabling as the operator knows it, not a guess. Discovered devices sit
in the inventory until dragged onto the canvas.

A modal rendered from inside the builder must be portaled to `document.body`
(`ClearTopologyModal` does this). The builder's own container uses `backdrop-blur-xl`, and an
element with a `backdrop-filter` becomes the containing block for `position: fixed` descendants —
without the portal the overlay covered only the builder box (878x700 of a 1500x950 viewport) instead
of the screen. The modals rendered from `SettingsView` sit in plain `div`s and are unaffected, so
this only bites inside glass panels.

Nodes on the canvas take `setPointerCapture` on pointerdown so a drag keeps tracking outside the
box. That capture retargets pointerup to the node, so `click` lands on the node and **never reaches
a button inside it**. Any interactive child of a node must stop pointerdown from bubbling
(`onPointerDown={(e) => e.stopPropagation()}`) or it will look dead — this is exactly what broke the
node's remove button. A synthetic `element.click()` bypasses pointer events and still works, so
browser tests must click by coordinates to catch it.

`hooks/use-topology-layout.ts` holds a **workspace of several named diagrams** (schema
`version: 2` under `ai-noc:topology-workspace`) in a module-level store exposed through
`useSyncExternalStore`, persisted to `localStorage`. Mutations apply to the active diagram only.
A single-layout `version: 1` value left at the old key `ai-noc:topology-layout` is migrated into
the workspace on first read, so keep that path when changing the schema again. There is always at
least one diagram — deleting the last one creates a fresh empty replacement — so `activeDiagram`
is never null. Import always adds a **new** diagram rather than overwriting the open one.

**Port-to-device mapping comes from LLDP/CDP only — there is no manual entry, by product
decision.** Hand-entered pairs go stale the moment someone re-patches a cable, and a diagram that
silently drifts from reality is worse than one that admits it does not know. A port with no
neighbor shows "—". Do not reintroduce an override control.

A link carries optional `sourceInterface`/`targetInterface`, written **only** by
`applyNeighborLink()` when the operator clicks "เพิ่มเส้นเชื่อมนี้ลงผัง" — detection never mutates
the diagram on its own, which keeps the "no auto-generated topology" rule intact. Because links
drawn by hand in connect mode carry no port names, `verifyLink()` falls back to looking the port up
in the neighbor table, so the down/red verdict still works for them. Port lists come from
`NetworkDevice.interfaces`, which only SNMP-discovered devices have, so the Interfaces tab renders
for those devices only. It is deliberately **not** `useState` +
`useEffect`: reading localStorage during render breaks hydration, and reading it in an effect
trips `react-hooks/set-state-in-effect` (an error, not a warning, in this ESLint config) while
causing a cascading render. `getServerSnapshot` returns a shared frozen empty layout — it must
be the same object every call or React re-renders forever. The same rule is why the discovery
fetch in `InfrastructureView` puts its first `setState` after an `await` and guards it with a
`cancelled` flag (the view unmounts on every tab switch).

### Port-to-peer map — `lib/interface-map.ts`

Builds "which port faces which device" for the canvas node tooltip, from neighbors only. It is
deliberately separate from link verification: this answers *who is on the far end*, that one answers
*is the drawn line trustworthy*. Ports sort with `localeCompare(..., { numeric: true })` so Gi0/2
precedes Gi0/24.

### Link verification — `lib/link-verification.ts`

Colors every drawn link by checking it against detected neighbors, in this order: a mapped port
that is `down` wins over everything (a stale LLDP cache should not paint a dead cable green), then
confirmation from either endpoint, then contradiction, then "no data". Four verdicts, not three:
**verified** (green), **down** (red), **mismatch** (solid grey) and **unverified** (dashed grey).
Keeping *unverified* separate from *mismatch* is deliberate — a device with LLDP/CDP disabled, or a
VM with no port data, can never be confirmed, and folding those into "wrongly connected" would
accuse correct diagrams. Every verdict carries a Thai `reason` string shown in the link tooltip, so
a color always comes with its evidence.

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

`app/api/ai/chat/route.ts` runs server-side, reads `GEMINI_API_KEY`,
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

### Deployment — self-hosted runner on the target box, not a hosted platform

`.github/workflows/deploy.yml` runs on a self-hosted GitHub Actions runner installed **on the
Linux server itself** (`runs-on: ai-noc` — a custom label; `self-hosted`/`Linux`/`X64` come for
free and add nothing here). It builds in place, swaps a symlink, and restarts a systemd unit.
Nothing is copied over SSH, so there are no deploy secrets in GitHub at all.

Server layout: each build lands in `/opt/ai-noc/releases/<utc-timestamp>-<sha7>/`, and
`/opt/ai-noc/current` is a symlink swapped atomically (`ln -sfn` into `.tmp` then `mv -T`).
The unit's `WorkingDirectory` is that symlink, so `systemctl restart` is the step that makes a
release live. Only two commands need `sudo` (`systemctl restart`/`status`), granted through
`deploy/ai-noc-deploy.sudoers`.

Rules that are load-bearing:

- **Release dirs are named by timestamp, never by sha alone.** Re-deploying the same commit
  would otherwise `rm -rf` the directory the running process is reading from, and would make
  `PREVIOUS_RELEASE` point at itself.
- **The rollback step keys off `env.RELEASE_DIR`**, which is written to `$GITHUB_ENV` *after*
  the swap succeeds — so a failure before the swap leaves `current` alone and never restarts a
  healthy service. `PREVIOUS_RELEASE` is captured *before* the copy. Keep that ordering when
  adding steps.
- Health check is `curl` against `/` in a 30×2s loop; on failure the previous release is
  re-linked and restarted. The rollback step also fires on `cancelled()`, since `failure()`
  alone is false for a cancelled job and would leave `current` on an unvalidated release.
  GitHub kills the runner shortly after a cancellation, so keep that step short.
- `npm ci --include=dev` is deliberate: the build needs typescript/tailwind from
  `devDependencies`, and a runner with `NODE_ENV=production` in its environment would have
  `npm ci` skip them silently.
- `EnvironmentFile=-/etc/ai-noc/ai-noc.env` carries a leading dash on purpose: the box must
  start the app with no config file at all, which is the same mock-first contract as
  `/api/ai/chat` and `lib/device-discovery.ts`. Only `GEMINI_API_KEY` is worth setting today;
  Zabbix/vCenter/Proxmox vars are left for later and each falls back on its own.
- The unit runs `node server.js` inside the standalone folder — never `npm run start`, which
  `next start` refuses under `output: 'standalone'`.
- `next build` does not copy `.next/static` or `public` into `.next/standalone`; the workflow
  does it by hand. There is no `public/` dir in this repo, hence the `[ -d public ]` guard.
- `actions/checkout` cleans the workspace (`git clean -ffdx`), so every deploy is a cold
  `npm ci` and a cold build. Fine on a normal VM; if it ever hits `timeout-minutes: 30`, pass
  `clean: false` to keep the `.next` cache rather than trimming the checks.

`ci.yml` runs the same three checks on pull requests only — `deploy.yml` re-runs them before
every release, so CI deliberately has no `push` trigger. Server-side setup (runner install,
systemd unit, sudoers, env file, reverse proxy, manual rollback) is documented in
`deploy/README.md` next to the templates it installs.

## Conventions

- **All user-facing strings, code comments, and commit messages are Thai.** Match that when
  editing; do not translate existing Thai comments into English.
- Dates shown to users are Buddhist era (พ.ศ., e.g. 2569) and formatted with `th-TH` locale
  calls. Incident ids follow `INC-<BE year>-<MMDD>-<seq>`.
- Imports use the `@/*` path alias (`tsconfig.json` maps it to the repo root).
- `lib/utils.ts` exports `cn()` (clsx + tailwind-merge) for conditional class names.
- When a change alters a documented behavior, capability, or known limitation, update the
  matching row in `README.md` — it carries detailed status tables that go stale easily.
