import type { TimeUnit } from '../api/types';

interface TimeUnitLabels {
  hours: string; // t('timeUnit.HOURS')
  minutes: string; // t('timeUnit.MINUTES')
}

/** "10 juin 2026" from an ISO timestamp; locale comes from i18n.language. */
export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
}

/**
 * "1h 30min" / "45 min" from prep + cook times. Unit labels come from the
 * caller's t() so the string stays inside i18n.
 */
export function formatTotalTime(
  prepTime: number,
  prepUnit: TimeUnit,
  cookTime: number,
  cookUnit: TimeUnit,
  labels: TimeUnitLabels,
): string {
  const toMinutes = (value: number, unit: TimeUnit) => (unit === 'HOURS' ? value * 60 : value);
  const total = toMinutes(prepTime, prepUnit) + toMinutes(cookTime, cookUnit);
  if (total >= 60) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}${labels.hours} ${m}${labels.minutes}` : `${h}${labels.hours}`;
  }
  return `${total} ${labels.minutes}`;
}
