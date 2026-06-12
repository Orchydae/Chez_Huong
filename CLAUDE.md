# CLAUDE.md

**Be extremely concise. Sacrifice grammar for the sake of concision.**

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Repo layout

Two independent npm projects — the repo root has no `package.json`. Always `cd` into the right one:

- [server/](./server) — NestJS 11 + Prisma 7 API (port 3000)
- [client/](./client) — React 19 + Vite frontend (port 5173)
- [docs/adr/](./docs/adr) — architectural decision records
- [docs/diagrams/](./docs/diagrams) — PlantUML class / use-case / deployment / package / bounded-context diagrams
- [CONTEXT.md](./CONTEXT.md) — domain glossary (Recipe, Translation, Particularity, …)

The database is hosted on **Supabase** (PostgreSQL). There is no local Postgres — `DATABASE_URL` / `DIRECT_URL` in `server/.env` point at a Supabase project. `migrate dev` writes to whatever `DIRECT_URL` points at, so make sure that's a dev project.

## Server commands (run from `server/`)

| Command | Purpose |
|---|---|
| `npm run start:dev` | `nest start --watch` — local dev, hot reload |
| `npm run build` | `nest build` — type-checks and emits to `dist/` |
| `npm run start:prod` | Runs `node dist/src/main` (requires prior `build`) |
| `npm run lint` | `eslint --fix` over `src,apps,libs,test` |
| `npm run test` | Jest unit tests (`*.spec.ts` under `src/`); `test:watch` / `test:cov` also available |
| `npx prisma generate` | Regenerate the typed Prisma client into `node_modules/.prisma/client`. Required after editing `prisma/schema.prisma`, otherwise `@prisma/client` resolves to an empty module and the TS build fails. |
| `npx prisma migrate dev` | Apply pending migrations + regenerate client (dev) |
| `npx prisma migrate deploy` | Apply migrations only (CI/prod) |
| `npx prisma db seed` | Runs `prisma/seed.ts` via `ts-node` |

### Docker dev

`docker compose up -d --build` from `server/` runs the dev container. Its entrypoint is `npx prisma generate && npm run start:dev`, so the Prisma client is regenerated on each container start — don't run `prisma generate` manually with this setup. Source and `prisma/` are bind-mounted for hot reload; `node_modules` is a volume to avoid host/container conflicts.

## Client commands (run from `client/`)

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173 with HMR |
| `npm run build` | `tsc -b && vite build` — type-check then bundle to `dist/` |
| `npm run preview` | Serves `dist/` locally (sanity check, not a prod server) |
| `npm run lint` | ESLint via flat config in [eslint.config.js](./client/eslint.config.js) |

Client reads one optional env var: `VITE_API_URL` (defaults to `http://localhost:3000`). Only `VITE_`-prefixed vars are exposed to the browser.

## Client architecture

Rebuilt from scratch June 2026 — see [ADR-04](./docs/adr/04-client-teardown-rebuild.md) and [PRD-02](./docs/prds/02-client-rearchitecture.md) (phases 0–4 shipped; 5 pending). Discovery state (search/filters/sort) lives in the URL; `useDiscovery` is an infinite query (12/page, load-more). React 19 + Vite 7 + **Tailwind v4** (brand tokens in `src/index.css` `@theme`: cream/forest/leaf/coral, Be Vietnam Pro + Cormorant Garamond) + **TanStack Query** + **react-i18next** (ships French-only; ALL UI text lives in `src/lib/locales/fr.json` — no inline strings).

```
client/src/
├── api/          # THE ONLY code that talks to the server
│   ├── client.ts      # base URL + /v1, attaches JWT, 401 → app-wide logout event
│   ├── types.ts       # single mirror of server response shapes (raw Prisma rows)
│   ├── auth.api.ts    # AuthProvider/useAuth + login/register (token in localStorage, exp-timer logout)
│   ├── recipes.api.ts # query/mutation hooks (incl. links, nutrition, liked/saved list); writes setQueryData(id + slug) then invalidate lists
│   ├── social.api.ts  # likes & comments hooks incl. edit-own-comment + load-more-replies (M5); cache safe across accounts (auth clears it)
│   ├── ingredients.api.ts  # search/confirm (writer/admin-only endpoints)
│   └── users.api.ts   # admin-only: user directory (name/email search) + role promotion (M7)
├── pages/        # one folder per route — composition only, no fetch logic
├── components/   # shared UI (auth modals, RequireRole, RecipeForm, ui kit, layout)
└── lib/          # i18n, toast store (replaces alert()), format helpers
```

