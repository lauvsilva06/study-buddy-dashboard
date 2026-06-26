import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useStudyStore, studyActions, Topic } from "@/lib/study-store";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, ListTodo } from "lucide-react";

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
    <form onSubmit={submit} className="mt-2 ml-7 flex gap-2 items-center">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nome da subtarefa…"
        className="h-8 text-sm flex-1"
      />
      <Button type="submit" size="sm" className="h-8 px-3">
        <Plus className="size-3.5 mr-1" /> Adicionar
      </Button>
      <button
        type="button"
        onClick={onClose}
        className="text-xs text-muted-foreground hover:text-foreground px-1"
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
  depth = 0,
}: {
  topic: Topic;
  subjectId: string;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const hasSubtasks = (topic.subtasks ?? []).length > 0;

  return (
    <div className={depth > 0 ? "ml-6 border-l border-border pl-3" : ""}>
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex items-start gap-2 group">
        {/* expand/collapse toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`mt-0.5 text-muted-foreground hover:text-foreground transition-colors ${!hasSubtasks ? "opacity-0 pointer-events-none" : ""}`}
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        <input
          type="checkbox"
          checked={topic.done}
          onChange={() => studyActions.toggleTopic(subjectId, topic.id)}
          className="mt-1 size-4 accent-primary cursor-pointer flex-shrink-0"
          aria-label="Concluído"
        />

        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm ${topic.done ? "line-through text-muted-foreground" : ""}`}>
            {topic.title}
          </div>
          {topic.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{topic.notes}</p>
          )}
          {hasSubtasks && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {(topic.subtasks ?? []).filter((s) => s.done).length}/{(topic.subtasks ?? []).length} subtarefas
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {depth === 0 && (
            <button
              type="button"
              onClick={() => setAddingSubtask((v) => !v)}
              className="text-muted-foreground hover:text-primary p-1.5 rounded-md hover:bg-muted"
              aria-label="Adicionar subtarefa"
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

      {addingSubtask && (
        <AddSubtaskForm
          subjectId={subjectId}
          parentId={topic.id}
          onClose={() => setAddingSubtask(false)}
        />
      )}

      {expanded && hasSubtasks && (
        <div className="mt-2 flex flex-col gap-2">
          {(topic.subtasks ?? []).map((sub) => (
            <TopicRow key={sub.id} topic={sub} subjectId={subjectId} depth={depth + 1} />
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

  // Flatten recursively to count done/total
  const done = topics.filter((t) => t.done).length;
  const total = topics.length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await studyActions.addTopic(subject!.id, { title: title.trim(), notes: notes.trim() || undefined });
    setTitle("");
    setNotes("");
  }

  return (
    <AppShell title={subject.name} subtitle="Conteúdos que você precisa estudar">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          to="/disciplinas"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Disciplinas
        </Link>
        <div className="text-sm text-muted-foreground">
          {done}/{total} concluídos · {progress}%
        </div>
      </div>

      <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-6">
        <div
          className="h-full transition-all"
          style={{ width: `${progress}%`, background: subject.color }}
        />
      </div>

      {/* Deadline */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-8 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="deadline">Prazo final da disciplina</Label>
          <Input
            id="deadline"
            type="date"
            value={subject.deadline ?? ""}
            onChange={(e) =>
              studyActions.updateSubject(subject.id, { deadline: e.target.value || undefined })
            }
            className="mt-1.5"
          />
        </div>
        {subject.deadline &&
          (() => {
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
            return (
              <p className={`text-sm ${tone}`}>
                {d.toLocaleDateString("pt-BR")} · {label}
              </p>
            );
          })()}
      </div>

      {/* Topic list */}
      <div className="flex flex-col gap-3 mb-6">
        {topics.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum conteúdo cadastrado ainda.</p>
        )}
        {topics.map((t) => (
          <TopicRow key={t.id} topic={t} subjectId={subject.id} />
        ))}
      </div>

      {/* Add topic form — below the list */}
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
