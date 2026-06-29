import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Timer, LayoutDashboard, LogOut, ClipboardList } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { initStudyStore, useStudyStore } from "@/lib/study-store";

const nav = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard },
  { to: "/disciplinas", label: "Disciplinas", icon: BookOpen },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/atividades", label: "Atividades", icon: ClipboardList },
  { to: "/metricas", label: "Métricas & Pomodoro", icon: Timer },
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const loaded = useStudyStore((s) => s.loaded);
  const userId = useStudyStore((s) => s.userId);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    initStudyStore().then(() => {
      if (cancelled) return;
      setChecked(true);
    });
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (checked && loaded && !userId) {
      navigate({ to: "/auth" });
    }
  }, [checked, loaded, userId, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (!checked || !loaded) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">
        Carregando...
      </div>
    );
  }
  if (!userId) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-5">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="size-9 rounded-xl bg-primary grid place-items-center text-primary-foreground font-display text-lg">
            E
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg text-sidebar-foreground">Estudo</div>
            <div className="text-xs text-muted-foreground">painel pessoal</div>
          </div>
        </Link>
        <nav className="mt-4 flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          {email && <div className="px-2 pb-2 text-xs text-muted-foreground truncate">{email}</div>}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-2">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs whitespace-nowrap",
                  active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
          <button onClick={signOut} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground px-2">
            <LogOut className="size-3.5" />
          </button>
        </div>

        <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
          <header className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl text-foreground">{title}</h1>
            {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
