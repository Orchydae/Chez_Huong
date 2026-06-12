# Auto-generated, publish-frozen recipe slugs

A Recipe is addressed publicly by a human-readable **Slug** (`/recipes/banh-mi`). We
auto-generate the slug from the title — lowercased, diacritics flattened so Vietnamese
titles become clean ASCII ("Bánh Mì" → `banh-mi`) — and append a numeric suffix on
collision (`pho`, `pho-2`). While a Recipe is a **Draft** the slug re-tracks the title on
each edit; on the **first Publish** the slug **freezes** and never changes again, even if
the title is edited later.

**Why:** once a Recipe is public, shared links, bookmarks, and search-engine entries must
stay stable — a slug that followed every title edit would silently break them. We accept
that a heavily-renamed Recipe may end up with a slug that no longer matches its title; a
stable address is worth more than a tidy one. Authors never hand-write slugs, which keeps
addresses consistent and removes a decision from the authoring flow.

## Considered options

- **Author-supplied slugs** — rejected: inconsistent quality, an extra authoring burden,
  and still needs collision handling.
- **Always track the title** — rejected: renaming a published Recipe would move its
  address and break every existing link to it.
