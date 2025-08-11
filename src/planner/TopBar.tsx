import type { ISODateString, WorkingHours } from './types';
import { formatWeekRange, minutesToTimeString, timeStringToMinutes } from './date';

type Props = {
  weekStartISO: ISODateString;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onAutoSchedule: () => void;
  onClearTaskSchedule: () => void;
  onClearAll: () => void;
  workingHours: WorkingHours;
  onUpdateWorkingHours: (wh: WorkingHours) => void;
};

export default function TopBar({ weekStartISO, onPrevWeek, onNextWeek, onToday, onAutoSchedule, onClearTaskSchedule, onClearAll, workingHours, onUpdateWorkingHours }: Props) {
  const rangeLabel = formatWeekRange(weekStartISO);
  const start = minutesToTimeString(workingHours.startMinutes);
  const end = minutesToTimeString(workingHours.endMinutes);
  return (
    <div className="flex items-center justify-between gap-4 p-3 border-b border-gray-200 bg-white sticky top-0 z-10 text-gray-900">
      <div className="flex items-center gap-2">
        <button onClick={onPrevWeek} className="px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50">←</button>
        <button onClick={onToday} className="px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50">Today</button>
        <button onClick={onNextWeek} className="px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50">→</button>
        <div className="ml-3 font-semibold tracking-tight">Week {rangeLabel}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500">Hours</span>
          <input
            className="input w-[96px]"
            type="time"
            defaultValue={start}
            onBlur={(e) => onUpdateWorkingHours({ startMinutes: timeStringToMinutes(e.target.value), endMinutes: workingHours.endMinutes })}
          />
          <span className="text-gray-400">–</span>
          <input
            className="input w-[96px]"
            type="time"
            defaultValue={end}
            onBlur={(e) => onUpdateWorkingHours({ startMinutes: workingHours.startMinutes, endMinutes: timeStringToMinutes(e.target.value) })}
          />
        </div>
        <button onClick={onAutoSchedule} className="px-3 py-2 rounded-md bg-black text-white hover:opacity-90">Auto-schedule</button>
        <button onClick={onClearTaskSchedule} className="px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50">Clear task schedule</button>
        <button onClick={onClearAll} className="px-3 py-2 rounded-md border border-red-200 hover:bg-red-50 text-red-600">Reset all</button>
      </div>
    </div>
  );
}


