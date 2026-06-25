import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudyStore, useHydrated, studyActions } from "@/lib/study-store";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

export const Route = createFileRoute("/metricas")({
  head: () => ({ meta: [{ title: "Métricas & Pomodoro" }, { name: "description", content: "Pomodoro e métricas de estudo." }] }),
  component: MetricsPage,
});

const FOCUS_DEFAULT = 25 * 60;
const BREAK_DEFAULT = 5 * 60;

function MetricsPage() {
  const subjects = useStudyStore((s) => s.subjects);
  const sessions = useStudyStore((s) => s.sessions);
  const hydrated = useHydrated();

  const [subjectId, setSubjectId] = useState("");
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [focusLen, setFocusLen] = useState(FOCUS_DEFAULT);
  const [breakLen, setBreakLen] = useState(BREAK_DEFAULT);
  const [remaining, setRemaining] = useState(FOCUS_DEFAULT);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    setRemaining(mode === "focus" ? focusLen : breakLen);
    elapsedRef.current = 0;
    startedAtRef.current = null;
    setRunning(false);
  }, [mode, focusLen, breakLen]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          finishSession(mode === "focus" ? focusLen : breakLen);
          return 0;
        }
        return r - 1;
      });
      elapsedRef.current += 1;
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode, focusLen, breakLen]);

  function finishSession(totalSeconds: number) {
    setRunning(false);
    if (mode === "focus" && subjectId) {
      studyActions.addSession({
        subjectId,
        startedAt: startedAtRef.current ?? Date.now() - totalSeconds * 1000,
        durationSeconds: totalSeconds,
        mode: "focus",
      });
    }
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(mode === "focus" ? "Foco concluído!" : "Pausa terminada");
    }
    setMode(mode === "focus" ? "break" : "focus");
  }

  function toggle() {
    if (mode === "focus" && !subjectId) return;
    if (!running) {
      if (startedAtRef.current === null) startedAtRef.current = Date.now();
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setRemaining(mode === "focus" ? focusLen : breakLen);
    elapsedRef.current = 0;
    startedAtRef.current = null;
  }

  function skip() {
    // record partial focus if running
    if (mode === "focus" && subjectId && elapsedRef.current > 10) {
      studyActions.addSession({
        subjectId,
        startedAt: startedAtRef.current ?? Date.now() - elapsedRef.current * 1000,
        durationSeconds: elapsedRef.current,
        mode: "focus",
      });
    }
    setRunning(false);
    setMode(mode === "focus" ? "break" : "focus");
  }

  const total = mode === "focus" ? focusLen : breakLen;
  const progress = 1 - remaining / total;
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  // Metrics
  const byDay = useMemo(() => buildLastNDays(sessions, 7), [sessions]);
  const bySubject = useMemo(() => buildBySubject(sessions, subjects), [sessions, subjects]);
  const totalFocusSec = sessions.filter((s) => s.mode === "focus").reduce((a, b) => a + b.durationSeconds, 0);

  return (
    <AppShell title="Métricas & Pomodoro" subtitle="Cronometre o foco por disciplina e acompanhe o progresso.">
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 mb-8">
        {/* Pomodoro */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="inline-flex rounded-full bg-muted p-1">
              <button
                onClick={() => setMode("focus")}
                className={`px-4 py-1.5 text-sm rounded-full transition ${mode === "focus" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                Foco
              </button>
              <button
                onClick={() => setMode("break")}
                className={`px-4 py-1.5 text-sm rounded-full transition ${mode === "break" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                Pausa
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Foco {focusLen / 60}min · Pausa {breakLen / 60}min
            </div>
          </div>

          <div className="relative grid place-items-center my-4">
            <svg viewBox="0 0 200 200" className="size-64 -rotate-90">
              <circle cx="100" cy="100" r="90" stroke="var(--muted)" strokeWidth="10" fill="none" />
              <circle
                cx="100" cy="100" r="90"
                stroke={selectedSubject?.color ?? "var(--primary)"}
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 90}
                strokeDashoffset={2 * Math.PI * 90 * (1 - progress)}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="font-display text-5xl tabular-nums">{fmt(remaining)}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                  {mode === "focus" ? "Em foco" : "Pausa"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Label className="mb-1.5 block">Disciplina em estudo</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Escolher disciplina..." /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mode === "focus" && !subjectId && (
              <p className="text-xs text-muted-foreground mt-2">Selecione uma disciplina para iniciar o foco.</p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={reset} aria-label="Reiniciar"><RotateCcw className="size-4" /></Button>
            <Button onClick={toggle} disabled={mode === "focus" && !subjectId} size="lg" className="rounded-full px-8">
              {running ? <><Pause className="size-4 mr-2" /> Pausar</> : <><Play className="size-4 mr-2" /> Iniciar</>}
            </Button>
            <Button variant="outline" size="icon" onClick={skip} aria-label="Pular"><SkipForward className="size-4" /></Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <DurationControl label="Foco (min)" value={focusLen / 60} onChange={(v) => setFocusLen(v * 60)} />
            <DurationControl label="Pausa (min)" value={breakLen / 60} onChange={(v) => setBreakLen(v * 60)} />
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-display text-xl mb-1">Sua semana</h3>
          <p className="text-sm text-muted-foreground mb-6">Últimos 7 dias de foco.</p>

          <div className="flex items-end gap-2 h-44">
            {byDay.map((d) => {
              const max = Math.max(...byDay.map((x) => x.seconds), 60);
              const h = Math.max(4, (d.seconds / max) * 100);
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs text-muted-foreground tabular-nums">{fmtShort(d.seconds)}</div>
                  <div
                    className="w-full rounded-t-md bg-primary/80"
                    style={{ height: `${h}%`, minHeight: 4 }}
                  />
                  <div className="text-xs text-muted-foreground">{d.label}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-baseline justify-between mb-3">
              <h4 className="font-display text-lg">Por disciplina</h4>
              <span className="text-sm text-muted-foreground">Total: {fmtShort(totalFocusSec)}</span>
            </div>
            {hydrated && bySubject.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma sessão de foco registrada ainda.</p>
            )}
            <ul className="space-y-3">
              {bySubject.map((s) => {
                const pct = totalFocusSec ? Math.round((s.seconds / totalFocusSec) * 100) : 0;
                return (
                  <li key={s.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                      <span className="text-muted-foreground tabular-nums">{fmtShort(s.seconds)} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DurationControl({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 flex items-center justify-between">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(1, value - 5))} className="size-7 rounded-md bg-card border border-border text-sm">−</button>
        <span className="tabular-nums font-medium w-8 text-center">{value}</span>
        <button onClick={() => onChange(value + 5)} className="size-7 rounded-md bg-card border border-border text-sm">+</button>
      </div>
    </div>
  );
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function fmtShort(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m ? ` ${m}m` : ""}`;
  return `${m}m`;
}

function buildLastNDays(sessions: { startedAt: number; durationSeconds: number; mode: string }[], n: number) {
  const out: { label: string; seconds: number; date: string }[] = [];
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const seconds = sessions
      .filter((s) => s.mode === "focus" && new Date(s.startedAt).toDateString() === key)
      .reduce((a, b) => a + b.durationSeconds, 0);
    out.push({ label: labels[d.getDay()], date: key, seconds });
  }
  return out;
}

function buildBySubject(
  sessions: { subjectId: string; durationSeconds: number; mode: string }[],
  subjects: { id: string; name: string; color: string }[],
) {
  return subjects
    .map((s) => ({
      ...s,
      seconds: sessions
        .filter((x) => x.mode === "focus" && x.subjectId === s.id)
        .reduce((a, b) => a + b.durationSeconds, 0),
    }))
    .filter((s) => s.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}
