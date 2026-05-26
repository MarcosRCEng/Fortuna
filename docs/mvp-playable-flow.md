# Fortuna MVP Playable Flow

Este documento descreve o fluxo jogavel do MVP da Sprint 21. Todos os valores monetarios trafegam em centavos inteiros: `1 moeda Fortuna = R$ 0,01`.

## Subir o ambiente

1. Instale dependencias:
   ```bash
   pnpm install
   ```
2. Suba o banco:
   ```bash
   docker compose up -d
   ```
3. Gere o Prisma e aplique migracoes:
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   pnpm --filter @fortuna/infrastructure db:seed
   ```
4. Suba API e web:
   ```bash
   $env:FORTUNA_PERSISTENCE="prisma"; pnpm dev
   ```

API: `http://localhost:3000`  
Web: `http://localhost:5173`

## Fluxo pela UI

1. Abra `http://localhost:5173`.
2. Clique em `Criar jogador`.
3. Veja dashboard, saldo, patrimonio, rendimento coletavel, mentor e atalhos.
4. Acesse `Mercado`.
5. Compre um ativo com rendimento, como `FII Shopping Fortuna`.
6. Abra `Carteira` e confirme a posicao.
7. Abra `Missoes` e confira progresso/conclusao.
8. Abra `Cidade Fortuna` e veja os predios evolutivos.
9. Volte ao dashboard e clique em `Coletar rendimento`.
10. Abra `Historico` e confirme compra, rendimento, missoes e eventos.
11. Venda parte da posicao pela carteira.
12. Reinicie API/web e confirme que jogador, saldo, carteira, historico, mentor e cidade continuam disponiveis.

## Endpoints do fluxo

- `POST /players`
- `GET /players/:playerId`
- `GET /players/:playerId/summary`
- `GET /players/:playerId/game-loop/state`
- `GET /assets`
- `GET /assets/:assetId`
- `GET /players/:playerId/wallet`
- `GET /players/:playerId/portfolio`
- `GET /players/:playerId/portfolio/allocation`
- `POST /players/:playerId/orders/buy`
- `POST /players/:playerId/orders/sell`
- `GET /players/:playerId/transactions`
- `POST /players/:playerId/income/collect`
- `GET /players/:playerId/missions`
- `GET /players/:playerId/mentor/messages`
- `GET /players/:playerId/city`

## Fluxo pela coleção Bruno

Use a coleção em `api-tests/bruno/fortuna` com o ambiente `Local`.

Variaveis principais:

- `baseUrl`: `http://localhost:3000`
- `playerId`: jogador criado para o fluxo
- `assetId`: `asset-fiisf001` para validar compra e rendimento
- `transactionId`: reservado para encadeamentos futuros

Sequencia sugerida:

1. `Players/01 Create Player`
2. `Players/02 Get Player`
3. `Players/03 Get Summary`
4. `Assets/01 List Assets`
5. `Assets/05 Get Asset Detail`
6. `Orders/01 Buy Asset`
7. `Wallet/01 Get Wallet`
8. `Portfolio/01 Get Portfolio`
9. `Portfolio/02 Get Allocation`
10. `Missions/01 Get Missions`
11. `Mentor/01 Get Mentor Messages`
12. `City/01 Get City State`
13. `Income/01 Collect Income`
14. `Transactions/01 List Transactions`
15. `Orders/04 Sell Asset`
16. `Players/03 Get Summary`
17. `Portfolio/01 Get Portfolio`
18. `City/01 Get City State`

Exemplos de erro:

- `Orders/02 Buy Without Funds`
- `Orders/03 Sell Above Position`
- `Income/02 Collect Income - Nothing Available`
- `Players/04 Get Invalid Player`

## Limitações do MVP

- Precos e rendimentos sao simulados para educacao, sem recomendacao financeira real.
- A Cidade Fortuna usa cards/tiles evolutivos, nao uma cidade isometrica completa.
- A geracao de rendimento e simplificada para ativos de renda no fluxo jogavel.
- A UI usa estado local organizado e recarrega os blocos impactados apos acoes de negocio.
