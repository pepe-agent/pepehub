## ADDED Requirements

### Requirement: Publicar direto de um repositório público
O sistema SHALL aceitar `source: { repo, ref }` como alternativa ao upload
manual de artefato, empacotando o conteúdo do `ref` pedido do jeito que um
upload normal seria empacotado.

#### Scenario: Publish a partir de um repositório público
- **WHEN** o manifesto de publish declara `source.repo` e `source.ref`
  apontando pra um repositório público e não arquivado
- **THEN** o sistema SHALL clonar rasamente esse `ref`, empacotar o conteúdo
  e seguir o mesmo fluxo de validação de namespace e content-addressing do
  upload manual

### Requirement: Repositório privado, fork ou arquivado é recusado
O sistema SHALL recusar publicar a partir de um repositório privado, um
fork, ou um repositório arquivado.

#### Scenario: Repositório privado
- **WHEN** `source.repo` aponta pra um repositório privado
- **THEN** o sistema SHALL retornar `422`
- **AND** o sistema SHALL NOT publicar nada

#### Scenario: Repositório é um fork
- **WHEN** `source.repo` aponta pra um repositório marcado como fork
- **THEN** o sistema SHALL retornar `422`

#### Scenario: Repositório arquivado
- **WHEN** `source.repo` aponta pra um repositório arquivado
- **THEN** o sistema SHALL retornar `422`
