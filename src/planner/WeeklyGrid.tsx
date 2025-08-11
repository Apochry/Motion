import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ISODateString, ScheduledBlock, WorkingHours } from './types';
import { listWeekDates, minutesToTimeString, formatDayLabel } from './date';

type Props = {
  weekStartISO: ISODateString;
  workingHours: WorkingHours;
  blocks: ScheduledBlock[];
  onDeleteBlock: (blockId: string) => void;
  onClickEmpty?: (dayISO: ISODateString, minuteOfDay: number) => void;
  preview?: { date: ISODateString; startMinutes: number; endMinutes: number; title: string; color: string };
  onClickEvent?: (eventId: string) => void;
  onClickTask?: (taskId: string) => void;
  onRequestDeleteBlock?: (blockId: string) => void;
};

const ROW_HEIGHT_PX = 24; // 30 min slot
const HEADER_HEIGHT_PX = 36;

export default function WeeklyGrid({ weekStartISO, workingHours, blocks, onClickEmpty, preview, onClickEvent, onClickTask, onRequestDeleteBlock }: Props) {
  const days = listWeekDates(weekStartISO);
  const numRows = useMemo(() => Math.ceil((workingHours.endMinutes - workingHours.startMinutes) / 30), [workingHours]);
  const contentHeight = numRows * ROW_HEIGHT_PX;
  const totalHeight = HEADER_HEIGHT_PX + contentHeight;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pad, setPad] = useState(0);

  useLayoutEffect(() => {
    const computePad = () => {
      const h = scrollRef.current?.clientHeight ?? 0;
      setPad(Math.max((h - totalHeight) / 2, 0));
    };
    computePad();
    const onResize = () => computePad();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [totalHeight]);

  const hoursLabels = useMemo(() => {
    const labels: { top: number; label: string }[] = [];
    for (let m = workingHours.startMinutes; m <= workingHours.endMinutes; m += 60) {
      const rowIndex = Math.floor((m - workingHours.startMinutes) / 30);
      labels.push({ top: rowIndex * ROW_HEIGHT_PX, label: minutesToTimeString(m) });
    }
    return labels;
  }, [workingHours]);

  return (
    <div className="flex w-full h-full overflow-hidden bg-white text-gray-900">
      {/* Time axis */}
      <div className="w-[72px] border-r border-gray-200 relative text-gray-500" style={{ paddingTop: pad, paddingBottom: pad }}>
        <div className="relative" style={{ height: contentHeight, marginTop: HEADER_HEIGHT_PX }}>
          {hoursLabels.map((h) => (
            <div key={h.top} className="absolute right-2 text-xs" style={{ top: h.top - 6 }}>{h.label}</div>
          ))}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 grid overflow-auto" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))`, paddingTop: pad, paddingBottom: pad }}>
        {days.map((day) => (
          <DayColumn
            key={day}
            dayISO={day}
            workingHours={workingHours}
            blocks={blocks.filter((b) => b.date === day)}
            numRows={numRows}
            onClickEmpty={onClickEmpty}
            preview={preview && preview.date === day ? preview : undefined}
            onClickEvent={onClickEvent}
            onClickTask={onClickTask}
            onRequestDeleteBlock={onRequestDeleteBlock}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({ dayISO, workingHours, blocks, numRows, onClickEmpty, preview, onClickEvent, onClickTask, onRequestDeleteBlock }: { dayISO: ISODateString; workingHours: WorkingHours; blocks: ScheduledBlock[]; numRows: number; onClickEmpty?: (dayISO: ISODateString, minuteOfDay: number) => void; preview?: { date: ISODateString; startMinutes: number; endMinutes: number; title: string; color: string }; onClickEvent?: (eventId: string) => void; onClickTask?: (taskId: string) => void; onRequestDeleteBlock?: (blockId: string) => void; }) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [nowTop, setNowTop] = useState<number | null>(null);

  useEffect(() => {
    function updateNow() {
      const todayISO = new Date().toISOString().slice(0, 10);
      if (todayISO !== dayISO) { setNowTop(null); return; }
      const minutes = new Date().getHours() * 60 + new Date().getMinutes();
      const clamped = Math.min(Math.max(minutes, workingHours.startMinutes), workingHours.endMinutes);
      const rowIndex = Math.floor((clamped - workingHours.startMinutes) / 30);
      setNowTop(rowIndex * ROW_HEIGHT_PX);
    }
    updateNow();
    const id = setInterval(updateNow, 30 * 1000);
    return () => clearInterval(id);
  }, [dayISO, workingHours]);

  return (
    <div ref={columnRef} className="border-r border-black/10 relative select-none" style={{ height: HEADER_HEIGHT_PX + numRows * ROW_HEIGHT_PX }}>
      {/* Grid background below header */}
      <div className="absolute left-0 right-0" style={{ top: HEADER_HEIGHT_PX }}>
        {Array.from({ length: numRows }).map((_, i) => (
          <div key={i} className="border-b border-black/[.06]" style={{ height: ROW_HEIGHT_PX }} />
        ))}
      </div>

      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-black/10 px-3 py-2 text-sm font-medium">{formatDayLabel(dayISO)}</div>

      {/* Now line */}
      {nowTop !== null && nowTop >= 0 && nowTop <= numRows * ROW_HEIGHT_PX && (
        <div className="absolute left-0 right-0" style={{ top: HEADER_HEIGHT_PX + nowTop }}>
          <div className="h-[2px] bg-orange-500" />
        </div>
      )}

      {/* Click capture over grid rows */}
      <div
        className="absolute left-0 right-0 cursor-pointer"
        style={{ top: HEADER_HEIGHT_PX, height: numRows * ROW_HEIGHT_PX }}
        onClick={(e) => {
          if (!onClickEmpty) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const y = e.clientY - rect.top;
          const rowIndex = Math.floor(y / ROW_HEIGHT_PX);
          const minuteOfDay = workingHours.startMinutes + rowIndex * 30;
          const clamped = Math.min(Math.max(minuteOfDay, workingHours.startMinutes), workingHours.endMinutes - 30);
          onClickEmpty(dayISO, clamped);
        }}
      />

      {/* Preview block (semi-transparent) */}
      {preview && (
        <div className="absolute left-2 right-2 opacity-50" style={{ top: HEADER_HEIGHT_PX }}>
          {(() => {
            const startRow = Math.floor((preview.startMinutes - workingHours.startMinutes) / 30);
            const endRow = Math.ceil((preview.endMinutes - workingHours.startMinutes) / 30);
            const top = startRow * ROW_HEIGHT_PX + 2;
            const height = Math.max(ROW_HEIGHT_PX / 2, (endRow - startRow) * ROW_HEIGHT_PX - 4);
            return (
              <div className="absolute left-0 right-0 rounded-md border border-dashed text-xs overflow-hidden" style={{ top, height, backgroundColor: preview.color }}>
                <div className="px-2 py-1 font-semibold text-white truncate">{preview.title || 'New event'}</div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Blocks */}
      <div className="absolute left-2 right-2" style={{ top: HEADER_HEIGHT_PX }}>
        {blocks.map((b) => {
          const startRow = Math.floor((b.startMinutes - workingHours.startMinutes) / 30);
          const endRow = Math.ceil((b.endMinutes - workingHours.startMinutes) / 30);
          const top = startRow * ROW_HEIGHT_PX + 2;
          const height = Math.max(ROW_HEIGHT_PX / 2, (endRow - startRow) * ROW_HEIGHT_PX - 4);
          return (
            <div
              key={b.id}
              className={`absolute left-0 right-0 rounded-md shadow-sm border text-xs overflow-hidden cursor-pointer transition hover:brightness-110 hover:shadow-md ${b.completed ? 'opacity-60 grayscale' : ''}`}
              style={{ top, height, backgroundColor: b.color, borderColor: b.fixed ? 'rgba(0,0,0,0.25)' : 'transparent' }}
              onClick={(e) => {
                e.stopPropagation();
                if (b.source.type === 'event') onClickEvent?.(b.source.eventId);
                else if (b.source.type === 'task') onClickTask?.(b.source.taskId);
              }}
            >
              <div className="flex items-center justify-between gap-1 px-2 py-1">
                <div className="font-semibold truncate text-white drop-shadow">{b.title}</div>
                <div className="flex items-center gap-1">
                  {/* Complete quick action if block time is in the past or current */}
                  <CompleteBadge block={b} />
                  <button
                  className="text-[10px] bg-black/30 hover:bg-black/50 text-white rounded px-1"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onRequestDeleteBlock?.(b.id);
                  }}
                >
                  ✕
                </button>
                </div>
              </div>
              <div className="px-2 pb-1 text-white/90">{minutesToTimeString(b.startMinutes)}–{minutesToTimeString(b.endMinutes)} {b.fixed ? '(event)' : '(task)'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompleteBadge({ block }: { block: ScheduledBlock }) {
  const now = new Date();
  const isToday = new Date().toISOString().slice(0, 10) === block.date;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const pastOrCurrent = (new Date(block.date) < new Date(new Date().toISOString().slice(0, 10))) || (isToday && nowMinutes >= block.startMinutes);
  if (!pastOrCurrent || block.completed) return null;
  return (
    <span title="Mark complete" className="text-[10px] px-1 py-[1px] rounded bg-white/20 hover:bg-white/30 text-white" onClick={(e) => { e.stopPropagation(); (window as any).__markComplete?.(block); }}>✓ Complete</span>
  );
}


