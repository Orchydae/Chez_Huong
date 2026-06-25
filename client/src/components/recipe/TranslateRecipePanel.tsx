import { useMemo, useState } from 'react';
import { Languages, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { Recipe } from '../../api/types';
import { recipeKeys } from '../../api/recipes.api';
import {
  translateText,
  translationKeys,
  upsertTranslation,
  useRecipeTranslations,
} from '../../api/translations.api';
import { upsertIngredientTranslation } from '../../api/ingredients.api';
import { CONTENT_LANGUAGES, type ContentLanguage } from '../../lib/language';
import { approvedTranslationMap, recipeTranslatableFields } from '../../lib/recipeFieldPaths';
import { toast } from '../../lib/toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

/**
 * Writer authoring panel (M4). Lists a recipe's translatable fields (and its
 * ingredient names) for a chosen target language; pre-fills with the Google
 * proxy, lets the writer adjust, then saves. Saved rows are what readers see —
 * machine output is never shown to readers without an explicit save. No
 * client-side validation: the server DTOs are the source of truth.
 */
export default function TranslateRecipePanel({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Targets = every content language except the recipe's own base locale.
  const targets = CONTENT_LANGUAGES.filter(l => l !== recipe.locale);
  const [target, setTarget] = useState<ContentLanguage>(targets[0] ?? 'en');

  // switching language discards in-progress drafts (they belonged to the old
  // one). Reset during render when the target changes — React's documented
  // pattern, and it avoids the extra render an effect would cause.
  const [prevTarget, setPrevTarget] = useState(target);
  if (prevTarget !== target) {
    setPrevTarget(target);
    setDrafts({});
  }

  const fields = useMemo(() => recipeTranslatableFields(recipe), [recipe]);

  // Unique ingredients in this recipe, with their current name in the target
  // language (already loaded on the recipe read). English is the base name, so
  // ingredient translation only applies to non-English targets.
  const ingredients = useMemo(() => {
    const map = new Map<number, { id: number; name: string; current: string | undefined }>();
    for (const section of recipe.ingredientSections) {
      for (const row of section.ingredients) {
        const ing = row.ingredient;
        // recipe-as-ingredient and free-text rows have no catalogue ingredient
        // to translate — only real ingredients carry curated translations
        if (!ing) continue;
        if (!map.has(ing.id)) {
          map.set(ing.id, {
            id: ing.id,
            name: ing.name,
            current: ing.translations?.find(tr => tr.locale === target)?.name,
          });
        }
      }
    }
    return [...map.values()];
  }, [recipe, target]);
  const showIngredients = target !== 'en' && ingredients.length > 0;

  const { data: existing } = useRecipeTranslations(recipe.id, target, open);
  const existingMap = useMemo(() => approvedTranslationMap(existing), [existing]);

  const fieldValue = (path: string) => drafts[`f:${path}`] ?? existingMap.get(path) ?? '';
  const ingValue = (id: number, current: string | undefined) => drafts[`i:${id}`] ?? current ?? '';

  const autofillOne = async (key: string, source: string, from: string) => {
    setBusy(true);
    try {
      const { translatedText } = await translateText(source, target, from);
      setDrafts(d => ({ ...d, [key]: translatedText }));
    } catch {
      toast.error(t('translation.autofillError'));
    } finally {
      setBusy(false);
    }
  };

  const prefillAll = async () => {
    setBusy(true);
    try {
      const next: Record<string, string> = { ...drafts };
      for (const f of fields) {
        if (fieldValue(f.path).trim()) continue;
        next[`f:${f.path}`] = (await translateText(f.value, target, recipe.locale)).translatedText;
      }
      if (showIngredients) {
        for (const ing of ingredients) {
          if (ingValue(ing.id, ing.current).trim()) continue;
          next[`i:${ing.id}`] = (await translateText(ing.name, target, 'en')).translatedText;
        }
      }
      setDrafts(next);
    } catch {
      toast.error(t('translation.autofillError'));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      for (const f of fields) {
        const val = fieldValue(f.path).trim();
        if (val && val !== existingMap.get(f.path)) {
          await upsertTranslation({ recipeId: recipe.id, field: f.path, locale: target, value: val });
        }
      }
      if (showIngredients) {
        for (const ing of ingredients) {
          const val = ingValue(ing.id, ing.current).trim();
          if (val && val !== ing.current) await upsertIngredientTranslation(ing.id, target, val);
        }
      }
      // refresh both reader caches: recipe detail (ingredient names) + the
      // per-locale translation list the reader view reads from
      await qc.invalidateQueries({ queryKey: recipeKeys.detail(recipe.id) });
      await qc.invalidateQueries({ queryKey: recipeKeys.detail(recipe.slug) });
      await qc.invalidateQueries({ queryKey: translationKeys.forRecipe(recipe.id, target) });
      toast.success(t('translation.saved'));
      setOpen(false);
      setDrafts({});
    } catch {
      toast.error(t('translation.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-fit items-center gap-2 rounded-full border border-cream/40 px-4 py-2 text-sm transition hover:bg-cream/10"
      >
        <Languages size={16} />
        {t('translation.open')}
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} panelClassName="max-w-2xl">
          <div className="flex flex-col gap-4 text-forest">
            <div>
              <h2 className="text-2xl">{t('translation.manageTitle')}</h2>
              <p className="mt-1 text-sm text-forest/60">{t('translation.manageHint')}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium" htmlFor="translate-target">
                  {t('translation.targetLanguage')}
                </label>
                <select
                  id="translate-target"
                  className="rounded-lg border border-forest/20 bg-white px-3 py-2 text-sm outline-none focus:border-forest"
                  value={target}
                  onChange={e => setTarget(e.target.value as ContentLanguage)}
                >
                  {targets.map(code => (
                    <option key={code} value={code}>
                      {t(`language.${code}`)}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="ghost" type="button" disabled={busy} onClick={() => void prefillAll()}>
                {busy ? <Spinner size={16} /> : <Wand2 size={16} />}
                {t('translation.autofillAll')}
              </Button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto pr-1">
              {fields.map(f => (
                <FieldRow
                  key={f.path}
                  original={f.value}
                  value={fieldValue(f.path)}
                  onChange={v => setDrafts(d => ({ ...d, [`f:${f.path}`]: v }))}
                  onAutofill={() => void autofillOne(`f:${f.path}`, f.value, recipe.locale)}
                  busy={busy}
                  autofillLabel={t('translation.autofill')}
                />
              ))}

              {showIngredients && (
                <>
                  <h3 className="mt-4 mb-2 text-sm font-semibold tracking-wide text-forest/70 uppercase">
                    {t('translation.ingredientTitle')}
                  </h3>
                  {ingredients.map(ing => (
                    <FieldRow
                      key={ing.id}
                      original={ing.name}
                      value={ingValue(ing.id, ing.current)}
                      onChange={v => setDrafts(d => ({ ...d, [`i:${ing.id}`]: v }))}
                      onAutofill={() => void autofillOne(`i:${ing.id}`, ing.name, 'en')}
                      busy={busy}
                      autofillLabel={t('translation.autofill')}
                      singleLine
                    />
                  ))}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-forest/10 pt-4">
              <Button variant="ghost" type="button" disabled={busy} onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" disabled={busy} onClick={() => void save()}>
                {busy && <Spinner size={16} />}
                {t('translation.save')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

interface FieldRowProps {
  original: string;
  value: string;
  onChange: (value: string) => void;
  onAutofill: () => void;
  busy: boolean;
  autofillLabel: string;
  singleLine?: boolean;
}

function FieldRow({ original, value, onChange, onAutofill, busy, autofillLabel, singleLine }: FieldRowProps) {
  return (
    <div className="border-t border-forest/10 py-3 first:border-t-0">
      <p className="mb-1 text-sm text-forest/55">{original}</p>
      <div className="flex items-start gap-2">
        {singleLine ? (
          <input
            className="w-full rounded-lg border border-forest/20 bg-white px-3 py-2 text-sm outline-none focus:border-forest"
            value={value}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <textarea
            rows={2}
            className="w-full rounded-lg border border-forest/20 bg-white px-3 py-2 text-sm outline-none focus:border-forest"
            value={value}
            onChange={e => onChange(e.target.value)}
          />
        )}
        <button
          type="button"
          aria-label={autofillLabel}
          title={autofillLabel}
          disabled={busy}
          onClick={onAutofill}
          className="mt-0.5 shrink-0 rounded-lg border border-forest/20 p-2 text-forest/70 transition hover:bg-forest/5 disabled:opacity-40"
        >
          <Wand2 size={16} />
        </button>
      </div>
    </div>
  );
}
