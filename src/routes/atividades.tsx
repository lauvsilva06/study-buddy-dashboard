import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStudyStore, useHydrated, studyActions } from "@/lib/study-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Plus, Trash2, AlertCircle, CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/atividades")({
  head: () => ({
    meta: [
      { title: "Atividades & Prazos" },
      { name: "description", content: "Cadastre atividades com prazo e associe a uma disciplina." },
    ],
  }),
  component: Atividades,
});

function Atividades() {
  const hydrated = useHydrated();
  const activities = useStudyStore((s) => s.activities);
  const subjects = useStudyStore((s) => s.subjects);

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    studyActions.addActivity({
      title: title.trim(),
      subjectId: subjectId || undefined,
      dueDate,
      dueTime: dueTime || undefined,
      description: description.trim() || undefined,
    });
    setTitle("");
    setSubjectId("");
    setDueDate("");
    setDueTime("");
    setDescription("");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = useMemo(() => {
    const list = activities
      .filter((a) => (filter === "all" ? true : filter === "done" ? a.done : !a.done))
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return list;
  }, [activities, filter]);

  return (
    <AppShell title="Atividades" subtitle="Organize prazos e associe cada atividade a uma disciplina.">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-6 grid gap-4"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Atividade</Label>
            <Input
              id="title"
              placeholder="Ex.: Entregar trabalho de Cálculo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="subject">Disciplina</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="subject" className="w-full">
                <SelectValue placeholder="— Sem disciplina —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Sem disciplina —</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="date">Prazo</Label>
            <Input
              id="date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="time">Horário (opcional)</Label>
            <Input id="time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="desc">Observações</Label>
          <Input
            id="desc"
            placeholder="Detalhes ou link da atividade"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 w-fit"
        >
          <Plus className="size-4" /> Adicionar atividade
        </button>
      </form>

      <div className="flex items-center gap-2 mb-4">
        {(["pending", "done", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {f === "pending" ? "Pendentes" : f === "done" ? "Concluídas" : "Todas"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {!hydrated ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarDays className="size-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade nesta lista.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((a) => {
              const subj = subjects.find((s) => s.id === a.subjectId);
              const date = new Date(a.dueDate + "T00:00:00");
              const days = Math.round((date.getTime() - today.getTime()) / 86400000);
              const overdue = !a.done && days < 0;
              const soon = !a.done && days >= 0 && days <= 3;
              const tone = a.done
                ? "text-muted-foreground"
                : overdue
                  ? "text-destructive"
                  : soon
                    ? "text-primary"
                    : "text-muted-foreground";
              const label = a.done
                ? "Concluída"
                : overdue
                  ? `Vencido há ${Math.abs(days)}d`
                  : days === 0
                    ? "Vence hoje"
                    : `Faltam ${days}d`;
              const monthShort = date
                .toLocaleDateString("pt-BR", { month: "short" })
                .replace(".", "")
                .toUpperCase();
              return (
                <li key={a.id} className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => studyActions.toggleActivity(a.id)}
                    className="shrink-0 text-primary"
                    aria-label="Alternar concluída"
                  >
                    {a.done ? <CheckCircle2 className="size-5" /> : <Circle className="size-5 text-muted-foreground" />}
                  </button>
                  <div
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border border-border bg-background/60 shrink-0"
                    style={{ borderColor: subj ? `${subj.color}55` : undefined }}
                  >
                    <span
                      className="text-[10px] font-semibold tracking-wider"
                      style={{ color: subj?.color }}
                    >
                      {monthShort}
                    </span>
                    <span className="font-display text-xl leading-none tabular-nums">
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${a.done ? "line-through text-muted-foreground" : ""}`}>
                      {a.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      {subj && (
                        <span className="inline-flex items-center gap-1">
                          <span className="size-2 rounded-full" style={{ background: subj.color }} />
                          {subj.name}
                        </span>
                      )}
                      <span>
                        {date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                        {a.dueTime ? ` · ${a.dueTime}` : ""}
                      </span>
                      {a.description && <span className="truncate">— {a.description}</span>}
                    </div>
                  </div>
                  <div className={`text-xs font-medium flex items-center gap-1 ${tone}`}>
                    {overdue && <AlertCircle className="size-3.5" />}
                    {label}
                  </div>
                  <button
                    onClick={() => studyActions.removeActivity(a.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Remover"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
