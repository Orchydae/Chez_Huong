# Chez Huong

A recipe website for Vietnamese cooking. The big idea: **no recipe stands alone — every recipe links to others.** Plus everything you'd expect from a real recipe site: find them, cook them, talk about them, read them in your language. See the [product roadmap](./docs/prds/01-revamped-recipes-website.md) for the full vision and [CONTEXT.md](./CONTEXT.md) for the domain glossary.

## Milestone status

Work ships as small, testable steps. ✅ marks a milestone whose **server/API work is complete**; the client UI that consumes those endpoints is tracked separately.

| Milestone | Scope | Status |
|---|---|---|
| **Now** | Harden the core loop — lock the ingredient catalogue to writers/admins, delete a recipe, tighten validation | ✅ Done (API) |
| **M0** | Foundations — Draft/Published, slug, yield, created/updated dates, comment edited date, recipe-link table; drop the old audit table | ✅ Done (API) |
| **M1** | Recipe lifecycle — draft → publish → unpublish → delete; draft-aware reads; slug frozen on first publish | ✅ Done (API) |
| **M2** | Discovery — search, filter (cuisine / diet / difficulty / type), find-by-ingredient, newest & popular (published only) | ✅ Done (API) |
| **M3** | Linking recipes — Pairs with / Uses / Variation of; self-links, duplicates, and links to drafts all blocked | ✅ Done (API) |
| **M4** | Read in your language — reader translation switch + completeness badge | ⏳ Planned |
| **M5** | Community & sharing — edit your comment, author page, share link, likes as a saved list | ⏳ Planned |
| **M6** | Cooking help — scale, shopping list, cook mode, nutrition breakdown | ⏳ Planned |
| **M7** | Admin & clean addresses — promote a user to writer, clean URLs, a proper 404 page | ⏳ Planned |
| **M8** | Later — password-reset / email-confirm emails, rich recipe cards, search across languages | ⏳ Planned |

## Architecture Diagrams
The architecture and design diagrams (Class, Use Case, Deployment, Package, and Bounded Context) can be found in the [`/docs/diagrams`](./docs/diagrams) directory.

## Prerequisites
- Node.js **20+** (NestJS 11 + Prisma 7 require it)
- npm
- A Supabase project (the database is hosted there — there is no local Postgres)
- *(Docker setup only)* Docker Desktop with Compose v2

---

## Environment Variables (required for both setups)

Before running the server you must create `server/.env` from the template:

```bash
cd server
cp .env.example .env       # Windows PowerShell: Copy-Item .env.example .env
```

Then fill in every blank in `.env`. Comments inside `.env.example` tell you where to find each value (Supabase dashboard, USDA API, etc.). The server will fail to start without `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, and the Supabase keys.

---

## Setup with Docker (Recommended)

Docker Compose runs the NestJS server in dev mode (with hot reload), reading from your `server/.env`.

```bash
cd server
docker compose up -d --build
```

The container's startup command is `npx prisma generate && npm run start:dev`, so the Prisma client is regenerated on every container start — you do **not** need to run `prisma generate` manually with this setup.

**Endpoints once up:**
- API: http://localhost:3000

> Browse the database via the Supabase dashboard's table editor.

**Stop the stack:**
```bash
docker compose down
```

---

## Setup without Docker (Local Node)

Use this if you don't want Docker, or if you need to attach a debugger directly to the Node process.

```bash
cd server
npm install
npx prisma generate
npm run start:dev
```

**Why each command:**
- `cd server` — all the Node tooling (`package.json`, Prisma schema, NestJS config) lives inside `server/`. Running these commands at the repo root will fail because there is no top-level `package.json`.
- `npm install` — installs every dependency listed in `server/package.json` into `server/node_modules`. This includes the `@prisma/client` *package shell*, but **not** the generated client code yet.
- `npx prisma generate` — reads `prisma/schema.prisma` and generates the typed Prisma Client into `node_modules/.prisma/client`. Without this step, every `import { PrismaClient } from '@prisma/client'` resolves to an empty module and the TypeScript build fails with errors like *"Module '@prisma/client' has no exported member 'PrismaClient'"*. Re-run it any time `schema.prisma` changes.
- `npm run start:dev` — runs `nest start --watch`, which compiles TypeScript on the fly and restarts the server when files change. Use this for development.

**Production-style run** (compiled JavaScript, no watcher):
```bash
npm run build       # compiles TypeScript to dist/
npm run start:prod  # runs node dist/src/main
```
- `npm run build` — runs `nest build`, which type-checks the project and emits compiled JS to `dist/`. Required before `start:prod` because that script just runs the compiled output.
- `npm run start:prod` — runs the compiled server. Faster startup, no watcher, closer to production behaviour.

**Run tests:**
```bash
npm run test
```
- `npm run test` — runs the Jest suite defined in `package.json`.

---

## Client Setup (React + Vite)

The frontend lives in [`client/`](./client) and is a separate npm project from the server. There is **no Docker setup for the client** — it runs locally with Vite's dev server.

### Environment Variables

The client reads a single optional variable, `VITE_API_URL`, which tells it where to send API requests. If it isn't set, the code falls back to `http://localhost:3000`, which matches the default server port — so for typical local development you can skip this step entirely.

