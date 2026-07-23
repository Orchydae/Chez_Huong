import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { Camera, Check, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  Difficulty,
  Recipe,
  RecipeType,
  ParticularityType,
  TimeUnit,
  UpdateRecipePayload,
} from '../../api/types';
import {
  DIFFICULTY_VALUES,
  PARTICULARITY_VALUES,
  RECIPE_TYPE_VALUES,
} from '../../api/types';
import { uploadImage } from '../../api/recipes.api';
import { upsertIngredientPortion } from '../../api/ingredients.api';
import { ApiError } from '../../api/client';
import { toast } from '../../lib/toast';
import { useApiErrorToast } from '../../lib/apiError';
import { CONTENT_LANGUAGES } from '../../lib/language';
import { unitNeedsWeight } from '../../lib/units';
import IngredientAutocomplete from './IngredientAutocomplete';
import UnitAutocomplete from './UnitAutocomplete';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import ConfirmDialog from '../ui/ConfirmDialog';

export type SubmitIntent = 'draft' | 'publish' | 'save' | 'unpublish';

/** How long a blur / structural change waits before autosaving — long enough to
 *  coalesce tabbing through fields and a blur-then-click on a Save button (which
 *  supersedes the autosave), short enough to feel continuous. */
const AUTOSAVE_DEBOUNCE_MS = 400;

type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

interface RecipeFormProps {
  mode: 'create' | 'edit';
  initial?: Recipe;
  /**
   * Explicit Save / Publish. `force` is set on the retry after the author
   * confirms the "publish anyway despite incomplete fields" prompt — the page
   * forwards it to the server as `?force=true`.
   */
  onSubmit: (payload: UpdateRecipePayload, intent: SubmitIntent, force: boolean) => Promise<void>;
  /**
   * Background autosave (draft-safety net). Fires on field blur + structural
   * changes with the current payload; the page persists it (create the draft on
   * first call, PUT thereafter). Resolve to `false` to signal the change was NOT
   * persisted (e.g. a title-less create the page declined) so the form keeps it
   * dirty instead of showing "Saved". Omit to disable autosave for this form.
   */
  onAutosave?: (payload: UpdateRecipePayload) => Promise<boolean | void>;
  /** Abandon the form and go back (rendered as a Cancel action). */
  onCancel?: () => void;
  /** Extra hero controls (e.g. the translate panel), shown beside the language
   *  selector. Edit-only concerns the page injects; create passes nothing. */
  heroActions?: ReactNode;
}

/* ── form-local row shapes ────────────────────────────────────────────── */
// Every row carries a stable client-side id, used both as the React key and
// as the target of updates. Positional indices are NOT identity: async writes
// (the USDA confirm resolves after a network roundtrip) must land on the row
// that initiated them even if rows were added/removed meanwhile.

let rowSeq = 0;
const newRowId = () => ++rowSeq;

/** Return a copy of `arr` with the item at `index` shifted by `delta` (±1).
 *  Out-of-range moves return the array unchanged. */
