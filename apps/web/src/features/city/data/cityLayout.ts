import type { CityDistrict } from "../domain/cityTypes.js";

type DistrictSeed = Omit<
  CityDistrict,
  "level" | "state" | "unlocked" | "buildings"
> & {
  buildingNames: string[];
};

export const cityLayout: DistrictSeed[] = [
  {
    id: "district-safe-reserve",
    type: "safe_reserve",
    name: "Distrito Seguro",
    description:
      "Caixa, reserva de emergencia, liquidez e estabilidade da base financeira.",
    position: { x: 218, y: 220 },
    buildingNames: ["Praca-cofre", "Banco local"],
    mentorHint:
      "Sua reserva esta comecando a formar a base da Cidade Fortuna.",
  },
  {
    id: "district-fixed-income",
    type: "fixed_income",
    name: "Renda Fixa",
    description:
      "Planejamento, previsibilidade e rendimentos programados em ativos conservadores.",
    position: { x: 342, y: 162 },
    buildingNames: ["Agencia de titulos", "Relogio de prazos"],
    mentorHint:
      "Renda fixa ajuda a comparar liquidez, prazo e previsibilidade.",
  },
  {
    id: "district-stocks",
    type: "stocks",
    name: "Distrito Empresarial",
    description:
      "Empresas, participacao societaria, crescimento e oscilacao de mercado.",
    position: { x: 474, y: 230 },
    buildingNames: ["Predio empresarial", "Centro de analise"],
    mentorHint:
      "Acoes pedem plano e tamanho de posicao consciente.",
  },
  {
    id: "district-education",
    type: "education",
    name: "Academia Fortuna",
    description:
      "Missoes educativas, conceitos aprendidos e evolucao de maturidade.",
    position: { x: 292, y: 315 },
    buildingNames: ["Biblioteca financeira", "Sala de missoes"],
    mentorHint:
      "Aprendizado tambem evolui a cidade, nao apenas patrimonio.",
  },
  {
    id: "district-mentor",
    type: "mentor",
    name: "Torre do Mentor",
    description:
      "Dicas contextuais, alertas educativos e orientacao financeira responsavel.",
    position: { x: 410, y: 330 },
    buildingNames: ["Torre do Mentor"],
    mentorHint:
      "O Mentor observa concentracao, risco e proximos passos educativos.",
  },
  {
    id: "district-real-estate",
    type: "real_estate",
    name: "Imobiliario e FIIs",
    description:
      "Renda recorrente, imoveis e diversificacao patrimonial para fases futuras.",
    position: { x: 554, y: 342 },
    buildingNames: ["Quadra imobiliaria"],
    mentorHint: "Distrito previsto para evolucao futura do mapa.",
  },
  {
    id: "district-market",
    type: "market",
    name: "Bolsa Fortuna",
    description:
      "Consulta de ativos, precos simulados, compra e venda com validacao financeira.",
    position: { x: 610, y: 218 },
    buildingNames: ["Bolsa Fortuna"],
    mentorHint: "A bolsa e interface de consulta, nao promessa de retorno.",
  },
  {
    id: "district-reports",
    type: "reports",
    name: "Central de Relatorios",
    description:
      "Historico, evolucao patrimonial, carteira e indicadores para fases futuras.",
    position: { x: 122, y: 340 },
    buildingNames: ["Central de relatorios"],
    mentorHint: "Relatorios deixam a evolucao mais rastreavel.",
  },
];
