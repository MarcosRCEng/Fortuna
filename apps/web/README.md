# Fortuna Web

Interface React da experiencia financeira educacional do Fortuna.

## Configuracao

Crie um `.env.local` em `apps/web` quando precisar apontar para uma API diferente:

```txt
VITE_API_URL=http://localhost:3000
```

O front adiciona `/api/v1` automaticamente quando a URL nao inclui esse prefixo.

## Rodando

Na raiz do monorepo:

```bash
pnpm --filter @fortuna/api dev
pnpm --filter @fortuna/web dev
```

Tambem e possivel subir ambos com:

```bash
pnpm dev
```

## Telas implementadas

- Dashboard com criacao de jogador, saldo, patrimonio, progresso, dica educativa, resumo de carteira e coleta de rendimento.
- Mercado com lista de ativos, preco em centavos formatado, risco, rendimento esperado, compra e atualizacao de precos mockados.
- Carteira com saldo, posicoes, preco medio, preco atual, valor atual, venda e alocacao por classe.
- Historico com compras, vendas, rendimentos e outros eventos retornados pela API.

## Dinheiro

A API e a UI usam centavos inteiros como fonte de verdade. A regra do produto e:

```txt
1 moeda Fortuna = R$ 0,01
```

A divisao por 100 acontece apenas na camada de apresentacao.

## Observacao sobre rendimentos

Nesta sprint a API possui endpoint de coleta (`POST /players/:playerId/income/collect`), mas nao expoe uma listagem de rendimentos coletaveis. Por isso, a UI mostra a acao de coleta quando existe carteira com posicoes e deixa a validacao final para o backend, exibindo a mensagem de negocio quando nao houver rendimento disponivel.
