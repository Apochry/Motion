import type { PlannerState } from './types';

const STORAGE_KEY = 'motionx_planner_state_v1';

export function loadState(): PlannerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlannerState;
  } catch {
    return null;
  }
}

export function saveState(state: PlannerState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}