Conventions that keep it maintainable:
- **Only `api/` may fetch**; server shapes only in `api/types.ts`. A contract change = one file.
- Recipe URLs are **slug-canonical**: route is `/recipes/:slugOrId`; a numeric id fetches by id then redirects to the slug. Server guarantees slugs are never digit-only and never `create`/`edit` (`recipe-` prefix).
- **Lifecycle from the edit screen is PUT then PATCH** `…/publish` / `…/unpublish` — the server silently ignores `status` in a PUT body. Create accepts `status` (Draft default / Publish-now).
- Write payloads never include `authorId` (server derives it from the JWT; `forbidNonWhitelisted` would 400).
- RecipeForm rows have stable client-side `rowId`s (React keys + async-update targets — never positional indices).
- Errors surface as localized toasts; raw (English) server messages go to the console only.
- **No client-side validation** (product decision, June 2026): the server DTOs are the single source of truth — never re-implement their rules in the client. Submit, let the server 400, and map the verdict to a localized message (status code / keyword match only). Native HTML attributes (`required`, `type="email"`) are the one tolerated exception.

## Server architecture

**Flat, idiomatic NestJS.** See [ADR-02](./docs/adr/02-collapse-hexagonal-to-controller-service-prisma.md) for the rationale (the codebase was previously hexagonal/DDD/CQRS and was collapsed because none of those boundaries earned their keep for this CRUD-shaped app).

Each module sits directly under `server/src/modules/<feature>/`:

```
modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts       # uses PrismaService directly
├── <other>.service.ts         # only when there's real logic to isolate
├── <external>.service.ts      # external API clients (USDA, Google Translate, etc.)
└── dtos/                      # class-validator request DTOs
```

Call chain: **Controller → Service → PrismaService**. No domain entities, no command/query objects, no handler classes, no repository ports, no mappers. The Prisma-generated types from `@prisma/client` are the in-process shape; service responses are returned as-is (raw rows with `include`d relations) to the controller and then to the wire.

### Where things live

- **Types for Recipe / Ingredient / User / etc.** — auto-generated by Prisma; import from `@prisma/client`.
- **Validation rules** — `class-validator` decorators on the DTOs in `dtos/`. Structural rules like "a recipe must have at least one ingredient section" are `@ArrayMinSize(1)`; enum rules like `difficulty` are `@IsEnum(Difficulty)`. NestJS' global `ValidationPipe` auto-returns 400s.
- **Behavior** — service methods. Real-logic services (e.g. `NutritionalValueService`) keep their own files because they actually do work; trivial CRUD lives directly in the feature's main service.
- **External integrations** — plain `*.service.ts` files (`UsdaService`, `GoogleTranslateService`, `SupabaseService` in `shared/`). No port/interface — there's one implementation and tests can mock the class directly if needed.
- **Auth + RBAC** — `JwtAuthGuard` + `RolesGuard` + `@Roles(Role.X, ...)`. `RolesGuard` is **fail-safe** (denies when `request.user` is missing) — always stack `@UseGuards(JwtAuthGuard, RolesGuard)` in that order.
- **Global pipes** — `main.ts` registers a global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. A DTO field without a `class-validator` decorator gets silently dropped on requests — don't be surprised when a typo causes a 400.
- **CORS** — single-origin from `process.env.CLIENT_URL` (default `http://localhost:5173`).

### Response shape

The server returns **raw Prisma rows** with appropriate `include`s — no hand-written response mapping. That means clients see:

- DB columns like `createdAt`/`updatedAt` and foreign-key ids.
- Enum-backed relations as objects, not strings (e.g. `particularities: [{ id, recipeId, type: "VEGAN" }, ...]`).
- Nested objects rather than flattened fields (e.g. recipe ingredients carry `ingredient: { id, name, fdcId }` instead of a flat `ingredientName`).
- Every recipe read includes `_count: { likes }` (cards/Discovery show it; like rows themselves stay in the social module). Authenticated Discovery rows additionally carry the caller's OWN like row (`likes: [{ userId }]` or `[]`, never other users') so cards render the heart without a per-recipe likes request.

