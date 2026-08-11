## Purpose

API pública de leitura do PepeHub: busca, metadata de pacotes/skills, listagem
de versões e download de artefato. Sem autenticação, pensada pra ser consumida
pela CLI do Pepe e por qualquer outro cliente.

## Requirements

### Requirement: Buscar pacotes e skills por texto
O sistema SHALL permitir buscar pacotes e skills publicados por um termo de texto
livre, sem exigir autenticação.

#### Scenario: Busca com resultados
- **WHEN** um cliente chama `GET /api/v1/search?q=<termo>`
- **THEN** o sistema SHALL retornar uma lista de itens que casam com o termo (nome,
  resumo ou dono), cada um com `name`, `kind`, `category`, `summary`, `official`
- **AND** a resposta SHALL incluir um `nextCursor` quando houver mais resultados

#### Scenario: Busca sem resultados
- **WHEN** o termo buscado não casa com nenhum pacote ou skill publicado
- **THEN** o sistema SHALL retornar uma lista vazia com status `200`, nunca `404`

### Requirement: Filtrar a busca por categoria
O sistema SHALL permitir restringir a busca a uma única categoria da lista fixa
(ver `package-categories`).

#### Scenario: Busca filtrada por categoria válida
- **WHEN** um cliente chama `GET /api/v1/search?category=<categoria>`
- **THEN** o sistema SHALL retornar só os itens cuja `category` bate com
  `<categoria>`

#### Scenario: Busca filtrada por categoria inexistente
- **WHEN** um cliente chama `GET /api/v1/search?category=<categoria>` com uma
  categoria que não existe na lista fixa
- **THEN** o sistema SHALL retornar `400`

### Requirement: Consultar metadata de um pacote ou skill
O sistema SHALL expor a metadata completa de um pacote/skill publicado por nome,
sem autenticação.

#### Scenario: Pacote existe
- **WHEN** um cliente chama `GET /api/v1/packages/<name>`
- **THEN** o sistema SHALL retornar `name`, `kind`, `category`, `owner`, `summary`,
  `official`, `latestVersion`, `createdAt`, `updatedAt`

#### Scenario: Pacote não existe
- **WHEN** `<name>` não corresponde a nenhum pacote publicado
- **THEN** o sistema SHALL retornar `404`

### Requirement: Listar versões publicadas de um pacote
O sistema SHALL listar todas as versões publicadas de um pacote, em ordem
cronológica.

#### Scenario: Pacote com múltiplas versões
- **WHEN** um cliente chama `GET /api/v1/packages/<name>/versions`
- **THEN** o sistema SHALL retornar a lista de versões, cada uma com `version`,
  `sha256`, `sizeBytes`, `createdAt`, `changelog`, `requires`
- **AND** a lista SHALL vir ordenada da mais recente pra mais antiga
- **AND** `requires` SHALL ser `null` quando a versão não declarou nenhum

### Requirement: Baixar o artefato de uma versão publicada
O sistema SHALL permitir baixar o artefato binário de uma versão específica, sem
autenticação, com garantia de integridade.

#### Scenario: Download de uma versão existente
- **WHEN** um cliente chama `GET /api/v1/packages/<name>/versions/<version>/download`
- **THEN** o sistema SHALL retornar o artefato binário com status `200`
- **AND** a resposta SHALL incluir os headers `X-PepeHub-Sha256` e `Content-Length`
  batendo com o que está registrado no D1

#### Scenario: Download de uma versão inexistente
- **WHEN** `<version>` não existe para o pacote `<name>`
- **THEN** o sistema SHALL retornar `404`

### Requirement: Toda leitura funciona sem autenticação
O sistema SHALL nunca exigir sessão ou token pra busca, metadata, listagem de
versões ou download.

#### Scenario: Chamada de leitura sem header de autorização
- **WHEN** qualquer uma das rotas de leitura acima é chamada sem o header
  `Authorization`
- **THEN** o sistema SHALL responder normalmente, sem `401`
