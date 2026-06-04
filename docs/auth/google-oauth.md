# Google OAuth no Fortuna

O login do MVP usa OAuth server-side: o React redireciona para `GET /auth/google`, a API NestJS conversa com o Google usando `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` e `WEB_APP_URL`, cria uma sessao HttpOnly e volta para o frontend.

## Google Cloud Console

1. Crie ou selecione um projeto, por exemplo `Fortuna MVP`.
2. Configure a OAuth consent screen.
   - Para login com uma conta `@gmail.com` comum, o app Google OAuth precisa estar com `Audience = External`.
   - Em modo `Testing`, adicione o e-mail do usuario em `Test users`.
   - `Audience = Internal` so funciona para usuarios da organizacao Google Workspace ou Cloud Identity dona do projeto Google Cloud.
3. Crie uma credencial `OAuth Client ID`.
4. Use `Application type: Web application`.
5. Configure `Authorized JavaScript origins`:
   - `http://127.0.0.1:5173`
   - `http://127.0.0.1:3000`
   - `http://localhost:5173`
   - `http://localhost:3000`
6. Configure `Authorized redirect URIs`:
   - `http://127.0.0.1:3000/auth/google/callback`
   - `http://localhost:3000/auth/google/callback`
7. Copie o client ID e o client secret para o ambiente da API.

## Variaveis

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://127.0.0.1:3000/auth/google/callback
WEB_APP_URL=http://127.0.0.1:5173
```

Escopos usados: `openid`, `email` e `profile`. O Fortuna nao pede offline access do Google no MVP, porque nao acessa APIs Google em background.

## Fluxo

```txt
React Web
-> GET /auth/google
-> NestJS gera state, salva em cookie HttpOnly curto e redireciona para Google
-> GET /auth/google/callback
-> API valida code, state e email_verified
-> API cria/atualiza User
-> API cria/recupera Player
-> API define cookie HttpOnly
-> React restaura estado via GET /auth/me
```

Callbacks sem `code`, sem `state` valido, com erro no token endpoint, sem e-mail,
com `email_verified=false` ou para usuario inativo voltam para
`/login?error=google_auth_failed`.

## Troubleshooting

### `GOOGLE_CLIENT_ID nao configurado`

A API nao encontrou `GOOGLE_CLIENT_ID` no ambiente. Copie um arquivo example para um `.env` local nao versionado e preencha o client ID no ambiente da API. O frontend redireciona para `GET /auth/google`; quem precisa do client ID real para montar a autorizacao e a API.

### `redirect_uri_mismatch`

O valor de `GOOGLE_CALLBACK_URL` precisa estar cadastrado em `Authorized redirect URIs` exatamente igual, incluindo protocolo, host, porta e caminho. Para o fluxo local esperado, use:

```env
WEB_APP_URL=http://127.0.0.1:5173
GOOGLE_CALLBACK_URL=http://127.0.0.1:3000/auth/google/callback
```

Cadastre tambem `http://127.0.0.1:3000/auth/google/callback` no Google Cloud. Se usar `localhost`, cadastre e configure tudo com `localhost`; nao misture hosts entre o `.env` e o OAuth Client.

### `Erro 403: org_internal`

Esse erro vem da configuracao do Google Auth Platform, nao da API do Fortuna. Ele indica que o app OAuth esta com `Audience = Internal`, o que bloqueia contas fora da organizacao Google Workspace ou Cloud Identity dona do projeto.

Para entrar com uma conta `@gmail.com` comum, altere a audience para `External`. Se o app continuar em modo `Testing`, adicione o e-mail exato em `Test users`. Como alternativa, use uma conta pertencente a organizacao dona do projeto Google Cloud.

Os testes automatizados do Fortuna nao dependem de login real no Google: eles validam montagem da URL, state, sessao e perfil com mocks/stubs locais.
