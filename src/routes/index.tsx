import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStudyStore, useHydrated } from "@/lib/study-store";
import { ArrowRight, BookOpen, CalendarDays, Timer, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Estudos" },
      { name: "description", content: "Acompanhe disciplinas, cronograma e tempo de estudo." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const hydrated = useHydrated();
  const subjects = useStudyStore((s) => s.subjects);
  const sessions = useStudyStore((s) => s.sessions);
  const schedule = useStudyStore((s) => s.schedule);

  const todayDay = new Date().getDay();
  const totalSecondsToday = sessions
    .filter((s) => s.mode === "focus" && new Date(s.startedAt).toDateString() === new Date().toDateString())
    .reduce((a, b) => a + b.durationSeconds, 0);
  const totalSecondsAll = sessions.filter((s) => s.mode === "focus").reduce((a, b) => a + b.durationSeconds, 0);
  const todayBlocks = schedule.filter((b) => b.day === todayDay);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlines = subjects
    .filter((s) => s.deadline)
    .map((s) => {
      const d = new Date(s.deadline! + "T00:00:00");
      const days = Math.round((d.getTime() - today.getTime()) / 86400000);
      return { subject: s, date: d, days };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <AppShell title="Bom estudo!" subtitle="Resumo do seu dia e atalhos rápidos.">
      <div className="grid gap-4 md:grid-cols-3 mb-10">
        <StatCard label="Disciplinas ativas" value={hydrated ? subjects.length : "—"} icon={<BookOpen className="size-5" />} />
        <StatCard
          label="Estudado hoje"
          value={hydrated ? formatHM(totalSecondsToday) : "—"}
          icon={<Timer className="size-5" />}
        />
        <StatCard
          label="Total acumulado"
          value={hydrated ? formatHM(totalSecondsAll) : "—"}
          icon={<CalendarDays className="size-5" />}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card title="Próximas atividades de hoje" to="/cronograma" linkLabel="Ver cronograma">
          {hydrated && todayBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada agendado para hoje.</p>
          ) : (
            <ul className="space-y-2">
              {todayBlocks.slice(0, 4).map((b) => {
                const subj = subjects.find((s) => s.id === b.subjectId);
                return (
                  <li key={b.id} className="flex items-center gap-3 text-sm">
                    <span className="size-2.5 rounded-full" style={{ background: subj?.color ?? "#999" }} />
                    <span className="font-medium">{subj?.name ?? "—"}</span>
                    <span className="text-muted-foreground ml-auto">{b.durationMinutes} min</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Disciplinas" to="/disciplinas" linkLabel="Gerenciar">
          {hydrated && subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não tem disciplinas.</p>
          ) : (
            <ul className="space-y-2">
              {subjects.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                  <span>{s.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Deadlines calendar */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" /> Calendário de prazos
          </h3>
          <Link to="/disciplinas" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
            Gerenciar <ArrowRight className="size-3" />
          </Link>
        </div>

        {!hydrated ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : deadlines.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <CalendarDays className="size-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma disciplina com prazo definido.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {deadlines.map(({ subject, date, days }) => {
              const overdue = days < 0;
              const soon = days >= 0 && days <= 7;
              const tone = overdue
                ? "text-destructive"
                : soon
                  ? "text-primary"
                  : "text-muted-foreground";
              const label = overdue
                ? `Vencido há ${Math.abs(days)}d`
                : days === 0
                  ? "Vence hoje"
                  : `Faltam ${days}d`;
              const monthShort = date
                .toLocaleDateString("pt-BR", { month: "short" })
                .replace(".", "")
                .toUpperCase();
              return (
                <li key={subject.id}>
                  <Link
                    to="/disciplinas/$id"
                    params={{ id: subject.id }}
                    className="flex items-center gap-4 py-3 group"
                  >
                    <div
                      className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border border-border bg-background/60 flex-shrink-0"
                      style={{ borderColor: `${subject.color}55` }}
                    >
                      <span
                        className="text-[10px] font-semibold tracking-wider"
                        style={{ color: subject.color }}
                      >
                        {monthShort}
                      </span>
                      <span className="font-display text-xl leading-none tabular-nums">
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full flex-shrink-0"
                          style={{ background: subject.color }}
                        />
                        <span className="font-medium text-sm group-hover:underline underline-offset-4 truncate">
                          {subject.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {date.toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className={`text-xs font-medium flex items-center gap-1 ${tone}`}>
                      {overdue && <AlertCircle className="size-3.5" />}
                      {label}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary to-primary-glow" />
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-display text-3xl text-foreground">{value}</div>
    </div>
  );
}

function Card({ title, to, linkLabel, children }: { title: string; to: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg">{title}</h3>
        <Link to={to} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
          {linkLabel} <ArrowRight className="size-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

function formatHM(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
