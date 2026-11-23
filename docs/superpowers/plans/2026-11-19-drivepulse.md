# DrivePulse Implementation Plan

> **For agentic workers:** Execute inline using superpowers:executing-plans. User has authorized specification and implementation; routine implementation choices do not require another approval.

**Goal:** Deliver a working owner-operations workflow demo and portfolio explanation page.

**Architecture:** Browser modules isolate deterministic workflow logic, fixture data, persistence, rendering and event handling. A dependency-free Node server serves the app. Browser localStorage is the single-user persistence boundary.

**Tech Stack:** HTML, CSS, ES Modules, Node.js 22+ built-in test runner and HTTP server.

**Spec:** `docs/superpowers/specs/2026-11-19-drivepulse-design.md`

## Global Constraints

- 独立目录 `drivepulse`；使用 HTML、CSS、浏览器 ES Modules，无外部网络依赖。
- Node.js 22+ 原生静态服务与原生 test runner；无需安装第三方依赖。
- 状态保存在当前浏览器 localStorage；不提供多人同步或账号权限。
- 桌面宽屏优先，同时适配 390px 手机视口。
- 固定演示业务日期为 2026-11-19，界面明确标记。

## Task 1: Domain behavior and fixture data

Files: `src/data.js`, `src/engine.js`, `tests/engine.test.js`, `package.json`.

Interfaces: `createState`, `queryOwnerSegment`, `screenOwners`, `beginRun`, `advanceRun`, `retryRun`, `approveRun`, `recordOutcome`, `getMetrics` as defined in the spec. Functions mutate a serializable state where appropriate; UI persists after mutations.

- [x] Write behavior tests for explicit approval, filtering, duplicate prevention, failure recovery, expired policy, changed eligibility and feedback-derived metrics.
- [x] Run `node --test` and confirm tests fail against missing behavior.
- [x] Implement functions and hand-authored fictional fixtures; use finite state transitions and validate write boundaries.
- [x] Run `node --test` and fix observed failures.

Example acceptance assertion:
```js
const run = beginRun(state, input);
while (run.status === 'running') advanceRun(state, run.id);
assert.equal(state.operations.length, 0);
approveRun(state, run.id, {selectedIds: run.eligible.map(x => x.id), message: run.message});
const count = state.operations.length;
approveRun(state, run.id, {selectedIds: run.eligible.map(x => x.id), message: run.message});
assert.equal(state.operations.length, count);
```

## Task 2: Usable product and persistence

Files: `index.html`, `styles.css`, `src/app.js`, `src/store.js`, `server.mjs`.

Interfaces: `loadState`/`saveState` persist versioned state. `renderApp(state, ui)` returns escaped HTML. Event delegation calls the domain interfaces. Hash routes preserve navigation on reload. Running tasks resume their saved step.

- [x] Add Node static server, content types, path confinement and fallback to index for valid app navigation.
- [x] Implement dashboard, task detail, owner directory, results and portfolio screens.
- [x] Add form validation, scenario injection, approval editing, outcome recording and export.
- [x] Verify native module imports and serve the application locally.

Running cycle:
```js
advanceRun(state, run.id);
saveState(state);
render();
if (run.status === 'running') scheduleNextStep(run.id);
```

## Task 3: Browser verification and delivery

Files: `README.md`, `docs/verification.md`, `artifacts/`.

- [x] Use a real browser to inspect desktop UI and run a task from goal through feedback.
- [x] Check text edits, selection, repeated approval, refresh persistence, failed query retry and expired rule recovery.
- [x] Check portfolio navigation, owner search, responsive layout and console errors.
- [x] Re-run domain tests after any logic fixes; document evidence and limitations.
- [x] Leave local preview running, open it in Codex and provide startup instructions.

No existing commit is present in the parent repository. This new application is isolated in its own directory; unrelated portfolio documents are not modified. Git publication is outside this delivery.

## Final implementation notes

Rendering and event coordination are in `src/app.js`; portfolio content is isolated in `src/portfolio.js`. Tool outputs can be expanded and exported. Browser checks used the in-app browser via CUA; evidence is recorded in `docs/verification.md`. The local preview uses port 4186 because 4173 belongs to an existing unrelated project. No Git commit was made because the environment disallows writing the parent `.git` directory.
