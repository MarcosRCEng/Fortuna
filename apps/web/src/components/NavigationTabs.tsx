export type ScreenKey = "dashboard" | "market" | "wallet" | "history";

const tabs: Array<{ key: ScreenKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "market", label: "Mercado" },
  { key: "wallet", label: "Carteira" },
  { key: "history", label: "Historico" },
];

export function NavigationTabs({
  active,
  onNavigate,
}: {
  active: ScreenKey;
  onNavigate(screen: ScreenKey): void;
}) {
  return (
    <nav className="tabs" aria-label="Navegacao financeira">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={active === tab.key ? "active" : ""}
          onClick={() => onNavigate(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
