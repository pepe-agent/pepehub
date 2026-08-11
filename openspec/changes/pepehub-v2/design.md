## Context

Este change constrói sobre o schema e a infra que o `pepehub-mvp` já define
(`owners`, `packages`, `package_versions`, `dist_tags`, o bucket R2, a sessão
via GitHub Device Flow) — não recria nada disso, só adiciona tabelas e rotas
novas. O `pepehub-mvp` ainda está em implementação; este change não edita
nenhum arquivo dele, só assume que essas peças existirão.

O desenho abaixo foi calibrado depois de uma varredura completa de como um
concorrente direto resolve os mesmos problemas (limite de taxa, varredura de
segurança, moderação, ciclo de vida de pacote, publisher confiável via CI,
compatibilidade com npm) — a forma das decisões é comparável de propósito
(não faz sentido reinventar o que já foi validado publicamente), mas nomes,
tokens, motores de varredura e a marca são todos originais deste projeto.

## Goals / Non-Goals

**Goals:**
- Limite de taxa que protege o serviço sem precisar de autenticação pra usar
  a leitura pública.
- Um sinal de confiança acionável (varredura de segurança) antes de alguém
  instalar um pacote de terceiro.
- Um caminho real pra remover algo malicioso do ar, com apelação pra quem foi
  removido por engano.
- As operações de manutenção que um pacote público eventualmente precisa
  (apagar, renomear, transferir) sem perder o histórico de versões.

**Non-Goals:**
- Construir um motor de análise estática/malware próprio — v2 integra com um
  serviço de terceiros existente.
- Um sistema de moderação com aprendizado de máquina próprio — a fila de
  moderação nesta v2 é revisão humana, com a varredura automática como sinal
  de entrada, não decisão final.
- Suporte a outro provedor de OAuth além do GitHub (mantém a decisão do MVP).
- Preço/monetização de pacote (fora de escopo, igual ao MVP).

## Decisions

### Limite de taxa

Duas categorias, avaliadas por prefixo de rota (leitura = GET não autenticado
específico de metadata/busca/download; escrita = POST/DELETE de publish,
denúncia, favoritar, etc.):

| Categoria | Anônimo (por IP) | Autenticado (por sessão) |
|---|---|---|
| Leitura | 600/min | 3000/min |
| Escrita | 60/min | 600/min |

Headers de resposta: `RateLimit-Limit`, `RateLimit-Remaining`,
`RateLimit-Reset`, e `Retry-After` no `429`. Implementado com o Rate
Limiting nativo da Cloudflare (binding no `wrangler.toml`), não uma tabela
D1 - contar limite de taxa em D1 seria escrita síncrona em todo request, o
que o design do `pepehub-mvp` já evita deliberadamente pra contagem de
download.

### Varredura de segurança (`artifact-scanning`)

Tabela nova:

```sql
CREATE TABLE artifact_scans (
  id INTEGER PRIMARY KEY,
  package_version_id INTEGER NOT NULL REFERENCES package_versions(id),
  status TEXT NOT NULL CHECK (status IN
    ('pending', 'clean', 'review', 'warning', 'malicious', 'error')),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  findings_json TEXT,           -- lista de achados: severidade, mensagem, arquivo
  provider TEXT,                -- qual serviço de terceiros respondeu
  provider_ref TEXT,             -- id da análise no serviço de terceiros, se houver
  scanned_at TEXT,
  created_at TEXT NOT NULL
);
```

Fluxo: publicar uma versão enfileira uma varredura (fora do caminho crítico
do publish - o publish não espera o resultado). Enquanto `pending`, o pacote
continua instalável normalmente (uma varredura pendente não é motivo pra
bloquear, só falta de informação ainda). Um veredito `malicious` bloqueia o
download daquela versão especificamente (`403`, não afeta outras versões do
mesmo pacote). `status` e `risk_level` são eixos independentes - um pacote
pode ser `review` + `high` (funciona como anunciado, mas com autoridade
real, então merece uma leitura antes de instalar) sem ser `malicious`.

Integração: uma chamada HTTP pra um serviço de reputação de arquivo de
terceiros (ex.: a API pública do VirusTotal) roda como o `provider` inicial;
se o serviço estiver fora do ar, a varredura fica em `error`, e o pacote
segue instalável (o risco de um `error` nunca é maior que o de não ter
varredura nenhuma, que é o estado do `pepehub-mvp` hoje).

### Moderação

```sql
CREATE TABLE package_reports (
  id INTEGER PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages(id),
  package_version_id INTEGER REFERENCES package_versions(id),
  reporter_owner_id INTEGER REFERENCES owners(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN
    ('open', 'confirmed', 'dismissed')),
  triage_note TEXT,
  triaged_by_owner_id INTEGER REFERENCES owners(id),
  triaged_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE package_moderation_state (
  package_id INTEGER PRIMARY KEY REFERENCES packages(id),
  state TEXT NOT NULL DEFAULT 'visible' CHECK (state IN
    ('visible', 'held', 'hidden', 'blocked')),
  reason TEXT,
  changed_by_owner_id INTEGER REFERENCES owners(id),
  changed_at TEXT NOT NULL
);
```

