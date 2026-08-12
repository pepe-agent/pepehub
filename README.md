# PepeHub

Registro público de plugins e skills do [Pepe](../pepe): publica autenticado via
GitHub, busca e baixa sem autenticação. Astro (`output: "server"`) rodando como um
único Cloudflare Worker (com assets estáticos), com D1 (metadata) e R2 (artefatos).

Produção: https://hub.pepe-agent.com (`wrangler.toml` não tem `main`/`assets`:
o `@astrojs/cloudflare` gera isso em `dist/server/wrangler.json` no build; é
esse arquivo gerado, não o `wrangler.toml` da raiz, que o deploy usa).

## Setup local

1. Instale as dependências:

   ```sh
   npm install
   ```

2. Crie o GitHub OAuth App (Device Flow):

   - Acesse **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
     (https://github.com/settings/applications/new).
   - Preencha `Application name` (ex.: `PepeHub (dev)`) e `Homepage URL`
     (ex.: `http://localhost:4321`). O campo `Authorization callback URL` é
     obrigatório no formulário mas não é usado pelo Device Flow, pode preencher
     com a mesma homepage URL.
   - Depois de criar o app, abra **Enable Device Flow** nas configurações do app e
     salve.
   - Gere um novo `Client secret` na mesma página.

3. Copie `.env.example` para `.dev.vars` (é esse arquivo, não `.env`, que o
   `wrangler`/`astro dev` usa pra injetar os bindings/segredos em desenvolvimento
   local) e preencha com o `Client ID`/`Client secret` do passo anterior e um
   `SESSION_SECRET` gerado com `openssl rand -hex 32`:

   ```sh
   cp .env.example .dev.vars
   ```

4. Crie o banco D1 e o bucket R2 locais (veja "Banco de dados" abaixo), depois
   suba o servidor de desenvolvimento:

   ```sh
   npm run dev
   ```

## Banco de dados

- Migrations vivem em `migrations/*.sql` (formato aceito pelo `wrangler d1
  migrations`).
- Aplicar localmente (usa um D1 emulado, não toca em nada na Cloudflare):

  ```sh
  npm run db:migrations:apply:local
  ```

- Aplicar em produção (depois do banco criado e do `wrangler.toml` apontando pro
  `database_id` real, veja "Deploy"):

  ```sh
  npm run db:migrations:apply:remote
  ```

## Testes

```sh
npm test
```

## Deploy

1. `wrangler login` (uma vez, autentica a CLI na conta Cloudflare).
2. `wrangler d1 create pepehub` e cole o `database_id` retornado em
   `wrangler.toml`.
3. `wrangler r2 bucket create pepehub-artifacts`.
4. `npm run db:migrations:apply:remote`.
5. `npm run build && wrangler deploy --config dist/server/wrangler.json`,
   que publica o Worker (bindings de D1/R2 já vêm do `wrangler.toml` da raiz,
   propagados pro config gerado no build).
6. Configure os secrets de produção:

   ```sh
   wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
   wrangler secret put SESSION_SECRET
   ```

   (`GITHUB_OAUTH_CLIENT_ID` não é secreto, pode ir em `[vars]` no
   `wrangler.toml` ou também via `wrangler secret put`, tanto faz.)

7. Repita o passo 2 do "Setup local" pra criar um segundo GitHub OAuth App
   (produção), com a `Homepage URL` de produção (`https://hub.pepe-agent.com`).
8. Domínio customizado (uma vez): `wrangler.toml` não declara rotas, o domínio
   `hub.pepe-agent.com` foi anexado ao Worker via a API de Workers Custom
   Domains (`PUT /accounts/:id/workers/domains`), não pelo dashboard de Pages.

### Deploy automático (CI)

`.github/workflows/deploy.yml` roda `npm test` e, se passar, `npm run build
&& wrangler deploy` em todo push pro `main`. Migrations de D1 continuam
manuais (passo 4 acima), de propósito: schema em produção sem revisão humana
é arriscado demais pra automatizar.

Setup único: crie um API Token na Cloudflare (**My Profile → API Tokens →
Create Token → template "Edit Cloudflare Workers"**, escopado só pra essa
conta) e salve como secret do repositório:

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo pepe-agent/pepehub
```

## Marcar um pacote como "oficial"

Curadoria manual na v1: não existe rota pública pra isso. Direto no D1 de
produção:

```sh
wrangler d1 execute pepehub --remote \
  --command "UPDATE packages SET official = 1, updated_at = datetime('now') WHERE name = '@handle/nome';"
```

Pra reverter, o mesmo comando com `official = 0`.

## Marcar um pacote como "featured"

Mesma curadoria manual, mesmo mecanismo, controla a ordenação "Featured" da
home:

```sh
wrangler d1 execute pepehub --remote \
  --command "UPDATE packages SET featured = 1, updated_at = datetime('now') WHERE name = '@handle/nome';"
```

## Varredura de segurança (VirusTotal)

`VIRUSTOTAL_API_KEY` é opcional (`wrangler secret put VIRUSTOTAL_API_KEY`).
Sem ela, toda varredura termina em `error` de propósito, nunca bloqueia
publish/install. Crie uma conta e uma API key em virustotal.com.

## Publisher confiável (CI/OIDC do GitHub Actions)

Depois de registrar um publisher confiável
(`POST /api/v1/packages/<name>/trusted-publisher`, autenticado normalmente),
um workflow do GitHub Actions publica sem sessão de login humana, só com um
token OIDC:

```yaml
permissions:
  id-token: write
steps:
  - id: pepehub-token
    run: |
      TOKEN=$(curl -sS -H "Authorization: Bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
        "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=pepehub" | jq -r .value)
      echo "token=$TOKEN" >> "$GITHUB_OUTPUT"
```

A audiência precisa ser exatamente `pepehub` (`src/lib/trustedPublisher.ts`
`OIDC_AUDIENCE`), é assim que o PepeHub distingue um token emitido pra ele
de um token pra qualquer outro serviço.

## Telemetria de instalação

Opcional e agregada: só grava um evento numa instalação (`GET .../versions/
<version>/download`) autenticada e bem-sucedida. Pra desativar, envie o
header `X-PepeHub-No-Telemetry` (qualquer valor) na chamada de download.
