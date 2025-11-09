import type { AppLocale } from '../i18n/config';
import { formatJalaliDateTime, formatTehranDateTime } from '../time/jalali';

export function formatDisplayDate(date: Date, locale: AppLocale): string {
  if (locale === 'fa') {
    return formatJalaliDateTime(date, 'YYYY/MM/DD HH:mm');
  }
  return formatTehranDateTime(date, 'YYYY-MM-DD HH:mm');
}
