import type { FixedEvent, ISODateString, ScheduledBlock, Task, WorkingHours } from './types';
import { isDateInRange, listWeekDates, fromISODateString, todayISO, isBeforeISO, isSameISO } from './date';

type DayBusyMap = Record<ISODateString, Array<[number, number]>>;
const CHUNK_MINUTES = 30;

function roundUpTo(minutes: number, step: number): number {
  return Math.ceil(minutes / step) * step;
}

function clampIntervals(intervals: Array<[number, number]>, workingHours: WorkingHours): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (const [s, e] of intervals) {
    const ns = Math.max(s, workingHours.startMinutes);
    const ne = Math.min(e, workingHours.endMinutes);
    if (ne > ns) result.push([ns, ne]);
  }
  return result;
}

function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    const last = merged[merged.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

function invertBusyToFree(busy: Array<[number, number]>, workingHours: WorkingHours): Array<[number, number]> {
  const merged = mergeIntervals(clampIntervals(busy, workingHours));
  const free: Array<[number, number]> = [];
  let cursor = workingHours.startMinutes;
  for (const [s, e] of merged) {
    if (s > cursor) free.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < workingHours.endMinutes) free.push([cursor, workingHours.endMinutes]);
  return free;
}

function addBusy(busy: Array<[number, number]>, slot: [number, number]): Array<[number, number]> {
  return mergeIntervals([...busy, slot]);
}

function scheduleTaskContinuous(
  task: Task,
  dayBusy: DayBusyMap,
  days: ISODateString[],
  workingHours: WorkingHours,
  today: ISODateString,
  nowMinutes: number,
): ScheduledBlock | null {
  for (const day of days) {
    const busy = dayBusy[day] ?? [];
    // Free slots, clamped to "now" if scheduling today
    const startClamp = day === today ? Math.max(roundUpTo(nowMinutes, CHUNK_MINUTES), workingHours.startMinutes) : workingHours.startMinutes;
    const free = invertBusyToFree(busy, workingHours)
      .map(([fs, fe]) => [Math.max(fs, startClamp), fe] as [number, number])
      .filter(([fs, fe]) => fe > fs);
    for (const [fs, fe] of free) {
      if (fe - fs >= task.durationMinutes) {
        return { id: `${task.id}:${day}:${fs}`, source: { type: 'task', taskId: task.id }, title: task.title, date: day, startMinutes: fs, endMinutes: fs + task.durationMinutes, color: colorFromPriority(task.priority), fixed: false };
      }
    }
  }
  return null;
}

function scheduleTaskSplit(
  task: Task,
  dayBusy: DayBusyMap,
  days: ISODateString[],
  workingHours: WorkingHours,
  today: ISODateString,
  nowMinutes: number,
  minChunk = CHUNK_MINUTES
): ScheduledBlock[] | null {
  let remaining = task.durationMinutes;
  const blocks: ScheduledBlock[] = [];
  for (const day of days) {
    if (remaining <= 0) break;
    const busy = dayBusy[day] ?? [];
    const startClamp = day === today ? Math.max(roundUpTo(nowMinutes, CHUNK_MINUTES), workingHours.startMinutes) : workingHours.startMinutes;
    const free = invertBusyToFree(busy, workingHours)
      .map(([fs, fe]) => [Math.max(fs, startClamp), fe] as [number, number])
      .filter(([fs, fe]) => fe > fs);
    for (const [fs, fe] of free) {
      if (remaining <= 0) break;
      const span = fe - fs;
      const take = Math.min(span - (span % minChunk), remaining - (remaining % minChunk) || remaining);
      if (take >= minChunk) {
        const start = fs;
        const end = fs + take;
        blocks.push({ id: `${task.id}:${day}:${start}`, source: { type: 'task', taskId: task.id }, title: task.title, date: day, startMinutes: start, endMinutes: end, color: colorFromPriority(task.priority), fixed: false });
        remaining -= take;
        dayBusy[day] = addBusy(busy, [start, end]);
      }
    }
  }
  return remaining <= 0 ? blocks : null;
}

function buildInitialBusy(events: FixedEvent[], scheduled: ScheduledBlock[], days: ISODateString[]): DayBusyMap {
  const map: DayBusyMap = {} as DayBusyMap;
  for (const day of days) map[day] = [];
  const consider = [
    ...events.map((e) => ({ date: e.date, s: e.startMinutes, e: e.endMinutes })),
    ...scheduled.map((b) => ({ date: b.date, s: b.startMinutes, e: b.endMinutes })),
  ];
  for (const item of consider) {
    if (!map[item.date]) continue;
    map[item.date] = addBusy(map[item.date], [item.s, item.e]);
  }
  return map;
}

export function autoSchedule(tasks: Task[], fixedEvents: FixedEvent[], existingScheduled: ScheduledBlock[], weekStartISO: ISODateString, workingHours: WorkingHours): ScheduledBlock[] {
  const weekDays = listWeekDates(weekStartISO);
  const dayBusy = buildInitialBusy(fixedEvents, existingScheduled, weekDays);

  const weekStartDate = fromISODateString(weekStartISO);
  const unscheduledTasks = tasks
    .filter((t) => !t.completed)
    .filter((t) => !existingScheduled.some((b) => b.source.type === 'task' && b.source.taskId === t.id))
    .sort((a, b) => {
      const aDue = fromISODateString(a.dueDate).getTime() - weekStartDate.getTime();
      const bDue = fromISODateString(b.dueDate).getTime() - weekStartDate.getTime();
      if (aDue !== bDue) return aDue - bDue; // earlier deadlines first
      if (a.priority !== b.priority) return b.priority - a.priority; // then higher priority
      return a.durationMinutes - b.durationMinutes; // then shorter tasks
    });

  const newlyScheduled: ScheduledBlock[] = [];
  const today = todayISO();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  for (const task of unscheduledTasks) {
    // Start from today for current week; otherwise from the week's Monday
    const startISO = isSameISO(weekStartISO, getMondayOf(today)) ? today : weekStartISO;
    const endISO = task.dueDate;
    const candidateDays = weekDays.filter((d) => isDateInRange(d, startISO, endISO) && !isBeforeISO(d, today));
    if (candidateDays.length === 0) continue;

    if (task.canSplit) {
      const plan = scheduleTaskSplit(task, dayBusy, candidateDays, workingHours, today, nowMinutes);
      if (plan) newlyScheduled.push(...plan);
    } else {
      const block = scheduleTaskContinuous(task, dayBusy, candidateDays, workingHours, today, nowMinutes);
      if (block) {
        newlyScheduled.push(block);
        const { date, startMinutes, endMinutes } = block;
        dayBusy[date] = addBusy(dayBusy[date] ?? [], [startMinutes, endMinutes]);
      }
    }
  }
  return newlyScheduled;
}

// Helper to compute Monday of a ISO date (local)
function getMondayOf(dateISO: ISODateString): ISODateString {
  const d = fromISODateString(dateISO);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return fromISODateString(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`) && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` as ISODateString;
}

export function blocksForWeek(blocks: ScheduledBlock[], weekStartISO: ISODateString): ScheduledBlock[] {
  const days = new Set(listWeekDates(weekStartISO));
  return blocks.filter((b) => days.has(b.date));
}

export function rebuildScheduledFromEventsAndTasks(fixedEvents: FixedEvent[], scheduled: ScheduledBlock[]): ScheduledBlock[] {
  const eventsAsBlocks: ScheduledBlock[] = fixedEvents.map((e) => ({ id: `event:${e.id}`, source: { type: 'event', eventId: e.id }, title: e.title, date: e.date, startMinutes: e.startMinutes, endMinutes: e.endMinutes, color: e.color, fixed: true, completed: e.completed }));
  const taskBlocks = scheduled.filter((b) => b.source.type === 'task');
  return [...eventsAsBlocks, ...taskBlocks];
}

function colorFromPriority(priority: number): string {
  switch (priority) {
    case 4: return '#dc2626'; // Critical - red
    case 3: return '#f59e0b'; // High - amber
    case 2: return '#3b82f6'; // Medium - blue
    default: return '#16a34a'; // Low - green
  }
}


