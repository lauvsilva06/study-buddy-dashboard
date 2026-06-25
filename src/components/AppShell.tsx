import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Timer, LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard },
  { to: "/disciplinas", label: "Disciplinas", icon: BookOpen },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/metricas", label: "Métricas & Pomodoro", icon: Timer },
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
            const active = pathname === item.to;
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
      </aside>

      <main className="flex-1 min-w-0">
        {/* Mobile nav */}
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
