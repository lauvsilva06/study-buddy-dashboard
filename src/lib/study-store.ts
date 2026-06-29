import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export type Topic = {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
  parentId?: string;
  subtasks?: Topic[];
};

export type Subject = {
  id: string;
  name: string;
  color: string;
  goalHours?: number;
  deadline?: string; // YYYY-MM-DD
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

export type Activity = {
  id: string;
  subjectId?: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  done: boolean;
};

type Store = {
  loaded: boolean;
  userId: string | null;
  subjects: Subject[];
  schedule: ScheduleBlock[];
  sessions: StudySession[];
  activities: Activity[];
};

const emptyStore: Store = {
  loaded: false,
  userId: null,
  subjects: [],
  schedule: [],
  sessions: [],
  activities: [],
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
  const [subjectsRes, topicsRes, scheduleRes, sessionsRes, activitiesRes] = await Promise.all([
    supabase.from("subjects").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("topics").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("schedule_items").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("study_sessions").select("*").eq("user_id", userId).order("started_at"),
    supabase.from("activities").select("*").eq("user_id", userId).order("due_date"),
  ]);

  const rawTopics = (topicsRes.data ?? []) as any[];

  function buildTopics(subjectId: string, parentId: string | null): Topic[] {
    return rawTopics
      .filter((t) => t.subject_id === subjectId && (t.parent_id ?? null) === parentId)
      .map((t) => ({
        id: t.id,
        title: t.title,
        notes: t.notes ?? undefined,
        done: !!t.done,
        parentId: t.parent_id ?? undefined,
        subtasks: buildTopics(subjectId, t.id),
      }));
  }

  const subjects: Subject[] = (subjectsRes.data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    goalHours: s.weekly_hours_target ?? undefined,
    deadline: s.deadline ?? undefined,
    topics: buildTopics(s.id, null),
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

  const activities: Activity[] = (activitiesRes.data ?? []).map((a: any) => ({
    id: a.id,
    subjectId: a.subject_id ?? undefined,
    title: a.title,
    description: a.description ?? undefined,
    dueDate: a.due_date,
    dueTime: a.due_time ?? undefined,
    done: !!a.done,
  }));

  state = { loaded: true, userId, subjects, schedule, sessions, activities };
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
        deadline: subject.deadline ?? null,
      })
      .select()
      .single();
    if (error || !data) return;
    setState((s) => ({
      ...s,
      subjects: [...s.subjects, { id: data.id, name: data.name, color: data.color, goalHours: data.weekly_hours_target ?? undefined, deadline: data.deadline ?? undefined, topics: [] }],
    }));
  },

  async updateSubject(id: string, patch: Partial<Subject>) {
    const dbPatch: any = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.color !== undefined) dbPatch.color = patch.color;
    if (patch.goalHours !== undefined) dbPatch.weekly_hours_target = patch.goalHours;
    if (patch.deadline !== undefined) dbPatch.deadline = patch.deadline ?? null;
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

  async addTopic(subjectId: string, topic: Omit<Topic, "id" | "done" | "subtasks">) {
    const uid = requireUser();
    const { data, error } = await supabase
      .from("topics")
      .insert({
        user_id: uid,
        subject_id: subjectId,
        title: topic.title,
        notes: topic.notes ?? null,
        done: false,
        parent_id: topic.parentId ?? null,
      })
      .select()
      .single();
    if (error || !data) return;
    const newTopic: Topic = {
      id: data.id,
      title: data.title,
      notes: data.notes ?? undefined,
      done: !!data.done,
      parentId: data.parent_id ?? undefined,
      subtasks: [],
    };
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((x) => {
        if (x.id !== subjectId) return x;
        if (!newTopic.parentId) {
          return { ...x, topics: [...(x.topics ?? []), newTopic] };
        }
        // Add as subtask to parent
        function addSubtask(topics: Topic[]): Topic[] {
          return topics.map((t) =>
            t.id === newTopic.parentId
              ? { ...t, subtasks: [...(t.subtasks ?? []), newTopic] }
              : { ...t, subtasks: addSubtask(t.subtasks ?? []) },
          );
        }
        return { ...x, topics: addSubtask(x.topics ?? []) };
      }),
    }));
  },

  async updateTopic(subjectId: string, topicId: string, patch: Partial<Topic>) {
    const dbPatch: any = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes;
    if (patch.done !== undefined) dbPatch.done = patch.done;
    await supabase.from("topics").update(dbPatch).eq("id", topicId);
    function applyPatch(topics: Topic[]): Topic[] {
      return topics.map((t) =>
        t.id === topicId
          ? { ...t, ...patch }
          : { ...t, subtasks: applyPatch(t.subtasks ?? []) },
      );
    }
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((x) =>
        x.id === subjectId ? { ...x, topics: applyPatch(x.topics ?? []) } : x,
      ),
    }));
  },

  async toggleTopic(subjectId: string, topicId: string) {
    function findTopic(topics: Topic[]): Topic | undefined {
      for (const t of topics) {
        if (t.id === topicId) return t;
        const found = findTopic(t.subtasks ?? []);
        if (found) return found;
      }
    }
    const subj = state.subjects.find((s) => s.id === subjectId);
    const t = findTopic(subj?.topics ?? []);
    if (!t) return;
    await studyActions.updateTopic(subjectId, topicId, { done: !t.done });
  },

  async removeTopic(subjectId: string, topicId: string) {
    await supabase.from("topics").delete().eq("id", topicId);
    function filterOut(topics: Topic[]): Topic[] {
      return topics
        .filter((t) => t.id !== topicId)
        .map((t) => ({ ...t, subtasks: filterOut(t.subtasks ?? []) }));
    }
    setState((s) => ({
      ...s,
      subjects: s.subjects.map((x) =>
        x.id === subjectId ? { ...x, topics: filterOut(x.topics ?? []) } : x,
      ),
    }));
  },

  async addActivity(activity: Omit<Activity, "id" | "done">) {
    const uid = requireUser();
    const { data, error } = await supabase
      .from("activities")
      .insert({
        user_id: uid,
        subject_id: activity.subjectId ?? null,
        title: activity.title,
        description: activity.description ?? null,
        due_date: activity.dueDate,
        due_time: activity.dueTime ?? null,
        done: false,
      })
      .select()
      .single();
    if (error || !data) return;
    setState((s) => ({
      ...s,
      activities: [
        ...s.activities,
        {
          id: data.id,
          subjectId: data.subject_id ?? undefined,
          title: data.title,
          description: data.description ?? undefined,
          dueDate: data.due_date,
          dueTime: data.due_time ?? undefined,
          done: !!data.done,
        },
      ],
    }));
  },

  async updateActivity(id: string, patch: Partial<Activity>) {
    const dbPatch: any = {};
    if (patch.subjectId !== undefined) dbPatch.subject_id = patch.subjectId ?? null;
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.description !== undefined) dbPatch.description = patch.description ?? null;
    if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
    if (patch.dueTime !== undefined) dbPatch.due_time = patch.dueTime ?? null;
    if (patch.done !== undefined) dbPatch.done = patch.done;
    await supabase.from("activities").update(dbPatch).eq("id", id);
    setState((s) => ({
      ...s,
      activities: s.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  },

  async toggleActivity(id: string) {
    const a = state.activities.find((x) => x.id === id);
    if (!a) return;
    await studyActions.updateActivity(id, { done: !a.done });
  },

  async removeActivity(id: string) {
    await supabase.from("activities").delete().eq("id", id);
    setState((s) => ({ ...s, activities: s.activities.filter((a) => a.id !== id) }));
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
