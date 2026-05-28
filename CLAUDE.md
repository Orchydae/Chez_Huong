# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

Two independent npm projects — the repo root has no `package.json`. Always `cd` into the right one:

- [server/](./server) — NestJS 11 + Prisma 7 API (port 3000)
- [client/](./client) — React 19 + Vite frontend (port 5173)
- [docs/diagrams/](./docs/diagrams) — PlantUML class / use-case / deployment / package / bounded-context diagrams

The database is hosted on **Supabase** (PostgreSQL). There is no local Postgres — `DATABASE_URL` / `DIRECT_URL` in `server/.env` point at a Supabase project. `migrate dev` writes to whatever `DIRECT_URL` points at, so make sure that's a dev project.

## Server commands (run from `server/`)

| Command | Purpose |
|---|---|
| `npm run start:dev` | `nest start --watch` — local dev, hot reload |
| `npm run build` | `nest build` — type-checks and emits to `dist/` |
| `npm run start:prod` | Runs `node dist/src/main` (requires prior `build`) |
| `npm run lint` | `eslint --fix` over `src,apps,libs,test` |
| `npm run test` | Jest — picks up `*.spec.ts` under `src/` (see `jest` block in `package.json`) |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:e2e` | Uses `test/jest-e2e.json` |
| `npx prisma generate` | Regenerate typed Prisma client into `node_modules/.prisma/client` — required after editing `prisma/schema.prisma`, otherwise `@prisma/client` resolves to an empty module and the TS build fails |
| `npx prisma migrate dev` | Apply pending migrations + regenerate client (dev) |
| `npx prisma migrate deploy` | Apply migrations only (CI/prod) |
| `npx prisma db seed` | Runs `prisma/seed.ts` via `ts-node` |

Run a single test file: `npx jest path/to/foo.spec.ts` (or filter by name: `npx jest -t "creates a recipe"`).

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

## Server architecture

Hexagonal / DDD layering — every feature module under [server/src/modules/](./server/src/modules) follows the same three-layer split:

```
modules/<feature>/
├── domain/           # Entities + ports (interfaces). Pure TS, no NestJS, no Prisma.
│   ├── entities/     # Aggregates with factory methods + invariants (e.g. Recipe.create throws EmptyIngredientSectionsError)
│   └── ports/        # Repository interfaces. Exported BOTH as TS type AND as Symbol DI token (see pattern below)
├── application/      # Use-case orchestration. Handlers, services, command/query DTOs
│   ├── commands/     # Write-side: <verb>-<noun>.command.ts + .handler.ts
│   ├── queries/      # Read-side: same pattern
│   └── services/     # Coordinating services that controllers call directly
└── infrastructure/   # Adapters + HTTP
    ├── controllers/  # NestJS @Controller — maps HTTP DTOs to commands/queries
    │   └── dtos/     # class-validator request DTOs (the only place class-validator lives)
    └── adapters/
        ├── persistence/  # Prisma adapters implementing domain ports
        └── external/     # Outbound integrations (USDA FoodData Central, Supabase Storage, Google Translate)
```

### The port/token pattern

Ports are declared as both an interface and a `Symbol` with the same name — TypeScript treats them as separate namespaces. Modules wire the adapter via `{ provide: IFoo, useClass: PrismaFoo }`, and consumers inject with `@Inject(IFoo)`. Example: [recipe.port.ts](./server/src/modules/recipes/domain/ports/recipe.port.ts) ends with `export const IRecipesRepository = Symbol(...)`. Keep this pattern when adding new ports — it's how every module wires its persistence layer.

### Domain validation vs HTTP errors

Domain entities throw typed domain errors (e.g. `EmptyIngredientSectionsError`). Handlers catch those and rethrow as `BadRequestException` so HTTP semantics stay in the application layer, not the domain. See [create-recipe.handler.ts](./server/src/modules/recipes/application/commands/create-recipe.handler.ts) for the canonical pattern.

### Active modules

`AppModule` composes: `Auth`, `Users`, `Recipes`, `Translation`, `SocialInteraction`, `Audit`, plus a `SharedModule` and `EventEmitterModule.forRoot()` (used by the audit listener — see [audit.module.ts](./server/src/modules/audit/audit.module.ts)).

### Auth + RBAC

JWT via Passport. Roles enum (`ADMIN | WRITER | READER`) lives in Prisma; the `RolesGuard` is **fail-safe** — if `request.user` or `user.role` is missing it returns `false`, so applying `@Roles(...)` without `JwtAuthGuard` ahead of it denies all requests rather than allowing them. Always stack `@UseGuards(JwtAuthGuard, RolesGuard)` in that order on protected routes.

### Global pipes

`main.ts` registers a global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. DTOs without `class-validator` decorators on a field will silently drop that field on requests — don't be surprised when a typo in a DTO causes a 400.

### CORS

Single-origin CORS allowed from `process.env.CLIENT_URL` (default `http://localhost:5173`). Trailing slash is stripped in `main.ts`.

## Prisma schema highlights

- `User.id` is a UUID string; `Recipe.id` is an autoincrement int — be careful when typing IDs across the boundary.
- Nutrition is stored **per 100g** on `IngredientNutrition`, with `IngredientPortion` providing unit→gram conversions (e.g. "1 cup flour = 125g"). The `NutritionalValueService` computes recipe totals on demand — totals are not persisted.
- Ingredients are linked to USDA FoodData Central via `Ingredient.fdcId`. `PendingIngredientMatch` is a staging table for USDA search results before they're promoted to real `Ingredient` rows.
- `Translation` keys nested fields by dotted path (e.g. `"stepSection.1.step.2.description"`), unique per `(recipeId, field, locale)`.
- `AuditLog` is append-only and indexed on `userId`, `action`, `resourceType`, `timestamp`. The audit module subscribes to events emitted via `EventEmitterModule` rather than being called directly — keep that decoupling.

## Conventions worth keeping

- **No `class-validator` in the domain layer.** It lives only in `infrastructure/controllers/dtos/`. Domain entities validate via factory methods and throw typed errors.
- **Controllers don't call repositories.** They map DTO → command/query, hand off to a service or handler, and return the result. The mapping helpers live as private methods on the controller (see `mapDtoToCreateCommand` in [recipes.controller.ts](./server/src/modules/recipes/infrastructure/controllers/recipes.controller.ts)).
- **Repository interfaces stay in `domain/ports/`**, even though they describe persistence. The Prisma implementation lives in `infrastructure/adapters/persistence/` and is the only place that imports `@prisma/client` models.
