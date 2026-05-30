# Seguranca de Sessao

O Fortuna usa um token opaco de sessao em cookie `HttpOnly`. O token completo nao fica no banco: apenas um hash SHA-256 com segredo de servidor e salvo em `UserSession.refreshHash`.

## Regras

- Nao salvar token Google em `localStorage`.
- Nao salvar token brapi no frontend.
- Usar cookie `HttpOnly`.
- Em desenvolvimento, `AUTH_COOKIE_SECURE=false`.
- Em producao, `AUTH_COOKIE_SECURE=true`.
- Usar `SameSite=lax` quando frontend e backend compartilham site.
- Se domínios forem separados, avaliar `SameSite=None; Secure` e protecao CSRF.
- `POST /auth/logout` revoga a sessao e limpa o cookie.
- `GET /auth/me` e a fonte da verdade para restaurar abas e reloads.

## Variaveis

```env
AUTH_ACCESS_TOKEN_SECRET=
AUTH_REFRESH_TOKEN_SECRET=
AUTH_ACCESS_TOKEN_TTL_SECONDS=900
AUTH_REFRESH_TOKEN_TTL_DAYS=7
AUTH_COOKIE_NAME=fortuna_session
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax
```

O CORS da API deve usar `credentials: true` somente para `WEB_APP_URL`.

