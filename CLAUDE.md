# Heartbeat

Personal iPhone PWA: tap a heart whenever you think of your partner; Apple Health–style analytics; research-backed lessons and quizzes. Product spec and quality bar: `../SPEC.md`. Research: `../research/` (ux.md, psychology.md).

@AGENTS.md

## Stack
Next.js 16 static export (`output: "export"`, single route, tabs in client state) · TypeScript · Tailwind v4 · Motion (`motion/react`) · Recharts (Trends only) · Dexie (`lib/db.ts`) · date-fns · Lucide · Sonner · Vaul.

## Commands
- Type-check: `npx tsc --noEmit` · Lint/format: `pnpm biome check --write .` · Tests: `npx vitest run`
- Build: `pnpm build` (static export to `out/`). Use pnpm, never npm/yarn for deps.
- Dev data: in the dev server console run `seedDemo()` (200 days of fake beats).

## Rules
- Colours, radius, type sizes only from tokens in `app/globals.css` (`bg-card`, `text-label-2`, `text-accent`, `text-subhead`, `rounded-card` …). No hex in components; SVG fills use `var(--accent)` etc.
- Reuse primitives from `components/ui.tsx` (Card, CardHeader, Stat, Segmented, List, Row, Toggle, Sheet, Button, EmptyState).
- Date math lives in pure functions in `lib/` with vitest tests. Local time, weeks start Monday.
- Mobile first at 390px; tap targets ≥ 44px; safe areas via `pt-safe`/`pb-safe`.
- Motion: everyday animation ≤ 400 ms, transform/opacity only, respect `useReducedMotion`.
- Tone: warm, plain, never guilt or judgement ("only", "missed", "failed", "should" are banned in UI copy). No streak shaming, no notifications.
- No network requests at runtime, no third-party fonts/scripts. All data stays in IndexedDB.
- `NEXT_PUBLIC_BASE_PATH` prefixes any hard-coded public asset URL (GitHub Pages sub-path).
