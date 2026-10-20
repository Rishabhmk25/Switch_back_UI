# Switchback: Kokonut UI + anime.js integration

## Goal
Make the prototype feel more polished, with a slightly expressive motion tone. Use two motion systems side by side:
- **Kokonut UI** (installed as-is, driven by `motion/react`) for eight self-contained interactive widgets.
- **anime.js v4** for Switchback's own choreography: Memory row collapse when you forget a page, staggered list entrances, the recovery banner sliding in and out, and the sidebar spring.

The Settings Motion choice (Full / Calm / Off) must control both systems. We won't edit any Kokonut source files. Theme tokens get bridged by wrapper CSS only.

Success means all eight components show up in real, sensible places. They follow dark/light mode and the six accent themes, and they respect the Motion setting. Existing behavior (undo timing, confirm rules, keyboard paths) stays the same, and the build passes.

## Current repo facts
- Stack: React 19, Vite 8, Tailwind v4 (`@tailwindcss/vite`), `lucide-react`. The `@/*` alias points to `src/*` in both `tsconfig.json` and `vite.config.ts`.
- There's no `components.json`, no `src/lib/`, and no `motion`, `clsx`, `tailwind-merge` or `animejs` yet.
- Theme is set by a class on the `.sb-window` root in `src/App.tsx`: `sb-dark`/`sb-light`, `sb-accent-<id>`, and `sb-calm` when motion ≠ Full. Tokens live in `src/index.css` (`@theme inline` maps `--color-accent`, `--bg-*`, `--text-*`, `--line*`).
- `src/index.css` already has a `@media (prefers-reduced-motion: reduce)` block and the `.sb-calm` rule that sets all durations to 0.01ms.
- Host locations:
  - Status chip: `TopBar.tsx` around L295, with the inline Undo button and the `sb-undo` progress bar.
  - `showStatus(text, undo?, ms)`: `state.tsx` L105. Undo lasts 8s.
  - Recovery banner: `App.tsx` L17.
  - Sidebar width transition: `Sidebar.tsx` L65.
  - Memory view `Segmented`: `MemoryPage.tsx` L51.
  - Forget-everything dialog: `MemoryPage.tsx` around L217. You have to type "forget everything".
  - Ask view with passages: `CommandPalette.tsx` L189–215.
  - Toggles and Segmented controls: `SettingsPage.tsx`.

## 1. Dependencies and scaffolding
1. Install runtime deps with the project's package manager (use the existing lockfile): `motion`, `animejs` (v4), `clsx`, `tailwind-merge`. Also install any extra deps the Kokonut registry items declare (for example `@radix-ui/react-slot`, `class-variance-authority`) when the CLI or registry lists them.
2. Create `src/lib/utils.ts` exporting `cn(...inputs) = twMerge(clsx(inputs))`. Kokonut imports `@/lib/utils`.
3. Create a minimal `components.json` for the shadcn CLI:
   - style `new-york`, `tsx: true`, `rsc: false`
   - tailwind css `src/index.css`, `cssVariables: false`
   - aliases `components: @/components`, `utils: @/lib/utils`, `ui: @/components/ui`, `lib: @/lib`, `hooks: @/hooks`
4. Before installing, save a copy of `src/index.css`. Then run `npx shadcn@latest add https://kokonutui.com/r/<name>.json` for each of the eight items: `undo-button status-island switch-button hold-button ai-text-loading ai-citations command-button smooth-tab`.
   - After that, diff `src/index.css` and remove anything the CLI injected (shadcn `:root` vars, `@layer base`, a `dark` variant). The token bridge below replaces those.
   - Keep files wherever the CLI puts them (expected: `src/components/kokonutui/*.tsx`). Shadcn primitives they pull in go in `src/components/ui/`. That doesn't clash with the existing `src/components/ui.tsx`, but check that the import `@/components/ui` still resolves to the file the existing code expects. If it doesn't, the existing app imports are relative (`./ui`, `../components/ui`), so confirm with a grep.
   - **Fallback** if the CLI fails (network, interactive prompt): fetch each registry JSON with `webfetch` and write each `files[].content` verbatim to its `target` path. Install the listed `dependencies`.
