import type { ReactNode } from "react";

export type ScreenKey =
  | "dashboard"
  | "wallet"
  | "assets"
  | "income"
  | "history"
  | "missions"
  | "mentor"
  | "city";

const navItems: Array<{ key: ScreenKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "wallet", label: "Carteira" },
  { key: "assets", label: "Ativos" },
  { key: "income", label: "Rendimentos" },
  { key: "history", label: "Historico" },
  { key: "missions", label: "Missoes" },
  { key: "mentor", label: "Mentor" },
  { key: "city", label: "Cidade" },
];

export function AppLayout({
  activeScreen,
  onNavigate,
  children,
}: {
  activeScreen: ScreenKey;
  onNavigate(screen: ScreenKey): void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span>F</span>
          <div>
            <strong>Fortuna</strong>
            <small>Educacao financeira</small>
          </div>
        </div>
        <nav aria-label="Telas financeiras">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === activeScreen ? "active" : ""}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  );
}
