---
title: Revamped recipes website
status: draft
relates-to:
  - CONTEXT.md
---

# Revamped recipes website

A recipe website for Vietnamese cooking. The big idea: **no recipe stands alone — every recipe links to others.** Plus everything you'd expect from a real recipe site: find them, cook them, talk about them, read them in your language.

> **Priority right now — the core loop.** The one chain that must never break is **register → author a recipe → read it back**. It already works today; the immediate job is to make it airtight, then build everything else (linking, discovery, translation) around it. The roadmap below leads with it.

**Tags:** `[have]` = already built. `[new]` = to build.

## The recipe itself `[have]`

A recipe has: title, description, photo, cuisine, difficulty, type (breakfast/main/dessert…), prep + cook time, and servings.

- **Ingredients** — grouped into sections ("For the broth"), each ingredient with an amount.
- **Steps** — grouped into sections ("Preparation", "Cooking"), in order, each step can have a photo/video.
- **Diet tags** — vegan, gluten-free, halal, etc. (pick from a fixed list).
- **Nutrition** — worked out automatically, shown per serving and as a total. Always fresh, never goes stale.

`[new]` Add an optional **yield** line for recipes that don't "serve people" — e.g. "makes 24 dumplings", "≈ 2 cups of dipping sauce". Servings still drives the nutrition math.

## Linking recipes `[new]` — the headline feature

Every recipe can point at others, three ways:

- **Pairs with** — goes well together (a soup + a bread). Shows on both recipes.
- **Uses** — needs another recipe (a main dish uses a sauce). A clickable link only — the sauce's ingredients and nutrition do **not** get merged in.
- **Variation of** — another version of a recipe (vegan, spicier). The original shows all its variations.

Rules: a recipe can't link to itself, and you can't add the exact same link twice.

## Finding recipes `[new]`

- **Search** by title and description.
- **Filter** by cuisine, diet tag, difficulty, type, and time.
- **Find by ingredient** — "recipes with lemongrass".
- **Popular** (most-liked) and **newest**.
- **Across languages (the goal):** a French word should find a recipe that's been translated to French. First version searches the original language only; searching translations follows right after.

## Languages `[have, extending]`

- A recipe is written in one language, then translated field by field.
- **People write the real translations** — those are the truth. Google Translate only helps **pre-fill the form** for a translator; it's never shown to readers on its own.
- `[new]` Readers can **switch a recipe into their language**. Anything not translated yet shows the original language, clearly marked.
- `[new]` A **"translated 80%"** badge shows how complete a language is.

## Social `[have + new]`

- `[have]` **Like** a recipe. **Comment**, and **reply** to comments.
- `[new]` The like button doubles as **save for later** (your liked recipes are your saved list). Room to grow into named cookbooks later.
- `[new]` **Edit your own comment.**
- `[new]` **Author page** — all recipes by one person.
- `[new]` **Share** a recipe link.

Not now: following people, notifications, users posting their own photos.

## Cooking help `[new]`

- **Scale** a recipe up or down to the servings you want.
- **Shopping list** for a recipe.
- **Cook mode** — one step at a time, easy to follow at the stove.
- **Nutrition detail** — per serving, plus which ingredient drives what (e.g. "fish sauce = most of the salt").

## Writing & managing recipes `[have + new]`

- `[have]` Writers and admins **create and edit** recipes.
- `[new]` **Draft vs published** — work on a recipe privately, publish when ready. Drafts don't show up in search, popular, or links.
- `[new]` **Delete a recipe.**
- `[new]` An **admin can promote** a normal user to writer.

## Looking good when shared `[new]`

- **Now:** clean web addresses (e.g. `/recipes/banh-mi`), fast-loading images, a proper "page not found" screen.
- **Later:** rich Google recipe cards and nice Facebook/social link previews (needs extra setup first).

## Accounts `[have + later]`

- `[have]` Register, log in, and three roles: reader / writer / admin.
- **Later (needs an email service first):** "forgot password" and "confirm your email" emails.

## Not doing — on purpose

- Star ratings — the like is enough.
- Following users / notifications.
- Users posting their own photos.
- Seasonal / Tết homepage section.
- Merging ingredients or nutrition across linked recipes.
- Auto-translating for readers on the fly.
- Named cookbooks / collections (maybe later — the save button leaves the door open).

## Under-the-hood tidy-ups

Small fixes bundled in along the way: enable deleting a recipe, keep step numbering correct, check that step media links are valid, and record created/updated dates so "newest" and "popular" are honest.

