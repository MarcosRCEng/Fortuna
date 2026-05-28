# Runbook — Troubleshooting de Dados de Mercado

## Objetivo

Orientar investigação de problemas relacionados à integração de dados de mercado.

## Sintomas comuns

### Dados não aparecem

Verificar:

- `MARKET_DATA_PROVIDER`;
- `MARKET_DATA_ALLOW_REAL_DATA`;
- `BRAPI_BASE_URL`;
- `BRAPI_API_TOKEN`;
- conectividade externa;
- logs da aplicação;
- fallback para mock.

### Dados aparecem como mock

Verificar:

- se o uso de dados reais está habilitado;
- se o token está ausente;
- se houve erro HTTP;
- se houve timeout;
- se a aplicação caiu no fallback esperado.

### Dados antigos aparecem

Verificar:

- TTL do cache;
- horário da última atualização;
- status do provider;
- se houve falha recente na API externa;
- se o dado foi retornado do cache.

### Erro 401 ou 403

Possíveis causas:

- token ausente;
- token inválido;
- token expirado ou revogado;
- uso de plano sem permissão para determinado recurso.

Ação recomendada:

- validar token no ambiente local;
- nunca registrar token completo em logs;
- confirmar configuração do `.env.local` ou ambiente equivalente.

### Erro 429

Possível causa:

- limite de requisições atingido.

Ação recomendada:

- aumentar cache;
- reduzir quantidade de chamadas;
- evitar refresh automático;
- revisar uso de endpoints em lote;
- manter fallback para mock.

### Timeout

Verificar:

- `BRAPI_TIMEOUT_MS`;
- rede;
- indisponibilidade temporária do provider;
- logs de tentativa e fallback.

## Checklist rápido

```txt
1. A aplicação continua funcionando com mock?
2. O cache está sendo usado corretamente?
3. O token está configurado apenas em ambiente seguro?
4. O fallback foi acionado?
5. O usuário recebeu mensagem segura, sem erro técnico bruto?
6. O disclaimer continua visível quando dados reais aparecem?
```

## Boas práticas de log

Logs podem conter:

- nome do provider;
- status da chamada;
- símbolo consultado;
- tempo de resposta;
- indicação de cache/fallback;
- correlation id.

Logs não devem conter:

- token da API;
- dados sensíveis do usuário;
- stack trace exposto ao usuário final;
- mensagens que sugiram recomendação financeira.
