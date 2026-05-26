# Demo Data - Fortuna MVP

O seed cria um ambiente jogavel e idempotente para demonstracao local.

## Jogador demo
- `player-demo`
- Nome: `Jogador Demo`
- Saldo inicial: `200000` centavos, equivalente a `F$ 2.000,00`
- Regra financeira: `1 moeda Fortuna = R$ 0,01`

## Ativos disponiveis
- `TSF001` - Tesouro Liquidez Fortuna, risco baixo
- `CDBLF001` - Banco Reserva FIC, risco medio
- `FIISF001` - FII Praca Central, risco medio
- `FIILF001` - FII Logistica Fortuna, risco medio
- `AEF001` - Acao Energia Solar, risco alto
- `ATF001` - Acao Tecnologia Fortuna, risco alto

Todos os precos sao mockados, persistidos em centavos inteiros e nao representam recomendacao ou promessa de ganho.

## Fluxo recomendado
1. Consultar `GET /players/player-demo`.
2. Consultar `GET /assets`.
3. Comprar uma unidade de `FIISF001` em `POST /players/player-demo/orders/buy`.
4. Consultar carteira, missoes, mentor e cidade.
5. Coletar o rendimento demo em `POST /players/player-demo/income/collect`.
6. Consultar historico em `GET /players/player-demo/transactions`.
7. Vender parte da posicao em `POST /players/player-demo/orders/sell`.

## Reset
- Aplicar seed sem apagar dados: `pnpm db:seed`
- Resetar o banco demo com migrations e seed: `pnpm db:reset:demo`

Por padrao, quando `DATABASE_URL` nao estiver definido, o seed usa `postgresql://fortuna:fortuna_dev@localhost:5432/fortuna`, que corresponde ao `docker-compose.yml` do projeto.
