import type { ReactNode } from "react";
import { Header } from "./Header.js";
import { NavigationTabs, type ScreenKey } from "./NavigationTabs.js";

export function Layout({
  activeScreen,
  onNavigate,
  onResetPlayer,
  children,
}: {
  activeScreen: ScreenKey;
  onNavigate(screen: ScreenKey): void;
  onResetPlayer(): void;
  children: ReactNode;
}) {
  return (
    <div className="app-frame">
      <Header
        title="Fortuna"
        description="Acompanhe sua evolucao financeira simulada com calma, contexto e rastreabilidade."
        action={
          <button type="button" className="button button-ghost" onClick={onResetPlayer}>
            Trocar jogador
          </button>
        }
      />
      <NavigationTabs active={activeScreen} onNavigate={onNavigate} />
      <main className="content-shell">{children}</main>
    </div>
  );
}