If you need to point at a different backend (deployed server, custom port), create `client/.env`:

```env
VITE_API_URL=http://localhost:3000
```

> Vite only exposes variables prefixed with `VITE_` to the browser. Renaming it removes it from `import.meta.env`.

### Install and Run

```bash
cd client
npm install
npm run dev
```

**Why each command:**
- `cd client` — the client's `package.json` and Vite config live here. The repo root has no `package.json`.
- `npm install` — installs React, Vite, TypeScript, ESLint, etc. into `client/node_modules`.
- `npm run dev` — runs `vite`, which starts the dev server with Hot Module Replacement on http://localhost:5173. Edits to `.tsx`/`.css` files are reflected instantly without a full reload.

### Production Build

```bash
npm run build
npm run preview
```

- `npm run build` — runs `tsc -b && vite build`. The `tsc -b` step type-checks the project (Vite's own bundler skips type errors), and `vite build` outputs static assets to `client/dist/`.
- `npm run preview` — serves the contents of `dist/` locally so you can sanity-check the production bundle before deploying. This is **not** a production server — for real deployment, host `dist/` on any static file host (Netlify, Vercel, S3, etc.).

### Lint

```bash
npm run lint
```
- Runs ESLint across the project using the flat config in [`client/eslint.config.js`](./client/eslint.config.js).

---

## Prisma Database Commands

These commands all run from inside `server/` and act on the Supabase database pointed to by `DATABASE_URL` / `DIRECT_URL` in your `.env`.

| Command | Purpose |
|---|---|
| `npx prisma generate` | Regenerate the typed Prisma Client after editing `schema.prisma`. |
| `npx prisma migrate dev` | Apply pending migrations to the database **and** regenerate the client. Use during development. |
| `npx prisma migrate deploy` | Apply migrations without prompts or generation. Use in CI/production. |
| `npx prisma db seed` | Run `prisma/seed.ts` to populate reference data. |

> ⚠️ `migrate dev` writes to whatever database `DIRECT_URL` points at. Make sure that's a development Supabase project, not production.

---

## Deployment (where this is hosted)

> Quick memory aid — the repo holds no deploy config, so this section is the record.

| Part | Host | Live URL | Source |
|---|---|---|---|
| **Frontend** | **Vercel** | https://chezhuong.vercel.app | this repo, root dir `client/` (`npm run build` → `dist/`) |
| **Backend** | **Render** (Docker web service "Chez_Huong", **Free** tier) | https://chez-huong.onrender.com | this repo, root dir `server/`, built from `server/Dockerfile`, branch `main` |

- **Free-tier cold start:** the Render instance spins down after ~15 min idle and takes ~50 s to wake on the next request. Expected, not a bug.
- **How the backend boots on Render:** the Docker production stage runs `CMD npm run start:prod:deploy`, i.e. **`npx prisma migrate deploy && node dist/src/main`** — so every deploy applies pending migrations against the Supabase DB before starting. A failed/mismatched migration makes the container **exit 1 / crash-loop**, and Render keeps serving the previous good build.
- **API is under `/v1`** (`app.setGlobalPrefix('v1')`). The base URL is the host with no `/v1` and no trailing slash — the client appends `/v1` itself.
- **SPA deep links:** `client/vercel.json` rewrites every path to `/index.html` so React Router can handle routes like `/recipes/:slug`. Without it, pasting or refreshing a deep link returns Vercel's own `404: NOT_FOUND` (only the home page and in-app navigation would work). The file must sit in Vercel's configured **Root Directory** (`client`).

### The two env vars that wire frontend ↔ backend
| Where | Variable | Value | Notes |
|---|---|---|---|
| **Vercel** (frontend) | `VITE_API_URL` | `https://chez-huong.onrender.com` | **No** `/v1`, **no** trailing slash. Vite inlines this at build time, so **redeploy the frontend** after changing it. |
| **Render** (backend) | `CLIENT_URL` | `https://chezhuong.vercel.app` | The single CORS-allowed origin (exact, no trailing slash). If unset, CORS falls back to `http://localhost:5173` and the live site is blocked. Only one origin is allowed, so Vercel **preview** URLs won't pass CORS. |

Render also needs every required server env var (see `server/.env.example` / `env.validation.ts`): `JWT_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `USDA_API_KEY`, `GOOGLE_CLOUD_TRANSLATION_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — a missing one also makes boot fail (Joi validation throws).

### If the live site can't reach the backend
1. **Read the Render logs** (dashboard → the service → Logs, or the "service logs" link on a failed event) — `Exited with status 1` is a **boot crash**, and the log line says why.
2. Most common after a git rebase: **`prisma migrate deploy` fails** because the migration history no longer matches the `_prisma_migrations` table. Reconcile locally (`npx prisma migrate status`, then `npx prisma migrate resolve …`) until `migrate deploy` succeeds against the prod DB.
3. Or a **required env var is missing** on Render (see list above).
4. Then **Manual Deploy → Clear build cache & deploy** the latest `main`. Verify with `curl https://chez-huong.onrender.com/v1/recipes` → should be `200`.
