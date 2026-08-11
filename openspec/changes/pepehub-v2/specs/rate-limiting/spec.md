## ADDED Requirements

### Requirement: Toda rota da API tem um limite de taxa
O sistema SHALL aplicar um limite de taxa a toda rota `/api/v1/*`, diferenciado
por categoria (leitura ou escrita) e por identidade (IP anônimo ou sessão
autenticada).

#### Scenario: Chamada de leitura dentro do limite
- **WHEN** um cliente faz uma chamada de leitura (busca, metadata, download)
  dentro do limite da sua categoria
- **THEN** o sistema SHALL responder normalmente
- **AND** a resposta SHALL incluir os headers `RateLimit-Limit`,
  `RateLimit-Remaining`, `RateLimit-Reset`

#### Scenario: Chamada além do limite
- **WHEN** um cliente excede o limite da sua categoria e identidade
- **THEN** o sistema SHALL retornar `429`
- **AND** a resposta SHALL incluir o header `Retry-After`

### Requirement: Autenticação amplia o limite
O sistema SHALL conceder um limite maior a uma chamada autenticada do que a
uma chamada anônima da mesma categoria.

#### Scenario: Mesma categoria, identidades diferentes
- **WHEN** uma chamada de leitura anônima e uma chamada de leitura
  autenticada são comparadas
- **THEN** o limite autenticado SHALL ser maior que o limite anônimo
