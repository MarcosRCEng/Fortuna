# Pipeline grafico inicial da Cidade Fortuna

## Objetivo

Explicar como a camada PixiJS renderiza a primeira versao visual da Cidade Fortuna.

## Arquitetura

React continua responsavel por dados, HUD, modal de detalhes, fallback e grade de cards. A pagina `/city` deriva os predios com as regras existentes e envia o resultado para `CityScene`.

PixiJS renderiza apenas o mapa, o chao isometrico, os sprites placeholder e o clique nos predios. A engine grafica nao faz fetch e nao recalcula regra financeira.

## Assets

Os placeholders ficam em `apps/web/public/assets/city/placeholders`. Eles sao SVGs leves usados como base temporaria ate a substituicao por PNG/WebP definitivos.

## Convencao de nomes

Cada predio segue o padrao:

```txt
building_<id>_l0.svg
building_<id>_l1.svg
building_<id>_l2.svg
```

O chao usa `ground_tile.svg`.

## Como evoluir

1. Substituir placeholders por PNG/WebP definitivos.
2. Criar atlas.
3. Integrar mapa exportado do Tiled.
4. Adicionar animacoes leves.
5. Adicionar feedback visual para coleta de rendimentos.

## Restricoes visuais

Sem cassino, apostas, loot boxes, neon agressivo ou promessa de enriquecimento.
