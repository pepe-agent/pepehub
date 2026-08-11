## Why

O Pepe já tem um cliente de skills (`mix pepe skill install`) e um registro embutido, mas
esse registro é um JSON estático empacotado junto do binário — hoje vazio, sem lugar
nenhum pra alguém publicar um plugin ou skill próprio e outra pessoa instalar. Sem um
registro hospedado e público, "instalar um plugin de terceiro" continua sendo copiar
arquivo manualmente ou apontar pra um repositório Git específico. O PepeHub é esse
registro: um lugar único, público, onde qualquer pessoa publica (autenticada via GitHub)
e qualquer instalação do Pepe busca e baixa.

## What Changes

- Cria a API pública de leitura (buscar, listar, ver metadata de um pacote/skill, ver
  versões, baixar o artefato) — sem autenticação, pensada pra ser consumida pela CLI do
  Pepe e por qualquer outro cliente.
- Cria o fluxo de autenticação de quem publica, via GitHub OAuth Device Flow (mesmo
  modelo do `gh` CLI: mostra um código, a pessoa aprova no navegador, a sessão é
  emitida).
- Cria o fluxo de publicação: valida o manifesto do pacote, calcula o hash do
  artefato, grava no R2, registra a versão no D1, garante que o namespace
  (`@<handle>/<nome>`) bate com quem está publicando.
- Cria o site de navegação (Astro, renderizado sob demanda): busca, listagem por
  categoria/ordenação, página de detalhe de um pacote/skill.
- Cria uma página estática de "como publicar" (login, formato aceito, comando de
  publish) — focada só no que é específico de publicar no PepeHub; o formato do
  manifesto em si continua documentado no site do Pepe, sem duplicar conteúdo.
- Cria a marcação de "oficial": uma flag booleana no pacote, curada manualmente por
  um operador do PepeHub, refletida na API e no site.
- Cria a categorização de pacotes: uma lista fixa e curada de categorias (não tags
  livres), escolhida no manifesto de publish, usada pra filtrar a busca e agrupar
  a navegação do site.

## Capabilities

### New Capabilities
- `registry-read-api`: API pública (sem auth) de busca, metadata, versões e download
  de artefato de pacotes e skills.
- `publisher-auth`: login via GitHub OAuth Device Flow e gestão da sessão de quem
  publica.
- `package-publish`: publicação autenticada de uma nova versão de um pacote ou skill,
  com validação de namespace e content-addressing do artefato.
- `browse-site`: site em Astro pra navegar, buscar e ver o detalhe de um pacote/skill
  publicado.
- `trust-marking`: flag `official` curada manualmente, exposta na API e no site.
- `package-categories`: lista fixa de categorias, atribuída no publish e usada pra
  filtrar/agrupar a busca e a navegação.

### Modified Capabilities
(nenhuma — este é o primeiro change do projeto, não há specs existentes ainda)

## Impact

- **Novo projeto** (`pepehub`), sem nenhuma dependência de código com o Pepe (`../pepe`)
  — os dois só vão se falar por HTTP depois que essa v1 estiver no ar.
- **Infra nova**: um projeto Cloudflare Pages, um banco D1, um bucket R2, e um GitHub
  OAuth App (Device Flow) pra autenticar quem publica.
- **Fora deste change** (fica pra depois, não é non-goal permanente): a mudança do
  lado do Pepe (`mix pepe skill/plugin publish` apontando pra essa API) — este change
  só entrega a API e o site; o cliente consome uma vez que a API estiver estável.
