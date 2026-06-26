import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useStudyStore, studyActions } from "@/lib/study-store";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/disciplinas/$id")({
  head: () => ({ meta: [{ title: "Conteúdos da disciplina" }] }),
  component: SubjectDetailPage,
});

function SubjectDetailPage() {
  const { id } = useParams({ from: "/disciplinas/$id" });
  const subject = useStudyStore((s) => s.subjects.find((x) => x.id === id));
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  if (!subject) {
    return (
      <AppShell title="Disciplina não encontrada">
        <Link to="/disciplinas" className="text-primary underline underline-offset-4">
          Voltar para disciplinas
        </Link>
      </AppShell>
    );
  }

  const topics = subject.topics ?? [];
  const done = topics.filter((t) => t.done).length;
  const progress = topics.length ? Math.round((done / topics.length) * 100) : 0;

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    studyActions.addTopic(subject!.id, { title: title.trim(), notes: notes.trim() || undefined });
    setTitle("");
    setNotes("");
  }

  return (
    <AppShell title={subject.name} subtitle="Conteúdos que você precisa estudar">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/disciplinas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Disciplinas
        </Link>
        <div className="text-sm text-muted-foreground">
          {done}/{topics.length} concluídos · {progress}%
        </div>
      </div>

      <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-6">
        <div className="h-full transition-all" style={{ width: `${progress}%`, background: subject.color }} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-8 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="deadline">Prazo final da disciplina</Label>
          <Input
            id="deadline"
            type="date"
            value={subject.deadline ?? ""}
            onChange={(e) => studyActions.updateSubject(subject.id, { deadline: e.target.value || undefined })}
            className="mt-1.5"
          />
        </div>
        {subject.deadline && (() => {
          const d = new Date(subject.deadline + "T00:00:00");
          const today = new Date(); today.setHours(0,0,0,0);
          const days = Math.round((d.getTime() - today.getTime()) / 86400000);
          const label = days < 0 ? `Vencido há ${Math.abs(days)} dia(s)` : days === 0 ? "Vence hoje" : `Faltam ${days} dia(s)`;
          const tone = days < 0 ? "text-destructive" : days <= 7 ? "text-primary" : "text-muted-foreground";
          return <p className={`text-sm ${tone}`}>{d.toLocaleDateString("pt-BR")} · {label}</p>;
        })()}
      </div>

      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-8">
        <h3 className="font-display text-lg mb-4">Adicionar conteúdo</h3>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="title">Tópico</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Limites e continuidade" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="notes">Anotações (opcional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Capítulos, exercícios, vídeos…" className="mt-1.5" rows={3} />
          </div>
          <Button type="submit" className="justify-self-start">
            <Plus className="size-4 mr-1" /> Adicionar
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {topics.length === 0 && (
          <p className="text-muted-foreground">Nenhum conteúdo cadastrado ainda.</p>
        )}
        {topics.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-start gap-3">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => studyActions.toggleTopic(subject.id, t.id)}
              className="mt-1.5 size-4 accent-primary cursor-pointer"
              aria-label="Concluído"
            />
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>
                {t.title}
              </div>
              {t.notes && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.notes}</p>
              )}
            </div>
            <button
              onClick={() => studyActions.removeTopic(subject.id, t.id)}
              className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-muted"
              aria-label="Remover"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
