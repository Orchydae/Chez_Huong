---
title: Client re-architecture — teardown & rebuild
status: approved
relates-to:
  - 01-revamped-recipes-website.md
  - ../adr/04-client-teardown-rebuild.md
  - ../diagrams/client_component_diagram.puml
  - ../diagrams/client_data_flow_diagram.puml
---

# Client re-architecture — teardown & rebuild

The current frontend is being torn down and rebuilt on a maintainable foundation.
This document is the plan: why, the decisions already made, the target
architecture, and the build phases in order.

## Why a teardown (the audit, June 2026)

The client is **fully disconnected from the server today** — every request 404s
because the server moved under a `/v1` prefix and the client never followed.
Beyond that, the audit found the core loop broken end-to-end:

- **No register screen exists** (login only) — the server's `POST /v1/auth/register` is unused.
- **Create/Edit always fail with 400**: the client sends `authorId` in the body; the
  server rejects unknown fields and derives the author from the login token.
- **Ingredient names render blank**: the client expects a flat `ingredientName`;
  the server returns nested `ingredient: { name }`.
- **A newly created recipe disappears**: it defaults to Draft, and the client never
  sends the login token on reads, so even its author gets a 404.
- The UI shows **5 hardcoded stars** — the PRD explicitly says no star ratings.
- Whole server features have no UI at all: discovery (search/filter/sort), draft →
  publish lifecycle, delete, slug addresses, recipe linking (the headline feature),
  nutrition.
- Maintainability: the server URL is copy-pasted in 5 files; every page re-declares
  its own `Recipe` type (already drifted — e.g. diet tags typed as plain strings
  where the server returns objects) and copy-pastes identical label maps; raw
  `fetch` + `alert()` everywhere; no 404 page.

Each page owning its own copy of everything is the root disease — patching pages
one by one would keep the disease. Hence: rebuild the foundation, then the pages.

## Decisions (made 2026-06-09, grilled & locked)

