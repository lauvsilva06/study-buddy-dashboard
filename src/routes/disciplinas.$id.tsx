import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useStudyStore, studyActions, Topic } from "@/lib/study-store";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ListTodo,
  CalendarDays,
  Target,
  CheckCircle2,
  Circle,
} from "lucide-react";

export const Route = createFileRoute("/disciplinas/$id")({
  head: () => ({ meta: [{ title: "Conteúdos da disciplina" }] }),
  component: SubjectDetailPage,
});

// ---------- Inline add-subtask form ----------
function AddSubtaskForm({
  subjectId,
  parentId,
  onClose,
}: {
  subjectId: string;
  parentId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await studyActions.addTopic(subjectId, { title: title.trim(), parentId });
    setTitle("");
    onClose();
  }

  return (
    <form onSubmit={submit} className="mt-2 ml-9 flex gap-2 items-center">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nome da subtarefa…"
        className="h-9 text-sm flex-1"
      />
      <Button type="submit" size="sm" className="h-9 px-3">
        <Plus className="size-3.5 mr-1" /> Adicionar
      </Button>
      <button
        type="button"
        onClick={onClose}
        className="text-xs text-muted-foreground hover:text-foreground px-2"
      >
        Cancelar
      </button>
    </form>
  );
}

// ---------- Recursive topic row ----------
function TopicRow({
  topic,
  subjectId,
  accent,
  depth = 0,
}: {
  topic: Topic;
  subjectId: string;
  accent: string;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const subs = topic.subtasks ?? [];
  const hasSubtasks = subs.length > 0;
  const subsDone = subs.filter((s) => s.done).length;
  const subProgress = hasSubtasks ? Math.round((subsDone / subs.length) * 100) : 0;

  return (
    <div className={depth > 0 ? "ml-6 pl-4 border-l border-dashed border-border/70" : ""}>
      <div
        className={`relative rounded-xl border bg-card/60 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-md group ${
          topic.done ? "opacity-70" : ""
        }`}
        style={{
          borderLeftWidth: depth === 0 ? 3 : 1,
          borderLeftColor: depth === 0 ? accent : undefined,
        }}
      >
        <div className="flex items-start gap-3 p-3.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`mt-0.5 text-muted-foreground hover:text-foreground transition-colors ${
              !hasSubtasks ? "opacity-0 pointer-events-none" : ""
            }`}
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>

          <button
            type="button"
            onClick={() => studyActions.toggleTopic(subjectId, topic.id)}
            className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
            aria-label="Concluído"
          >
            {topic.done ? (
              <CheckCircle2 className="size-5" style={{ color: accent }} />
            ) : (
              <Circle className="size-5 text-muted-foreground" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div
              className={`font-medium text-sm leading-snug ${
                topic.done ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {topic.title}
            </div>
            {topic.notes && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                {topic.notes}
              </p>
            )}
            {hasSubtasks && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 max-w-[120px] rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${subProgress}%`, background: accent }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {subsDone}/{subs.length}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {depth === 0 && (
              <button
                type="button"
                onClick={() => setAddingSubtask((v) => !v)}
                className="text-muted-foreground hover:text-primary p-1.5 rounded-md hover:bg-muted"
                title="Adicionar subtarefa"
              >
                <ListTodo className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => studyActions.removeTopic(subjectId, topic.id)}
              className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-muted"
              aria-label="Remover"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {addingSubtask && (
        <AddSubtaskForm
          subjectId={subjectId}
          parentId={topic.id}
          onClose={() => setAddingSubtask(false)}
        />
      )}

      {expanded && hasSubtasks && (
        <div className="mt-2 flex flex-col gap-2">
          {subs.map((sub) => (
            <TopicRow key={sub.id} topic={sub} subjectId={subjectId} accent={accent} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Page ----------
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
  const total = topics.length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const accent = subject.color;

  const deadlineInfo = (() => {
    if (!subject.deadline) return null;
    const d = new Date(subject.deadline + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((d.getTime() - today.getTime()) / 86400000);
    const label =
      days < 0
        ? `Vencido há ${Math.abs(days)} dia(s)`
        : days === 0
          ? "Vence hoje"
          : `Faltam ${days} dia(s)`;
    const tone =
      days < 0 ? "text-destructive" : days <= 7 ? "text-primary" : "text-muted-foreground";
    return { date: d.toLocaleDateString("pt-BR"), label, tone };
  })();

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await studyActions.addTopic(subject!.id, { title: title.trim(), notes: notes.trim() || undefined });
    setTitle("");
    setNotes("");
  }

  return (
    <AppShell title={subject.name} subtitle="Conteúdos que você precisa estudar">
      <Link
        to="/disciplinas"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" /> Disciplinas
      </Link>

      {/* Hero card */}
      <div
        className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm mb-8 p-6"
      >
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ background: `radial-gradient(circle at 0% 0%, ${accent}, transparent 60%)` }}
        />
        <div className="relative grid gap-5 md:grid-cols-[1fr_280px] items-center">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span
                className="size-3 rounded-full ring-4"
                style={{ background: accent, boxShadow: `0 0 0 4px ${accent}22` }}
              />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Progresso
              </span>
            </div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="font-display text-4xl tabular-nums" style={{ color: accent }}>
                {progress}%
              </span>
              <span className="text-sm text-muted-foreground">
                {done} de {total} conteúdos concluídos
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full transition-all rounded-full"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/40 p-4">
            <Label
              htmlFor="deadline"
              className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
            >
              <Target className="size-3.5" /> Prazo final
            </Label>
            <Input
              id="deadline"
              type="date"
              value={subject.deadline ?? ""}
              onChange={(e) =>
                studyActions.updateSubject(subject.id, { deadline: e.target.value || undefined })
              }
              className="mt-2 h-9"
            />
            {deadlineInfo && (
              <p className={`text-xs mt-2 ${deadlineInfo.tone}`}>
                {deadlineInfo.date} · {deadlineInfo.label}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tasks section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg flex items-center gap-2">
          <ListTodo className="size-5" style={{ color: accent }} /> Tarefas
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {done}/{total}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 mb-8">
        {topics.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
            <CalendarDays className="size-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum conteúdo cadastrado. Adicione sua primeira tarefa abaixo.
            </p>
          </div>
        )}
        {topics.map((t) => (
          <TopicRow key={t.id} topic={t} subjectId={subject.id} accent={accent} />
        ))}
      </div>

      {/* Add topic form */}
      <form
        onSubmit={addTopic}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <h3 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
          <Plus className="size-4" /> Adicionar tarefa
        </h3>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="title">Tópico</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Limites e continuidade"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="notes">Anotações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Capítulos, exercícios, vídeos…"
              className="mt-1.5"
              rows={3}
            />
          </div>
          <Button type="submit" className="justify-self-start">
            <Plus className="size-4 mr-1" /> Adicionar
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
