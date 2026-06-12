import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecipeNutrition } from '../../api/recipes.api';
import type { NutrientKey } from '../../api/types';

/**
 * One line of the Canadian "Nutrition Facts / Valeurs nutritives" label.
 * `dvKey` picks which Canadian Daily Value (supplied by the server, in the same
 * unit) to compute %DV against — omit it for nutrients shown WITHOUT a %DV
 * (cholesterol, protein). `sumWith` adds a second nutrient's value to `key`
 * (Canada shows ONE %DV for saturated + trans combined). `indent` marks a
 * sub-nutrient; `labelKey` overrides the i18n label.
 */
interface LabelRow {
  key: NutrientKey;
  unit: 'g' | 'mg' | 'mcg';
  bold?: boolean;
  indent?: boolean;
  dvKey?: NutrientKey;
  sumWith?: NutrientKey;
  labelKey?: string;
}

// Macros block, in Canadian Nutrition Facts order (Fat → Carb → Protein →
// Cholesterol → Sodium). Daily Values come from the server (Health Canada
// Table of Daily Values); Canada shows ONE %DV for saturated + trans combined,
// a %DV on total sugars, and NO %DV on cholesterol or protein.
const MAIN_ROWS: LabelRow[] = [
  { key: 'totalFat', unit: 'g', bold: true, dvKey: 'totalFat' },
  { key: 'saturatedFat', sumWith: 'transFat', labelKey: 'saturatedTransFat', unit: 'g', indent: true, dvKey: 'saturatedFat' },
  { key: 'carbohydrates', unit: 'g', bold: true, dvKey: 'carbohydrates' },
  { key: 'fiber', unit: 'g', indent: true, dvKey: 'fiber' },
  { key: 'sugar', unit: 'g', indent: true, dvKey: 'sugar' },
  { key: 'protein', unit: 'g', bold: true },
  { key: 'cholesterol', unit: 'mg', bold: true },
  { key: 'sodium', unit: 'mg', bold: true, dvKey: 'sodium' },
];

// The three micronutrients the Canadian label mandates — all tracked server-side.
const MICRO_ROWS: LabelRow[] = [
  { key: 'potassium', unit: 'mg', dvKey: 'potassium' },
  { key: 'calcium', unit: 'mg', dvKey: 'calcium' },
  { key: 'iron', unit: 'mg', dvKey: 'iron' },
];

/**
 * Per-serving / whole-recipe nutrition rendered as the Canadian "Valeurs
 * nutritives / Nutrition Facts" label (text localized; %DV against Health
 * Canada Daily Values supplied by the server). Nutrient amounts are computed on
 * demand from USDA data and supplementary by design: while loading, on error,
 * or when no ingredient carries nutrition data, the panel simply doesn't
 * render — the recipe page never breaks over a missing estimate.
 */
export default function NutritionPanel({ recipeId }: { recipeId: number }) {
  const { t, i18n } = useTranslation();
  const { data } = useRecipeNutrition(recipeId);
  const [scope, setScope] = useState<'perServing' | 'total'>('perServing');

  if (!data || data.ingredientsProcessed === 0) return null;

  const values = scope === 'perServing' ? data.perServing : data.total;
  const dailyValues = data.dailyValues ?? {};
  const numberFormat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 });
  const fmt = (n: number) => numberFormat.format(n);

  const renderRow = ({ key, unit, bold, indent, dvKey, sumWith, labelKey }: LabelRow) => {
    const value = values[key] + (sumWith ? values[sumWith] : 0);
    const dv = dvKey ? dailyValues[dvKey] : undefined;
    const pct = dv ? Math.round((value / dv) * 100) : null;
    return (
      <div key={key} className="flex justify-between gap-2 border-t border-forest/40 py-0.5">
        <span className={indent ? 'pl-4' : ''}>
          <span className={bold ? 'font-bold' : ''}>{t(`nutrient.${labelKey ?? key}`)}</span>{' '}
          {fmt(value)}&nbsp;{t(`unit.${unit}`)}
        </span>
        {pct !== null && <span className="font-bold">{pct}&nbsp;%</span>}
      </div>
    );
  };

  const scopePill = (value: 'perServing' | 'total', label: string) => (
    <button
      type="button"
      aria-pressed={scope === value}
      className={`px-3 py-1 text-xs font-medium transition ${
        scope === value ? 'bg-forest text-cream' : 'bg-white text-forest hover:bg-forest/5'
      }`}
      onClick={() => setScope(value)}
    >
      {label}
    </button>
  );

  return (
    <section aria-labelledby="nutrition-heading" className="mt-2 mb-6">
      <div className="w-full max-w-xs border-2 border-forest bg-white p-2 font-sans text-sm text-forest">
        <h2 id="nutrition-heading" className="text-3xl leading-none font-extrabold tracking-tight">
          {t('nutrition.title')}
        </h2>
        <p className="mt-1 text-sm">
          {t('nutrition.servingsPerRecipe', { count: data.servings })}
        </p>

        {/* serving-size selector — drives whether the figures below are per
            portion or for the whole recipe (and scales %DV accordingly) */}
        <div
          role="group"
          aria-label={t('nutrition.title')}
          className="mt-1 flex w-fit overflow-hidden rounded-md border border-forest/30"
        >
          {scopePill('perServing', t('nutrition.perServing'))}
          {scopePill('total', t('nutrition.total'))}
        </div>

        {/* calories block */}
        <div className="mt-1 border-t-8 border-forest pt-0.5">
          <p className="text-xs font-bold">
            {scope === 'perServing' ? t('nutrition.perServing') : t('nutrition.total')}
          </p>
          <div className="flex items-end justify-between border-b-4 border-forest pb-0.5">
            <span className="text-3xl font-extrabold">{t('nutrient.calories')}</span>
            <span className="text-3xl font-extrabold">{fmt(values.calories)}</span>
          </div>
        </div>

        <p className="border-b border-forest py-0.5 text-right text-xs font-bold">
          {t('nutrition.dailyValue')}
        </p>

        <div>{MAIN_ROWS.map(renderRow)}</div>

        <div className="border-t-8 border-forest">{MICRO_ROWS.map(renderRow)}</div>

        <p className="mt-1 border-t-4 border-forest pt-1 text-[10px] leading-snug text-forest/70">
          {t('nutrition.footnote')}
        </p>
      </div>

      <p className="mt-2 max-w-xs text-xs text-forest/50">
        {t('nutrition.approx')}
        {data.ingredientsSkipped.length > 0 && (
          <> {t('nutrition.skipped', { count: data.ingredientsSkipped.length })}</>
        )}
      </p>
    </section>
  );
}
