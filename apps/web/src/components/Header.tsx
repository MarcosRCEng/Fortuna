export function Header({
  title,
  description,
  currentUser,
  onLogout,
}: {
  title: string;
  description: string;
  currentUser?: {
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  onLogout?: () => void;
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
      {currentUser ? (
        <div className="session-menu">
          {currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="" />
          ) : (
            <span>{(currentUser.name ?? currentUser.email).slice(0, 1)}</span>
          )}
          <div>
            <strong>{currentUser.name ?? currentUser.email}</strong>
            <small>Conectado</small>
          </div>
          <button type="button" className="button button-ghost" onClick={onLogout}>
            Sair
          </button>
        </div>
      ) : null}
    </header>
  );
}
