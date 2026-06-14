# FIIs Pro e Tesouro Direto

## Matriz de recursos

| Recurso                       | Gratuito atual |               Pro futuro |
| ----------------------------- | -------------: | -----------------------: |
| Catalogo B3                   |          ativo |                    ativo |
| Cotacao basica                |          ativo |                    ativo |
| FIIs detalhados               |   desabilitado |                preparado |
| Tesouro Direto completo       |   desabilitado |                preparado |
| Consenso de analistas         |  nao suportado | nao planejado pela brapi |
| Tendencia educacional Fortuna |          ativo |                    ativo |

## Contratos

Os dados Pro usam contratos proprios em `packages/domain/src/market/MarketProData.ts` e portas especializadas em `packages/application/src/ports/MarketProDataProvider.ts`.

O contrato basico de cotacao continua sem campos de Tesouro Direto, P/VP, dividend yield, vacancia ou indicadores especializados. Valores monetarios permanecem em centavos inteiros. Taxas percentuais sao representadas separadamente em basis points.

## Capabilities

As flags seguras padrao sao:

```env
BRAPI_CAPABILITY_FII_PRO=false
BRAPI_CAPABILITY_TREASURY_PRO=false
```

Com capability desabilitada, as rotas preparatorias retornam `NOT_AVAILABLE_IN_CURRENT_PLAN` e os adapters Pro reais nao sao chamados. `/market/status` informa as capabilities sem revelar token.

## Ativacao futura

1. Validar que o plano contratado permite os endpoints Pro da brapi.
2. Configurar `MARKET_DATA_PROVIDER=brapi` e `MARKET_DATA_ALLOW_REAL_DATA=true`.
3. Definir `BRAPI_API_TOKEN` apenas em ambiente seguro.
4. Habilitar `BRAPI_CAPABILITY_FII_PRO=true` e/ou `BRAPI_CAPABILITY_TREASURY_PRO=true`.
5. Executar testes de contrato, integracao e E2E antes de expor a UI.

Nao versionar credenciais reais. Nao usar probing automatico para descobrir plano.

## Fora do dominio financeiro

Tesouro Direto Pro nesta sprint e somente leitura de catalogo, indicadores e historico. Compra, venda, posicao, saldo e historico financeiro simulados nao foram ampliados para Tesouro.

## Evidencias de desabilitacao

Com as flags padrao `BRAPI_CAPABILITY_FII_PRO=false` e
`BRAPI_CAPABILITY_TREASURY_PRO=false`, as rotas de detalhes/dividendos de FIIs
e Tesouro retornam `NOT_AVAILABLE_IN_CURRENT_PLAN`, sem chamar adapters Pro e
sem habilitar operacoes de compra ou venda fora do suporte financeiro atual.

A Tendencia educacional nao depende dessas capabilities Pro. Ela usa cotacao,
historico basico, cache/fallback e contexto da carteira simulada.
