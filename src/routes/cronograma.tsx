import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudyStore, useHydrated, studyActions, DAYS, minutesToHHMM, hhmmToMinutes } from "@/lib/study-store";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/cronograma")({
  head: () => ({ meta: [{ title: "Cronograma" }, { name: "description", content: "Cronograma semanal de estudos." }] }),
  component: SchedulePage,
});

function SchedulePage() {
  const subjects = useStudyStore((s) => s.subjects);
  const schedule = useStudyStore((s) => s.schedule);
  const hydrated = useHydrated();

  const [subjectId, setSubjectId] = useState("");
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("08:00");
  const [duration, setDuration] = useState("60");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) return;
    studyActions.addBlock({
      subjectId,
      day: Number(day),
      startMinutes: hhmmToMinutes(start),
      durationMinutes: Number(duration),
    });
  }

  return (
    <AppShell title="Cronograma" subtitle="Sua semana de estudo organizada.">
      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-8">
        <h3 className="font-display text-lg mb-4">Novo bloco de estudo</h3>
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <Label className="mb-1.5 block">Disciplina</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Escolher..." /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Dia</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="start" className="mb-1.5 block">Início</Label>
            <Input id="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <Label htmlFor="dur" className="mb-1.5 block">Duração (min)</Label>
              <Input id="dur" type="number" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <Button type="submit" className="self-end"><Plus className="size-4" /></Button>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {DAYS.map((d, i) => {
          const blocks = hydrated
            ? schedule.filter((b) => b.day === i).sort((a, b) => a.startMinutes - b.startMinutes)
            : [];
          return (
            <div key={i} className="rounded-2xl border border-border bg-card p-3 shadow-sm min-h-40">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">{d}</div>
              <div className="space-y-2">
                {blocks.length === 0 && <div className="text-xs text-muted-foreground/60 px-1">livre</div>}
                {blocks.map((b) => {
                  const subj = subjects.find((s) => s.id === b.subjectId);
                  return (
                    <div
                      key={b.id}
                      className="group rounded-lg p-2.5 text-xs relative"
                      style={{ background: (subj?.color ?? "#999") + "22", borderLeft: `3px solid ${subj?.color ?? "#999"}` }}
                    >
                      <div className="font-medium text-foreground">{subj?.name ?? "—"}</div>
                      <div className="text-muted-foreground mt-0.5">
                        {minutesToHHMM(b.startMinutes)} · {b.durationMinutes}min
                      </div>
                      <button
                        onClick={() => studyActions.removeBlock(b.id)}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        aria-label="Remover"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
