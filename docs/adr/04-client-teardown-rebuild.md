# ADR-04 — Tear down the client and rebuild on a single API layer

- Status: accepted
- Date: 2026-06-09
- Relates to: [PRD-02 client re-architecture](../prds/02-client-rearchitecture.md), [ADR-02](./02-collapse-hexagonal-to-controller-service-prisma.md)

## Context

A June 2026 audit found the React client fully disconnected from the server
(every call missing the `/v1` prefix → 404) and the core loop broken even after
reconnection: no register screen, create/edit rejected with 400 (`authorId` sent
in the body against `forbidNonWhitelisted`), ingredient names rendered blank
(flat `ingredientName` expected vs nested `ingredient.name` returned), and
freshly created recipes invisible to their own author (Draft default + no token
on reads). Entire server capabilities (discovery, lifecycle, linking, nutrition,
slugs) had no UI.

The root cause was structural, not a list of bugs: every page owned a private
copy of the server contract — its own base URL, its own `Recipe` type, its own
label maps, its own `fetch`/error handling. The type copies had already drifted
(e.g. `particularities` typed as `string[]` where the server returns objects);
the label maps were still byte-identical, i.e. drift waiting to happen.
Patching pages preserves the structure that produces the drift.

## Decision

Tear down `client/src` and rebuild in the same Vite project on one foundation:

- **One API layer**: an `api/` folder is the only code allowed to talk to the
  server — a typed client (`/v1`, JWT attach, 401 → logout) plus TanStack Query
  for caching/loading/error/invalidation. `api/types.ts` is the single mirror
  of server response shapes (raw Prisma rows, per ADR-02).
- **Pages + shared components** layout (`pages/`, `components/`, `api/`, `lib/`),
  chosen over feature folders by the owner; the api-only-fetch rule is the
  guardrail that prevents the old rot from regrowing.
- **Responsive one-codebase web** (read-first on mobile; authoring usable but
  desktop-optimized), **Tailwind** for styling, **react-i18next** scaffold
  shipping French-only.
- **Slug-canonical URLs**: `/recipes/:slug` is the address the app generates;
  numeric-id URLs still resolve and redirect.

## Consequences

- The existing UI code is discarded; the visual design survives as Tailwind
  tokens and re-expressed markup. Nothing of the old `src` is load-bearing —
  it was disconnected, so there is no working behavior to regress.
- Server contract changes now have exactly one place to land (`api/`), and a
  type drift is a compile error in one file instead of a silent blank field.
- Two small server additions are required by the v1 UI (`GET /recipes/mine`,
  `likedByMe` on the likes read) — tracked in PRD-02.
- Until the rebuild reaches Phase 1, there is no usable client; the old one was
  already unusable (every request 404s), so the regression window is zero.
