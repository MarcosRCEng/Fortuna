# Cache e Fallback de Dados de Mercado

## Objetivo

Definir a política mínima de cache e fallback para consumo de dados reais de mercado no Fortuna.

A integração com dados reais deve ser resiliente, econômica e segura para o MVP.

## Política inicial

Para proteger o MVP contra consumo excessivo:

- Cache obrigatório.
- Nada de polling agressivo.
- Atualização manual por botão ou refresh controlado.
- TTL mínimo recomendado: 15 minutos.
- Lista pequena de ativos permitidos no MVP.
- Fallback para mock em caso de erro, timeout, 401, 403, 429 ou indisponibilidade.

## TTL recomendado

O TTL inicial recomendado é:

```txt
15 minutos
```

Representação sugerida em variável de ambiente:

```env
BRAPI_CACHE_TTL_SECONDS=900
```

## Estratégia de fallback

Fluxo esperado:

```txt
1. Tentar buscar dado real no provider configurado.
2. Se sucesso, salvar/atualizar cache.
3. Se falhar, tentar retornar último dado em cache.
4. Se não houver cache, retornar dado mockado.
5. Marcar corretamente a origem do dado retornado.
```

## Origem dos dados

As respostas devem deixar claro se os dados são:

- reais;
- mockados;
- vindos de cache;
- atrasados;
- indisponíveis.

## Erros que devem acionar fallback

- timeout;
- erro de rede;
- token ausente;
- erro 401;
- erro 403;
- erro 429;
- erro 5xx;
- resposta inválida;
- provider indisponível.

## Restrições

- Não fazer polling agressivo.
- Não chamar provider externo em loop descontrolado.
- Não depender exclusivamente de dados reais para o jogo funcionar.
- Não bloquear compra/venda simulada apenas porque a API externa falhou, salvo regra de negócio específica futura.
