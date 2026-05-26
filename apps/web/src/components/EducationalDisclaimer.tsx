export function EducationalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={compact ? "educational-disclaimer compact" : "educational-disclaimer"}>
      <strong>Ambiente educativo e simulado.</strong>
      <span>
        O Fortuna nao realiza investimentos reais, nao oferece recomendacao
        financeira e nao promete retorno. Os ativos, precos e rendimentos do MVP
        sao usados apenas para aprendizado.
      </span>
    </aside>
  );
}
