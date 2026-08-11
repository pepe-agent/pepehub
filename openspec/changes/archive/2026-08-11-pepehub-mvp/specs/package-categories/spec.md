## ADDED Requirements

### Requirement: Categoria é escolhida de uma lista fixa e curada
O sistema SHALL exigir que todo pacote/skill publicado declare exatamente uma
categoria, escolhida de uma lista fixa mantida pelo PepeHub, nunca uma tag
livre digitada por quem publica.

#### Scenario: Publish com categoria válida
- **WHEN** o manifesto de publish declara uma `category` que existe na lista
  fixa
- **THEN** o sistema SHALL aceitar a publicação e gravar a categoria na linha
  de `packages`

#### Scenario: Publish com categoria inválida
- **WHEN** o manifesto de publish declara uma `category` que não existe na
  lista fixa
- **THEN** o sistema SHALL retornar `400` e SHALL NOT criar o pacote nem
  gravar a versão

#### Scenario: Publish sem categoria
- **WHEN** o manifesto de publish não declara nenhuma `category`
- **THEN** o sistema SHALL retornar `400`

### Requirement: Categoria é exposta na API
O sistema SHALL incluir a categoria de um pacote em toda resposta de metadata
que já inclui `kind` e `official`.

#### Scenario: Metadata inclui a categoria
- **WHEN** um cliente consulta a metadata de um pacote publicado
- **THEN** a resposta SHALL incluir o campo `category`
