# Google OAuth no Fortuna

O login do MVP usa OAuth server-side: o React redireciona para `GET /auth/google`, a API NestJS conversa com o Google e cria uma sessao HttpOnly antes de voltar para o frontend.

## Google Cloud Console

1. Crie ou selecione um projeto, por exemplo `Fortuna MVP`.
2. Configure a OAuth consent screen. Em desenvolvimento, o modo de teste e suficiente.
3. Crie uma credencial `OAuth Client ID`.
4. Use `Application type: Web application`.
5. Configure `Authorized JavaScript origins`:
   - `http://localhost:5173`
   - `http://localhost:3000`
6. Configure `Authorized redirect URIs`:
   - `http://localhost:3000/auth/google/callback`
7. Copie o client ID e o client secret para o ambiente da API.

## Variaveis

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
WEB_APP_URL=http://localhost:5173
```

Escopos usados: `openid`, `email` e `profile`. O Fortuna nao pede offline access do Google no MVP, porque nao acessa APIs Google em background.

## Fluxo

```txt
React Web
-> GET /auth/google
-> NestJS redireciona para Google
-> GET /auth/google/callback
-> API valida perfil Google
-> API cria/atualiza User
-> API cria/recupera Player
-> API define cookie HttpOnly
-> React restaura estado via GET /auth/me
```

