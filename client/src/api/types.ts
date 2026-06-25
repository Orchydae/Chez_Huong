/*
 * The single mirror of the server's response shapes (raw Prisma rows with
 * includes — see server CLAUDE.md "Response shape"). Nothing outside api/
 * declares server types. If the server changes, this file is the one place
 * the client follows.
 *
 * Enums are string-literal unions (matching @prisma/client enums), with
 * `*_VALUES` arrays for building <select> options.
 */

// ─── Enums ─────────────────────────────────────────────────────────────

export const ROLE_VALUES = ['ADMIN', 'WRITER', 'READER'] as const;
export type Role = (typeof ROLE_VALUES)[number];

export const DIFFICULTY_VALUES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTY_VALUES)[number];

export const RECIPE_TYPE_VALUES = [
  'BREAKFAST',
  'MAIN',
  'SIDE',
  'DESSERT',
  'APPETIZER',
  'SALAD',
  'SNACK',
] as const;
export type RecipeType = (typeof RECIPE_TYPE_VALUES)[number];

export const TIME_UNIT_VALUES = ['MINUTES', 'HOURS'] as const;
export type TimeUnit = (typeof TIME_UNIT_VALUES)[number];

export const RECIPE_STATUS_VALUES = ['DRAFT', 'PUBLISHED'] as const;
export type RecipeStatus = (typeof RECIPE_STATUS_VALUES)[number];

export const PARTICULARITY_VALUES = [
  'VEGETARIAN',
  'VEGAN',
  'GLUTEN_FREE',
  'DAIRY_FREE',
  'NUT_FREE',
  'EGG_FREE',
  'SEAFOOD_FREE',
  'SOY_FREE',
  'HALAL',
  'KOSHER',
  'LOW_SODIUM',
  'LOW_SUGAR',
  'LOW_CARB',
  'HIGH_PROTEIN',
] as const;
export type ParticularityType = (typeof PARTICULARITY_VALUES)[number];

export const RECIPE_LINK_KIND_VALUES = ['PAIRS_WITH', 'USES', 'VARIATION_OF'] as const;
export type RecipeLinkKind = (typeof RECIPE_LINK_KIND_VALUES)[number];

// ─── Auth ──────────────────────────────────────────────────────────────

/** Decoded from the JWT payload (sub, email, role, firstName). */
export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  firstName: string;
}

export interface AuthResponse {
  access_token: string;
}

/**
 * The server's safe user shape (no password) — from `safeUserSelect`. Returned
 * by the admin-only GET /users and PATCH /users/:id/role.
 */
export interface SafeUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// ─── Recipe (read shapes — raw rows with includes) ─────────────────────

/** A localized ingredient name (fr / vi). English == Ingredient.name. */
export interface IngredientTranslation {
  id: number;
  ingredientId: number;
  locale: string;
  name: string;
}

export interface Ingredient {
  id: number;
  name: string;
  fdcId: number | null;
  /** Localized names; present on recipe detail reads and ingredient search. */
  translations?: IngredientTranslation[];
}

/** When a recipe is used AS an ingredient, the referenced recipe (clickable). */
export interface RecipeRefBrief {
  id: number;
  title: string;
  slug: string;
  status: RecipeStatus;
}

/**
 * One ingredient-list row. Its nutrition source is AT MOST one of: a catalogue
 * `ingredient`, OR another recipe used as an ingredient (`recipeRef`, whose
 * nutrition rolls up by servings), OR neither — a free-text row showing only
 * `displayName`. Note: nested `ingredient.name` — there is no flat ingredientName.
 */
export interface RecipeIngredient {
  id: number;
  sectionId: number;
  ingredientId: number | null;
  recipeRefId: number | null;
  displayName: string | null;
  quantity: string; // supports fractions like "1/2"; "" for "to taste"
  unit: string;
  ingredient: Ingredient | null;
  recipeRef: RecipeRefBrief | null;
}

export interface IngredientSection {
  id: number;
  name: string;
  recipeId: number;
  ingredients: RecipeIngredient[];
}

export interface Step {
  id: number;
  order: number;
  description: string;
  mediaUrl: string | null;
  stepSectionId: number;
}

