# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

우리웨딩 노트 — a wedding-planning app for a couple to share: checklist, budget, venue comparison, vendor contacts, guest list/RSVP, sangyeonrye (family meeting) planning, honeymoon planning, wedding-day timeline/MC script, style picks, and a public community board. Korean-language UI throughout (labels, error messages, enums stored as Korean strings in the DB).

Monorepo with two independently deployed halves:
- `backend/` — Node/Express API (deployed to Render)
- `frontend/` — React 19 + Vite SPA (deployed to Vercel)
- DB is Postgres (Neon in production; local Postgres via `docker-compose.yml` for dev)

## Commands

Backend (run from `backend/`):
- `npm run dev` — start API with `node --watch` on port 4000 (auto-runs pending migrations first via `predev`)
- `npm start` — production start (auto-runs pending migrations first via `prestart`)
- `npm run migrate` — raw `node-pg-migrate` CLI passthrough, e.g. `npm run migrate create <name>` or `npm run migrate down`
- `node scripts/seedGuideContent.mjs` — seed/refresh the `guide_content` table (idempotent, `ON CONFLICT DO NOTHING`)

Frontend (run from `frontend/`):
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run lint` — oxlint

There is no test suite in this repo (no test runner configured, no test files).

Local full-stack dev: `docker-compose up -d` (Postgres only, port 5432) + `npm run dev` in both `backend/` and `frontend/`. Copy `backend/.env.example` to `backend/.env` first.

## Database & migrations

Schema lives entirely in `backend/migrations/` (node-pg-migrate, JS migration files using `pgm.sql(...)`). There is no ORM — all queries are hand-written SQL via `pg` (`backend/src/db.js` exports a `pool` and a `query(text, params)` helper).

When changing the schema: create a new migration (`npm run migrate create <name>`), write the SQL in `exports.up`/`exports.down`. Do not hand-edit the DB directly — migrations are the single source of truth and run automatically on both `npm run dev` (local) and `npm start` (Render deploy, via the `prestart` hook).

`guide_content` is a separate concept from schema migrations: it's a DB table of admin-editable reference content (checklist templates, budget category presets, sangyeonrye region data, honeymoon destination guides, roadmap phase definitions, etc.) that the frontend fetches once via `GET /api/guide-content` and the admin UI (`AdminGuideContent` page) can edit without a redeploy. New environments need `node scripts/seedGuideContent.mjs` run once after migrations to populate it — an empty `guide_content` table doesn't error, it just leaves guide-content-dependent pages stuck (see "Loading gates" below).

## Backend architecture

`backend/src/index.js` wires one Express app: `app.use('/api', globalLimiter)` then a flat list of `app.use('/api/<resource>', router)` mounts, one router per `backend/src/routes/*.js` file. No sub-app composition beyond that.

Auth: JWT access token (15m, held in memory on the frontend, never localStorage) + JWT refresh token (30d, httpOnly cookie scoped to `/api/auth`, `sameSite=none; secure` in production so it survives the Vercel↔Render cross-origin split). `requireAuth` middleware (`backend/src/middleware/auth.js`) reads the `Authorization: Bearer` header only — it does not touch the refresh cookie. `backend/src/utils/jwt.js` centralizes token signing/verification and cookie options; `NODE_ENV=production` is what flips cookies to `secure`/`sameSite=none`.

Couple scoping: almost every domain route (checklist, budget, venues, vendors, guests, honeymoon, etc.) is scoped to a `couple_id`, not a `user_id` directly. Routes call `requireCoupleForRequest(req, res)` (`backend/src/utils/coupleAccess.js`), which looks up the couple by `groom_user_id OR bride_user_id = req.user.id` and 404s if the user hasn't joined/created one — callers use the `if (!couple) return;` pattern since the helper already sent the response. A `couples` row can have one or both partner slots filled; a solo-created couple has an `invite_code` the other partner uses via `POST /couples/join` to fill the second slot (code is nulled out once both slots are filled). `POST /couples/switch` (transactional) lets a solo creator abandon their own couple and join a different invite code instead — used when both partners independently created couples.

Admin: `role` column on `users` (`'user' | 'admin'`) baked into the access-token JWT at login, checked via `requireAdmin` middleware. Admin-only routes live under `/api/admin/*` and the admin-scoped bits of `announcements`/`inquiries`.

Rate limiting (`backend/src/middleware/rateLimit.js`, `express-rate-limit`): three tiers — `globalLimiter` (loose, all of `/api`), `authLimiter` (strict, login/register), `postLimiter` (medium, community posts/comments/reports).

Error convention: route handlers `try/catch` and call `next(err)`; the shared `errorHandler` (`backend/src/middleware/errorHandler.js`) responds `{ error: <message> }` with `err.status || 500`. Validation errors are thrown/returned inline as `res.status(4xx).json({ error: '<Korean message>' })` rather than via a validation library.

## Frontend architecture

Context provider nesting in `frontend/src/main.jsx` matters: `AuthProvider` → `GuideContentProvider` → `CoupleProvider` → `App`. `GuideContentContext` fetches all guide content once when `user` becomes non-null and exposes it via `useGuideContent(key)` (returns `undefined` while loading or if the key is missing) and `useGuideContentReady()` (true once the initial fetch has settled, success or failure — used to distinguish "still loading" from "this key doesn't exist," see below).

Route guards in `frontend/src/App.jsx` are composed per-section, not per-route:
- `RequireAppAccess` — the main app (dashboard, checklist, budget, …): requires login *and* a couple; couple-less non-admin users get bounced to `/couple-setup`, couple-less admins go to `/admin`.
- `RequireLogin` — community/inquiries: login only, no couple required (admin-only accounts can still browse/moderate).
- `RequireAdminAccess` — `/admin/*`: login + `role === 'admin'`.
- `RequireCoupleSetup` / `PublicOnlyRoute` — gate `/couple-setup` and `/login` `/register` respectively (redirect away if the condition doesn't apply).

`frontend/src/api/client.js` is the only place that talks to the backend. It holds the access token in a module-level variable (not React state), auto-retries once on a 401 by calling `/auth/refresh` (dedup'd via a shared in-flight promise so concurrent 401s don't fire multiple refreshes), and reads `VITE_API_URL` (falls back to `http://localhost:4000/api`) — this must be set in Vercel's env config and requires a redeploy to take effect since Vite bakes it in at build time.

Loading gates: most pages follow `const x = useGuideContent('key'); if (!data || !x) return <Spinner/>` for their initial load. Because `useGuideContent` returns `undefined` both while loading *and* when a key is permanently missing from the DB, pages should also check `useGuideContentReady()` and show an error state (not spin forever) when ready-but-missing — see `Vendors.jsx`/`Budget.jsx`/`Sangyeonrye.jsx`/`Honeymoon.jsx`/`StyleRecommendation.jsx` for the pattern. Apply the same pattern to any new page that gates on guide content.

Page organization: each top-level route has a `pages/<Name>.jsx` file; non-trivial pages split their sub-sections into a same-named lowercase subfolder (e.g. `pages/Budget.jsx` + `pages/budget/CategorySection.jsx`, `LineItemRow.jsx`, `helpers.js`). Follow that convention for new sections rather than growing one file.

Styling is a single global stylesheet (`frontend/src/index.css`) using CSS custom properties for theming (`--accent`, `--bg`, etc., with a `@media (prefers-color-scheme: dark)` override block) — no CSS-in-JS, no per-component stylesheets, no Tailwind.

## Deployment specifics

- Frontend (Vercel): needs `VITE_API_URL=<render-url>/api` and `frontend/vercel.json` (SPA rewrite — without it, refreshing on any client-side route like `/login` 404s).
- Backend (Render): root dir `backend/`, build `npm install`, start `npm start` (migrations run automatically via `prestart`). Required env vars: `DATABASE_URL` (Neon pooled connection string), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_ORIGIN` (exact Vercel origin, no trailing slash — mismatches break CORS silently with a confusing preflight error), `NODE_ENV=production`, optionally `KAKAO_REST_API_KEY` (venue/place address search, `backend/src/routes/places.js`; that route just 500s without it, nothing else breaks).
- `backend/db.js` sets a custom `pg.types` parser for DATE columns (1082) to keep them as raw `'YYYY-MM-DD'` strings instead of JS `Date` objects, to avoid timezone-shift-by-a-day bugs — don't remove this.
