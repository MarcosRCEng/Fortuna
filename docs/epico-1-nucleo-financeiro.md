# Epico 1: Nucleo financeiro

## Decisoes

- A fonte da verdade para dinheiro e `MoneyCents`, sempre em centavos inteiros.
- Quantidades do MVP usam unidades inteiras por meio de `Quantity`; fracionamento de ativos fica fora deste epico.
- Saldo da conta so muda por metodos controlados de `PlayerAccount` e pelos use cases financeiros.
- Operacoes validas registram `Transaction` e retornam eventos de dominio simples.
- Operacoes rejeitadas lancam erros de negocio controlados. Quando aplicavel, o erro carrega o evento de rejeicao.
- O preco medio de `Position` usa media ponderada inteira com arredondamento half-up para centavos.
- Percentuais de alocacao sao retornados em basis points para evitar floats como fonte financeira.

## Fora do escopo

- UI, game loop e Cidade Fortuna visual.
- Integracao com mercado real.
- Persistencia real ou infraestrutura de event bus.
- Alavancagem, margem ou venda descoberta.
