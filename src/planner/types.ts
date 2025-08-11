export type ISODateString = string;

export type WorkingHours = {
  startMinutes: number;
  endMinutes: number;
};

export type FixedEvent = {
  id: string;
  title: string;
  date: ISODateString;
  startMinutes: number;
  endMinutes: number;
  color: string;
  completed?: boolean;
};

export type Task = {
  id: string;
  title: string;
  durationMinutes: number;
  dueDate: ISODateString;
  priority: number; // 1..4
  canSplit: boolean;
  color: string;
  completed?: boolean;
};

export type ScheduledBlock = {
  id: string;
  source: { type: 'task'; taskId: string } | { type: 'event'; eventId: string };
  title: string;
  date: ISODateString;
  startMinutes: number;
  endMinutes: number;
  color: string;
  fixed: boolean;
  completed?: boolean;
};

export type PlannerState = {
  workingHours: WorkingHours;
  fixedEvents: FixedEvent[];
  tasks: Task[];
  scheduled: ScheduledBlock[];
  weekStartISO: ISODateString;
};