The `User` table is the one exception — `users.service.ts` uses a `safeUserSelect` to keep `password` out of any read that crosses the HTTP boundary.

### Translation policy

Hybrid model: human-authored translations stored in the `Translation` table are the source of truth; `POST /translate` is a Google Cloud Translate proxy used to pre-fill the translation form. Saving is always explicit via `POST /translations` (idempotent upsert on `(recipeId, field, locale)`). New rows are saved with status `APPROVED` — the `DRAFT` workflow is deferred. See [CONTEXT.md](./CONTEXT.md) for the full glossary.

### Recipe lifecycle & discovery

- **Create takes a `status` choice** — `DRAFT` (default) or `PUBLISHED`. A Draft is private; `PATCH /recipes/:id/publish` opens it, `:id/unpublish` pulls it back to Draft, `DELETE /recipes/:id` removes it (cascade). All are author-or-admin (writer/admin role).
- **Reads are draft-aware.** `GET /recipes/:id` and `GET /recipes/slug/:slug` use `OptionalJwtAuthGuard`: a Draft is returned only to its author/admins, otherwise **404** (its existence is hidden). `GET /recipes` (Discovery) returns **PUBLISHED only** — search (`q` over title+description, LIKE-escaped, `@MaxLength(100)`), filters (`cuisine` substring /`difficulty`/`type`/`diet`/`ingredient`), and `sort=newest|popular`. `GET /recipes/mine` (writer/admin) returns the caller's own recipes **including Drafts** — backs the client's My Recipes page; declared before `GET /recipes/:id` so `mine` never hits `ParseIntPipe`. `GET /recipes/liked` (any signed-in user, readers included) returns the caller's liked **PUBLISHED** recipes — their **saved list** (M5), most-recently-saved first via `Like.createdAt`; same shape as Discovery cards (carries `_count.likes` + the caller's own like row) and likewise declared before `GET /recipes/:id`.
- **Social endpoints are draft-aware too.** Every recipe-scoped like/comment route (read AND write) calls `RecipesService.assertReadable` first — otherwise like/comment counts are an oracle confirming a hidden draft exists at an id. `RecipesModule` exports `RecipesService` for exactly this. `GET /recipes/:id/likes` returns `{ likeCount, likedByMe }` (`likedByMe` always false for anonymous callers); the toggle `POST /recipes/:id/like` returns `{ liked, likeCount }` — note the differing flag names. Comments support **create / reply / edit-own / delete-own** — `PATCH /comments/:id` and `DELETE /comments/:id` are author-only (403 otherwise) and, like each other, check ownership rather than `assertReadable` (you own the row regardless of the recipe's draft state). The listing returns top-level comments with **two levels of replies** plus each comment's `_count.replies`; `GET /comments/:id/replies` (`OptionalJwtAuthGuard`, draft-aware via the parent recipe) walks **deeper subtrees two levels at a time** — that `_count` is what tells the client to offer "load more replies" (M5).
- **Slug** is generated from the title (diacritics flattened, `-2` suffix on collision) and **frozen on first publish** — see [ADR-03](./docs/adr/03-auto-generated-publish-frozen-slugs.md). `Recipe.publishedAt` (set once, never cleared on unpublish) is what freezes it. Digit-only bases and route-reserved words (`create`, `edit`) get a `recipe-` prefix so a slug never looks like a numeric id or shadows a client route.
- **The `IngredientsController` is locked to `@Roles(ADMIN, WRITER)`** — the ingredient catalogue is authoring-only and several routes write (`PendingIngredientMatch` / `Ingredient`).
- **The whole `UsersController` is `@Roles(ADMIN)` (class-level)** — user management is an admin tool. `GET /users` lists/searches (`q` over name+email, case-insensitive; `take`/`skip`); `PATCH /users/:id/role` promotes/demotes to any `Role`. `UsersService.updateRole` **refuses to change the acting admin's own role** (`BadRequestException`) so the last admin can't lock themselves out; a missing target id surfaces as 404 via `PrismaExceptionFilter` (P2025). This is M7's "admin promotes a member" — backs the client's `/admin/users` page.
- **Recipe linking (M3) is live.** `RecipeLinksService` backs `POST /recipes/:id/links` (author/admin), `GET /recipes/:id/links` (`OptionalJwtAuthGuard`, draft-aware, returns `{ outgoing, incoming }`), and `DELETE /recipes/:id/links/:linkId`. It rejects self-links and links whose target is a Draft (400); exact duplicates surface as **409** via the `@@unique(fromId, toId, kind)` + the global `PrismaExceptionFilter` (so the service doesn't try/catch). A link whose other end is currently a Draft is hidden from the read. Nothing composes across a link — ingredients/steps/nutrition never roll up.
- **Milestones `Now`, `M0`–`M3`, and `M5` (community & sharing) are implemented**; `M4` (reader translations) and `M6`/`M8` (cooking help, email, social previews) are pending. See the [PRD roadmap](./docs/prds/01-revamped-recipes-website.md).

### Active modules

`AppModule` composes: `Auth`, `Users`, `Recipes`, `Translation`, `SocialInteraction`, `Health`, plus a global `SharedModule` (exports `SupabaseService` for image uploads).

The audit module and `EventEmitterModule` were removed in the collapse — they were never wired to anything real beyond a login-history event. The orphaned `AuditLog` table was dropped in the `m0_foundations_and_links` migration.

## Prisma schema highlights

- `User.id` is a UUID string; `Recipe.id` is an autoincrement int — be careful when typing IDs across the boundary.
- `Recipe` carries lifecycle + addressing fields: `status` (`DRAFT | PUBLISHED`), `slug` (unique, frozen at publish), optional `yield` (display-only — `servings` still drives nutrition math), `publishedAt`, plus `createdAt`/`updatedAt`.
- `RecipeLink` is a Recipe self-relation (`fromId` → `toId`, `kind` ∈ `PAIRS_WITH | USES | VARIATION_OF`, `@@unique(fromId, toId, kind)`) backing the linking feature (M3, live — see above). `Comment.updatedAt` backs **edit-your-own-comment** (M5, live); `Like.createdAt` orders the **saved list** (M5, live) most-recently-saved first.
- Nutrition is stored **per 100g** on `IngredientNutrition`, with `IngredientPortion` providing unit→gram conversions (e.g. "1 cup flour = 125g"). `NutritionalValueService` computes recipe totals on demand — totals are never persisted.
- Ingredients are linked to USDA FoodData Central via `Ingredient.fdcId`. `PendingIngredientMatch` is a staging table for USDA search results before they're promoted to real `Ingredient` rows via `POST /ingredients/confirm`.
- `Translation` keys nested fields by dotted path (e.g. `"stepSection.1.step.2.description"`), unique per `(recipeId, field, locale)`. Status enum: `DRAFT | APPROVED`.
- See [ADR-01](./docs/adr/01-prisma-over-supabase-js.md) for why Prisma — not `supabase-js` — owns data access.

## Conventions worth keeping

- **Return Prisma rows from services.** No domain entities, no mappers. If a response needs to omit a column (e.g. `password`), do it with `Prisma.XSelect` at the query, not with a hand-mapped DTO.
- **Validate at the DTO.** Put structural rules (`@ArrayMinSize`, `@ValidateNested`, `@IsEnum`) on the request DTO. The service can assume inputs are well-formed.
- **One service per feature owns behavior.** Split into a second service only when there's a cohesive chunk of real logic (e.g. `NutritionalValueService`, `UsdaService`).
- **Controllers don't reach into Prisma.** They map HTTP → service call → return value. `ParseIntPipe` for numeric route params.
- **External integrations are plain services.** No port/Symbol — inject the concrete class.

## Tests

Jest is wired for unit tests (`npm run test`). It compiles `*.spec.ts` under `src/` via `tsconfig.spec.json` in transpile-only CommonJS (overriding the app's `nodenext` config) — the full type-check stays with `npm run build` / `npm run lint`. The `*.spec.ts` files relax the type-aware `no-unsafe-*` ESLint rules (Jest matcher types don't resolve cleanly under them).

The first suite covers [nutrition.calculator.ts](./server/src/modules/recipes/nutrition.calculator.ts) — the pure recipe-nutrition math (fraction parsing, unit→gram conversion, scaling, summing), which was split out of `NutritionalValueService` specifically so it's testable without a DB. Add unit tests for pure / real-logic modules the same way. No e2e harness is scaffolded yet.
