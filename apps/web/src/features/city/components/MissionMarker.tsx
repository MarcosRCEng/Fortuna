export function MissionMarker({ completed = false }: { completed?: boolean }) {
  return (
    <span
      className={`city-floating-indicator ${completed ? "city-mission-completed" : "city-mission-marker"}`}
      aria-label={completed ? "Missao concluida recentemente" : "Missao disponivel"}
    >
      {completed ? "OK" : "!"}
    </span>
  );
}
