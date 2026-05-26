export function LoadingState({ message }: { message: string }) {
  return (
    <div className="state state-loading" role="status">
      <span className="loader" />
      <p>{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="state">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="state state-error" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

export function SuccessState({ message }: { message: string }) {
  return (
    <div className="state state-success" role="status">
      <strong>Operacao registrada</strong>
      <p>{message}</p>
    </div>
  );
}

export function OperationBlockedState({ message }: { message: string }) {
  return (
    <div className="state state-blocked" role="alert">
      <strong>Operacao bloqueada</strong>
      <p>{message}</p>
    </div>
  );
}
