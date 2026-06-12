# Chez Huong — Domain Language

A multilingual recipe site for Vietnamese cuisine. Recipes are authored once and presented in multiple languages.

## Language

### Content & translation

**Recipe**:
A single piece of cooking content — title, description, ingredient sections, step sections, particularities — authored in one **base locale**.

**Locale**:
A language code (`vi`, `en`, `fr`) identifying which language a piece of content is written in. Used on both **Recipe** (the base locale) and **Translation** (the target locale).
_Avoid_: language, lang, lang code (in domain talk — `lang` survives only as the HTTP query param name).

**Base locale**:
The single locale a **Recipe** was originally authored in (`Recipe.locale`). All other locales are **target locales** that exist only as **Translations**.

**Translation**:
A translated value of **one field** of **one Recipe** in **one target locale**, with provenance (which **Translator**) and a **TranslationStatus** (DRAFT / APPROVED / …). Keyed by `(recipeId, field, locale)`. A Recipe is "available in English" only when its translations for that locale exist with status `APPROVED`.
_Avoid_: localization, i18n entry, language version.

**Field path**:
The dotted string identifying which part of a Recipe a Translation belongs to — e.g. `"title"`, `"description"`, `"stepSection.1.step.2.description"`. The numeric segments are 1-indexed.

**Translator**:
A **User** who has authored or edited at least one **Translation**. Not a separate role — any User with appropriate permissions can act as a Translator on a given Recipe.

**Hybrid translation policy**:
Human-authored **Translations** are the source of truth. When a field has no Translation for the requested locale, the Recipe is shown in its **base locale** for that field — there is **no** live machine translation at read time. Machine translation (Google Cloud Translate) is an *authoring aid only*: it pre-fills the **Translator**'s editor so they can review and save, and never serves readers directly.

**Translation coverage**:
How complete a **Recipe** is in a given **target locale** — the share of its translatable **field paths** that have an `APPROVED` **Translation**. A derived number (the "translated 80%" badge), never stored; recomputed from the Translations that exist. 100% means every field is human-translated; anything less means some fields fall back to the **base locale**.
_Avoid_: completeness, progress (in domain talk — reserve for the coverage figure).

### Recipe structure

**IngredientSection**:
A named grouping of **RecipeIngredients** inside a Recipe (e.g., "For the broth"). A Recipe has at least one IngredientSection; each IngredientSection has at least one RecipeIngredient.

**RecipeIngredient**:
The usage of an **Ingredient** inside one Recipe — quantity (string, supports fractions like `"1/2"`) and unit (`"cup"`, `"g"`, …).
_Avoid_: line item, recipe-line (those collapse RecipeIngredient with Step).

**Ingredient**:
The underlying food item itself (e.g. "rice noodle", "star anise"), linked to USDA FoodData Central via `fdcId`. Carries its **Nutrition** (per 100g) and its **Portions** (unit conversions).

**Step**:
One ordered instruction inside a **StepSection**. Ordering is `order` (1-indexed), not array position, so steps can be reordered without renumbering siblings.

**StepSection**:
A named grouping of Steps inside a Recipe (e.g., "Preparation", "Cooking"). A Recipe has at least one StepSection; each has at least one Step.

**Particularity**:
A dietary tag applied to a Recipe (`VEGETARIAN`, `GLUTEN_FREE`, `HALAL`, …). Drawn from a fixed enum, not free text.
_Avoid_: tag, dietary restriction, label (those are broader concepts).

**Servings**:
The number of eaters a Recipe is portioned for (`Recipe.servings`, an integer). The divisor for per-serving **Nutrition** and the basis for servings scaling.

**Yield**:
An optional, human-readable description of what a Recipe produces when "eaters" is the wrong frame — e.g. "makes 24 dumplings", "≈ 2 cups". Display-only; **Servings** still carries the number the nutrition math divides by.
_Avoid_: portions, batch size.

### Recipe relationships

