# Pipeline grafico da Cidade Fortuna

## Objetivo

Explicar como a camada PixiJS renderiza a Cidade Fortuna com assets isometricos definitivos.

## Arquitetura

React continua responsavel por dados, HUD, modal de detalhes, fallback e grade de cards. A pagina `/city` deriva os predios com as regras existentes e envia o resultado para `CityScene`.

PixiJS renderiza apenas o mapa, o chao isometrico, os sprites dos predios e o clique nos predios. A engine grafica nao faz fetch e nao recalcula regra financeira.

## Assets

Os assets definitivos ficam em `apps/web/public/assets/city/buildings`. Os placeholders continuam em `apps/web/public/assets/city/placeholders` como fallback documentado e base de emergencia.

Formato atual recomendado:

```txt
PNG com transparencia
1024x1024
Objeto centralizado
Sem texto dentro do sprite
Sombra suave no sprite ou sombra controlada pelo PixiJS
```

## Convencao de nomes

Cada predio segue o padrao:

```txt
building_<id>_stage_1.png
building_<id>_stage_2.png
building_<id>_stage_3.png
```

O chao usa `ground_tile.svg`.

## Estagios visuais

Os niveis da cidade sao traduzidos em tres estagios, alinhados ao blueprint da Cidade Fortuna:

```txt
Level 0 e 1 -> Stage 1, Fundacao
Level 2 e 3 -> Stage 2, Crescimento
Level 4 e 5 -> Stage 3, Maturidade
```

Stage 1 representa base simples e inicio de construcao. Stage 2 aumenta volume e detalhes. Stage 3 apresenta a construcao madura, refinada e consolidada.

## Predios obrigatorios

```txt
financial_hall
reserve_bank
city_exchange
real_estate_center
financial_school
income_park
mentor_tower
```

## Como adicionar ou trocar assets

1. Gerar as tres imagens do predio sem texto interno.
2. Salvar em `apps/web/public/assets/city/buildings`.
3. Seguir exatamente `building_<id>_stage_<1|2|3>.png`.
4. Rodar `pnpm --filter @fortuna/web validate:city-assets`.
5. Rodar `pnpm --filter @fortuna/web test` e `pnpm --filter @fortuna/web build`.

## Restricoes visuais

Sem cassino, apostas, loot boxes, neon agressivo ou promessa de enriquecimento.

Tambem nao usar roleta, slot machine, fichas de poker, logos reais, tickers reais ou labels como parte da imagem. Textos como nomes dos predios devem ser renderizados pela UI, nao embutidos no sprite.

## Proximas melhorias tecnicas

1. Converter os PNGs para WebP quando o peso do build virar prioridade.
2. Criar atlas/spritesheet para reduzir requisicoes.
3. Integrar mapa exportado do Tiled.
4. Adicionar animacoes leves e feedback visual de rendimentos.
