import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase";

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
  goalHours?: number;
  topics?: Topic[];
};

export type ScheduleBlock = {
  id: string;
  subjectId: string;
  day: number; // 0=Sunday .. 6=Saturday
  startMinutes: number;
  durationMinutes: number;
};

export type StudySession = {
  id: string;
  subjectId: string;
  startedAt: number;
  durationSeconds: number;
  mode: "focus" | "break";
};

type Store = {
  loaded: boolean;
  userId: string | null;
  subjects: Subject[];
  schedule: ScheduleBlock[];
  sessions: StudySession[];
};

const emptyStore: Store = {
  loaded: false,
  userId: null,
  subjects: [],
  schedule: [],
  sessions: [],
};

let state: Store = emptyStore;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function setState(updater: (s: Store) => Store) {
  state = updater(state);
  emit();
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

// ---------- helpers ----------
function hhmm(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
function parseHHMM(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

// ---------- Loading ----------
async function loadAll(userId: string) {
  const [subjectsRes, topicsRes, scheduleRes, sessionsRes] = await Promise.all([
    supabase.from("subjects").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("topics").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("schedule_items").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("study_sessions").select("*").eq("user_id", userId).order("started_at"),
  ]);

  const topics = (topicsRes.data ?? []) as any[];
  const subjects: Subject[] = (subjectsRes.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    goalHours: s.weekly_hours_target ?? undefined,
    topics: topics
      .filter((t) => t.subject_id === s.id)
      .map((t) => ({ id: t.id, title: t.title, notes: t.notes ?? undefined, done: !!t.done })),
  }));

  const schedule: ScheduleBlock[] = (scheduleRes.data ?? []).map((b: any) => {
    const start = parseHHMM(b.start_time);
    const end = parseHHMM(b.end_time);
    return {
      id: b.id,
      subjectId: b.subject_id,
      day: b.day_of_week,
      startMinutes: start,
      durationMinutes: Math.max(5, end - start),
    };
  });

  const sessions: StudySession[] = (sessionsRes.data ?? []).map((x: any) => ({
    id: x.id,
    subjectId: x.subject_id,
    startedAt: new Date(x.started_at).getTime(),
    durationSeconds: (x.duration_minutes ?? 0) * 60,
    mode: "focus" as const,
  }));

  state = { loaded: true, userId, subjects, schedule, sessions };
  emit();
}

export async function initStudyStore() {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id ?? null;
  if (uid) {
    await loadAll(uid);
  } else {
    state = { ...emptyStore, loaded: true };
    emit();
  }
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    const uid = session?.user?.id ?? null;
    if (event === "SIGNED_OUT" || !uid) {
      state = { ...emptyStore, loaded: true, userId: null };
      emit();
      return;
    }
    if (uid !== state.userId) {
      state = { ...emptyStore, loaded: false, userId: uid };
      emit();
      loadAll(uid);
    }
  });
}

// ---------- Actions ----------
function requireUser(): string {
  if (!state.userId) throw new Error("Not signed in");
  return state.userId;
}

export const studyActions = {
  async addSubject(subject: Omit<Subject, "id">) {
    const uid = requireUser();
    const { data, error } = await supabase
      .from("subjects")
      .insert({
        user_id: uid,
        name: subject.name,
        color: subject.color,
        weekly_hours_target: subject.goalHours ?? null,
      })
      .select()
      .single();
    if (error || !data) return;
    setState((s) => ({
      ...s,
      subjects: [...s.subjects, { id: data.id, name: data.name, color: data.color, goalHours: data.weekly_hours_target ?? undefined, topics: [] }],
    }));
  },

  async updateSubject(id: string, patch: Partial<Subject>) {
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    if (patch.goalHours !== undefined) dbPatch.weekly_hours_target = patch.goalHours;
    await supabase.from("subjects").update(dbPatch).eq("id", id);
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  },

  async removeSubject(id: string) {
    await supabase.from("subjects").delete().eq("id", id);
    setState((s) => ({
      ...s,
      subjects: s.subjects.filter((x) => x.id !== id),
      schedule: s.schedule.filter((b) => b.subjectId !== id),
      sessions: s.sessions.filter((b) => b.subjectId !== id),
    }));
  },

  async addBlock(block: Omit<ScheduleBlock, "id">) {
    const uid = requireUser();
    const { data, error } = await supabase
      .from("schedule_items")
      .insert({
        user_id: uid,
        subject_id: block.subjectId,
        day_of_week: block.day,
        start_time: hhmm(block.startMinutes),
        end_time: hhmm(block.startMinutes + block.durationMinutes),
      })
      .select()
      .single();
    if (error || !data) return;
    setState((s) => ({
      ...s,
      schedule: [...s.schedule, { id: data.id, subjectId: data.subject_id, day: data.day_of_week, startMinutes: block.startMinutes, durationMinutes: block.durationMinutes }],
    }));
  },

  async removeBlock(id: string) {
    await supabase.from("schedule_items").delete().eq("id", id);
    setState((s) => ({ ...s, schedule: s.schedule.filter((b) => b.id !== id) }));
  },

  async addSession(session: Omit<StudySession, "id">) {
    if (session.mode !== "focus") return; // only persist focus
    const uid = requireUser();
    const minutes = Math.max(1, Math.round(session.durationSeconds / 60));
    const started = new Date(session.startedAt).toISOString();
    const ended = new Date(session.startedAt + session.durationSeconds * 1000).toISOString();
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: uid,
        subject_id: session.subjectId,
        started_at: started,
        ended_at: ended,
        duration_minutes: minutes,
      })
      .select()
      .single();
    if (error || !data) return;
    setState((s) => ({
      ...s,
      sessions: [...s.sessions, { id: data.id, subjectId: data.subject_id, startedAt: new Date(data.started_at).getTime(), durationSeconds: minutes * 60, mode: "focus" }],
    }));
  },

  async addTopic(subjectId: string, topic: Omit<Topic, "id" | "done">) {
    const uid = requireUser();
    const { data, error } = await supabase
      .from("topics")
      .insert({ user_id: uid, subject_id: subjectId, title: topic.title, notes: topic.notes ?? null, done: false })
      .select()
      .single();
    if (error || !data) return;
    const newTopic: Topic = { id: data.id, title: data.title, notes: data.notes ?? undefined, done: !!data.done };
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((x) =>
        x.id === subjectId ? { ...x, topics: [...(x.topics ?? []), newTopic] } : x,
      ),
    }));
  },

  async updateTopic(subjectId: string, topicId: string, patch: Partial<Topic>) {
    const dbPatch: any = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes;
    if (patch.done !== undefined) dbPatch.done = patch.done;
    await supabase.from("topics").update(dbPatch).eq("id", topicId);
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((x) =>
        x.id === subjectId
          ? { ...x, topics: (x.topics ?? []).map((t) => (t.id === topicId ? { ...t, ...patch } : t)) }
          : x,
      ),
    }));
  },

  async toggleTopic(subjectId: string, topicId: string) {
    const subj = state.subjects.find((s) => s.id === subjectId);
    const t = subj?.topics?.find((x) => x.id === topicId);
    if (!t) return;
    await studyActions.updateTopic(subjectId, topicId, { done: !t.done });
  },

  async removeTopic(subjectId: string, topicId: string) {
    await supabase.from("topics").delete().eq("id", topicId);
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((x) =>
        x.id === subjectId ? { ...x, topics: (x.topics ?? []).filter((t) => t.id !== topicId) } : x,
      ),
    }));
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
