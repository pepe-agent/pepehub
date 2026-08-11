## 1. Bootstrap do projeto

- [x] 1.1 Criar `mise.toml` fixando a versão do Node (lts)
- [x] 1.2 Criar `package.json` e instalar o Astro com o adapter `@astrojs/cloudflare`
- [x] 1.3 Criar `.env.example` com as chaves esperadas (`GITHUB_OAUTH_CLIENT_ID`,
      `GITHUB_OAUTH_CLIENT_SECRET`, `SESSION_SECRET`) e adicionar `.env` ao
      `.gitignore`
- [x] 1.4 Criar `wrangler.toml` com os bindings de D1 e R2 (placeholders de
      `database_id`/`bucket_name` até a task 2)
- [ ] 1.5 Criar o GitHub OAuth App (com Device Flow habilitado) e documentar no
      README como preencher o `.env` local a partir dele

## 2. Banco D1 e bucket R2

- [x] 2.1 Criar o banco D1 (`wrangler d1 create pepehub`) e registrar o
      `database_id` retornado no `wrangler.toml`
- [x] 2.2 Escrever a migration inicial (`owners`, `packages`, `package_versions`,
      `dist_tags`) e os índices descritos em `design.md`
- [x] 2.3 Aplicar a migration localmente (`wrangler d1 migrations apply --local`)
- [x] 2.4 Criar o bucket R2 (`wrangler r2 bucket create pepehub-artifacts`) e
      registrar no `wrangler.toml`
- [x] 2.5 Adicionar a coluna `requires_json` em `package_versions` (migration
      incremental, adicionada depois do schema inicial da task 2.2)

## 3. API de leitura (registry-read-api)

- [x] 3.1 Implementar `GET /api/v1/search` (incluindo o filtro `?category=`)
- [x] 3.2 Implementar `GET /api/v1/packages/<name>`
- [x] 3.3 Implementar `GET /api/v1/packages/<name>/versions` (incluindo `requires`
      na resposta de cada versão)
- [x] 3.4 Implementar `GET /api/v1/packages/<name>/versions/<version>/download`
- [x] 3.5 Testes cobrindo os cenários de `specs/registry-read-api/spec.md` (existe/
      não existe, com/sem `Authorization`)

## 4. Autenticação de quem publica (publisher-auth)

- [x] 4.1 Implementar `POST /api/v1/auth/device/start` (chamada à API de Device
      Flow do GitHub)
- [x] 4.2 Implementar `POST /api/v1/auth/device/poll` (emissão do token de sessão
      opaco do PepeHub)
- [x] 4.3 Implementar `GET /api/v1/auth/whoami`
- [x] 4.4 Testes cobrindo aprovação concedida, pendente, código expirado e sessão
      inválida/ausente

## 5. Publicação de pacotes (package-publish)

- [x] 5.1 Implementar `POST /api/v1/packages/<name>/versions` com validação de
      sessão, de namespace (`403` quando o handle não bate) e de `category`
      (`400` quando não está na lista fixa)
- [x] 5.2 Implementar o cálculo de sha256 do artefato e a gravação no R2 na
      chave `packages/<handle>/<nome>/<version>.<ext>`
- [x] 5.3 Implementar a criação implícita do pacote (`official = false`) na
      primeira publicação de um nome novo
- [x] 5.4 Implementar a rejeição de versão duplicada (`409`, sem sobrescrever
      R2/D1)
- [x] 5.5 Testes cobrindo os cenários de `specs/package-publish/spec.md` (401,
      403, 409, sucesso)
- [x] 5.6 Gravar `requires` (env/bins) do manifesto em `requires_json`, verbatim
      e sem validar o conteúdo (`null` quando o manifesto não declara nada)

## 6. Site de navegação (browse-site)

- [x] 6.1 Layout base do site (nav com Skills/Plugins/Official/Docs)
- [x] 6.2 Página inicial com abas Skills/Plugins, ordenação Trending/Featured/
      Official/New, e filtro por categoria (`?category=`)
- [x] 6.3 Página de detalhe `/packages/<name>` e `/skills/<name>` (mostrando a
      categoria), incluindo o caso de 404
- [x] 6.4 Campo de busca consumindo `GET /api/v1/search`
- [x] 6.5 Página `/publish` com o passo a passo de login (Device Flow), o
      comando de publish, o formato de artefato aceito, e link pra doc do
      manifesto no site do Pepe

## 7. Marcação de confiança (trust-marking)

- [x] 7.1 Garantir que `official` aparece em toda resposta de metadata (search,
      package, versions)
- [x] 7.2 Selo "oficial" na página de detalhe e nos cartões da home
- [x] 7.3 Documentar no README como um operador marca `official = true`
      manualmente no D1 (consulta SQL de exemplo via `wrangler d1 execute`)

## 8. Categorias (package-categories)

- [x] 8.1 Definir a lista fixa de categorias como uma constante compartilhada
      entre a validação de publish e a UI de filtro (única fonte da verdade)
- [x] 8.2 Testes cobrindo os cenários de `specs/package-categories/spec.md`
      (categoria válida, inválida, ausente)

## 9. Deploy

- [x] 9.1 Deploy em produção (Cloudflare Workers — `@astrojs/cloudflare` v14+
      não roda mais como Pages, ver README) e conectar os bindings de D1/R2 de
      produção. Domínio `hub.pepe-agent.com` anexado ao Worker.
- [ ] 9.2 Configurar os secrets de produção (`wrangler secret put
      GITHUB_OAUTH_CLIENT_SECRET`, `SESSION_SECRET`)
- [x] 9.3 Rodar a migration em produção (`wrangler d1 migrations apply --remote`)
- [ ] 9.4 Validar o fluxo ponta a ponta: login, publish, busca, download
