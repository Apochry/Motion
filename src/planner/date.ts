import type { ISODateString } from './types';

export function toISODateString(date: Date): ISODateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromISODateString(value: ISODateString): Date {
  const [y, m, d] = value.split('-').map((x) => parseInt(x, 10));
  const dt = new Date();
  dt.setFullYear(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function getMondayOfWeek(date: Date): ISODateString {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return toISODateString(d);
}

export function shiftISODateByDays(dateISO: ISODateString, days: number): ISODateString {
  const d = fromISODateString(dateISO);
  d.setDate(d.getDate() + days);
  return toISODateString(d);
}

export function listWeekDates(weekStartISO: ISODateString): ISODateString[] {
  return Array.from({ length: 7 }, (_, i) => shiftISODateByDays(weekStartISO, i));
}

export function isDateInRange(dateISO: ISODateString, startISO: ISODateString, endISO: ISODateString): boolean {
  return fromISODateString(dateISO) >= fromISODateString(startISO) && fromISODateString(dateISO) <= fromISODateString(endISO);
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeStringToMinutes(value: string): number {
  const [h, m] = value.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export function humanDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function formatDayLabel(dateISO: ISODateString): string {
  const d = fromISODateString(dateISO);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${weekday} ${month}/${day}`;
}

export function formatWeekRange(weekStartISO: ISODateString): string {
  const start = fromISODateString(weekStartISO);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startMonth = start.toLocaleString(undefined, { month: 'short' });
  const endMonth = end.toLocaleString(undefined, { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();
  if (sameMonth) return `${startMonth} ${startDay}–${endDay}, ${year}`;
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

export function todayISO(): ISODateString {
  return toISODateString(new Date());
}

export function isBeforeISO(a: ISODateString, b: ISODateString): boolean {
  return fromISODateString(a).getTime() < fromISODateString(b).getTime();
}

export function isSameISO(a: ISODateString, b: ISODateString): boolean {
  return fromISODateString(a).getTime() === fromISODateString(b).getTime();
}

export function nowMinuteOfDay(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}


