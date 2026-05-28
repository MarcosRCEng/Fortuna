# Compliance readiness do MVP Fortuna

## Natureza do produto

- Plataforma educativa.
- Investimentos simulados.
- Sem execucao de ordens reais.
- Sem custodia.
- Sem recomendacao financeira.

## Limites do MVP

- Dados de mercado mockados/simulados por padrao.
- Dados reais da brapi podem ser usados apenas em modo controlado, sinalizados internamente como dados reais, cacheados por pelo menos 15 minutos e sem recomendacao financeira.
- A allowlist inicial de mercado real/simulado e pequena: PETR4, VALE3, ITUB4 e MGLU3.
- Sem conexao com corretoras.
- Sem leitura de carteira real.
- Sem Open Finance.
- Sem integracao transacional com B3, MSN Money, Google Finance ou provedores similares.
- Sem promessa de rentabilidade.

## Preparacao arquitetural

- `MarketDataProvider` formaliza a porta de dados de mercado.
- `MockMarketDataProvider` segue como provider padrao do MVP.
- `BrapiMarketDataProvider` existe como adapter externo plugavel em infraestrutura, com token por ambiente, timeout, feature flag explicita, tratamento de erros, cache/fallback e DTO interno.
- `ExternalMarketDataProvider` existe apenas como placeholder seguro e desabilitado.
- `CachedMarketDataProvider` encapsula outro provider com TTL em memoria.
- `FallbackMarketDataProvider` tenta provider primario e cai para secundario em falhas de provider.
- Consentimentos futuros foram modelados para uso educativo e integracoes reais futuras.
- Auditoria registra eventos simulados relevantes com payload sanitizado.

## Configuracao de provider

- `MARKET_DATA_PROVIDER=mock` e o padrao.
- `MARKET_DATA_PROVIDER=brapi` so tenta brapi quando `MARKET_DATA_ALLOW_REAL_DATA=true`, `BRAPI_API_TOKEN` existe e a configuracao e valida.
- `BRAPI_CACHE_TTL_SECONDS=900` controla o TTL do cache da brapi.
- `BRAPI_MAX_SYMBOLS_PER_REQUEST` limita explicitamente o tamanho de cada consulta.
- `MARKET_DATA_ALLOWED_SYMBOLS` controla a allowlist local do MVP.
- `BRAPI_API_TOKEN` deve ser configurado por ambiente e nunca versionado.
- Configuracao invalida, token ausente ou dados reais desativados resultam em fallback para mock.

## Consentimento

- Consentimentos previstos: uso educativo, termos de simulacao, dados reais de mercado futuros, conexao de carteira futura, ciencia de ausencia de recomendacao financeira e ciencia de ausencia de investimento real.
- O MVP ainda nao coleta carteira real ou dados bancarios. Token de provider e segredo operacional, nao dado do jogador.
- A revogacao futura deve bloquear qualquer integracao real associada ao escopo revogado.
- Antes de integrar dados reais, consentimento deve ter termos revisados, versao, escopo, data, revogacao e trilha de auditoria persistente.

## Auditoria

- Eventos registrados incluem criacao de jogador, compra simulada, venda simulada, coleta de rendimento, refresh de preco mockado, selecao de provider real, consulta de cotacao, fallback, falha de provider, erros financeiros relevantes e aceite/revogacao de consentimento.
- O `correlationId` dos logs estruturados e reaproveitado quando disponivel.
- Payloads sao sanitizados para remover tokens, segredos, headers, cookies, senhas e credenciais.
- Valores financeiros sao registrados em centavos inteiros.
- Auditoria nao deve armazenar segredos nem dados sensiveis desnecessarios.

## Disclaimers

- Texto usado na UI: "Ambiente educativo e simulado. O Fortuna nao realiza investimentos reais, nao oferece recomendacao financeira e nao promete retorno. Os ativos, precos e rendimentos do MVP sao usados apenas para aprendizado."
- Aparece no Dashboard, Mercado e modal de compra/venda.

## Proximos passos antes de dados reais

- Revisao juridica.
- Politica de privacidade.
- Termos de uso.
- Seguranca de credenciais.
- Gestao de consentimento real.
- Rate limit.
- Monitoramento de provider externo.
- Estrategia de incidentes.
- UI explicita para atraso/stale data quando dados reais forem exibidos ao jogador.
