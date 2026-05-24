export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state state-error" role="alert">
      <strong>Algo precisa de atencao</strong>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="button button-ghost" onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