export interface StepSection {
  id: number;
  title: string;
  recipeId: number;
  steps: Step[];
}

/** Diet tags come back as objects, not strings. */
export interface Particularity {
  id: number;
  recipeId: number;
  type: ParticularityType;
}

export interface Recipe {
  id: number;
  title: string;
  description: string | null;
  locale: string;
  prepTime: number;
  prepTimeUnit: TimeUnit;
  cookTime: number;
  cookTimeUnit: TimeUnit;
  difficulty: Difficulty;
  type: RecipeType;
  cuisine: string;
  servings: number;
  imageUrl: string | null;
  slug: string;
  yield: string | null;
  status: RecipeStatus;
  publishedAt: string | null; // ISO date string
  createdAt: string;
  updatedAt: string;
  authorId: string;
  ingredientSections: IngredientSection[];
  stepSections: StepSection[];
  particularities: Particularity[];
  /** Prisma relation count include — like count for cards/Discovery. */
  _count: { likes: number };
  /**
   * Present only on authenticated Discovery reads, and filtered server-side
   * to the CALLER's own like row — `[{ userId }]` if you liked it, else `[]`.
   * Absent for anonymous readers and on other read endpoints.
   */
  likes?: { userId: string }[];
}

// ─── Recipe (write payloads — mirror server DTOs exactly) ──────────────
// No authorId: the server derives the author from the login token, and the
// validation pipe rejects unknown fields with a 400.

/**
 * A row to save. Provide AT MOST one source: `ingredientId` (catalogue) or
 * `recipeRefId` (a recipe used as an ingredient). `displayName` is an optional
 * override / free-text name. The server is the single source of truth for the
 * "exactly one source, or a name" rule — the client just sends what was picked.
 */
export interface RecipeIngredientPayload {
  ingredientId?: number;
  recipeRefId?: number;
  displayName?: string;
  quantity: string;
  unit: string;
}

export interface IngredientSectionPayload {
  name: string;
  ingredients: RecipeIngredientPayload[];
}

export interface StepPayload {
  order: number;
  description: string;
  mediaUrl?: string;
}

export interface StepSectionPayload {
  title: string;
  steps: StepPayload[];
}

export interface CreateRecipePayload {
  title: string;
  description?: string | null;
  locale: string;
  prepTime: number;
  prepTimeUnit?: TimeUnit;
  cookTime: number;
  cookTimeUnit?: TimeUnit;
  difficulty: Difficulty;
  type: RecipeType;
  cuisine: string;
  servings: number;
  imageUrl?: string | null;
  yield?: string;
  /** Create-time visibility choice; omit to save privately as a Draft. */
  status?: RecipeStatus;
  ingredientSections: IngredientSectionPayload[];
  stepSections: StepSectionPayload[];
  particularities?: ParticularityType[];
}

/**
 * PUT /recipes/:id takes the same shape — but NEVER status: the server
 * silently ignores it there. Publishing is PATCH /recipes/:id/publish.
 */
export type UpdateRecipePayload = Omit<CreateRecipePayload, 'status'>;

// ─── Discovery ─────────────────────────────────────────────────────────

// type alias (not interface) so it satisfies the api client's query record
export type DiscoveryParams = {
  q?: string;
  cuisine?: string;
  difficulty?: Difficulty;
  type?: RecipeType;
  diet?: ParticularityType;
  ingredient?: string;
  sort?: 'newest' | 'popular';
  /** Active content language — when non-base, `q` also matches translated text. */
  locale?: string;
  take?: number;
  skip?: number;
};

// ─── Ingredient search (authoring, writer/admin only) ──────────────────

export interface UsdaMatch {
  fdcId: number;
  name: string;
}

/** A published recipe selectable as a recipe-as-ingredient (nutrition rolls up). */
export interface RecipeAsIngredientMatch {
  id: number;
  title: string;
  slug: string;
}

export interface IngredientSearchResult {
  found: boolean;
  ingredients: Ingredient[];
  matches: UsdaMatch[];
  /** Published recipes whose title matches — usable AS an ingredient. */
  recipes: RecipeAsIngredientMatch[];
}

// ─── Social: likes & comments ──────────────────────────────────────────

