export function LoadingState({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="state state-loading" role="status">
      <span className="loader" />
      <p>{message}</p>
    </div>
  );
}
