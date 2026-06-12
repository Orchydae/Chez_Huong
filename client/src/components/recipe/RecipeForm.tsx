import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, Plus, Trash2 } from 'lucide-react';
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
import { ApiError } from '../../api/client';
import { toast } from '../../lib/toast';
import IngredientAutocomplete from './IngredientAutocomplete';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

export type SubmitIntent = 'draft' | 'publish' | 'save' | 'unpublish';

interface RecipeFormProps {
  mode: 'create' | 'edit';
  initial?: Recipe;
  /** Receives the validated payload (no status — the page owns lifecycle). */
  onSubmit: (payload: UpdateRecipePayload, intent: SubmitIntent) => Promise<void>;
}

/* ── form-local row shapes ────────────────────────────────────────────── */
// Every row carries a stable client-side id, used both as the React key and
// as the target of updates. Positional indices are NOT identity: async writes
// (the USDA confirm resolves after a network roundtrip) must land on the row
// that initiated them even if rows were added/removed meanwhile.

let rowSeq = 0;
const newRowId = () => ++rowSeq;

interface IngredientRowForm {
  rowId: number;
  ingredientId: number | null;
  name: string;
  quantity: string;
  unit: string;
}

interface IngredientSectionForm {
  rowId: number;
  name: string;
  ingredients: IngredientRowForm[];
}

interface StepRowForm {
  rowId: number;
  description: string;
  mediaUrl: string | null; // already-hosted image (edit mode)
  mediaFile: File | null; // newly picked file, uploaded on submit
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
  name: '',
  quantity: '',
  unit: '',
});
const emptyIngredientSection = (): IngredientSectionForm => ({
  rowId: newRowId(),
  name: '',
  ingredients: [emptyIngredientRow()],
});
const emptyStepRow = (): StepRowForm => ({
  rowId: newRowId(),
  description: '',
  mediaUrl: null,
  mediaFile: null,
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
        name: row.ingredient.name,
        quantity: row.quantity,
        unit: row.unit,
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
          mediaUrl: step.mediaUrl,
          mediaFile: null,
          mediaPreview: step.mediaUrl,
        })),
    })),
  };
}

