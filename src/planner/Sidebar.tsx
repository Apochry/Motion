import type { FixedEvent, Task, WorkingHours } from './types';
import { humanDuration, minutesToTimeString, timeStringToMinutes } from './date';
import { useState } from 'react';

type Props = {
  tasks: Task[];
  fixedEvents: FixedEvent[];
  workingHours: WorkingHours;
  onAddTask: (task: Task) => void;
  onAddEvent: (event: FixedEvent) => void;
  onDeleteEvent: (id: string) => void;
  onScheduleTask: (taskId: string) => void;
  onUpdateWorkingHours: (wh: WorkingHours) => void;
};

export default function Sidebar({ tasks, fixedEvents, workingHours, onAddTask, onAddEvent, onDeleteEvent, onScheduleTask }: Props) {
  return (
    <aside className="w-[340px] shrink-0 border-r border-gray-200 p-3 space-y-6 overflow-y-auto bg-white text-gray-900">
      <AddEventForm workingHours={workingHours} onAdd={onAddEvent} />
      <AddTaskForm onAdd={onAddTask} />
      <TaskList tasks={tasks} onScheduleTask={onScheduleTask} />
      <EventList events={fixedEvents} onDelete={onDeleteEvent} />
    </aside>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold tracking-tight text-gray-700">{children}</div>;
}

function AddEventForm({ onAdd, workingHours }: { onAdd: (e: FixedEvent) => void; workingHours: WorkingHours }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState<string>(() => minutesToTimeString(workingHours.startMinutes));
  const [end, setEnd] = useState<string>(() => minutesToTimeString(Math.min(workingHours.endMinutes, workingHours.startMinutes + 60)));
  const [color, setColor] = useState<string>('#2563eb');

  return (
    <div className="space-y-2">
      <SectionTitle>Add fixed event</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <input className="col-span-2 input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <button className="btn col-span-1" onClick={() => {
          if (!title) return;
          const s = timeStringToMinutes(start);
          const e = timeStringToMinutes(end);
          if (e <= s) return;
          onAdd({ id: crypto.randomUUID(), title, date, startMinutes: s, endMinutes: e, color });
          setTitle('');
        }}>Add</button>
      </div>
    </div>
  );
}

function AddTaskForm({ onAdd }: { onAdd: (t: Task) => void }) {
  const [title, setTitle] = useState('');
  const [durationHours, setDurationHours] = useState<number>(1);
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [canSplit, setCanSplit] = useState<boolean>(true);
  const [color, setColor] = useState<string>('#16a34a');

  return (
    <div className="space-y-2">
      <SectionTitle>Add task</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <input className="col-span-2 input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex gap-1 col-span-2 items-center">
          <span className="text-xs text-gray-500">Duration</span>
          <button type="button" className="btn" onClick={() => setDurationHours(0.5)}>0.5h</button>
          <button type="button" className="btn" onClick={() => setDurationHours(1)}>1h</button>
          <button type="button" className="btn" onClick={() => setDurationHours(2)}>2h</button>
          <input className="input w-24" type="number" min={0.25} step={0.25} value={durationHours} onChange={(e) => setDurationHours(parseFloat(e.target.value || '0'))} />
          <span className="text-xs text-gray-500">hours</span>
        </div>
        <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <div className="flex gap-1 items-center">
          <span className="text-xs text-gray-500">Quick due</span>
          <button type="button" className="btn" onClick={() => setDueDate(new Date().toISOString().slice(0,10))}>Today</button>
          <button type="button" className="btn" onClick={() => { const d=new Date(); d.setDate(d.getDate()+1); setDueDate(d.toISOString().slice(0,10)); }}>Tomorrow</button>
          <button type="button" className="btn" onClick={() => { const d=new Date(); d.setDate(d.getDate()+7); setDueDate(d.toISOString().slice(0,10)); }}>+1w</button>
        </div>
        <div className="flex gap-1">
          {(['Low','Medium','High','Critical'] as const).map(p => (
            <button key={p} type="button" className={`btn ${p===priority? 'opacity-100':'opacity-70'}`} onClick={() => setPriority(p)}>{p}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-foreground/80"><input type="checkbox" checked={canSplit} onChange={(e) => setCanSplit(e.target.checked)} /> allow split</label>
        <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <button className="btn col-span-1" onClick={() => {
          const durationMinutes = Math.round(durationHours * 60);
          if (!title || durationMinutes <= 0) return;
          const priorityValue = { Low: 1, Medium: 2, High: 3, Critical: 4 }[priority];
          onAdd({ id: crypto.randomUUID(), title, durationMinutes, dueDate, priority: priorityValue, canSplit, color });
          setTitle('');
        }}>Add</button>
      </div>
    </div>
  );
}

function TaskList({ tasks }: { tasks: Task[]; onScheduleTask?: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <SectionTitle>Tasks</SectionTitle>
      <div className="space-y-2">
        {tasks.length === 0 && <div className="text-xs text-gray-500">No tasks yet.</div>}
        {tasks.map((t) => (
          <div key={t.id} className="p-2 rounded border bg-background">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium truncate">{t.title}</div>
            </div>
            <div className="text-xs text-gray-500 mt-1">{humanDuration(t.durationMinutes)} · due {t.dueDate} · priority {t.priority} {t.canSplit ? '· split' : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventList({ events, onDelete }: { events: FixedEvent[]; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <SectionTitle>Fixed events</SectionTitle>
      <div className="space-y-2">
        {events.length === 0 && <div className="text-xs text-gray-500">No events yet.</div>}
        {events.map((e) => (
          <div key={e.id} className="p-2 rounded border bg-background">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium truncate">{e.title}</div>
              <button className="btn" onClick={() => onDelete(e.id)}>Delete</button>
            </div>
            <div className="text-xs text-gray-500 mt-1">{e.date} · {minutesToTimeString(e.startMinutes)}–{minutesToTimeString(e.endMinutes)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


