# Compliance readiness do MVP Fortuna

## Natureza do produto
- Plataforma educativa.
- Investimentos simulados.
- Sem execucao de ordens reais.
- Sem custodia.
- Sem recomendacao financeira.

## Limites do MVP
- Dados de mercado mockados/simulados.
- Sem conexao com corretoras.
- Sem leitura de carteira real.
- Sem Open Finance.
- Sem integracao real com B3, Brapi, MSN Money, Google Finance ou provedores similares.
- Sem promessa de rentabilidade.

## Preparacao arquitetural
- `MarketDataProvider` formaliza a porta de dados de mercado.
- `MockMarketDataProvider` segue como provider padrao do MVP.
- `ExternalMarketDataProvider` existe apenas como placeholder seguro e desabilitado.
- `CachedMarketDataProvider` encapsula outro provider com TTL em memoria.
- `FallbackMarketDataProvider` tenta provider primario e cai para secundario em falhas de provider.
- Consentimentos futuros foram modelados para uso educativo e integracoes reais futuras.
- Auditoria registra eventos simulados relevantes com payload sanitizado.

## Configuracao de provider
- `MARKET_DATA_PROVIDER=mock` e o padrao.
- `MARKET_DATA_PROVIDER=external` exige `EXTERNAL_MARKET_DATA_ENABLED=true`; sem isso retorna erro claro.
- `MARKET_DATA_PROVIDER=fallback` prepara o fluxo externo para mock, sem chamada real.
- `MARKET_DATA_CACHE_ENABLED=true` habilita cache em memoria.
- `MARKET_DATA_CACHE_TTL_SECONDS=60` controla o TTL do cache.

## Consentimento
- Consentimentos previstos: uso educativo, termos de simulacao, dados reais de mercado futuros, conexao de carteira futura, ciencia de ausencia de recomendacao financeira e ciencia de ausencia de investimento real.
- O MVP ainda nao coleta dados reais, credenciais, tokens, carteira real ou dados bancarios.
- A revogacao futura deve bloquear qualquer integracao real associada ao escopo revogado.
- Antes de integrar dados reais, consentimento deve ter termos revisados, versao, escopo, data, revogacao e trilha de auditoria persistente.

## Auditoria
- Eventos registrados incluem criacao de jogador, compra simulada, venda simulada, coleta de rendimento, refresh de preco mockado, erros financeiros relevantes e aceite/revogacao de consentimento.
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
