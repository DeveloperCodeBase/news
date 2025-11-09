import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import jalaliday from 'jalaliday';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  dayjs.extend(utc);
  dayjs.extend(timezone);
  dayjs.extend(jalaliday);
  configured = true;
}

export function formatJalaliDateTime(
  value: Date | string | number | null | undefined,
  format = 'YYYY/MM/DD HH:mm'
): string {
  if (value === null || value === undefined) return '—';
  ensureConfigured();
  const instance = dayjs(value).tz('Asia/Tehran');
  if (!instance.isValid()) return '—';
  return instance.calendar('jalali').locale('fa').format(format);
}

export function formatTehranDateTime(
  value: Date | string | number | null | undefined,
  format = 'YYYY-MM-DD HH:mm'
): string {
  if (value === null || value === undefined) return '—';
  ensureConfigured();
  const instance = dayjs(value).tz('Asia/Tehran');
  if (!instance.isValid()) return '—';
  return instance.locale('en').format(format);
}

export function getTehranStartOfDay(date = new Date()): Date {
  ensureConfigured();
  return dayjs(date).tz('Asia/Tehran').startOf('day').toDate();
}

export function getTehranDateKey(date = new Date()): string {
  ensureConfigured();
  return dayjs(date).tz('Asia/Tehran').format('YYYY-MM-DD');
}
