## Context

Projeto novo, greenfield — não existe nada ainda além deste change. O desenho abaixo
foi calibrado estudando a API pública de um hub de plugins concorrente (formato REST
`/api/v1`, leitura sempre pública, metadata separada do blob do artefato, artefato
content-addressed por hash) sem copiar nome nem código de lá, só a forma.

## Goals / Non-Goals

**Goals:**
- Leitura pública (busca, metadata, download) rápida e sem autenticação.
- Publish seguro: só o dono do namespace pode publicar nele, artefato íntegro
  (hash conferido na gravação e no download).
- Base simples de operar: um único deploy Cloudflare Pages, sem Worker separado,
  sem serviço de scanning próprio na v1.

**Non-Goals:**
- Scanner de segurança/malware automático — a v1 confia só na curadoria manual da
  flag `official`; scanning fica de backlog explícito para uma extensão futura de
  `trust-marking`.
- Suporte a outro storage além do R2.
- Cobrança/billing por download.
- Substituir o registro estático embutido no binário do Pepe — o PepeHub é aditivo,
  o registro embutido continua existindo como fallback offline.
- Painel de administração — curar `official` na v1 é uma operação manual direto no D1.

## Decisions

### Framework e deploy: um único Cloudflare Pages

Astro com `output: "server"` e o adapter `@astrojs/cloudflare` — o projeto inteiro
(API + site de navegação) roda como um único Cloudflare Pages, sem Worker separado.
Rotas de API em `src/pages/api/v1/*.ts`, páginas de navegação em `src/pages/*.astro`,
ambas compiladas pelo mesmo adapter e servidas pelo mesmo binding de D1/R2.

Por que não estático: o catálogo muda a cada publish. Um site puramente estático
exigiria rebuild + redeploy a cada publicação pra aparecer — o que atrasa a
visibilidade de quem acabou de publicar e complica o próprio fluxo de publish
(quem chama o redeploy?). Rotas dinâmicas lendo direto do D1 resolvem isso sem
nenhuma infra extra além do que já é necessário para a API.

### Schema D1

```sql
CREATE TABLE owners (
  id INTEGER PRIMARY KEY,
  github_id INTEGER NOT NULL UNIQUE,
  handle TEXT NOT NULL UNIQUE,          -- github login, em minúsculo
  display_name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE packages (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('plugin', 'skill')),
  name TEXT NOT NULL UNIQUE,            -- "@handle/nome"
  owner_id INTEGER NOT NULL REFERENCES owners(id),
  summary TEXT,
  category TEXT NOT NULL CHECK (category IN
    ('channel', 'tool', 'integration', 'model', 'automation', 'other')),
  official INTEGER NOT NULL DEFAULT 0,  -- boolean
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE package_versions (
  id INTEGER PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages(id),
  version TEXT NOT NULL,                -- semver
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  changelog TEXT,
  requires_json TEXT,                   -- ver "Requisitos declarados" abaixo
  created_at TEXT NOT NULL,
  UNIQUE (package_id, version)
);

CREATE TABLE dist_tags (
  package_id INTEGER NOT NULL REFERENCES packages(id),
  tag TEXT NOT NULL,                    -- "latest" | "alpha" | "beta" | ...
  version TEXT NOT NULL,
  PRIMARY KEY (package_id, tag)
);
```

Índices: `packages(name)` já é único; adicionar `packages(kind, official)` pro
filtro da aba "Official"; `packages(category)` pro filtro por categoria;
`package_versions(package_id, created_at)` pra listar versões em ordem sem full
scan.

### Categorias

Lista fixa e curada (não tags livres) — cada pacote/skill declara **uma**
categoria no manifesto de publish, validada contra a lista no momento do
publish (`400` se a categoria não existir). Taxonomia inicial pra v1, pensada
pra cobrir o que um plugin/skill do Pepe costuma ser, não uma cópia de
taxonomia de outro produto:

- `channel` — adiciona um canal/gateway (ex.: um novo provedor de mensagens)
- `tool` — adiciona uma ferramenta que o agente pode chamar
- `integration` — conecta a um serviço externo (CRM, calendário, planilha, ...)
- `model` — conecta ou documenta uma conexão de modelo
- `automation` — fluxo, agendamento, ou automação de várias etapas
- `other` — não se encaixa em nenhuma das anteriores