5. Before wiring anything, read each installed component's props API. The mappings below assume the documented Kokonut APIs. If a component's real API differs (for example, `switch-button` is a theme sun/moon switch rather than a generic switch), use the alternate mapping listed for it.

## 2. Token bridge (wrapper CSS, no source edits)
In `src/index.css`:
- Add `@custom-variant dark (&:where(.sb-dark, .sb-dark *));` so every Kokonut `dark:` class follows Switchback's theme instead of the OS setting.
- Add a `.kk` scope class. It remaps the Tailwind v4 palette vars Kokonut uses onto Switchback tokens. This works because Tailwind v4 utilities resolve through `var(--color-*)`.
  - Neutrals (`--color-zinc-50…950`, `--color-neutral-50…950`, `--color-gray-*` if used): in `.sb-dark .kk` and `.sb-light .kk`, map the light stops (50–200) to `--bg-0/1/2` and the mid stops (300–500) to `--line`/`--line-strong`/`--text-3`. Map the dark stops (600–950) to `--text-2/--text-1` (light mode) or `--bg-3…--bg-0` (dark mode), so contrast direction stays correct in each mode. Write the exact stop table after reading which stops the eight components actually use (grep `zinc-|neutral-|gray-` in `src/components/kokonutui`).
  - Accents: map the hue families Kokonut uses for emphasis (e.g. `--color-blue-*`, `--color-indigo-*`, `--color-violet-*`, `--color-emerald-*`) to `--accent`, `color-mix(in oklab, var(--accent) X%, transparent)`, and `--accent-sub`. Map red/rose stops used by danger states to Switchback's danger token.
  - Set `font-family: inherit; font-size` overrides on `.kk` only if a component sets its own font. Set `--radius` if a shadcn primitive reads it (6px).
- Wrap every Kokonut usage in `<span className="kk contents">` or a `div.kk` so the remap stays local.
- Small sizing overrides (height, padding) go through wrapper `className` props or `.kk-<name>` descendant selectors. Don't edit component source.

## 3. Motion level plumbing
New file `src/lib/motion.ts`:
- `useMotionLevel(): 'Full' | 'Calm' | 'Off'` reads `s.motion` from the store.
- **matchMedia shim** `installReducedMotionShim()`, called once in `src/main.tsx` before render:
  - Wrap `window.matchMedia`. For queries containing `prefers-reduced-motion`, return a controllable `MediaQueryList` (`matches`, `media`, `addEventListener`/`removeEventListener`, legacy `addListener`/`removeListener`, `onchange`).
  - Export `setReducedMotion(reduced: boolean)`. It updates `matches` and dispatches `change` to all listeners. Every other query passes through to the native implementation.
  - Initial value: `true` if native `prefers-reduced-motion: reduce` matches, otherwise `false`.
- In `App.tsx`, add `useEffect(() => setReducedMotion(s.motion !== 'Full'), [s.motion])`.
- Also wrap the app tree in `<MotionConfig reducedMotion={s.motion === 'Full' ? 'never' : 'always'}>` from `motion/react`. This acts as a belt-and-braces backup for components that use motion's own hook, which caches the media query.
- Semantics:
  - **Full**: Kokonut animates normally, and anime.js runs the full expressive choreography.
  - **Calm**: Kokonut is reduced, since motion skips transform/layout animations and keeps opacity. anime.js runs a reduced version: no stagger, no spring, opacity plus ≤4px translate, durations × 0.5.
  - **Off**: Kokonut is reduced, and the existing `.sb-calm` CSS rule makes leftover CSS transitions instant. anime.js does nothing animated and applies the final state synchronously (call `onComplete` immediately).
