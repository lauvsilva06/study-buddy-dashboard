import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudyStore, useHydrated, studyActions } from "@/lib/study-store";
import { Trash2, Plus, Pipette } from "lucide-react";

export const Route = createFileRoute("/disciplinas/")({
  head: () => ({ meta: [{ title: "Disciplinas" }, { name: "description", content: "Gerencie suas disciplinas." }] }),
  component: SubjectsPage,
});

const PALETTE: { label: string; colors: string[] }[] = [
  {
    label: "Azuis",
    colors: ["#0ea5e9", "#38bdf8", "#0284c7", "#0369a1", "#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd"],
  },
  {
    label: "Verdes",
    colors: ["#22c55e", "#4ade80", "#16a34a", "#15803d", "#2a9d8f", "#81b29a", "#10b981", "#34d399"],
  },
  {
    label: "Vermelhos & Laranjas",
    colors: ["#ef4444", "#f87171", "#dc2626", "#e76f51", "#e07a5f", "#f97316", "#fb923c", "#f4a261"],
  },
  {
    label: "Roxos & Rosas",
    colors: ["#a855f7", "#c084fc", "#9333ea", "#7c3aed", "#9d8df1", "#6366f1", "#ec4899", "#f472b6"],
  },
  {
    label: "Neutros",
    colors: ["#3d5a80", "#64748b", "#475569", "#334155", "#6b7280", "#9ca3af", "#78716c", "#57534e"],
  },
  {
    label: "Especiais",
    colors: ["#f59e0b", "#fbbf24", "#eab308", "#84cc16", "#14b8a6", "#06b6d4", "#d97706", "#b45309"],
  },
];

function SubjectsPage() {
  const subjects = useStudyStore((s) => s.subjects);
  const hydrated = useHydrated();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0].colors[0]);
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [customColor, setCustomColor] = useState("#0ea5e9");
  const [useCustom, setUseCustom] = useState(false);

  function handleCustomColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCustomColor(e.target.value);
    setColor(e.target.value);
    setUseCustom(true);
  }

  function handlePaletteSelect(c: string) {
    setColor(c);
    setUseCustom(false);
  }

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

        {/* Color picker */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <Label className="block">Cor da disciplina</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cor selecionada:</span>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full text-white"
                style={{ background: color }}
              >
                {color}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {PALETTE.map((group) => (
              <div key={group.label}>
                <p className="text-xs text-muted-foreground mb-1.5">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handlePaletteSelect(c)}
                      title={c}
                      className={`size-7 rounded-full border-2 transition-all hover:scale-110 ${
                        color === c && !useCustom
                          ? "border-foreground scale-110 ring-2 ring-offset-1 ring-foreground/30"
                          : "border-transparent"
                      }`}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Custom color input */}
          <div className="mt-4 flex items-center gap-3">
            <Pipette className="size-4 text-muted-foreground shrink-0" />
            <Label htmlFor="customColor" className="text-sm text-muted-foreground whitespace-nowrap">
              Cor personalizada:
            </Label>
            <div className="flex items-center gap-2">
              <input
                id="customColor"
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className={`size-8 rounded-full cursor-pointer border-2 transition-all hover:scale-110 ${
                  useCustom ? "border-foreground ring-2 ring-offset-1 ring-foreground/30" : "border-border"
                }`}
                style={{ padding: "1px", background: "transparent" }}
              />
              <Input
                value={customColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomColor(val);
                  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                    setColor(val);
                    setUseCustom(true);
                  }
                }}
                placeholder="#000000"
                className="w-28 font-mono text-sm"
              />
            </div>
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
    </AppShell>
  );
}
