import { useEffect, useState, useSyncExternalStore } from "react";

export type Topic = {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
};

export type Subject = {
  id: string;
  name: string;
  color: string;
  description?: string;
  goalHours?: number;
  topics?: Topic[];
};

export type ScheduleBlock = {
  id: string;
  subjectId: string;
  day: number; // 0=Sunday .. 6=Saturday
  startMinutes: number; // minutes from 00:00
  durationMinutes: number;
  note?: string;
};

export type StudySession = {
  id: string;
  subjectId: string;
  startedAt: number;
  durationSeconds: number;
  mode: "focus" | "break";
};

type Store = {
  subjects: Subject[];
  schedule: ScheduleBlock[];
  sessions: StudySession[];
};

const STORAGE_KEY = "study-dashboard:v1";

const defaultStore: Store = {
  subjects: [
    { id: "s1", name: "Matemática", color: "#0ea5b7", goalHours: 6 },
    { id: "s2", name: "Português", color: "#e07a5f", goalHours: 4 },
    { id: "s3", name: "História", color: "#81b29a", goalHours: 3 },
  ],
  schedule: [],
  sessions: [],
};

let state: Store = load();
const listeners = new Set<() => void>();

function load(): Store {
  if (typeof window === "undefined") return defaultStore;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore;
    return { ...defaultStore, ...JSON.parse(raw) };
  } catch {
    return defaultStore;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setState(updater: (s: Store) => Store) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useStudyStore<T>(selector: (s: Store) => T): T {
  const getSnap = () => selector(state);
  return useSyncExternalStore(subscribe, getSnap, getSnap);
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export const studyActions = {
  addSubject(subject: Omit<Subject, "id">) {
    setState((s) => ({ ...s, subjects: [...s.subjects, { ...subject, id: crypto.randomUUID() }] }));
  },
  updateSubject(id: string, patch: Partial<Subject>) {
    setState((s) => ({ ...s, subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  },
  removeSubject(id: string) {
    setState((s) => ({
      ...s,
      subjects: s.subjects.filter((x) => x.id !== id),
      schedule: s.schedule.filter((b) => b.subjectId !== id),
      sessions: s.sessions.filter((b) => b.subjectId !== id),
    }));
  },
  addBlock(block: Omit<ScheduleBlock, "id">) {
    setState((s) => ({ ...s, schedule: [...s.schedule, { ...block, id: crypto.randomUUID() }] }));
  },
  removeBlock(id: string) {
    setState((s) => ({ ...s, schedule: s.schedule.filter((b) => b.id !== id) }));
  },
  addSession(session: Omit<StudySession, "id">) {
    setState((s) => ({ ...s, sessions: [...s.sessions, { ...session, id: crypto.randomUUID() }] }));
  },
};

export const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function minutesToHHMM(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

export function hhmmToMinutes(v: string) {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + (m || 0);
}
