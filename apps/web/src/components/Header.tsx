import type { ReactNode } from "react";

export function Header({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="brand-mark">
        <span>F</span>
        <div>
          <strong>Fortuna</strong>
          <small>Educacao financeira simulada</small>
        </div>
      </div>
      <div className="topbar-copy">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