export default function RecipeForm({ mode, initial, onSubmit }: RecipeFormProps) {
  const { t } = useTranslation();
  const initialSections = initial ? sectionsFromRecipe(initial) : null;

  /* ── scalar fields ──────────────────────────────────────────────── */
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [locale, setLocale] = useState(initial?.locale ?? 'vi');
  const [prepTime, setPrepTime] = useState(initial?.prepTime ?? 0);
  const [prepTimeUnit, setPrepTimeUnit] = useState<TimeUnit>(initial?.prepTimeUnit ?? 'MINUTES');
  const [cookTime, setCookTime] = useState(initial?.cookTime ?? 0);
  const [cookTimeUnit, setCookTimeUnit] = useState<TimeUnit>(initial?.cookTimeUnit ?? 'MINUTES');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'EASY');
  const [recipeType, setRecipeType] = useState<RecipeType>(initial?.type ?? 'MAIN');
  const [cuisine, setCuisine] = useState(initial?.cuisine ?? 'Viêt Nam');
  const [servings, setServings] = useState(initial?.servings ?? 4);
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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── sections ───────────────────────────────────────────────────── */
  const [ingredientSections, setIngredientSections] = useState<IngredientSectionForm[]>(
    initialSections?.ingredients ?? [emptyIngredientSection()],
  );
  const [stepSections, setStepSections] = useState<StepSectionForm[]>(
    initialSections?.steps ?? [emptyStepSection()],
  );
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(intent: SubmitIntent) {
    setSubmitting(true);
    try {
      // hero image: upload the newly picked file, else keep the existing URL
      let imageUrl = initial?.imageUrl ?? null;
      if (imageFile) imageUrl = await uploadImage(imageFile);

      const stepSectionsPayload = await Promise.all(
        stepSections.map(async section => ({
          title: section.title.trim(),
          steps: await Promise.all(
            section.steps.map(async (step, index) => {
              let mediaUrl = step.mediaUrl ?? undefined;
              if (step.mediaFile) mediaUrl = await uploadImage(step.mediaFile);
              return {
                order: index + 1,
                description: step.description.trim(),
                ...(mediaUrl ? { mediaUrl } : {}),
              };
            }),
          ),
        })),
      );

      const payload: UpdateRecipePayload = {
        title: title.trim(),
        description: description.trim() || null,
        locale,
        prepTime,
        prepTimeUnit,
        cookTime,
        cookTimeUnit,
        difficulty,
        type: recipeType,
        cuisine: cuisine.trim(),
        servings,
        imageUrl,
        ...(recipeYield.trim() ? { yield: recipeYield.trim() } : {}),
        ...(particularities.length > 0 ? { particularities } : {}),
        ingredientSections: ingredientSections.map(section => ({
          name: section.name.trim(),
          ingredients: section.ingredients.map(row => ({
            // null when no catalogue pick was confirmed — the server's 400
            // is the single source of truth for that rule (no client mirror)
            ingredientId: row.ingredientId as number,
            quantity: row.quantity.trim(),
            unit: row.unit.trim(),
          })),
        })),
        stepSections: stepSectionsPayload,
      };

      await onSubmit(payload, intent);
    } catch (err) {
      // server text is English — map to localized messages (rule: all visible
      // text via i18n); the raw message stays available in the console
      console.error(err);
      if (err instanceof ApiError && err.status === 403) {
        toast.error(t('common.errorForbidden'));
      } else if (err instanceof ApiError && err.status === 400) {
        toast.error(t('form.errorValidation'));
      } else if (err instanceof ApiError && err.status === 0) {
        toast.error(t('common.errorNetwork'));
      } else {
        toast.error(t('common.errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  // text-base below sm so iOS Safari doesn't auto-zoom on focus; sm:text-sm
  // restores the desktop sizing. Covers every input/select/textarea aliasing this.
  const selectClass =
    'rounded-lg border border-forest/20 bg-white px-3 py-2 text-base outline-none focus:border-forest sm:text-sm';
  const inputClass = selectClass;

  return (
    <div className="flex flex-col">
      {/* ── hero: photo + title + locale/type ─────────────────────── */}
      <section
        className="relative bg-forest bg-cover bg-center text-cream"
        style={
          imagePreview
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${imagePreview})`,
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
            setImageFile(file);
            setImagePreview(trackBlobUrl(file));
          }}
        />
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 sm:py-16">
          <button
            type="button"
            className="flex w-fit items-center gap-2 rounded-full border border-cream/40 px-4 py-2 text-sm transition hover:bg-cream/10"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={18} />
            {imagePreview ? t('form.changePhoto') : t('form.addPhoto')}
          </button>

          {/* text-base below sm so the two selects (font: inherit) don't trigger
              iOS focus-zoom; sm:text-sm keeps today's desktop size */}
          <div className="flex flex-wrap items-center gap-3 text-base sm:text-sm">
            <select
              aria-label={t('form.locale')}
              className="rounded-full bg-white/15 px-3 py-1.5 text-cream backdrop-blur-sm [&>option]:text-forest"
              value={locale}
              onChange={e => setLocale(e.target.value)}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
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
          </div>

          <input
            className="w-full max-w-3xl border-b border-cream/30 bg-transparent font-serif text-4xl font-bold outline-none placeholder:text-cream/40 focus:border-cream sm:text-5xl"
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
              onChange={e => setServings(Math.max(1, Number(e.target.value)))}
            />
          </FormStat>
          <FormStat label={t('recipe.prepTime')}>
            <div className="flex gap-2">
              <input
                className={`${inputClass} w-20`}
                type="number"
                min={0}
                value={prepTime}
                onChange={e => setPrepTime(Math.max(0, Number(e.target.value)))}
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
                onChange={e => setCookTime(Math.max(0, Number(e.target.value)))}
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
            {ingredientSections.map(section => (
              <div key={section.rowId} className="mb-6 rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    className={`${inputClass} flex-1`}
                    placeholder={t('form.ingredientSectionPlaceholder')}
                    value={section.name}
                    onChange={e => patchIngredientSection(section.rowId, { name: e.target.value })}
                  />
                  {ingredientSections.length > 1 && (
                    <IconButton
                      label={t('form.removeSection')}
                      onClick={() =>
                        setIngredientSections(prev => prev.filter(s => s.rowId !== section.rowId))
                      }
                    />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {section.ingredients.map(row => (
                    // flex-wrap + the name field's min basis let it drop to its
                    // own full-width line at ~360px instead of forcing the row
                    // (and the page) into horizontal scroll
                    <div key={row.rowId} className="flex flex-wrap items-start gap-2">
                      <input
                        className={`${inputClass} w-16`}
                        placeholder={t('form.quantityPlaceholder')}
                        value={row.quantity}
                        onChange={e =>
                          patchIngredientRow(section.rowId, row.rowId, { quantity: e.target.value })
                        }
                      />
                      <input
                        className={`${inputClass} w-20`}
                        placeholder={t('form.unitPlaceholder')}
                        value={row.unit}
                        onChange={e =>
                          patchIngredientRow(section.rowId, row.rowId, { unit: e.target.value })
                        }
                      />
                      <IngredientAutocomplete
                        name={row.name}
                        onType={name =>
                          // typing invalidates the previous match until a pick
                          patchIngredientRow(section.rowId, row.rowId, { name, ingredientId: null })
                        }
                        onSelect={(ingredientId, name) =>
                          // rowId identity: an async USDA confirm always lands
                          // on the row that initiated it (or nowhere)
                          patchIngredientRow(section.rowId, row.rowId, { ingredientId, name })
                        }
                      />
                      {section.ingredients.length > 1 && (
                        <IconButton
                          label={t('form.removeRow')}
                          onClick={() => removeIngredientRow(section.rowId, row.rowId)}
                        />
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
            {stepSections.map(section => (
              <div key={section.rowId} className="mb-6 rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    className={`${inputClass} flex-1`}
                    placeholder={t('form.stepSectionPlaceholder')}
                    value={section.title}
                    onChange={e => patchStepSection(section.rowId, { title: e.target.value })}
                  />
                  {stepSections.length > 1 && (
                    <IconButton
                      label={t('form.removeSection')}
                      onClick={() =>
                        setStepSections(prev => prev.filter(s => s.rowId !== section.rowId))
                      }
                    />
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {section.steps.map((step, index) => (
                    <div key={step.rowId} className="flex items-start gap-3">
                      <span className="pt-2 font-serif text-xl font-bold text-forest/30">
                        {index + 1}.
                      </span>
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
                            patchStepRow(section.rowId, step.rowId, {
                              mediaFile: file,
                              mediaPreview: trackBlobUrl(file),
                            });
                          }}
                        />
                        {!step.mediaPreview && <Camera size={16} />}
                        {step.mediaPreview ? t('form.change') : t('form.photo')}
                      </label>
                      {section.steps.length > 1 && (
                        <IconButton
                          label={t('form.removeRow')}
                          onClick={() => removeStepRow(section.rowId, step.rowId)}
                        />
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
        <div className="flex flex-col gap-3 border-t border-forest/10 py-8 sm:flex-row sm:justify-end">
          {submitting ? (
            <Button disabled>
              <Spinner size={18} /> {t('form.saving')}
            </Button>
          ) : mode === 'create' ? (
            <>
              <Button variant="ghost" onClick={() => void handleSubmit('draft')}>
                {t('form.saveDraft')}
              </Button>
              <Button onClick={() => void handleSubmit('publish')}>{t('form.publishNow')}</Button>
            </>
          ) : (
            <>
              {initial?.status === 'PUBLISHED' && (
                <Button variant="danger" onClick={() => void handleSubmit('unpublish')}>
                  {t('form.saveAndUnpublish')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => void handleSubmit('save')}>
                {t('form.save')}
              </Button>
              {initial?.status === 'DRAFT' && (
                <Button onClick={() => void handleSubmit('publish')}>
                  {t('form.saveAndPublish')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── small local helpers ─────────────────────────────────────────────── */

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
