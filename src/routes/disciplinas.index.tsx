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

const PALETTE = ["#0ea5b7", "#e07a5f", "#81b29a", "#f4a261", "#9d8df1", "#3d5a80", "#e76f51", "#2a9d8f"];

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
      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-8">
        <h3 className="font-display text-lg mb-4">Adicionar disciplina</h3>
        <div className="grid md:grid-cols-[1fr_140px_auto] gap-3 items-end">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Cálculo I" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="goal">Meta (h/sem)</Label>
            <Input id="goal" type="number" min="0" value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-1.5" />
          </div>
          <Button type="submit" className="md:w-auto"><Plus className="size-4 mr-1" /> Adicionar</Button>
        </div>
        <div className="mt-4">
          <Label className="mb-2 block">Cor</Label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-8 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Link
                  to="/disciplinas/$id"
                  params={{ id: s.id }}
                  className="flex-1 min-w-0"
                >
                  <h4 className="font-display text-xl hover:underline underline-offset-4">{s.name}</h4>
                  {s.goalHours ? (
                    <p className="text-sm text-muted-foreground mt-1">Meta: {s.goalHours}h / semana</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Sem meta definida</p>
                  )}
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
    </AppShell>
  );
}
