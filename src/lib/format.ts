import { format, formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

type SupportedLocale = 'tr' | 'en';

const localeMap = {
  tr,
  en: enUS,
} as const;

function getLocale(lang?: SupportedLocale) {
  const l = lang ?? ((localStorage.getItem('i18nextLng') as SupportedLocale) || 'tr');
  return localeMap[l] ?? tr;
}

/** Format currency (EUR). */
export function formatCurrency(amount: number, lang?: SupportedLocale): string {
  const locale = lang === 'en' ? 'en-DE' : 'tr-TR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format date as "10 May 2026". */
export function formatDate(date: Date | string, lang?: SupportedLocale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'd MMMM yyyy', { locale: getLocale(lang) });
}

/** Format date as "10 May". */
export function formatDateShort(date: Date | string, lang?: SupportedLocale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'd MMM', { locale: getLocale(lang) });
}

/** Format time as "14:30". */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm');
}

/** Relative time: "3 saat önce", "2 hours ago". */
export function formatRelative(date: Date | string, lang?: SupportedLocale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: getLocale(lang) });
}

/** Format number with locale. */
export function formatNumber(n: number, lang?: SupportedLocale): string {
  const locale = lang === 'en' ? 'en-DE' : 'tr-TR';
  return new Intl.NumberFormat(locale).format(n);
}
