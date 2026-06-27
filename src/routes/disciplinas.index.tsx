import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudyStore, useHydrated, studyActions } from "@/lib/study-store";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/disciplinas/")({
  head: () => ({ meta: [{ title: "Disciplinas" }, { name: "description", content: "Gerencie suas disciplinas." }] }),
  component: SubjectsPage,
});

const PALETTE = ["#93c5fd", "#86efac", "#fca5a5", "#fdba74", "#d8b4fe", "#f9a8d4", "#fde68a", "#a5f3fc"];

function SubjectsPage() {
  const subjects = useStudyStore((s) => s.subjects);
  const hydrated = useHydrated();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    studyActions.addSubject({ name: name.trim(), color, goalHours: goal ? Number(goal) : undefined, deadline: deadline || undefined });
    setName("");
    setGoal("");
    setDeadline("");
  }

  return (
    <AppShell title="Disciplinas" subtitle="O que você precisa estudar.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {hydrated && subjects.length === 0 && (
          <p className="text-muted-foreground col-span-full">Nenhuma disciplina ainda.</p>
        )}
        {subjects.map((s) => {
          const total = s.topics?.length ?? 0;
          const done = s.topics?.filter((t) => t.done).length ?? 0;
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: s.color }} />
              <div className="flex items-start justify-between gap-2">
                <Link to="/disciplinas/$id" params={{ id: s.id }} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="size-3 rounded-full shrink-0" style={{ background: s.color }} />
                    <h4 className="font-display text-xl hover:underline underline-offset-4">{s.name}</h4>
                  </div>
                  {s.goalHours ? (
                    <p className="text-sm text-muted-foreground mt-1">Meta: {s.goalHours}h / semana</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Sem meta definida</p>
                  )}
                  {s.deadline && (() => {
                    const d = new Date(s.deadline + "T00:00:00");
                    const today = new Date(); today.setHours(0,0,0,0);
                    const days = Math.round((d.getTime() - today.getTime()) / 86400000);
                    const formatted = d.toLocaleDateString("pt-BR");
                    const label = days < 0 ? `Vencido há ${Math.abs(days)}d` : days === 0 ? "Vence hoje" : `Faltam ${days}d`;
                    const tone = days < 0 ? "text-destructive" : days <= 7 ? "text-primary" : "text-muted-foreground";
                    return <p className={`text-sm mt-1 ${tone}`}>Prazo: {formatted} · {label}</p>;
                  })()}
                  <p className="text-xs text-muted-foreground mt-2">
                    {total === 0 ? "Sem conteúdos cadastrados" : `${done}/${total} conteúdos concluídos`}
                  </p>
                </Link>
                <button
                  onClick={() => studyActions.removeSubject(s.id)}
                  className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-muted"
                  aria-label="Remover"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-display text-lg mb-4">Adicionar disciplina</h3>
        <div className="grid md:grid-cols-[1fr_140px_180px_auto] gap-3 items-end">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cálculo I" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="goal">Meta (h/sem)</Label>
            <Input id="goal" type="number" min="0" value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="deadline">Prazo final</Label>
            <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" className="md:w-auto"><Plus className="size-4 mr-1" /> Adicionar</Button>
        </div>

        <div className="mt-5">
          <Label className="block mb-3">Cor da disciplina</Label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={c}
                className={`size-8 rounded-full border-2 transition-all hover:scale-110 ${
                  color === c
                    ? "border-foreground scale-110 ring-2 ring-offset-1 ring-foreground/30"
                    : "border-transparent"
                }`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </form>
    </AppShell>
  );
}
