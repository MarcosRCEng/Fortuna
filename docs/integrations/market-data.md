# Integração de Dados de Mercado

## Objetivo

Usar dados reais apenas para enriquecer a simulação educativa do Fortuna.

Os dados de mercado podem ser utilizados para exibir preço, variação percentual, histórico e contexto de ativos, mas não devem transformar o produto em uma plataforma de trading, corretagem, consultoria financeira ou recomendação de investimento.

## Fora de escopo

A integração de dados de mercado não deve incluir:

- ordens reais;
- conexão com corretora;
- leitura de carteira real;
- recomendação financeira;
- promessa de retorno;
- execução de investimento real;
- análise individualizada de perfil do investidor;
- sugestão personalizada de compra ou venda.

## Provider inicial

O provider inicial definido para o MVP é:

- `brapi.dev`

A escolha da brapi se justifica pelo suporte a ativos brasileiros, API REST simples, cotações, variação percentual e histórico OHLCV.

## Providers futuros

Providers que podem ser avaliados futuramente:

- Banco Central SGS;
- Tesouro Direto / Tesouro Transparente;
- CVM Dados Abertos;
- B3 for Developers, se fizer sentido institucionalmente;
- outros provedores de mercado, desde que compatíveis com o escopo educativo do Fortuna.

## Regra central do Fortuna

Mesmo usando dados reais, o Fortuna deve continuar operando com:

- carteira simulada;
- dinheiro fictício;
- ordens simuladas;
- resultados educativos;
- ausência de recomendação financeira.

Dados reais servem apenas como insumo contextual para tornar a experiência mais próxima do mercado.

## Relação com outros documentos

- `docs/integrations/brapi.md`
- `docs/integrations/provider-contract.md`
- `docs/integrations/cache-and-fallback.md`
- `docs/compliance/real-market-data-disclaimer.md`
- `docs/runbooks/market-data-troubleshooting.md`
