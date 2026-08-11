## ADDED Requirements

### Requirement: Publicar exige sessão autenticada
O sistema SHALL recusar qualquer publicação sem uma sessão válida.

#### Scenario: Publish sem autenticação
- **WHEN** um cliente chama `POST /api/v1/packages/<name>/versions` sem header
  `Authorization` válido
- **THEN** o sistema SHALL retornar `401`
- **AND** o sistema SHALL NOT gravar nada no D1 ou no R2

### Requirement: Namespace do pacote tem que bater com quem publica
O sistema SHALL recusar a publicação quando o handle do namespace não for o mesmo
da sessão autenticada.

#### Scenario: Handle não bate
- **WHEN** uma sessão autenticada como `@alice` chama
  `POST /api/v1/packages/@bob/algo/versions`
- **THEN** o sistema SHALL retornar `403`
- **AND** o sistema SHALL NOT criar o pacote nem gravar a versão

#### Scenario: Handle bate
- **WHEN** uma sessão autenticada como `@alice` chama
  `POST /api/v1/packages/@alice/algo/versions`
- **THEN** o sistema SHALL prosseguir com a publicação

### Requirement: Primeira publicação de um nome cria o pacote
O sistema SHALL criar implicitamente o registro do pacote na primeira publicação
de um nome ainda não existente.

#### Scenario: Nome novo
- **WHEN** a publicação é a primeira pra `<name>`
- **THEN** o sistema SHALL criar uma linha em `packages` com `official = false`
- **AND** o sistema SHALL gravar a versão publicada como a primeira de
  `package_versions`

### Requirement: Artefato é conferido por hash na publicação
O sistema SHALL calcular o sha256 do artefato recebido e gravá-lo junto da
versão.

#### Scenario: Upload bem-sucedido
- **WHEN** um artefato válido é enviado junto do manifesto
- **THEN** o sistema SHALL calcular o `sha256` do artefato
- **AND** o sistema SHALL gravar o artefato no R2 na chave
  `packages/<handle>/<nome>/<version>.<ext>`
- **AND** o sistema SHALL registrar `sha256`, `sizeBytes` e `r2Key` na linha de
  `package_versions`

### Requirement: Manifesto pode declarar requisitos de ambiente
O sistema SHALL aceitar um campo opcional `requires` no manifesto (`env`: lista
de variáveis de ambiente, `bins`: lista de binários), gravando-o junto da
versão sem validar se os valores existem ou fazem sentido. A checagem é
responsabilidade de quem instala, não do PepeHub.

#### Scenario: Manifesto com requires
- **WHEN** o manifesto de publish inclui `requires.env` e/ou `requires.bins`
- **THEN** o sistema SHALL gravar esse conteúdo junto da versão publicada,
  verbatim

#### Scenario: Manifesto sem requires
- **WHEN** o manifesto de publish não inclui `requires`
- **THEN** o sistema SHALL aceitar a publicação normalmente, sem exigir o campo

### Requirement: Uma versão já publicada não pode ser sobrescrita
O sistema SHALL recusar publicar de novo uma versão já existente do mesmo
pacote.

#### Scenario: Versão duplicada
- **WHEN** um cliente tenta publicar `<version>` que já existe pra `<name>`
- **THEN** o sistema SHALL retornar `409`
- **AND** o sistema SHALL NOT sobrescrever o artefato no R2 nem a linha em
  `package_versions`
