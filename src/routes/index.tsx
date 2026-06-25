import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStudyStore, useHydrated } from "@/lib/study-store";
import { ArrowRight, BookOpen, CalendarDays, Timer } from "lucide-react";

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

      <div className="grid md:grid-cols-2 gap-4">
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
    </AppShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
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