**RecipeLink**:
A relationship from one Recipe to another, of one **kind** (**Pairs with**, **Uses**, **Variation of**). Navigational only — following a link opens the other Recipe; nothing composes (ingredients, steps, and nutrition never roll up across a link). A Recipe cannot link to itself, and the same link is never stored twice.

**Pairs with**:
A symmetric **RecipeLink** suggesting two Recipes go well together (e.g. a soup and a bread). Shown on both Recipes.

**Uses**:
A directed **RecipeLink** from a Recipe to another it calls for (e.g. a main dish to its sauce). A navigational reference only — the used Recipe's ingredients and nutrition do **not** roll up into the using Recipe.
_Avoid_: sub-recipe, component (those imply composition, which Uses deliberately does not do).

**Variation of**:
A directed **RecipeLink** from a Recipe to the base Recipe it is an alternate version of (vegan, spicier, …). The base Recipe shows its variations.

### Recipe lifecycle

**Draft / Published**:
A **Recipe**'s visibility state. A **Draft** is visible only to its author and ADMINs and never appears in **Discovery** or as a **RecipeLink** target. **Published** makes it public. Publishing requires only the **base locale** — **Translation coverage** is not a gate.
_Avoid_: unlisted, archived (not modeled — a Recipe is either Draft or Published).

### Discovery

**Discovery**:
The umbrella for every way a reader finds a **Published** Recipe without already knowing its address: full-text **search** (title + description), **filtering** (cuisine, **Particularity**, difficulty, type, time), **find-by-ingredient** ("recipes with lemongrass"), and the **popularity** (most-**Liked**) and **newest** (by `createdAt`) listings. **Drafts** never surface in Discovery.
_Avoid_: feed, browse, catalogue (those imply a fixed list; Discovery is query-driven).

**Slug**:
The clean, human-readable handle in a Recipe's web address (e.g. `banh-mi` in `/recipes/banh-mi`), unique across Recipes. The reader-facing identity of a Recipe, distinct from its numeric `id`.
_Avoid_: permalink, handle, path (those are broader or transport-level).

### Nutrition

**Nutrition (per 100g)**:
Nutrient values stored on an **Ingredient** at the per-100-gram baseline. Recipe nutrition totals are **computed on demand** by scaling each RecipeIngredient's quantity into grams and summing — never persisted on the Recipe itself.

**Portion**:
A named unit-to-grams conversion for one **Ingredient** (e.g., `1 cup flour = 125g`), sourced from USDA. Required to convert non-weight RecipeIngredient units (`"cup"`, `"tbsp"`) into grams for nutrition calculation.

### Community

**Like**:
A **User**'s single positive mark on a **Recipe**. It doubles as that User's personal save ("recipes I want to cook later") and as the signal behind **popularity** ranking. One per `(User, Recipe)`.
_Avoid_: favorite, bookmark — currently synonymous with Like. Reserve **Save** / **Collection** / **Cookbook** for a possible future named-lists feature; they are not separate concepts today.

**Comment**:
A **User**'s note on a **Recipe**. A Comment may be a reply to another Comment, with **no limit on nesting depth** — any reply can itself be replied to (a full thread tree, via `parent`).
_Avoid_: review (a review implies a score, which the site deliberately does not have — see Like).

## Example dialogue

> Dev: "We have a recipe in Vietnamese. The user wants to read it in English."
>
> Domain: "Right — its **base locale** is `vi`. To present it in English, you look up every **Translation** for `(recipeId, field, locale='en')` and apply each one to the matching **field path** on the Recipe. Anything still missing just shows the **base locale** — there is no machine translation at read time. Google only helps a **Translator** pre-fill the editor when they're authoring."
>
> Dev: "What if the original author edits the Vietnamese title later?"
>
> Domain: "The English Translation for `field='title'` becomes stale. It still exists, still APPROVED — but its `updatedAt` is older than the Recipe's. That's a Translator workflow concern, not a structural one. The model stores both; the editorial process decides when to refresh."