Essa lista não é definitiva — é fácil de estender (é só adicionar um valor no
`CHECK` da coluna e na constante compartilhada da API), mas cada extensão é uma
decisão deliberada de um operador, igual à curadoria de `official`, nunca uma
tag livre que qualquer publish inventa.

### Requisitos declarados (`requires`)

Uma versão pode declarar, no manifesto de publish, o que o ambiente precisa ter
pra rodar — variáveis de ambiente e binários — no mesmo espírito do
`requires.env`/`requires.bins` de outros ecossistemas de skill:

```json
{ "requires": { "env": ["TODOIST_API_KEY"], "bins": ["curl"] } }
```

O PepeHub só **guarda e expõe** isso (`requires_json`, sem parsing/validação
de que os valores fazem sentido) — quem checa se o binário existe ou a env
está setada é o cliente instalando (o Pepe), na hora de carregar a skill/plugin,
não o PepeHub. É uma checagem de presença que impede a skill de carregar sem
o requisito, nunca um instalador automático — o PepeHub não
tem, e não deveria ter, a responsabilidade de instalar nada na máquina de
ninguém.

### Layout R2

Uma chave por versão, previsível a partir do nome + versão (não a partir do hash,
justamente pra ser previsível): `packages/<handle>/<nome>/<version>.tgz` (plugin) ou
`.zip` (skill). O sha256 vive só no D1, nunca compõe a chave — assim uma versão nova
nunca colide com a anterior, e a chave de uma versão publicada nunca muda.

### Fluxo de autenticação (GitHub OAuth Device Flow)

1. `POST /api/v1/auth/device/start` chama a API de Device Flow do GitHub e devolve
   `device_code`, `user_code`, `verification_uri`, `interval`.
2. O cliente mostra `user_code` + link pra pessoa, e passa a chamar
   `POST /api/v1/auth/device/poll` (com o `device_code`) no intervalo indicado.
3. Quando a pessoa aprova no GitHub, o poll retorna um token de sessão do PepeHub
   (opaco, assinado, TTL longo) — não o token do GitHub em si, que fica só no
   backend, usado uma vez pra resolver `handle`/`github_id` e nunca devolvido ao
   cliente.
4. Toda chamada de publish carrega esse token em `Authorization: Bearer <token>`.

Justificativa: é o mesmo modelo do `gh auth login` — funciona sem precisar de um
servidor de callback rodando na máquina de quem publica, o que importa pra uma CLI
que roda em qualquer lugar (terminal remoto, CI, etc.).

### Fluxo de publish

1. Cliente autenticado envia `POST /api/v1/packages/<name>/versions` com o
   manifesto (JSON) e o artefato (multipart).
2. O servidor resolve o `handle` a partir da sessão e confere que `<name>` começa
   com `@<handle>/` — não bate, `403`.
3. Calcula o sha256 do artefato recebido, grava no R2 na chave determinística,
   insere a linha em `package_versions`, atualiza `dist_tags` (`latest` por
   padrão, ou a tag pedida no manifesto).
4. Se `<name>` ainda não existe em `packages`, a linha é criada nesse mesmo
   request (a primeira publicação de um nome novo cria o pacote implicitamente,
   sempre com `official = false`).

### Versionamento

Semver puro (`MAJOR.MINOR.PATCH[-prerelease]`), sem esquema de calendário.
Checar atualização = comparar a versão instalada com `dist_tags.latest`.

## Risks / Trade-offs

- **Sem scanner de segurança na v1**: um pacote malicioso pode ser publicado e
  ficar listado até alguém reportar manualmente. O non-goal é aceitável pro MVP,
  mas precisa de uma entrada de backlog explícita — scanning é a extensão natural
  de `trust-marking` mais pra frente, não algo pra reinventar agora.
- **D1 no free tier tem limite de escrita diária** (cerca de 100k linhas
  escritas/dia). Publish é raro o bastante pra isso não ser problema, mas download
  NÃO pode escrever no D1 a cada request — se um contador de downloads existir,
  tem que ser agregado/assíncrono, nunca incrementado de forma síncrona em todo GET.
- **Device Flow depende do GitHub estar no ar**, sem login alternativo na v1 —
  risco aceito, é o mesmo que o `gh` CLI aceita.