- If the OS asks for reduced motion, the shim still reports reduced even when the setting is Full: `matches = native || s.motion !== 'Full'`. anime.js helpers apply the same rule and treat it as Calm.

## 4. anime.js choreography (`src/lib/choreo.ts`)
Helpers. Each one takes `level` and returns a `Promise<void>` that resolves when done, or right away under Off. Each uses `animate`, `stagger` and `createSpring` from `animejs`. Cancel any running animation on the same targets first, using `utils.remove(targets)`, so repeated triggers don't stack.
- `enterList(container, level)`: targets `[data-anim="item"]` children. Full: from `opacity 0, translateY 8px` to rest, 320ms, `outQuint`, `stagger(28, {start: 40})`, with the total stagger capped at 12 items (later items start with the 12th). Calm: opacity only, 160ms, no stagger.
- `collapseRows(elements, level)`: Full: animate `opacity→0, translateX→-12px` for 180ms, then `height→0, paddingY→0, marginY→0` for 220ms `inOutQuad`, with `stagger(30)`. Set `overflow: hidden` first and lock the measured height before collapsing. Calm: opacity 120ms, then height 120ms, no stagger.
- `slideBanner(el, 'in' | 'out', level)`: height 0↔36px plus opacity, with a spring (`createSpring({ stiffness: 260, damping: 24 })`) on Full. Calm: 140ms ease.
- `springWidth(el, from, to, level)`: Full: spring `{ stiffness: 320, damping: 30 }`. Calm: 140ms `outQuad`. Off: set it directly.

Wiring:
- **Memory forget (`MemoryPage.tsx`)**: add `data-mem-id={m.id}` and `data-anim="item"` to every timeline and session row. Change `forgetOne`/`hardForget` to: collect the row elements for the ids, `await collapseRows(...)`, then call `forgetMemory(ids)`. Clear the inline styles afterwards, since React unmounts those nodes. If no elements are found (e.g. the Graph view), call `forgetMemory` right away. While a collapse runs, ignore further forget triggers on the same ids using a `useRef<Set<string>>`.
  - Undo stays as it is. When the restore re-renders rows, run `enterList` only on the restored rows. Detect them by diffing the previous and current id sets in a `useLayoutEffect`.
  - Selection or drawer state is cleared after removal, same as today.
- **Memory entrance**: run `enterList` on the list container in a `useLayoutEffect` when you mount the page or switch view (Timeline/Sessions). Hide the rows before first paint by setting `opacity: 0` inline from the layout effect only when level ≠ Off, so nothing flashes.
- **New Tab entrance (`NewTab.tsx`)**: mark the hero, search/command area, and recent/tiles items with `data-anim="item"`. Run `enterList` once on mount.
- **Recovery banner (`App.tsx`)**: keep it mounted while it animates out. A local `visible` state follows `s.recoveryBanner`. On true, mount and `slideBanner('in')`. On dismiss, `await slideBanner('out')` and then unmount. Remove the `sb-fade` class from it.
- **Sidebar spring (`Sidebar.tsx`)**: remove the inline CSS `width` transition. In a `useLayoutEffect` keyed on `width` (rail ↔ expanded and mode changes), call `springWidth(el, prevWidth, width)` while the element holds `prevWidth`. Skip the animation (set directly) while a resize drag is active or when `overlay` is true.

## 5. Kokonut component placements
All of these are wrapped in `.kk`. Behavior and labels come from Switchback, not the Kokonut demo copy.

