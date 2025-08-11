import { useEffect, useMemo, useState } from 'react';
import type { FixedEvent, PlannerState, ScheduledBlock, Task, WorkingHours } from './types';
import { getMondayOfWeek, shiftISODateByDays } from './date';
import { autoSchedule, blocksForWeek, rebuildScheduledFromEventsAndTasks } from './scheduler';
import { loadState, saveState } from './storage';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import WeeklyGrid from './WeeklyGrid';
import type { ISODateString } from './types';

const DEFAULT_WORKING_HOURS: WorkingHours = { startMinutes: 9 * 60, endMinutes: 17 * 60 + 30 };

export default function Planner() {
  const [state, setState] = useState<PlannerState>(() => {
    const today = new Date();
    const loaded = loadState();
    return (
      loaded ?? {
        workingHours: DEFAULT_WORKING_HOURS,
        fixedEvents: [],
        tasks: [],
        scheduled: [],
        weekStartISO: getMondayOfWeek(today),
      }
    );
  });

  const fullScheduled: ScheduledBlock[] = useMemo(
    () => rebuildScheduledFromEventsAndTasks(state.fixedEvents, state.scheduled),
    [state.fixedEvents, state.scheduled]
  );

  const visibleBlocks = useMemo(() => blocksForWeek(fullScheduled, state.weekStartISO), [fullScheduled, state.weekStartISO]);

  useEffect(() => { saveState(state); }, [state]);

  // Auto-schedule whenever inputs change (tasks, events, week or hours)
  useEffect(() => {
    setState((s) => {
      const taskBlocks = autoSchedule(s.tasks, s.fixedEvents, [], s.weekStartISO, s.workingHours);
      // Keep only task blocks in s.scheduled; events are remapped in fullScheduled
      return { ...s, scheduled: taskBlocks };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tasks.length, state.fixedEvents.length, state.weekStartISO, state.workingHours.startMinutes, state.workingHours.endMinutes]);

  function addEvent(event: FixedEvent) { setState((s) => ({ ...s, fixedEvents: [...s.fixedEvents, event] })); }
  const [draft, setDraft] = useState<DraftState>({ open: false });
  // Global hook for quick-complete clicks in grid
  useEffect(() => {
    (window as any).__markComplete = (block: ScheduledBlock) => {
      setState((s) => {
        if (block.source.type === 'event') {
          const id = block.source.eventId;
          return { ...s, fixedEvents: s.fixedEvents.map((e) => (e.id === id ? { ...e, completed: true } : e)) };
        }
        // For tasks, toggle completed on the task itself
        return { ...s, tasks: s.tasks.map((t) => (block.source.type === 'task' && t.id === (block.source as any).taskId ? { ...t, completed: true } : t)) };
      });
    };
    return () => { (window as any).__markComplete = undefined; };
  }, []);
  function addTask(task: Task) { setState((s) => ({ ...s, tasks: [...s.tasks, task] })); }
  function deleteBlock(blockId: string) { setState((s) => ({ ...s, scheduled: s.scheduled.filter((b) => b.id !== blockId) })); }
  function deleteEvent(eventId: string) { setState((s) => ({ ...s, fixedEvents: s.fixedEvents.filter((e) => e.id !== eventId) })); }
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; title?: string; onConfirm?: () => void }>({ open: false });

  function autoScheduleAll() {
    setState((s) => {
      const newBlocks = autoSchedule(s.tasks, s.fixedEvents, s.scheduled, s.weekStartISO, s.workingHours);
      return { ...s, scheduled: [...s.scheduled, ...newBlocks] };
    });
  }

  function scheduleTask(taskId: string) {
    setState((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;
      const newBlocks = autoSchedule([task], s.fixedEvents, s.scheduled, s.weekStartISO, s.workingHours);
      return { ...s, scheduled: [...s.scheduled, ...newBlocks] };
    });
  }

  function clearTaskSchedule() { setState((s) => ({ ...s, scheduled: s.scheduled.filter((b) => b.source.type === 'event') })); }
  function resetAll() { const today = new Date(); setState({ workingHours: DEFAULT_WORKING_HOURS, fixedEvents: [], tasks: [], scheduled: [], weekStartISO: getMondayOfWeek(today) }); }

  return (
    <div className="h-screen w-full flex flex-col">
      <TopBar
        weekStartISO={state.weekStartISO}
        onPrevWeek={() => setState((s) => ({ ...s, weekStartISO: shiftISODateByDays(s.weekStartISO, -7) }))}
        onNextWeek={() => setState((s) => ({ ...s, weekStartISO: shiftISODateByDays(s.weekStartISO, 7) }))}
        onToday={() => setState((s) => ({ ...s, weekStartISO: getMondayOfWeek(new Date()) }))}
        onAutoSchedule={autoScheduleAll}
        onClearTaskSchedule={clearTaskSchedule}
        onClearAll={resetAll}
        workingHours={state.workingHours}
        onUpdateWorkingHours={(wh) => setState((s) => ({ ...s, workingHours: wh }))}
      />
      <div className="flex-1 flex min-h-0">
        <Sidebar
          tasks={state.tasks}
          fixedEvents={state.fixedEvents}
          workingHours={state.workingHours}
          onAddTask={addTask}
          onAddEvent={addEvent}
          onDeleteEvent={deleteEvent}
          onScheduleTask={scheduleTask}
          onUpdateWorkingHours={(wh) => setState((s) => ({ ...s, workingHours: wh }))}
        />
        <div className="flex-1 overflow-hidden">
          <WeeklyGrid
            weekStartISO={state.weekStartISO}
            workingHours={state.workingHours}
            blocks={visibleBlocks}
            onDeleteBlock={(id) => deleteBlock(id)}
            onClickEmpty={(dayISO, startMinutes) => setDraft({
              open: true,
              dayISO,
              startMinutes,
              endMinutes: Math.min(startMinutes + 60, state.workingHours.endMinutes),
              title: '',
              color: '#64748b',
            })}
            preview={draft.open ? { date: (draft as any).dayISO, startMinutes: (draft as any).startMinutes, endMinutes: (draft as any).endMinutes, title: (draft as any).title, color: (draft as any).color } : undefined}
            onClickEvent={(eventId) => {
              const ev = state.fixedEvents.find((e) => e.id === eventId);
              if (!ev) return;
              setDraft({ open: true, dayISO: ev.date, startMinutes: ev.startMinutes, endMinutes: ev.endMinutes, title: ev.title, color: ev.color });
            }}
            onClickTask={(taskId) => {
              const t = state.tasks.find((x) => x.id === taskId);
              if (!t) return;
              // open prefilled, allow changing title; date fixed to scheduled day via draft.dayISO
              // Find first scheduled block for this task in visible blocks to prefill day/time
              const blk = visibleBlocks.find((b) => b.source.type === 'task' && b.source.taskId === taskId);
              if (!blk) return;
              setDraft({ open: true, dayISO: blk.date, startMinutes: blk.startMinutes, endMinutes: blk.endMinutes, title: t.title, color: t.color });
            }}
            onRequestDeleteBlock={(blockId) => {
              const blk = visibleBlocks.find((b) => b.id === blockId);
              setConfirmDelete({
                open: true,
                title: blk?.title,
                onConfirm: () => {
                  if (blk && blk.source.type === 'event') {
                    deleteEvent(blk.source.eventId);
                  } else {
                    deleteBlock(blockId);
                  }
                },
              });
            }}
          />
        </div>
      </div>
      {confirmDelete.open && (
        <ConfirmModal
          title={`Delete "${confirmDelete.title ?? 'this block'}"?`}
          description="This will remove the scheduled block."
          onCancel={() => setConfirmDelete({ open: false })}
          onConfirm={() => { confirmDelete.onConfirm?.(); setConfirmDelete({ open: false }); setDraft({ open: false }); }}
        />
      )}
      {draft.open && (
        <EventModal
          dayISO={draft.dayISO as ISODateString}
          startMinutes={draft.startMinutes}
          endMinutes={draft.endMinutes}
          title={draft.title}
          color={draft.color}
          completed={(() => {
            const existing = state.fixedEvents.find((x) => x.date === (draft as any).dayISO && x.startMinutes === (draft as any).startMinutes && x.endMinutes === (draft as any).endMinutes && x.title === (draft as any).title);
            return existing?.completed ?? false;
          })()}
          onClose={() => setDraft({ open: false })}
          onSave={(e) => {
            // If we were editing an existing event (matched by same day/time/title at open), update it; otherwise add
            const existing = state.fixedEvents.find((x) => x.date === (draft as any).dayISO && x.startMinutes === (draft as any).startMinutes && x.endMinutes === (draft as any).endMinutes && x.title === (draft as any).title);
            if (existing) {
              const updated = { ...e, id: existing.id };
              setState((s) => ({ ...s, fixedEvents: s.fixedEvents.map((x) => (x.id === existing.id ? updated : x)) }));
            } else {
              addEvent(e);
            }
            setDraft({ open: false });
          }}
          onDelete={() => {
            const existing = state.fixedEvents.find((x) => x.date === (draft as any).dayISO && x.startMinutes === (draft as any).startMinutes && x.endMinutes === (draft as any).endMinutes && x.title === (draft as any).title);
            if (existing) {
              setConfirmDelete({
                open: true,
                title: existing.title,
                onConfirm: () => {
                  deleteEvent(existing.id);
                },
              });
            }
          }}
          onToggleCompleted={(val) => {
            const existing = state.fixedEvents.find((x) => x.date === (draft as any).dayISO && x.startMinutes === (draft as any).startMinutes && x.endMinutes === (draft as any).endMinutes && x.title === (draft as any).title);
            if (existing) {
              setState((s) => ({ ...s, fixedEvents: s.fixedEvents.map((e) => (e.id === existing.id ? { ...e, completed: val } : e)) }));
            }
          }}
        />
      )}
    </div>
  );
}

type DraftState = { open: true; dayISO: ISODateString; startMinutes: number; endMinutes: number; title: string; color: string } | { open: false };

function EventModal({ dayISO, startMinutes, endMinutes, title, color, completed, onClose, onSave, onDelete, onToggleCompleted }: { dayISO: ISODateString; startMinutes: number; endMinutes: number; title: string; color: string; completed?: boolean; onClose: () => void; onSave: (e: FixedEvent) => void; onDelete?: () => void; onToggleCompleted?: (val: boolean) => void }) {
  const [t, setT] = useState(title);
  const [s, setS] = useState(startMinutes);
  const [e, setE] = useState(endMinutes);
  const [c, setC] = useState(color);
  const [done, setDone] = useState(!!completed);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-[380px] p-4 space-y-3" onClick={(ev) => ev.stopPropagation()}>
        <div className="text-sm font-semibold">New event</div>
        <input className="input w-full" placeholder="Title" value={t} onChange={(ev) => setT(ev.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="date" value={dayISO} onChange={() => {}} readOnly />
          <input className="input" type="color" value={c} onChange={(ev) => setC(ev.target.value)} />
          <input className="input" type="time" value={minutesToTime(s)} onChange={(ev) => setS(timeToMinutes(ev.target.value))} />
          <input className="input" type="time" value={minutesToTime(e)} onChange={(ev) => setE(timeToMinutes(ev.target.value))} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={done} onChange={(ev) => { setDone(ev.target.checked); onToggleCompleted?.(ev.target.checked); }} /> Completed</label>
        {done && <div className="text-xs text-green-700">Completed</div>}
        <div className="flex justify-between items-center gap-2">
          <div>
            {onDelete && (
              <button className="px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50" onClick={() => onDelete()}>Delete</button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded border border-gray-200" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={() => { if (!t) return; if (e <= s) return; onSave({ id: crypto.randomUUID(), title: t, date: dayISO, startMinutes: s, endMinutes: e, color: c, completed: done }); }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function minutesToTime(m: number): string { const h = Math.floor(m / 60); const mi = m % 60; return `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`; }
function timeToMinutes(v: string): number { const [h, m] = v.split(':').map((x) => parseInt(x, 10)); return (h || 0) * 60 + (m || 0); }

function ConfirmModal({ title, description, onCancel, onConfirm }: { title: string; description?: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-lg w-[360px] p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold">{title}</div>
        {description && <div className="text-sm text-gray-600">{description}</div>}
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded border border-gray-200" onClick={onCancel}>Cancel</button>
          <button className="px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}