/** GET /recipes/:id/likes — likedByMe is always false for anonymous readers. */
export interface LikeStatus {
  likeCount: number;
  likedByMe: boolean;
}

/** POST /recipes/:id/like — note the flag is named `liked` here, not likedByMe. */
export interface LikeToggleResult {
  liked: boolean;
  likeCount: number;
}

/** Comment author identity — the server's safe select (never the full User). */
export interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Comments nest two levels of replies (the server's include depth). Replies
 * past that depth aren't in this read; `_count.replies` tells the client a
 * comment has more children than it's showing, so it can offer "load more
 * replies" (M5) — which fetches the next two levels via GET /comments/:id/replies.
 */
export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string; // > createdAt once edited (M5) — drives the "edited" marker
  userId: string;
  recipeId: number;
  parentId: number | null;
  user: CommentAuthor;
  /** Present on the first two levels; undefined past the include depth. */
  replies?: Comment[];
  /** Total direct replies (incl. any not in `replies`) — the "load more" signal. */
  _count: { replies: number };
}

export interface AddCommentPayload {
  content: string;
}

// ─── Recipe links (M3) ─────────────────────────────────────────────────

/** Summary included with each link so the client renders a card without a second fetch. */
export interface LinkedRecipeSummary {
  id: number;
  title: string;
  slug: string;
  status: RecipeStatus;
  imageUrl: string | null;
}

export interface RecipeLink {
  id: number;
  fromId: number;
  toId: number;
  kind: RecipeLinkKind;
  createdAt: string;
}

/** POST /recipes/:id/links response — only the target is included. */
export interface RecipeLinkWithTarget extends RecipeLink {
  to: LinkedRecipeSummary;
}

/** GET /recipes/:id/links rows — both ends included; draft ends are filtered out server-side. */
export interface RecipeLinkWithBothEnds extends RecipeLink {
  from: LinkedRecipeSummary;
  to: LinkedRecipeSummary;
}

export interface RecipeLinksResponse {
  outgoing: RecipeLinkWithBothEnds[];
  incoming: RecipeLinkWithBothEnds[];
}

export interface CreateRecipeLinkPayload {
  toId: number;
  kind: RecipeLinkKind;
}

// ─── Nutrition (computed on demand, never persisted) ───────────────────

/** The 25 tracked nutrients — mirrors the server's NUTRIENT_KEYS. */
export const NUTRIENT_KEYS = [
  'calories',
  'protein',
  'carbohydrates',
  'fiber',
  'sugar',
  'totalFat',
  'saturatedFat',
  'monounsatFat',
  'polyunsatFat',
  'transFat',
  'cholesterol',
  'sodium',
  'potassium',
  'calcium',
  'iron',
  'magnesium',
  'zinc',
  'vitaminA',
  'vitaminC',
  'vitaminD',
  'vitaminE',
  'vitaminK',
  'vitaminB6',
  'vitaminB12',
  'folate',
] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export type NutrientTotals = Record<NutrientKey, number>;

/** GET /recipes/:id/nutrition — skipped ingredients are reported, not silently dropped. */
export interface RecipeNutrition {
  perServing: NutrientTotals;
  total: NutrientTotals;
  servings: number;
  ingredientsProcessed: number;
  ingredientsSkipped: string[];
  /**
   * Canadian Daily Values the panel renders %DV against (per nutrient, in the
   * server's units). Nutrients without a DV (cholesterol, protein) are absent.
   */
  dailyValues?: Partial<Record<NutrientKey, number>>;
}

// ─── Translations (M4 — read in your language) ─────────────────────────

export type TranslationStatus = 'DRAFT' | 'APPROVED';

/** A stored recipe-field translation — one row per (recipeId, field, locale). */
export interface Translation {
  id: number;
  recipeId: number;
  /** Dotted field path, e.g. "title", "stepSection.1.step.2.description". */
  field: string;
  locale: string;
  value: string;
  translatorId: string;
  status: TranslationStatus;
  createdAt: string;
  updatedAt: string;
}

/** POST /translate — machine-translation pre-fill (never auto-saved). */
export interface TranslateResponse {
  translatedText: string;
  detectedSourceLang?: string;
}