| Decision | Choice |
|---|---|
| Approach | Tear down `client/src`, rebuild on a new foundation (same repo, same Vite project) |
| Mobile | **Responsive web, one codebase.** Reading/discovery designed mobile-first; authoring works on mobile but is optimized for desktop |
| Recipe URLs | **Both work, slug canonical**: `/recipes/banh-mi` and `/recipes/12` both resolve; the app always generates slug links; an id URL redirects to the slug |
| Data layer | **One typed API client + TanStack Query.** `api/` is the only code that talks to the server |
| Styling | **Tailwind CSS**, design tokens in config; current desktop look re-expressed, responsive from day one |
| UI text | **i18n-ready via react-i18next**, shipping French-only (`fr.json`); no hardcoded strings in components |
| Code layout | **pages/ + components/ + api/ + lib/** (see component diagram) |
| v1 scope | Core loop + discovery + likes & comments + recipe links + nutrition + my-recipes (drafts) |

## Target architecture

Two diagrams define it (in [docs/diagrams/](../diagrams/)):

- **[client_component_diagram.puml](../diagrams/client_component_diagram.puml)** —
  what exists and what contains what.
- **[client_data_flow_diagram.puml](../diagrams/client_data_flow_diagram.puml)** —
  how data moves: read flow, write flow, auth flow.

```
client/src/
├── api/            # ALL server communication + types — nothing else may fetch
│   ├── client.ts        # base URL + /v1, attaches the login token (JWT); an
│   │                    # expired login signs you out automatically (401 → logout)
│   ├── types.ts         # Recipe, User, Comment… single mirror of server shapes
│   ├── auth.api.ts      # login, register, profile + AuthProvider/useAuth
│   ├── recipes.api.ts   # discovery, read, create/update, lifecycle, links, nutrition
│   ├── social.api.ts    # likes, comments
│   └── ingredients.api.ts   # ingredient search/confirm (writer/admin only)
├── pages/          # one folder per route; composition only, no fetch logic
│   ├── home/  recipe/  create/  edit/  my-recipes/  not-found/
├── components/     # shared UI: Navbar, Footer, ToastHost, auth modals, RequireRole,
│                   # RecipeCard, RecipeForm, IngredientAutocomplete, CommentThread,
│                   # LikeButton, NutritionPanel, RecipeLinksPanel, ui kit (Button…)
├── lib/            # i18n (fr.json), formatting helpers
└── App.tsx         # routes
```

**The one rule that keeps this maintainable:** only `api/` imports `fetch`.
Pages and components get data through `api/` hooks; response types come from
`api/types.ts` and nowhere else. (This is the rule whose absence rotted the
old client.)

## Server prerequisites (small, do first)

Two gaps the v1 UI needs — both small additions to existing controllers:

1. **`GET /v1/recipes/mine`** — the caller's own recipes **including Drafts**
   (Discovery deliberately returns Published only). Auth required (writer/admin).
   Backs the My Recipes page.
2. **The likes read should also say whether *you* liked it** — so the heart can
   render filled/empty when the page loads. Works logged-out too (it just answers
   "no"). Technically: `GET /v1/recipes/:id/likes` gains `OptionalJwtAuthGuard`
   and returns `{ likeCount, likedByMe }`. (The toggle `POST /v1/recipes/:id/like`
   already returns the count and a flag after a click — note its flag is named
   `liked`, so either match the names or type both shapes in `api/types.ts`.)

Known and accepted: **comment editing has no endpoint yet** (PRD M5) — v1 ships
comments with create / reply / delete-own only.

## Build phases

Each phase is shippable and verifiable on its own. ✅ marks a phase that has
shipped.

### Phase 0 — Teardown & foundation ✅ _(shipped 2026-06-09)_
- Remove `client/src` pages/components; keep the Vite project, fonts, logo, brand CSS values (extracted into Tailwind tokens).
- Install: `tailwindcss`, `@tanstack/react-query`, `react-i18next` (+ `i18next`).
- Build `api/client.ts` (`/v1`, attaches the login token, expired login → signed out automatically) and `api/types.ts` mirroring **actual server responses** (nested `ingredient.name`; diet tags as objects, not strings; `status`, `slug`, `yield`, timestamps).
- App shell: routes, Navbar, Footer, ToastHost, 404 page, i18n scaffold with `fr.json`.
- _You'll see:_ an app that boots, shows brand + navigation and a proper 404 — wired to a server that answers.

### Phase 1 — Core loop (the priority: register → author → read) ✅ _(shipped 2026-06-09)_
- **Auth**: LoginModal + RegisterModal against `/v1/auth/*`; login token remembered in the browser; role-aware menus; expired login signs you out automatically.
- **Read**: RecipePage by slug (id redirects to slug); the login token rides along on reads so authors see their own Drafts; nested ingredient shape rendered correctly.
- **Author**: RecipeForm (shared by Create/Edit) — sends only the fields the server accepts (no `authorId`), explicit **Draft / Publish choice** at save, ingredient autocomplete (writer/admin-only endpoints), image uploads.
  - ⚠ On **Edit**, the Draft/Publish control must call `PUT` then `PATCH …/publish` (or `/unpublish`) — the server deliberately **ignores** a `status` field inside an update body, silently. Sending it looks like it worked and does nothing.
- _You'll see:_ a new visitor registers, writes a recipe, saves as Draft or publishes, and reads it back at `/recipes/<slug>` — airtight.
- _Shipped beyond plan:_ **unpublish from the edit screen** ("Repasser en brouillon") landed here instead of Phase 2, and the server gained a slug guard — a title like "2024" or "Create" gets a `recipe-` prefix so its address can never be mistaken for a numeric id or shadow the `/recipes/create` route.

### Phase 2 — My recipes & lifecycle ✅ _(shipped 2026-06-10)_
- Server: add `GET /v1/recipes/mine`.
- MyRecipesPage: own recipes incl. Drafts with status badges; **publish / unpublish / delete** (with confirm dialog) wired.
- _You'll see:_ the full Draft → Published → back lifecycle, owned from one screen.
- _Shipped beyond plan:_ a reusable `ConfirmDialog` joined the ui kit, and "Mes recettes" entered the navbar account menu (desktop + mobile).

### Phase 3 — Discovery ✅ _(shipped 2026-06-10)_
- HomePage becomes real Discovery: the Navbar search box works (`q`), filters (cuisine / diet / difficulty / type), **newest / popular** toggle, pagination.
- RecipeCard: real data, like count — **no fake stars**.
- _You'll see:_ "recipes with lemongrass" actually finds them.
- _Implementation notes:_ all Discovery state lives in the URL (`/?q=pho&diet=VEGAN&sort=popular`) so results are shareable and the back button works; pagination is a "load more" (12 per page) since the server returns no total count; the server now includes each recipe's like count (`_count.likes`) in every recipe read.
- _Shipped beyond plan (review findings):_ the cuisine filter matches substrings server-side; Discovery text params are length-capped and LIKE-escaped; and all recipe-scoped social endpoints (likes/comments) became draft-aware — they were an anonymous oracle for confirming hidden drafts.
- _Hero (revised 2026-06-10):_ full-bleed `viet-hero.jpg` with a left-heavy forest wash, Vietnamese proverb tagline, "Recettes" / "Défiler vers le bas" controls. Searching (or clicking Recettes) smooth-scrolls to the results section instead of hiding the hero.

### Phase 4 — The rest of v1 on the recipe page ✅ _(shipped 2026-06-10)_
- Server: add `likedByMe` to the likes read.
- **LikeButton** (toggle + count), **CommentThread** (comments, replies, delete own), **RecipeLinksPanel** (Pairs with / Uses / Variation of; authors manage links from the edit screen), **NutritionPanel** (per serving / total).
- _You'll see:_ the headline linking feature visible to readers for the first time.
- _Implementation notes:_ the heart and the comments section render only on **published** recipes (a draft has no audience); replies nest two levels — exactly the server's read depth — so the UI never offers a reply that would silently vanish; the nutrition panel hides itself when no ingredient carries USDA data and discloses how many ingredients were skipped; link management lives on the edit screen with a Discovery-backed picker (published-only by construction) that pre-filters self-links and duplicate targets, and each link saves immediately — independent of the form's save button.

### Phase 5 — Mobile polish pass ✅ _(shipped 2026-06-12)_
- Read-first responsive QA at 360–430 px (RecipePage, Home/Discovery, comments, authoring), done as an adversarially-verified static audit then fixed:
  - **iOS focus-zoom killed everywhere:** every text input/select/textarea is `text-base sm:text-sm` (16 px below `sm` stops Safari's auto-zoom; desktop sizing unchanged) — Discovery filters, RecipeForm + ingredient autocomplete + link manager, comments, auth modals, navbar search.
  - **Modal is now scrollable** (`overflow-y-auto` backdrop + `m-auto` panel) — the register form was taller than a short phone's viewport and its top/bottom controls were unreachable.
  - **No horizontal scroll on mobile:** hero uses `svh` so the scroll cue isn't clipped behind browser chrome; authoring ingredient/step rows shrink (`min-w-0`/`flex-wrap`) instead of forcing page-wide sideways scroll; long ingredient names wrap (grid `minmax(0,1fr)`) instead of clipping.
  - **CLS:** step images reserve a `4:3` box on mobile so lazy loads don't shove the step text.
  - **Tap targets:** RecipeCard like button gets an invisible `after:` hit halo (near-misses stop falling through to the card link), toast dismiss and mobile-menu rows enlarged.
- A mobile speed check (Lighthouse): **97 / 100** (LCP 2.3 s, CLS 0.019, TBT 0). Below-fold images stay lazy; the hero is eager + `fetchpriority=high` + preloaded.
- _You'll see:_ the site genuinely usable propped on a kitchen counter.
- _Implementation notes:_ the big mobile win was assets — the 2.9 MB hero JPEG, 755 KB fallback and 341 KB auto-traced logo SVG were re-encoded to responsive WebP (hero ~150 KB on phones via `srcset`, fallback 143 KB, logo 7 KB + a 4 KB PNG favicon). Originals live in `client/assets-src/`; `npm run optimize:assets` (sharp) regenerates `public/`. Google Fonts moved from a render-blocking CSS `@import` to a `<link>` + `preconnect` in `index.html`, weights trimmed to those actually rendered.
- _Shipped beyond plan:_ ingredient rows carry a **check-off checkbox** (cook-along, per-visit, strikes through when ticked); the `assets-src/` → `public/` image-optimization script joined the repo.

## Conventions for future devs

- Only `api/` talks to the server; only `api/types.ts` declares server shapes.
- All user-visible text through i18n keys (`fr.json`) — no inline strings.
- Tailwind utilities + tokens; no inline `style={{…}}` for layout.
- Errors surface as toasts; never `alert()`.
- Writer/admin-only routes wrapped in `RequireRole`.
- New page = new folder under `pages/`; shared bits go to `components/` the moment a second page needs them.

## Not in v1 (deliberate)

- Reader-facing translations UI & coverage badge (M4) — the i18n scaffold and `api/` seam are ready for it.
- Comment editing (M5 — no server endpoint yet).
- Author pages and share buttons (M5), cooking help (M6), admin tools (M7).
- Named cookbooks — explicitly "maybe later" per PRD-01, not scheduled.
- Time filter in Discovery (server defers it — needs a stored normalized-minutes column).
- PWA / installable app.

Note on M7: its client half — clean addresses and the "page not found" screen —
ships early, in v1 Phases 0–1; M7 retains only the admin tools.