## Roadmap — how we'll build it (milestones)

**Where we are today:** the first five milestones are built on the **API (server)** — **Now** (hardening), **M0** (foundations), **M1** (draft/publish/delete), **M2** (discovery), and **M3** (the headline recipe-linking feature). That includes the headline: recipes can now link to each other three ways, with self-links, duplicates, and links to drafts all blocked. **M7** (admin role management + clean addresses) and **M5** (community & sharing — minus the author page) have also shipped end-to-end. Still to come: **M4** (read in your language). Nothing is broken.

> ✅ below marks a milestone whose **server/API work is complete**. The client UI that consumes these endpoints is tracked separately.

The work is broken into shippable steps. Each is testable and useful on its own.

### Now — Harden the core loop ✅ _(the priority: register → author → read)_
The core loop already works; this round makes it airtight before anything is built on top.
- **Make authoring safe:** lock the ingredient endpoints so only writers/admins can change the shared ingredient list — today they're open to anyone, which is a security gap.
- **Round out managing a recipe:** add **delete a recipe** (author or admin only).
- **Tighten the edges:** confirm create / read / register validation holds and check the loop end-to-end.
- _You'll see:_ the same core flow — but safe and complete.

### M0 — Foundations & safety ✅ _(mostly invisible groundwork)_
- One database change adds the data the new features need: a recipe **Draft/Published** state, a web-address **slug**, an optional **yield** line, **created/updated dates**, an **edited date for comments**, and the **recipe-to-recipe link** structure.
- Remove the old unused **audit table**.
- _You'll see:_ little on screen yet — this is the groundwork the rest stands on.

### M1 — Recipe lifecycle: draft, publish, delete ✅
- A new recipe starts **private (Draft)** by default — only the author and admins can read it. **Publish** opens it to the world; **unpublish** pulls it back to private (its web address stays reserved). When creating, the author can also **publish immediately** in one step.
- Drafts stay out of search, listings, and links.
- The **slug** is generated from the title and **frozen on first publish**, so shared links never break (see [ADR-03](../adr/03-auto-generated-publish-frozen-slugs.md)).
- _Depends on M0._

### M2 — Finding recipes (Discovery) ✅
- **Search** by title/description; **filter** by cuisine, diet, difficulty, and type. _(Time filter not yet wired — optional.)_
- **Find by ingredient** ("recipes with lemongrass"), plus **Popular** (most-liked) and **Newest** lists.
- Drafts never surface here.
- _Depends on M0 (dates) and M1 (so drafts stay hidden)._

### M3 — Linking recipes ✅ _(the headline feature)_
- Connect recipes three ways: **Pairs with**, **Uses**, and **Variation of**.
- Self-links and duplicate links are blocked; links never point at a draft.
- A recipe's links read back in **both directions** (e.g. a paired soup shows on the bread too); a link whose other end has since been unpublished is hidden.
- Only the source recipe's **author or an admin** can add or remove a link.
- _Depends on M0 and M1._

### M4 — Read in your language
- Readers **switch a recipe into their language**; anything untranslated falls back to the original, clearly marked.
- A **"translated 80%"** badge shows how complete each language is.
- _Builds on the translation tools already in place._

### M5 — Community & sharing
- **Edit your own comment**, an **author page** (all recipes by one person), **share** a recipe link, and your **likes shown as your saved list**.
- Threads already allow replies to **any depth**; lift today's reader limitation that only loads the first **two levels** of replies per fetch (deeper threads need a "load more replies" step).
- _Depends on M0; share links use the slug from M0._

### M7 — Admin & clean addresses ✅
- An **admin promotes (or demotes) a member to any role** — reader, writer, or admin — from a dedicated **Administration** page (search a member by name/email, pick their role, it applies on the spot). An admin **can't change their own role**, so the last admin can never lock themselves out. _(Went slightly beyond the original "promote to writer" line: the screen sets any of the three roles, since demoting and granting admin are the same operation.)_
- Clean web addresses everywhere (`/recipes/banh-mi`) and a proper **"page not found"** screen — both already shipped in M1 (frozen slugs) and the client rebuild (the 404 route).
- _Uses the slug from M0._

### M8 — Later _(needs extra setup first)_
- Email-dependent: **forgot password** and **confirm your email** (needs an email service).
- **Rich Google recipe cards** and nice **social link previews**.
- **Search across languages** — find a recipe by its translated text, not just the original.
- Swap to Canadian nutritional value and what not