function withMoved<T>(arr: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= arr.length || target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

interface IngredientRowForm {
  rowId: number;
  // a row points at AT MOST one source: a catalogue ingredient OR another recipe
  // used as an ingredient. Both null = nothing picked yet (the server 400s).
  ingredientId: number | null;
  recipeRefId: number | null;
  name: string;
  // optional per-recipe display override for a PICKED catalogue ingredient: keep
  // the USDA nutrition (ingredientId) but show your own name — e.g. pick
  // "Cucumber, with peel, raw" then display "concombre anglais". Blank = show the
  // catalogue/translated name. Saved as the row's displayName.
  displayName: string;
  quantity: string;
  unit: string;
  // optional "1 unit = N g" the author sets for count-based units (pcs, slice…)
  // so they count toward nutrition; saved as an IngredientPortion on submit.
  gramsPerUnit: string;
}

interface IngredientSectionForm {
  rowId: number;
  name: string;
  ingredients: IngredientRowForm[];
}

interface StepRowForm {
  rowId: number;
  description: string;
  // hosted image URL — an existing one, a pasted link, or the URL returned by
  // uploading a picked file (files upload immediately on pick, never deferred)
  mediaUrl: string;
  mediaPreview: string | null;
}

interface StepSectionForm {
  rowId: number;
  title: string;
  steps: StepRowForm[];
}

const emptyIngredientRow = (): IngredientRowForm => ({
  rowId: newRowId(),
  ingredientId: null,
  recipeRefId: null,
  name: '',
  displayName: '',
  quantity: '',
  unit: '',
  gramsPerUnit: '',
});
const emptyIngredientSection = (): IngredientSectionForm => ({
  rowId: newRowId(),
  name: '',
  ingredients: [emptyIngredientRow()],
});
const emptyStepRow = (): StepRowForm => ({
  rowId: newRowId(),
  description: '',
  mediaUrl: '',
  mediaPreview: null,
});
const emptyStepSection = (): StepSectionForm => ({
  rowId: newRowId(),
  title: '',
  steps: [emptyStepRow()],
});

function sectionsFromRecipe(recipe: Recipe): {
  ingredients: IngredientSectionForm[];
  steps: StepSectionForm[];
} {
  return {
    ingredients: recipe.ingredientSections.map(section => ({
      rowId: newRowId(),
      name: section.name,
      ingredients: section.ingredients.map(row => ({
        rowId: newRowId(),
        ingredientId: row.ingredientId,
        recipeRefId: row.recipeRefId,
        // the autocomplete shows what's LINKED (catalogue ingredient name or the
        // referenced recipe's title); for a free-text row the typed name lives in
        // displayName, so fall back to it
        name: row.ingredient?.name ?? row.recipeRef?.title ?? row.displayName ?? '',
        // the custom-name override field, shown only for a picked catalogue
        // ingredient. Free-text rows keep their name above, not here.
        displayName: row.ingredientId != null ? (row.displayName ?? '') : '',
        quantity: row.quantity,
        unit: row.unit,
        // left blank on load: it's a set-or-update override, not the live value
        gramsPerUnit: '',
      })),
    })),
    steps: recipe.stepSections.map(section => ({
      rowId: newRowId(),
      title: section.title,
      steps: [...section.steps]
        .sort((a, b) => a.order - b.order)
        .map(step => ({
          rowId: newRowId(),
          description: step.description,
          mediaUrl: step.mediaUrl ?? '',
          mediaPreview: step.mediaUrl,
        })),
    })),
  };
}

export default function RecipeForm({
  mode,
  initial,
  onSubmit,
  onAutosave,
  onCancel,
  heroActions,
}: RecipeFormProps) {
  const { t } = useTranslation();
  const reportError = useApiErrorToast();
  const initialSections = initial ? sectionsFromRecipe(initial) : null;

  /* ── scalar fields ──────────────────────────────────────────────── */
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [locale, setLocale] = useState(initial?.locale ?? 'fr');
  // Numbers are held as strings so the box can be emptied while editing and a
  // stray leading zero doesn't stick (typing "5" over the initial "0" must read
  // 5, not "05"). Parsed back to numbers at submit; the server DTO is still the
  // single source of truth for the allowed range.
  const [prepTime, setPrepTime] = useState(initial ? String(initial.prepTime) : '');
  const [prepTimeUnit, setPrepTimeUnit] = useState<TimeUnit>(initial?.prepTimeUnit ?? 'MINUTES');
  const [cookTime, setCookTime] = useState(initial ? String(initial.cookTime) : '');
  const [cookTimeUnit, setCookTimeUnit] = useState<TimeUnit>(initial?.cookTimeUnit ?? 'MINUTES');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'EASY');
  const [recipeType, setRecipeType] = useState<RecipeType>(initial?.type ?? 'MAIN');
  const [cuisine, setCuisine] = useState(initial?.cuisine ?? 'Viêt Nam');
  const [servings, setServings] = useState(initial ? String(initial.servings) : '4');
  const [recipeYield, setRecipeYield] = useState(initial?.yield ?? '');
  const [particularities, setParticularities] = useState<ParticularityType[]>(
    initial?.particularities.map(p => p.type) ?? [],
  );

  /* ── images: every blob URL we create is revoked on unmount ─────── */
  const blobUrlsRef = useRef<string[]>([]);
  const trackBlobUrl = (file: File): string => {
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.push(url);
    return url;
  };
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, []);

  // The recipe's hero image URL: an existing one, a pasted link, or the URL a
  // picked file resolves to (files upload immediately on pick — see
  // uploadHeroImage — so there's never an un-uploaded File to carry to save).
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl ?? null);
  const [heroUploading, setHeroUploading] = useState(false);
  // rowIds whose step photo is currently uploading — drives a per-row spinner
  const [uploadingStepRows, setUploadingStepRows] = useState<ReadonlySet<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── sections ───────────────────────────────────────────────────── */
  const [ingredientSections, setIngredientSections] = useState<IngredientSectionForm[]>(
    initialSections?.ingredients ?? [emptyIngredientSection()],
  );
  const [stepSections, setStepSections] = useState<StepSectionForm[]>(
    initialSections?.steps ?? [emptyStepSection()],
  );
  const [submitting, setSubmitting] = useState(false);
  // Dotted field paths the server flagged on the last failed save (e.g.
  // "ingredientSections.0.ingredients.2.unit"). The form owns no validation
  // rules — it just highlights whatever the server reported. `hasError` matches
  // a path or any field beneath it, so a row prefix catches its field errors.
  const [errorPaths, setErrorPaths] = useState<readonly string[]>([]);
  const hasError = (prefix: string) =>
    errorPaths.some(p => p === prefix || p.startsWith(`${prefix}.`));

  /* All updates are functional (built from `prev`, never from a render-
     captured array) and target rows by rowId, so a click can never clobber
     an async update that landed in between. */

  const patchIngredientSection = (sectionId: number, patch: Partial<IngredientSectionForm>) =>
    setIngredientSections(prev =>
      prev.map(s => (s.rowId === sectionId ? { ...s, ...patch } : s)),
    );

  const patchIngredientRow = (sectionId: number, rowId: number, patch: Partial<IngredientRowForm>) =>
    setIngredientSections(prev =>
      prev.map(s =>
        s.rowId === sectionId
          ? { ...s, ingredients: s.ingredients.map(r => (r.rowId === rowId ? { ...r, ...patch } : r)) }
          : s,
      ),
    );

  const addIngredientRow = (sectionId: number) =>
    setIngredientSections(prev =>
      prev.map(s =>
        s.rowId === sectionId ? { ...s, ingredients: [...s.ingredients, emptyIngredientRow()] } : s,
      ),
    );

  const removeIngredientRow = (sectionId: number, rowId: number) =>
    setIngredientSections(prev =>
      prev.map(s =>
        s.rowId === sectionId
          ? { ...s, ingredients: s.ingredients.filter(r => r.rowId !== rowId) }
          : s,
      ),
    );

  const patchStepSection = (sectionId: number, patch: Partial<StepSectionForm>) =>
    setStepSections(prev => prev.map(s => (s.rowId === sectionId ? { ...s, ...patch } : s)));

  const patchStepRow = (sectionId: number, rowId: number, patch: Partial<StepRowForm>) =>
    setStepSections(prev =>
      prev.map(s =>
        s.rowId === sectionId
          ? { ...s, steps: s.steps.map(r => (r.rowId === rowId ? { ...r, ...patch } : r)) }
          : s,
      ),
    );

  const addStepRow = (sectionId: number) =>
    setStepSections(prev =>
      prev.map(s => (s.rowId === sectionId ? { ...s, steps: [...s.steps, emptyStepRow()] } : s)),
    );

  const removeStepRow = (sectionId: number, rowId: number) =>
    setStepSections(prev =>
      prev.map(s =>
        s.rowId === sectionId ? { ...s, steps: s.steps.filter(r => r.rowId !== rowId) } : s,
      ),
    );

  /* ── reordering (up/down) ──────────────────────────────────────────
     The saved order follows the array order: on save, child rows are wiped and
     recreated in this order, so the server's id/order sequence — and thus what
     readers see — matches. delta is -1 (up) or +1 (down). */
  const moveIngredientSection = (sectionId: number, delta: number) =>
    setIngredientSections(prev => withMoved(prev, prev.findIndex(s => s.rowId === sectionId), delta));

  const moveIngredientRow = (sectionId: number, rowId: number, delta: number) =>
    setIngredientSections(prev =>
      prev.map(s =>
        s.rowId === sectionId
          ? { ...s, ingredients: withMoved(s.ingredients, s.ingredients.findIndex(r => r.rowId === rowId), delta) }
          : s,
      ),
    );

  const moveStepSection = (sectionId: number, delta: number) =>
    setStepSections(prev => withMoved(prev, prev.findIndex(s => s.rowId === sectionId), delta));

  const moveStepRow = (sectionId: number, rowId: number, delta: number) =>
    setStepSections(prev =>
      prev.map(s =>
        s.rowId === sectionId
          ? { ...s, steps: withMoved(s.steps, s.steps.findIndex(r => r.rowId === rowId), delta) }
          : s,
      ),
    );

  /* ── autosave engine ─────────────────────────────────────────────────
     A snapshot of the persisted content gates saves (a blur that changed nothing
     is a no-op); saves are serialised (one in flight, at most one queued behind
     it); and runAutosaveRef is reassigned every render so a debounced call always
     runs against the latest state — never a stale closure. */
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');
  // Which intent is awaiting a "publish anyway?" confirmation (null = closed).
  const [publishAnywayIntent, setPublishAnywayIntent] = useState<SubmitIntent | null>(null);
  const lastSavedSnapRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // The in-flight autosave PUT (if any) — a manual Save/Publish awaits it so the
  // two never race into a lost update. null when no autosave is on the wire.
  const autosaveInFlightRef = useRef<Promise<unknown> | null>(null);
  // Synchronous mirror of `submitting` — a manual save sets it BEFORE any await
  // so a debounce firing in that window can't start a racing autosave.
  const submittingRef = useRef(false);
  // Set by Cancel so the unmount flush is skipped (Cancel = discard, don't save).
  const skipFlushRef = useRef(false);
  // Latest onAutosave, read through a ref so scheduleAutosave can stay stable
  // even though the page passes a fresh callback each render. Kept current by the
  // effect below (ref writes must happen after render, not during it).
  const onAutosaveRef = useRef(onAutosave);

  // Everything that gets persisted, as a stable string — but NOT gramsPerUnit
  // (portions save separately) nor transient upload previews. Compared against
  // the last-saved snapshot to tell a real change from an idle blur.
  function contentSnapshot(): string {
    return JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      locale,
      prepTime: Number(prepTime) || 0,
      prepTimeUnit,
      cookTime: Number(cookTime) || 0,
      cookTimeUnit,
      difficulty,
      recipeType,
      cuisine: cuisine.trim(),
      servings: Number(servings) || 1,
      recipeYield: recipeYield.trim(),
      imageUrl: imageUrl.trim(),
      particularities: [...particularities].sort(),
      ingredientSections: ingredientSections.map(s => ({
        name: s.name.trim(),
        ingredients: s.ingredients.map(r => ({
          ingredientId: r.ingredientId,
          recipeRefId: r.recipeRefId,
          name: r.name.trim(),
          displayName: r.displayName.trim(),
          quantity: r.quantity.trim(),
          unit: r.unit.trim(),
        })),
      })),
      stepSections: stepSections.map(s => ({
        title: s.title.trim(),
        steps: s.steps.map(st => ({
          description: st.description.trim(),
          mediaUrl: st.mediaUrl.trim(),
        })),
      })),
    });
  }

  /* ── payload assembly ────────────────────────────────────────────────
     Pure and synchronous (images already uploaded on pick): the single source
     the manual save AND autosave both submit, so the two can never diverge. */
  function buildPayload(): UpdateRecipePayload {
    return {
      title: title.trim(),
      description: description.trim() || null,
      locale,
      // empty box → 0 (prep/cook) / 1 (servings); the server validates the rest
      prepTime: Number(prepTime) || 0,
      prepTimeUnit,
      cookTime: Number(cookTime) || 0,
      cookTimeUnit,
      difficulty,
      type: recipeType,
      cuisine: cuisine.trim(),
      servings: Number(servings) || 1,
      imageUrl: imageUrl.trim() || null,
      ...(recipeYield.trim() ? { yield: recipeYield.trim() } : {}),
      ...(particularities.length > 0 ? { particularities } : {}),
      ingredientSections: ingredientSections.map(section => ({
        name: section.name.trim(),
        ingredients: section.ingredients.map(row => ({
          // exactly one source per row: a recipe-as-ingredient (recipeRefId), a
          // catalogue ingredient (ingredientId), or — when neither was picked —
          // a free-text name (displayName), which carries no nutrition and isn't
          // stored in the catalogue. The server validates the rule.
          ...(row.recipeRefId != null
            ? { recipeRefId: row.recipeRefId }
            : row.ingredientId != null
              ? {
                  ingredientId: row.ingredientId,
                  // a catalogue ingredient keeps its nutrition but can show a
                  // custom name; omit when blank so the catalogue name shows
                  ...(row.displayName.trim() ? { displayName: row.displayName.trim() } : {}),
                }
              : { displayName: row.name.trim() }),
          quantity: row.quantity.trim(),
          unit: row.unit.trim(),
        })),
      })),
      stepSections: stepSections.map(section => ({
        title: section.title.trim(),
        steps: section.steps.map((step, index) => {
          const mediaUrl = step.mediaUrl.trim() || undefined;
          return {
            order: index + 1,
            description: step.description.trim(),
            ...(mediaUrl ? { mediaUrl } : {}),
          };
        }),
      })),
    };
  }

  /* Persist author-set "1 unit = N g" weights so count-based units (pcs, slice…)
     count toward nutrition. Only on an explicit save (they're rare and the
     upserts are idempotent) — autosave leaves them for the next manual save.
     Dedupe by ingredient+unit so two rows of the same thing don't double-write. */
  async function commitPortionWeights() {
    const portionWeights = new Map<
      string,
      { ingredientId: number; unit: string; gramWeight: number }
    >();
    for (const section of ingredientSections) {
      for (const row of section.ingredients) {
        const grams = Number(row.gramsPerUnit);
        const unit = row.unit.trim();
        if (row.ingredientId === null || !unit || !(grams > 0)) continue;
        portionWeights.set(`${row.ingredientId}:${unit.toLowerCase()}`, {
          ingredientId: row.ingredientId,
          unit,
          gramWeight: grams,
        });
      }
    }
    await Promise.all(
      [...portionWeights.values()].map(p =>
        upsertIngredientPortion(p.ingredientId, p.unit, p.gramWeight),
      ),
    );
  }

  const runAutosaveRef = useRef<() => void>(() => {});
  // A one-shot flush used only by the unmount cleanup — see its comment. Kept in
  // a ref (reassigned every commit) so it always captures the latest content.
  const flushRef = useRef<() => void>(() => {});
  // Reassign the autosave closures every commit so a debounced call always runs
  // against the latest props/state — no stale closures — while respecting the
  // "no ref writes during render" rule.
  useEffect(() => {
    onAutosaveRef.current = onAutosave;
    // Flush a still-unsaved change as the form unmounts, so leaving the page
    // (Navbar link, back button) doesn't lose it. Unlike runAutosave this is
    // fire-and-forget and ignores mountedRef (the component is going away, but
    // the dispatched fetch outlives it). It's skipped after Cancel and after a
    // successful Save/Publish (skipFlushRef) — in both cases there's nothing to
    // rescue — which also stops it force-writing a just-published recipe with a
    // stale draft closure. If a save is already on the wire it CHAINS after it,
    // so the two never race and the newest edit still lands.
    flushRef.current = () => {
      if (!onAutosaveRef.current || skipFlushRef.current) return;
      const snap = contentSnapshot();
      if (snap === lastSavedSnapRef.current) return; // nothing unsaved
      const payload = buildPayload();
      const fire = () => {
        // if the save we chained after already persisted this exact content
        // (i.e. there was no newer edit behind it), don't re-PUT it
        if (snap === lastSavedSnapRef.current) return;
        void Promise.resolve(onAutosaveRef.current?.(payload)).catch(() => {});
      };
      const inFlight = autosaveInFlightRef.current;
      if (inFlight) inFlight.then(fire, fire);
      else fire();
    };
    runAutosaveRef.current = () => {
      // mountedRef guard: an image upload can resolve and re-arm the timer after
      // unmount — never save (or POST a phantom draft) once we're gone.
      // submittingRef guard: a manual save is in progress and owns the write.
      if (!mountedRef.current || !onAutosaveRef.current || submittingRef.current) return;
      const snap = contentSnapshot();
      if (snap === lastSavedSnapRef.current) return; // unchanged since last save
      if (savingRef.current) {
        pendingRef.current = true; // a save is running — remember to save again after
        return;
      }
      savingRef.current = true;
      setAutosaveState('saving');
      autosaveInFlightRef.current = (async () => {
        try {
          // The page may DECLINE to persist (e.g. a title-less create): it
          // returns false, so we leave the change dirty and the indicator idle
          // rather than falsely showing "Saved".
          const result = await onAutosaveRef.current!(buildPayload());
          if (result === false) {
            if (mountedRef.current) setAutosaveState('idle');
            return;
          }
          lastSavedSnapRef.current = snap;
          if (mountedRef.current) setAutosaveState('saved');
        } catch (err) {
          console.error(err); // autosave stays quiet — no toast on every blur
          if (mountedRef.current) setAutosaveState('error');
        } finally {
          savingRef.current = false;
          autosaveInFlightRef.current = null;
          if (pendingRef.current) {
            pendingRef.current = false;
            runAutosaveRef.current(); // flush changes that landed mid-save (re-sets the ref)
          }
        }
      })();
    };
  });

  const scheduleAutosave = useCallback(() => {
    if (!mountedRef.current || !onAutosaveRef.current || submittingRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      runAutosaveRef.current();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);

  /* ── image uploads (on pick, not on save) ───────────────────────────
     Uploading the moment a file is chosen means the form only ever holds hosted
     URLs — so save/autosave just persist strings, nothing re-uploads, and a
     picked photo isn't lost if the author walks away. A local blob previews it
     instantly; the hosted URL swaps in once the upload lands. */
  async function uploadHeroImage(file: File) {
    const previousUrl = imageUrl;
    setImagePreview(trackBlobUrl(file));
    setHeroUploading(true);
    try {
      const url = await uploadImage(file);
      setImageUrl(url);
      setImagePreview(url);
      scheduleAutosave();
    } catch (err) {
      reportError(err);
      setImagePreview(previousUrl || null); // revert to what was there before
    } finally {
      setHeroUploading(false);
    }
  }

  async function uploadStepImage(sectionId: number, rowId: number, file: File) {
    patchStepRow(sectionId, rowId, { mediaPreview: trackBlobUrl(file) });
    setUploadingStepRows(prev => new Set(prev).add(rowId));
    try {
      const url = await uploadImage(file);
      patchStepRow(sectionId, rowId, { mediaUrl: url, mediaPreview: url });
      scheduleAutosave();
    } catch (err) {
      reportError(err);
      // revert the preview to whatever URL the row already had
      setStepSections(prev =>
        prev.map(s =>
          s.rowId === sectionId
            ? {
                ...s,
                steps: s.steps.map(r =>
                  r.rowId === rowId ? { ...r, mediaPreview: r.mediaUrl || null } : r,
                ),
              }
            : s,
        ),
      );
    } finally {
      setUploadingStepRows(prev => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    }
  }

  // Structural / discrete changes (add·remove·reorder·pick, diet tags, the enum
  // selects) autosave right away. Free-text fields are deliberately absent — they
  // save on blur instead, matching "save when you leave a field".
  const structuralSignature = JSON.stringify({
    locale,
    difficulty,
    recipeType,
    prepTimeUnit,
    cookTimeUnit,
    particularities: [...particularities].sort(),
    ingredientSections: ingredientSections.map(s => [
      s.rowId,
      s.ingredients.map(r => [r.rowId, r.ingredientId, r.recipeRefId]),
    ]),
    stepSections: stepSections.map(s => [s.rowId, s.steps.map(st => st.rowId)]),
  });
  const structuralFirstRef = useRef(true);
  useEffect(() => {
    if (structuralFirstRef.current) {
      structuralFirstRef.current = false;
      return;
    }
    scheduleAutosave();
  }, [structuralSignature, scheduleAutosave]);

  // Seed the "last saved" snapshot from the initial state (so an untouched form
  // never autosaves). On unmount, FLUSH a pending change so leaving the page
  // (Navbar link, back button) doesn't lose the last edit — the dispatched
  // fetch outlives the component. Cancel opts out (skipFlushRef) since it means
  // discard. mountedRef is (re)set true on setup so StrictMode's mount→unmount→
  // mount cycle doesn't leave it stuck false.
  useEffect(() => {
    mountedRef.current = true;
    lastSavedSnapRef.current = contentSnapshot();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      mountedRef.current = false;
      // flushRef ignores mountedRef by design — it's the intentional last save
      flushRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(intent: SubmitIntent, force = false) {
    submittingRef.current = true; // block new autosaves synchronously, before any await
    setSubmitting(true);
    setErrorPaths([]); // clear last attempt's highlights
    // a manual save supersedes any queued autosave
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    try {
      // Let any autosave already on the wire finish first, so our save (which
      // carries the newest content) is the last writer — no lost-update race.
      if (autosaveInFlightRef.current) {
        try {
          await autosaveInFlightRef.current;
        } catch {
          /* an autosave failure is non-fatal here — the manual save is authoritative */
        }
      }
      await commitPortionWeights();
      await onSubmit(buildPayload(), intent, force);
      // Success: the submit persisted the content and is navigating away. Skip
      // the unmount flush — there's nothing to rescue, and it would otherwise
      // fire a stale draft autosave onto a recipe that just became published.
      skipFlushRef.current = true;
    } catch (err) {
      // Incomplete-but-publishing isn't an error, it's an offer: highlight the
      // gaps and ask to publish anyway; on confirm we retry with force (the
      // ConfirmDialog below drives that). Distinguished by the server's code.
      if (err instanceof ApiError && err.code === 'RECIPE_INCOMPLETE') {
        setErrorPaths(err.fields ?? []);
        setPublishAnywayIntent(intent);
        requestAnimationFrame(() => {
          document
            .querySelector('[data-field-error="true"]')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return;
      }
      // A 400 that names the offending rows/fields is special: highlight them
      // and scroll to the first (DOM side effects the shared mapper can't own),
      // so this branch stays here. A field-less 400 is a form-wide validation
      // message; everything else delegates to the app-wide policy.
      if (err instanceof ApiError && err.status === 400 && err.fields && err.fields.length > 0) {
        console.error(err);
        setErrorPaths(err.fields);
        toast.error(t('form.errorRowsIncomplete'));
        requestAnimationFrame(() => {
          document
            .querySelector('[data-field-error="true"]')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return;
      }
      reportError(err, { 400: 'form.errorValidation' });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // text-base below sm so iOS Safari doesn't auto-zoom on focus; sm:text-sm
  // restores the desktop sizing. Covers every input/select/textarea aliasing this.
  const selectClass =
    'rounded-lg border border-forest/20 bg-white px-3 py-2 text-base outline-none focus:border-forest sm:text-sm';
  const inputClass = selectClass;

  // Number field onChange: keep the raw text (so it can be cleared) but strip a
  // leading zero by round-tripping through Number — typing over the initial "0"
  // reads as the new digit, never "0…".
  const onNumberChange =
    (set: (value: string) => void) => (e: ChangeEvent<HTMLInputElement>) =>
      set(e.target.value === '' ? '' : String(Number(e.target.value)));

  // Block explicit Save/Publish while a photo is still uploading — otherwise the
  // synchronous buildPayload() would serialize a stale/empty image URL and the
  // post-save navigation would strand the just-picked photo. (Autosave self-heals
  // via the scheduleAutosave that fires when the upload lands.)
  const imagesUploading = heroUploading || uploadingStepRows.size > 0;

  return (
    // onBlur fires on focusout of any descendant field (React's onBlur bubbles):
    // this is the "save when you leave a field" trigger. Debounced + snapshot-
    // gated in scheduleAutosave, so tabbing through or a blur that changed
    // nothing costs no save.
    <div className="flex flex-col" onBlur={scheduleAutosave}>
      {/* ── hero: photo + title + locale/type ─────────────────────── */}
      <section
        className="relative bg-chili bg-cover bg-center text-cream"
        style={
          imagePreview
            ? {
                // chili (the section bg) shows through the transparent parts of
                // cut-out dish PNGs; a bottom-only scrim darkens just the title
                // area for legibility while the dish + red stay vibrant.
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0) 55%), url(${imagePreview})`,
              }
            : undefined
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = ''; // re-picking the same file must fire again
            if (!file) return;
            void uploadHeroImage(file); // uploads now; sets imageUrl on success
          }}
        />
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={heroUploading}
              className="flex w-fit items-center gap-2 rounded-full border border-cream/40 px-4 py-2 text-sm transition hover:bg-cream/10 disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
            >
              {heroUploading ? <Spinner size={18} /> : <Camera size={18} />}
              {imagePreview ? t('form.changePhoto') : t('form.addPhoto')}
            </button>
            {/* …or point at an image that already lives on the web — used as-is,
                no upload. Typing here replaces a picked/uploaded photo. */}
            <input
              type="url"
              inputMode="url"
              className="w-full max-w-md rounded-full bg-white/15 px-4 py-1.5 text-base text-cream outline-none backdrop-blur-sm placeholder:text-cream/50 focus:bg-white/25 sm:text-sm"
              placeholder={t('form.imageUrlPlaceholder')}
              value={imageUrl}
              onChange={e => {
                const url = e.target.value;
                setImageUrl(url);
                setImagePreview(url.trim() || null);
              }}
            />
          </div>

          {/* text-base below sm so the two selects (font: inherit) don't trigger
              iOS focus-zoom; sm:text-sm keeps today's desktop size */}
          <div className="flex flex-wrap items-center gap-3 text-base sm:text-sm">
            {/* the label makes clear this is the recipe's ORIGINAL language, not
                a translate switch — flipping it only re-tags stored text. Adding
                another language is a separate step (the translate action). */}
            <label className="flex items-center gap-2">
              <span className="text-cream/70">{t('form.localeHint')}</span>
              <select
                aria-label={t('form.locale')}
                className="rounded-full bg-white/15 px-3 py-1.5 text-cream backdrop-blur-sm [&>option]:text-forest"
                value={locale}
                onChange={e => setLocale(e.target.value)}
              >
                {CONTENT_LANGUAGES.map(code => (
                  <option key={code} value={code}>
                    {t(`language.${code}`)}
                  </option>
                ))}
              </select>
            </label>
            <select
              className="rounded-full bg-white/15 px-3 py-1.5 text-cream backdrop-blur-sm [&>option]:text-forest"
              value={recipeType}
              onChange={e => setRecipeType(e.target.value as RecipeType)}
            >
              {RECIPE_TYPE_VALUES.map(value => (
                <option key={value} value={value}>
                  {t(`recipeType.${value}`)}
                </option>
              ))}
            </select>
            {heroActions && <div className="sm:ml-auto">{heroActions}</div>}
          </div>

          <input
            data-field-error={hasError('title') ? 'true' : undefined}
            className={`w-full max-w-3xl border-b bg-transparent font-serif text-4xl font-bold outline-none [text-shadow:0_2px_12px_rgba(0,0,0,0.45)] placeholder:text-cream/40 sm:text-5xl ${
              hasError('title') ? 'border-coral' : 'border-cream/30 focus:border-cream'
            }`}
            placeholder={t('form.titlePlaceholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
      </section>

      {/* ── stats bar ──────────────────────────────────────────────── */}
      <section className="border-b border-forest/10 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
          <FormStat label={t('recipe.cuisine')}>
            <input
              className={inputClass}
              placeholder={t('form.cuisinePlaceholder')}
              value={cuisine}
              onChange={e => setCuisine(e.target.value)}
            />
          </FormStat>
          <FormStat label={t('recipe.servings')}>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={servings}
              onChange={onNumberChange(setServings)}
            />
          </FormStat>
          <FormStat label={t('recipe.prepTime')}>
            <div className="flex gap-2">
              <input
                className={`${inputClass} w-20`}
                type="number"
                min={0}
                value={prepTime}
                onChange={onNumberChange(setPrepTime)}
              />
              <select
                className={selectClass}
                value={prepTimeUnit}
                onChange={e => setPrepTimeUnit(e.target.value as TimeUnit)}
              >
                <option value="MINUTES">{t('timeUnit.MINUTES')}</option>
                <option value="HOURS">{t('timeUnit.HOURS')}</option>
              </select>
            </div>
          </FormStat>
          <FormStat label={t('recipe.cookTime')}>
            <div className="flex gap-2">
              <input
                className={`${inputClass} w-20`}
                type="number"
                min={0}
                value={cookTime}
                onChange={onNumberChange(setCookTime)}
              />
              <select
                className={selectClass}
                value={cookTimeUnit}
                onChange={e => setCookTimeUnit(e.target.value as TimeUnit)}
              >
                <option value="MINUTES">{t('timeUnit.MINUTES')}</option>
                <option value="HOURS">{t('timeUnit.HOURS')}</option>
              </select>
            </div>
          </FormStat>
          <FormStat label={t('recipe.difficulty')}>
            <select
              className={selectClass}
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as Difficulty)}
            >
              {DIFFICULTY_VALUES.map(value => (
                <option key={value} value={value}>
                  {t(`difficulty.${value}`)}
                </option>
              ))}
            </select>
          </FormStat>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        {/* ── yield + diet tags + description ──────────────────────── */}
        <section className="flex flex-col gap-5 py-8">
          <div className="flex max-w-md flex-col gap-1.5">
            <label className="text-sm font-medium text-forest/80">{t('form.yieldLabel')}</label>
            <input
              className={inputClass}
              placeholder={t('form.yieldPlaceholder')}
              value={recipeYield}
              onChange={e => setRecipeYield(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-forest/80">{t('form.dietTags')}</span>
            <div className="flex flex-wrap gap-2">
              {PARTICULARITY_VALUES.map(value => {
                const active = particularities.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'bg-forest text-cream'
                        : 'bg-forest/5 text-forest/70 hover:bg-forest/10'
                    }`}
                    onClick={() =>
                      setParticularities(prev =>
                        active ? prev.filter(p => p !== value) : [...prev, value],
                      )
                    }
                  >
                    {t(`particularity.${value}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            className={`${inputClass} max-w-3xl`}
            rows={3}
            placeholder={t('form.descriptionPlaceholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </section>

        {/* ── ingredients + steps ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 pb-8 lg:grid-cols-[2fr_3fr]">
          {/* ingredients */}
          <section>
            <h2 className="mb-4 text-3xl">{t('recipe.ingredients')}</h2>
            {ingredientSections.map((section, si) => (
              <div key={section.rowId} className="mb-6 rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    data-field-error={hasError(`ingredientSections.${si}.name`) ? 'true' : undefined}
                    className={`${inputClass} flex-1 ${
                      hasError(`ingredientSections.${si}.name`) ? 'border-coral ring-1 ring-coral' : ''
                    }`}
                    placeholder={t('form.ingredientSectionPlaceholder')}
                    value={section.name}
                    onChange={e => patchIngredientSection(section.rowId, { name: e.target.value })}
                  />
                  {ingredientSections.length > 1 && (
                    <>
                      <ReorderButtons
                        upLabel={t('form.moveSectionUp')}
                        downLabel={t('form.moveSectionDown')}
                        canUp={si > 0}
                        canDown={si < ingredientSections.length - 1}
                        onUp={() => moveIngredientSection(section.rowId, -1)}
                        onDown={() => moveIngredientSection(section.rowId, 1)}
                      />
                      <IconButton
                        label={t('form.removeSection')}
                        onClick={() =>
                          setIngredientSections(prev => prev.filter(s => s.rowId !== section.rowId))
                        }
                      />
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {section.ingredients.map((row, ri) => (
                    <div
                      key={row.rowId}
                      data-field-error={
                        hasError(`ingredientSections.${si}.ingredients.${ri}`) ? 'true' : undefined
                      }
                      className={`flex flex-col gap-1.5 ${
                        hasError(`ingredientSections.${si}.ingredients.${ri}`)
                          ? 'rounded-lg border-l-2 border-coral bg-coral/5 py-1.5 pl-2'
                          : ''
                      }`}
                    >
                      {/* flex-wrap + the name field's min basis let it drop to
                          its own full-width line at ~360px instead of forcing
                          the row (and the page) into horizontal scroll */}
                      <div className="flex flex-wrap items-start gap-2">
                        <input
                          className={`${inputClass} w-16`}
                          placeholder={t('form.quantityPlaceholder')}
                          value={row.quantity}
                          onChange={e =>
                            patchIngredientRow(section.rowId, row.rowId, { quantity: e.target.value })
                          }
                        />
                        <UnitAutocomplete
                          value={row.unit}
                          inputClassName={inputClass}
                          onChange={unit =>
                            patchIngredientRow(section.rowId, row.rowId, { unit })
                          }
                        />
                        <IngredientAutocomplete
                          name={row.name}
                          excludeRecipeId={initial?.id}
                          onType={name =>
                            // typing invalidates any previous pick (ingredient or
                            // recipe) until a new one is made
                            patchIngredientRow(section.rowId, row.rowId, {
                              name,
                              ingredientId: null,
                              recipeRefId: null,
                            })
                          }
                          onSelect={pick =>
                            // rowId identity: an async USDA confirm always lands
                            // on the row that initiated it (or nowhere). Each pick
                            // sets exactly one source and clears the others, so a
                            // row never carries more than one. A free-text pick
                            // clears both ids → saved as displayName, no nutrition.
                            patchIngredientRow(
                              section.rowId,
                              row.rowId,
                              pick.type === 'recipe'
                                ? { recipeRefId: pick.recipeRefId, ingredientId: null, name: pick.name }
                                : pick.type === 'ingredient'
                                  ? { ingredientId: pick.ingredientId, recipeRefId: null, name: pick.name }
                                  : { ingredientId: null, recipeRefId: null, name: pick.name },
                            )
                          }
                        />
                        {section.ingredients.length > 1 && (
                          <>
                            <ReorderButtons
                              upLabel={t('form.moveUp')}
                              downLabel={t('form.moveDown')}
                              canUp={ri > 0}
                              canDown={ri < section.ingredients.length - 1}
                              onUp={() => moveIngredientRow(section.rowId, row.rowId, -1)}
                              onDown={() => moveIngredientRow(section.rowId, row.rowId, 1)}
                            />
                            <IconButton
                              label={t('form.removeRow')}
                              onClick={() => removeIngredientRow(section.rowId, row.rowId)}
                            />
                          </>
                        )}
                      </div>
                      {/* Picked catalogue ingredient: keep its USDA nutrition but
                          optionally show a custom name on the recipe (e.g. pick
                          "Cucumber, with peel, raw" → display "concombre"). Blank
                          shows the catalogue/translated name (the placeholder). */}
                      {row.ingredientId !== null && (
                        <label className="flex flex-wrap items-center gap-2 pl-1 text-xs text-forest/60">
                          {t('form.displayNameLabel')}
                          <input
                            type="text"
                            className={`${inputClass} min-w-0 flex-1`}
                            placeholder={row.name || t('form.displayNamePlaceholder')}
                            value={row.displayName}
                            onChange={e =>
                              patchIngredientRow(section.rowId, row.rowId, {
                                displayName: e.target.value,
                              })
                            }
                          />
                        </label>
                      )}
                      {/* Count-based unit (pcs, slice…) on a chosen ingredient:
                          offer its gram weight so it counts toward nutrition.
                          Optional — blank just leaves any saved weight as-is. */}
                      {row.ingredientId !== null && unitNeedsWeight(row.unit) && (
                        <label className="flex flex-wrap items-center gap-2 pl-1 text-xs text-forest/60">
                          {t('form.gramsPerUnitLabel', { unit: row.unit.trim() })}
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            className={`${inputClass} w-24`}
                            placeholder={t('form.gramsPerUnitPlaceholder')}
                            value={row.gramsPerUnit}
                            onChange={onNumberChange(value =>
                              patchIngredientRow(section.rowId, row.rowId, { gramsPerUnit: value }),
                            )}
                          />
                          {t('unit.g')}
                        </label>
                      )}
                      {hasError(`ingredientSections.${si}.ingredients.${ri}`) && (
                        <p className="pl-1 text-xs font-medium text-coral">
                          {t('form.errorFieldRequired')}
                        </p>
                      )}
                    </div>
                  ))}
                  <AddButton
                    label={t('form.addIngredient')}
                    onClick={() => addIngredientRow(section.rowId)}
                  />
                </div>
              </div>
            ))}
            <AddButton
              label={t('form.addIngredientSection')}
              onClick={() => setIngredientSections(prev => [...prev, emptyIngredientSection()])}
            />
          </section>

          {/* steps */}
          <section>
            <h2 className="mb-4 text-3xl">{t('recipe.steps')}</h2>
            {stepSections.map((section, si) => (
              <div key={section.rowId} className="mb-6 rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    data-field-error={hasError(`stepSections.${si}.title`) ? 'true' : undefined}
                    className={`${inputClass} flex-1 ${
                      hasError(`stepSections.${si}.title`) ? 'border-coral ring-1 ring-coral' : ''
                    }`}
                    placeholder={t('form.stepSectionPlaceholder')}
                    value={section.title}
                    onChange={e => patchStepSection(section.rowId, { title: e.target.value })}
                  />
                  {stepSections.length > 1 && (
                    <>
                      <ReorderButtons
                        upLabel={t('form.moveSectionUp')}
                        downLabel={t('form.moveSectionDown')}
                        canUp={si > 0}
                        canDown={si < stepSections.length - 1}
                        onUp={() => moveStepSection(section.rowId, -1)}
                        onDown={() => moveStepSection(section.rowId, 1)}
                      />
                      <IconButton
                        label={t('form.removeSection')}
                        onClick={() =>
                          setStepSections(prev => prev.filter(s => s.rowId !== section.rowId))
                        }
                      />
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {section.steps.map((step, index) => (
                    <div
                      key={step.rowId}
                      data-field-error={
                        hasError(`stepSections.${si}.steps.${index}`) ? 'true' : undefined
                      }
                      className={`flex items-start gap-3 ${
                        hasError(`stepSections.${si}.steps.${index}`)
                          ? 'rounded-lg border-l-2 border-coral bg-coral/5 py-1.5 pl-2'
                          : ''
                      }`}
                    >
                      <span className="pt-2 font-serif text-xl font-bold text-forest/30">
                        {/* continuous numbering across sections, matching the
                            published recipe (offset by earlier sections' steps) */}
                        {stepSections.slice(0, si).reduce((n, s) => n + s.steps.length, 0) + index + 1}.
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start gap-3">
                          <textarea
                            className={`${inputClass} min-w-0 flex-1`}
                            rows={3}
                            placeholder={t('form.stepPlaceholder')}
                            value={step.description}
                            onChange={e =>
                              patchStepRow(section.rowId, step.rowId, { description: e.target.value })
                            }
                          />
                          <label
                            className={`flex h-20 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-forest/30 bg-cover bg-center text-xs text-forest/60 transition hover:border-forest ${
                              step.mediaPreview ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]' : ''
                            }`}
                            style={
                              step.mediaPreview
                                ? { backgroundImage: `url(${step.mediaPreview})` }
                                : undefined
                            }
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                e.target.value = ''; // same-file re-pick must fire again
                                if (!file) return;
                                void uploadStepImage(section.rowId, step.rowId, file);
                              }}
                            />
                            {uploadingStepRows.has(step.rowId) ? (
                              <Spinner size={16} />
                            ) : (
                              !step.mediaPreview && <Camera size={16} />
                            )}
                            {step.mediaPreview ? t('form.change') : t('form.photo')}
                          </label>
                        </div>
                        {/* …or paste a link to an image already on the web (used as-is) */}
                        <input
                          type="url"
                          inputMode="url"
                          className={`${inputClass} w-full`}
                          placeholder={t('form.stepImageUrlPlaceholder')}
                          value={step.mediaUrl}
                          onChange={e => {
                            const url = e.target.value;
                            patchStepRow(section.rowId, step.rowId, {
                              mediaUrl: url,
                              mediaPreview: url.trim() || null,
                            });
                          }}
                        />
                        {hasError(`stepSections.${si}.steps.${index}`) && (
                          <p className="text-xs font-medium text-coral">
                            {t('form.errorFieldRequired')}
                          </p>
                        )}
                      </div>
                      {section.steps.length > 1 && (
                        <>
                          <ReorderButtons
                            upLabel={t('form.moveUp')}
                            downLabel={t('form.moveDown')}
                            canUp={index > 0}
                            canDown={index < section.steps.length - 1}
                            onUp={() => moveStepRow(section.rowId, step.rowId, -1)}
                            onDown={() => moveStepRow(section.rowId, step.rowId, 1)}
                          />
                          <IconButton
                            label={t('form.removeRow')}
                            onClick={() => removeStepRow(section.rowId, step.rowId)}
                          />
                        </>
                      )}
                    </div>
                  ))}
                  <AddButton label={t('form.addStep')} onClick={() => addStepRow(section.rowId)} />
                </div>
              </div>
            ))}
            <AddButton
              label={t('form.addStepSection')}
              onClick={() => setStepSections(prev => [...prev, emptyStepSection()])}
            />
          </section>
        </div>

        {/* ── actions ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-forest/10 py-8 sm:flex-row sm:items-center sm:justify-end">
          {onAutosave && <AutosaveIndicator state={autosaveState} className="sm:mr-auto" />}
          {submitting ? (
            <Button disabled>
              <Spinner size={18} /> {t('form.saving')}
            </Button>
          ) : (
            <>
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    skipFlushRef.current = true; // Cancel = discard: don't flush on unmount
                    onCancel();
                  }}
                >
                  {t('common.cancel')}
                </Button>
              )}
              {mode === 'create' ? (
                <>
                  <Button
                    variant="ghost"
                    disabled={imagesUploading}
                    onClick={() => void handleSubmit('draft')}
                  >
                    {t('form.saveDraft')}
                  </Button>
                  <Button disabled={imagesUploading} onClick={() => void handleSubmit('publish')}>
                    {t('form.publishNow')}
                  </Button>
                </>
              ) : (
                <>
                  {initial?.status === 'PUBLISHED' && (
                    <Button
                      variant="danger"
                      disabled={imagesUploading}
                      onClick={() => void handleSubmit('unpublish')}
                    >
                      {t('form.saveAndUnpublish')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    disabled={imagesUploading}
                    onClick={() => void handleSubmit('save')}
                  >
                    {t('form.save')}
                  </Button>
                  {initial?.status === 'DRAFT' && (
                    <Button disabled={imagesUploading} onClick={() => void handleSubmit('publish')}>
                      {t('form.saveAndPublish')}
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Publishing with gaps isn't blocked — it's confirmed. The incomplete rows
          are already highlighted (errorPaths); this asks whether to publish
          anyway, then retries the same intent with force. */}
      {publishAnywayIntent && (
        <ConfirmDialog
          title={t('form.publishIncompleteTitle')}
          message={t('form.publishIncompleteMessage')}
          confirmLabel={t('form.publishAnyway')}
          confirmVariant="primary"
          busy={submitting}
          onConfirm={() => {
            const intent = publishAnywayIntent;
            setPublishAnywayIntent(null);
            void handleSubmit(intent, true);
          }}
          onCancel={() => setPublishAnywayIntent(null)}
        />
      )}
    </div>
  );
}

/* ── small local helpers ─────────────────────────────────────────────── */

/** Quiet "Saving… / Saved / autosave failed" status for the actions bar. */
function AutosaveIndicator({ state, className = '' }: { state: AutosaveState; className?: string }) {
  const { t } = useTranslation();
  if (state === 'idle') return <span className={className} aria-hidden />;
  return (
    <span className={`flex items-center gap-1.5 text-xs text-forest/50 ${className}`} aria-live="polite">
      {state === 'saving' && (
        <>
          <Spinner size={14} /> {t('form.autosaveSaving')}
        </>
      )}
      {state === 'saved' && (
        <>
          <Check size={14} className="text-forest/60" /> {t('form.autosaveSaved')}
        </>
      )}
      {state === 'error' && <span className="text-coral">{t('form.autosaveError')}</span>}
    </span>
  );
}

function FormStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-forest/50">{label}</span>
      {children}
    </div>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="mt-1 rounded-lg p-2 text-forest/40 transition hover:bg-coral/10 hover:text-coral"
      onClick={onClick}
    >
      <Trash2 size={15} />
    </button>
  );
}

/** Stacked up/down arrows for reordering a row or section. Each arrow disables
 *  itself at the end it can't move toward. */
function ReorderButtons({
  onUp,
  onDown,
  canUp,
  canDown,
  upLabel,
  downLabel,
}: {
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
  upLabel: string;
  downLabel: string;
}) {
  const btn = 'rounded p-0.5 text-forest/40 transition enabled:hover:text-forest disabled:opacity-20';
  return (
    <div className="mt-1 flex shrink-0 flex-col">
      <button type="button" aria-label={upLabel} className={btn} disabled={!canUp} onClick={onUp}>
        <ChevronUp size={16} />
      </button>
      <button type="button" aria-label={downLabel} className={btn} disabled={!canDown} onClick={onDown}>
        <ChevronDown size={16} />
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-forest/70 transition hover:bg-forest/5 hover:text-forest"
      onClick={onClick}
    >
      <Plus size={14} />
      {label}
    </button>
  );
}
