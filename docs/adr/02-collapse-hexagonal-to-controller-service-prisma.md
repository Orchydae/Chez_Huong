# Collapse hexagonal/DDD/CQRS scaffolding to Controller → Service → Prisma

The server was built with a full hexagonal layout per module: `domain/` (entities, ports-as-Symbols, factory validation), `application/` (commands, queries, handlers, passthrough services), `infrastructure/` (controllers, mappers, Prisma adapters). Creating a recipe passed through nine layers (DTO → mapDtoToCommand → Command object → passthrough Service → Handler → entity factory → port → Prisma adapter → mapper). Nothing in the product justified that — repositories had a single Prisma implementation, services forwarded calls verbatim, factory validation duplicated `class-validator` on the DTO, and the audit module's event bus was decoupling a sender that didn't exist.

## Decision

Idiomatic NestJS shape, applied uniformly across modules:

- **One service per feature** that injects `PrismaService` directly.
- **No domain entities, no mappers, no repository ports/Symbols, no Handler classes, no Command/Query objects.** Validation rules live as `class-validator` decorators on the request DTO. The service returns raw Prisma rows; the client adapts to the DB shape.
- **External integrations** (USDA, Google Translate, Supabase Storage) are plain `*.service.ts` — no port interface.
- **Real-logic services keep their place.** `NutritionalValueService` survives intact because it does actual work (unit parsing, gram conversion, nutrition math).
- **Flat folders.** `domain/application/infrastructure` are gone; files sit directly under the module with a `dtos/` subfolder.
- **Audit module deleted** (it recorded nothing — no code emitted the events its listener subscribed to). `EventEmitterModule` removed.
- **Existing tests dropped.** They mocked the layers being removed; coverage is rebuilt later only where there is real logic worth testing.

## Why hexagonal didn't pay off here

The two benefits hexagonal promises — swappable persistence and isolated domain tests — had no real payoff. Prisma against Supabase Postgres is not getting swapped (see [ADR-01](./01-prisma-over-supabase-js.md)), and the tests we built on top of the ports were testing passthrough rather than logic. The cost (~9-layer call chain, 16-arg positional constructors duplicated three times) was paid every feature.

## Consequences

- `CLAUDE.md` (which documents the old layout) must be rewritten after the refactor.
- The client receives the raw Prisma response shape (diet tags as `{type: "..."}` objects instead of strings, `ingredientName` deep-nested under `ingredient`, extra timestamp/FK fields). Client pages are updated in a follow-up.
- Re-introducing a hexagonal boundary later (e.g. if persistence becomes pluggable) means walking some of this back — accepted, because the trigger condition is not on the horizon.
