# Chez Huong

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