1. **status-island → top-bar status chip** (`TopBar.tsx` status renderer). It renders `s.status.text`, and it's keyed by `s.status.id` so each new status animates in. Constrain its height to the current 28px chip and position it via the wrapper. If the island can't render at ≤28px without editing source, move status display to a floating island centered at the bottom of the content area (16px from the bottom, `z` above the page, below dialogs), and remove the chip from the top bar. Keep `role="status"`.
2. **undo-button → the undo action inside status** when `s.status.undo` exists. `onClick` calls `s.status.undo()`. The 8s window still comes from `showStatus`. If undo-button has its own countdown visual, sync its duration to 8000ms and remove the `sb-undo` bar. Otherwise keep the `sb-undo` bar.
3. **smooth-tab → Memory view switcher** (`MemoryPage.tsx` L51). It replaces `Segmented` there with the same options (and hides Graph when `s.graph === 'Off'`), the same `value`/`onChange`, and keyboard arrows if the component supports them. Settings keeps `Segmented`.
4. **hold-button → Forget everything confirm**. It replaces the final danger button. It's disabled until the typed text equals `forget everything`. Completing the hold calls `hardForget(all)`, closes the dialog, and resets the text. Use a hold duration of about 1.2s if the component accepts one. Under Off, a hold is still required; only the visual is instant.
5. **ai-text-loading → Ask view loading**. When `asking` gets set, show ai-text-loading with Switchback copy ("Searching your memory", "Reading passages", "Citing sources") for 900ms on Full, 400ms on Calm, and 0 on Off. Then show the results. Use a local `askPhase: 'loading' | 'done'` reset per query.
6. **ai-citations → Ask view passages**. Render the passages as citations: `[n]`, title, host, age, snippet. Clicking a citation still runs `close(); navigate(m.url, m.title)`. If the component only takes data and doesn't support click handlers, keep the existing passage buttons below a compact ai-citations summary. Keep the Local/Cloud pill and the privacy footnote.
7. **command-button → New Tab "Search or ask" trigger** (`NewTab.tsx`). It opens the command palette with the same action the ⌘K shortcut uses (find it in state/App) and shows the ⌘K hint.
8. **switch-button**:
   - If it's a generic on/off switch, it replaces the internals of `Toggle` in `src/components/ui.tsx`. Keep the `Toggle` props (`checked`, `onChange`, `label`) so every Settings usage upgrades automatically, and keep `role="switch"`/`aria-checked`/label.
   - If it's a theme (sun/moon) switch, put it in Settings → Appearance beside the mode preview cards as a quick Dark/Light toggle. It's bound to `s.theme`, and the cards stay.

## 6. Edge cases and failure modes
- Private window and `recoveryBanner` hidden: the banner logic doesn't change.
- Rapid repeated forgets, or undo during a collapse: the in-flight guard prevents double removal. Undo only exists after `forgetMemory`, so it can't race the collapse.
- Theme or accent switch while Kokonut components are mounted: the bridge is pure CSS vars, so they update instantly.
- Changing Motion while an animation runs: animations already in progress finish. New ones read the new level.
- No layout shift at 1440×900. The sidebar keeps its 248px default, and the top bar stays 44px.
- The shim must not break other `matchMedia` callers. Only reduced-motion queries are intercepted.

## 7. Verification
1. `npx tsc -b` (or the project's TS check), then `npm run build` (or the matching package-manager script). Both must exit with 0.
2. Grep to confirm there are no edits inside `src/components/kokonutui/` compared with the registry content (no source edits), and no leftover shadcn CSS injected into `src/index.css`.
3. Manual check in the existing preview (don't start a dev server):
   - **Memory**: rows stagger in, forgetting one row collapses it, a multi-forget staggers, undo brings rows back with an entrance, and smooth-tab switches views.
   - **New Tab**: the stagger entrance plays, and command-button opens the palette.
   - **Palette**: the ask flow shows the loading phase, then the citations, and clicking a citation navigates.
   - **Forget everything**: you have to type the phrase and then hold.
   - **Banner**: it slides in and out.
   - **Sidebar**: rail ↔ expanded springs.
   - **Settings**: Toggle or theme switch behaves as mapped.
   - **Repeat on Calm and Off**: Off is instant everywhere, including Kokonut. Calm is subtle.
   - **Theme check**: dark/light × at least Indigo, Fern and Rose. Kokonut surfaces follow the tokens. While doing this, also verify the color theme and accent tint work that hasn't been checked in the preview yet.