`held` (em revisão, ainda listado mas com aviso), `hidden` (some da busca e
navegação, dono ainda acessa pra corrigir), `blocked` (download recusado pra
todo mundo, inclusive o dono, até revisão). Um `owner` marcado como operador
(campo booleano simples no schema do `pepehub-mvp`, não uma role separada)
pode transicionar esse estado; um dono comum só vê o estado do próprio
pacote e pode apelar (grava uma nova linha em `package_reports` com
`reason` prefixado, sem uma tabela de apelação separada - simplicidade
deliberada pro v2).

### Ciclo de vida de pacote

Sem tabela nova - usa colunas em `packages`:

```sql
ALTER TABLE packages ADD COLUMN deleted_at TEXT;
ALTER TABLE packages ADD COLUMN renamed_from TEXT;  -- nome anterior, se veio de rename
```

Apagar é sempre soft-delete (`deleted_at` setado, artefatos no R2
preservados) - nunca uma exclusão física, pra uma transferência ou apelação
posterior não perder histórico. Renomear grava o nome antigo em
`renamed_from` de uma linha nova e mantém a linha antiga como redirecionamento
(uma consulta por nome antigo resolve pro nome novo, `301` semântico em
HTTP). Transferir é uma troca só de `owner_id`, condicionada a um aceite
explícito de quem recebe (mesmo padrão do handshake de dois passos que o
`pepehub-mvp` já não tem, mas o `publisher-auth` dele já dá a base de sessão
pra isso).

### Publisher confiável (CI/OIDC)

```sql
CREATE TABLE trusted_publishers (
  package_id INTEGER PRIMARY KEY REFERENCES packages(id),
  provider TEXT NOT NULL DEFAULT 'github-actions',
  repository TEXT NOT NULL,        -- "owner/repo"
  workflow_filename TEXT NOT NULL,
  environment TEXT,
  created_at TEXT NOT NULL
);
```

Uma vez configurado (por um dono autenticado, via sessão normal), uma
publicação subsequente aceita um token OIDC do GitHub Actions em vez de uma
sessão de usuário - o backend valida o token contra o `repository` e
`workflow_filename` registrados antes de aceitar o publish. Não reimplementa
verificação de OIDC do zero: usa a biblioteca de verificação de JWT padrão
contra o emissor de tokens do GitHub Actions.

### Publicar direto de um repositório

Publish aceita `source: { repo, ref }` no lugar do upload de artefato -
nesse caso o backend clona o repositório (raso, só o `ref` pedido), empacota
o conteúdo do jeito que o `pepehub-mvp` já empacota um upload manual, e segue
o mesmo fluxo de content-addressing/validação de namespace. Repositórios
privados, forks e repositórios arquivados são recusados (`422`) - a mesma
assimetria que o concorrente estudado aplica, por um motivo real: validar
proveniência de um fork ou repo privado exigiria acesso que o backend não
deveria ter por padrão.

### Endpoint compatível com npm

`GET /api/npm/{name}` retorna um "packument" no formato que o `npm` /
`pnpm` / `yarn` já sabem ler (`dist-tags`, `versions`, cada versão com
`dist.tarball` apontando pro artefato real, `dist.integrity`,
`dist.shasum`), só pra pacotes do tipo `plugin` (que já são empacotados como
tarball no `pepehub-mvp`). Não é um registro npm completo - é uma casca
somente-leitura sobre o schema já existente, pra quem já tem tooling Node
não precisar reaprender um cliente novo.

### Telemetria de instalação

```sql
CREATE TABLE install_events (
  id INTEGER PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages(id),
  owner_id INTEGER REFERENCES owners(id),  -- null quando anônimo/opt-out
  first_install_at TEXT NOT NULL,
  UNIQUE (package_id, owner_id)
);
```

Só grava em instalação bem-sucedida, e só quando o cliente está autenticado
e não desativou via variável de ambiente. `UNIQUE (package_id, owner_id)`
faz a contagem de "instaladores únicos" ser uma contagem de linhas, sem
lógica de deduplicação separada. Nenhum caminho de arquivo, conteúdo ou
prompt do usuário é gravado - só o par pacote/instalador e quando.

## Risks / Trade-offs

- **Depender de um serviço de terceiros pra varredura** é um ponto de falha
  externo - mitigado por `error`/`pending` nunca bloquearem o registro de
  funcionar, só a confiança adicional que a varredura daria.
- **Moderação por revisão humana não escala infinitamente** - aceitável pro
  v2; automatizar a triagem (ex.: threshold de denúncias repetidas
  auto-escalando) fica pra depois, não é non-goal permanente, só não é hoje.
- **O endpoint compatível com npm expõe o formato interno de artefato a
  clientes fora do nosso controle** - mitigado por ser somente leitura e
  content-addressed do mesmo jeito que o download normal; não é uma
  superfície de escrita nova.
