# Sprint 22 - Quality Decisions

- Logs HTTP usam `x-correlation-id` propagado pelo middleware e tambem devolvido na resposta.
- Respostas de erro seguem `{ error: { code, message, details, correlationId, timestamp } }`.
- Stack trace fica restrito ao log em ambiente que nao seja producao; a resposta HTTP nunca expoe detalhes internos.
- DTOs financeiros aceitam quantidades inteiras positivas e valores monetarios em centavos inteiros.
- Textos de usuario passam por trim, limite de tamanho e rejeicao de caracteres HTML basicos.
- O seed demo e idempotente e mantem dados ficticios sem promessa de rentabilidade real.
- A cobertura minima inicial fica configurada nos pacotes com thresholds evolutivos: domain 85% statements, application 75%, infrastructure 28%, api 60% e web 24%. Infrastructure e web ficam abaixo da meta ideal da sprint porque a base atual ainda tem testes concentrados em providers/cidade; os thresholds agora impedem regressao enquanto a cobertura sobe.
