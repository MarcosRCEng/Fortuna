import type { ReactNode } from "react";
import { Header } from "./Header.js";
import { NavigationTabs, type ScreenKey } from "./NavigationTabs.js";

export function Layout({
  activeScreen,
  onNavigate,
  currentUser,
  onLogout,
  children,
}: {
  activeScreen: ScreenKey;
  onNavigate(screen: ScreenKey): void;
  currentUser?: {
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  onLogout(): void;
  children: ReactNode;
}) {
  return (
    <div className="app-frame">
      <Header
        title="Fortuna"
        description="Acompanhe sua evolucao financeira simulada com calma, contexto e rastreabilidade."
        currentUser={currentUser}
        onLogout={onLogout}
      />
      {currentUser ? <NavigationTabs active={activeScreen} onNavigate={onNavigate} /> : null}
      <main className="content-shell">{children}</main>
    </div>
  );
}
