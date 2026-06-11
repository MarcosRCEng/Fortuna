import type { PlayerMission } from "../../services/missionApi.js";
import type { PlayerSummary } from "../../types/player.js";
import { formatMoneyFromCents } from "../../utils/money.js";
import { CityBuildingsGrid } from "./CityBuildingsGrid.js";
import type { CityBuildingViewModel, DeriveCityInput } from "./city.types.js";

type CityExperienceStats = {
  cityLevel: number;
  playerLevel: number;
  playerProgressPercent: number;
  availableBalanceCents: number;
  totalEquityCents: number;
  assetsCount: number;
  completedMissionsCount: number;
  totalMissionsCount: number;
  inProgressMissionsCount: number;
  collectibleIncomeCents: number;
  diversificationCount: number;
};

type CityCardsExperienceProps = {
  summary?: PlayerSummary;
  input: DeriveCityInput;
  buildings: CityBuildingViewModel[];
  missions: PlayerMission[];
  stats: CityExperienceStats;
};

type SuggestedStep = {
  title: string;
  description: string;
  route?: string;
};

type ConceptProgress = {
  label: string;
  value: string;
  progressPercent: number;
  description: string;
};

export function CityCardsExperience({
  summary,
  input,
  buildings,
  missions,
  stats,
}: CityCardsExperienceProps) {
  const unlockedBuildingsCount = buildings.filter(
    (building) => building.status !== "locked",
  ).length;
  const actionBuildingsCount = buildings.filter((building) => building.hasAction).length;
  const suggestedSteps = createSuggestedSteps({ input, missions, summary });
  const conceptProgress = createConceptProgress({
    stats,
    input,
    unlockedBuildingsCount,
    totalBuildingsCount: buildings.length,
  });

  return (
    <>
      <section
        className="city-workbench"
        aria-label="Experiencia principal da Cidade Fortuna em cards"
      >
        <div className="city-workbench-copy">
          <span className="section-kicker">Cidade em modo cards</span>
          <h2>Painel tecnico da Cidade Fortuna</h2>
          <p>
            Uma leitura operacional da jornada: saldo, patrimonio simulado,
            ativos, missoes, rendimentos disponiveis e predios conceituais. Esta
            experiencia nao usa coordenadas, tiles, canvas ou renderizacao
            isometrica.
          </p>
        </div>

        <dl className="city-player-summary">
          <div>
            <dt>Jogador</dt>
            <dd>{summary?.playerId ? `Sessao ${shortId(summary.playerId)}` : "Dados parciais"}</dd>
          </div>
          <div>
            <dt>Trilha atual</dt>
            <dd>
              Nivel {stats.playerLevel} - {stats.playerProgressPercent}% do ciclo
            </dd>
          </div>
          <div>
            <dt>Cidade conceitual</dt>
            <dd>
              Nivel {stats.cityLevel}/5 - {unlockedBuildingsCount} predios ativos
            </dd>
          </div>
          <div>
            <dt>Acoes abertas</dt>
            <dd>{actionBuildingsCount} leituras ou tarefas sugeridas</dd>
          </div>
        </dl>
      </section>

      <section className="city-metrics-grid" aria-label="Resumo financeiro educativo">
        <CityMetric
          title="Saldo disponivel"
          value={formatMoneyFromCents(stats.availableBalanceCents)}
          description="Caixa simulado disponivel para estudar liquidez e organizacao."
        />
        <CityMetric
          title="Patrimonio simulado"
          value={formatMoneyFromCents(stats.totalEquityCents)}
          description="Soma educativa entre saldo e valor de mercado da carteira."
        />
        <CityMetric
          title="Quantidade de ativos"
          value={`${stats.assetsCount}`}
          description="Posicoes diferentes acompanhadas na carteira simulada."
        />
        <CityMetric
          title="Missoes concluidas"
          value={`${stats.completedMissionsCount}/${stats.totalMissionsCount}`}
          description="Conceitos ja aplicados em objetivos educativos."
        />
        <CityMetric
          title="Missoes em andamento"
          value={`${stats.inProgressMissionsCount}`}
          description="Tarefas iniciadas que ainda precisam de conclusao."
        />
        <CityMetric
          title="Rendimentos disponiveis"
          value={formatMoneyFromCents(stats.collectibleIncomeCents)}
          description="Valores simulados pendentes para acompanhamento de fluxo."
        />
      </section>

      <section className="city-learning-layout">
        <div className="city-next-steps" aria-label="Proximos passos sugeridos">
          <div>
            <span className="section-kicker">Proximos passos</span>
            <h2>Roteiro DIY</h2>
            <p>
              Use os sinais abaixo como uma lista de verificacao educativa para
              escolher a proxima tela do Fortuna.
            </p>
          </div>
          <ol>
            {suggestedSteps.map((step) => (
              <li key={step.title}>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
                {step.route ? (
                  <a className="button button-secondary" href={step.route}>
                    Abrir area
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="city-concept-progress" aria-label="Progresso conceitual">
          <div>
            <span className="section-kicker">Progresso conceitual</span>
            <h2>Cidade Fortuna</h2>
            <p>
              Cada barra resume um conceito observavel nos dados atuais, sem
              alterar saldo, ativos, missoes ou regras financeiras.
            </p>
          </div>
          <div className="city-concept-list">
            {conceptProgress.map((concept) => (
              <article key={concept.label} className="city-concept-item">
                <div className="city-concept-heading">
                  <strong>{concept.label}</strong>
                  <span>{concept.value}</span>
                </div>
                <div
                  className="city-progress"
                  aria-label={`${concept.label}: ${concept.progressPercent}%`}
                >
                  <span style={{ width: `${concept.progressPercent}%` }} />
                </div>
                <p>{concept.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="city-guidance">
        <div>
          <span className="section-kicker">Predios por cards</span>
          <h2>Areas da cidade como ferramentas educativas</h2>
          <p>
            Os predios abaixo representam estados conceituais da jornada. Eles
            indicam bloqueio, desbloqueio, nivel, categoria e acao principal
            quando houver uma proxima leitura util.
          </p>
        </div>
      </section>

      <CityBuildingsGrid buildings={buildings} />
    </>
  );
}

function CityMetric({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="city-metric">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  );
}

function createSuggestedSteps({
  input,
  missions,
  summary,
}: {
  input: DeriveCityInput;
  missions: PlayerMission[];
  summary?: PlayerSummary;
}): SuggestedStep[] {
  const steps: SuggestedStep[] = [];
  const availableMission = missions.find((mission) => mission.status === "AVAILABLE");
  const inProgressMission = missions.find((mission) => mission.status === "IN_PROGRESS");

  if (input.collectibleIncomeCents > 0) {
    steps.push({
      title: "Registrar rendimentos disponiveis",
      description:
        "Revise o fluxo simulado e observe como ele aparece no saldo depois da coleta educativa.",
      route: "/missions",
    });
  }

  if (inProgressMission) {
    steps.push({
      title: "Concluir uma missao em andamento",
      description: inProgressMission.objective,
      route: "/missions",
    });
  } else if (availableMission) {
    steps.push({
      title: "Escolher a proxima missao educativa",
      description: availableMission.objective,
      route: "/missions",
    });
  }

  if (input.positionsCount === 0 && input.availableBalanceCents > 0) {
    steps.push({
      title: "Estudar um primeiro ativo simulado",
      description:
        "Compare risco, liquidez e finalidade antes de registrar qualquer compra no ambiente educativo.",
      route: "/market",
    });
  }

  if (input.hasConcentrationWarning) {
    steps.push({
      title: "Revisar concentracao da carteira",
      description:
        "Observe se uma posicao domina a composicao e use a carteira para estudar equilibrio entre classes.",
      route: "/wallet",
    });
  }

  if (summary?.mentorMessage) {
    steps.push({
      title: "Ler a orientacao do Mentor",
      description:
        "Use a mensagem recente para revisar risco, liquidez, diversificacao ou comportamento.",
      route: "/",
    });
  }

  if (steps.length === 0) {
    steps.push(
      {
        title: "Abrir o painel inicial",
        description:
          "Revise o resumo geral e confirme quais dados ja estao disponiveis para a jornada.",
        route: "/",
      },
      {
        title: "Explorar missoes educativas",
        description:
          "Use missoes para transformar conceitos financeiros em tarefas verificaveis.",
        route: "/missions",
      },
    );
  }

  return steps.slice(0, 4);
}

function createConceptProgress({
  stats,
  input,
  unlockedBuildingsCount,
  totalBuildingsCount,
}: {
  stats: CityExperienceStats;
  input: DeriveCityInput;
  unlockedBuildingsCount: number;
  totalBuildingsCount: number;
}): ConceptProgress[] {
  const cityProgressPercent = clampPercent(Math.round((stats.cityLevel / 5) * 100));
  const missionProgressPercent =
    stats.totalMissionsCount > 0
      ? clampPercent(
          Math.round((stats.completedMissionsCount / stats.totalMissionsCount) * 100),
        )
      : 0;
  const diversificationProgressPercent = clampPercent(
    Math.round((stats.diversificationCount / 4) * 100),
  );
  const buildingProgressPercent =
    totalBuildingsCount > 0
      ? clampPercent(Math.round((unlockedBuildingsCount / totalBuildingsCount) * 100))
      : 0;
  const incomeProgressPercent = input.collectedIncomeCents > 0
    ? 100
    : input.collectibleIncomeCents > 0
      ? 50
      : 0;

  return [
    {
      label: "Maturidade da cidade",
      value: `Nivel ${stats.cityLevel}/5`,
      progressPercent: cityProgressPercent,
      description: "Combinacao visual de carteira, aprendizado e acompanhamento.",
    },
    {
      label: "Conhecimento aplicado",
      value: `${stats.completedMissionsCount}/${stats.totalMissionsCount} missoes`,
      progressPercent: missionProgressPercent,
      description: "Progresso nas tarefas educativas ja concluidas.",
    },
    {
      label: "Diversificacao observavel",
      value: `${stats.diversificationCount}/4 dimensoes`,
      progressPercent: diversificationProgressPercent,
      description: "Leitura simples de caixa e classes de ativos com participacao.",
    },
    {
      label: "Predios desbloqueados",
      value: `${unlockedBuildingsCount}/${totalBuildingsCount}`,
      progressPercent: buildingProgressPercent,
      description: "Areas da cidade com sinais suficientes para sair do estado bloqueado.",
    },
    {
      label: "Rendimentos acompanhados",
      value: formatMoneyFromCents(input.collectibleIncomeCents),
      progressPercent: incomeProgressPercent,
      description: "Acompanhamento de rendimentos simulados disponiveis ou ja coletados.",
    },
  ];
}

function shortId(value: string): string {
  return value.length <= 8 ? value : value.slice(0, 8);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
