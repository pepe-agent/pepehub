## ADDED Requirements

### Requirement: Uma sessão autenticada pode favoritar um pacote
O sistema SHALL permitir que uma sessão autenticada favorite ou desfavorite
um pacote, de forma idempotente.

#### Scenario: Favoritar
- **WHEN** um cliente autenticado favorita um pacote que ainda não tinha
  favoritado
- **THEN** o sistema SHALL registrar o favorito

#### Scenario: Favoritar de novo não duplica
- **WHEN** um cliente favorita um pacote que já tinha favoritado
- **THEN** o sistema SHALL responder com sucesso sem criar um segundo
  registro

#### Scenario: Desfavoritar sem nunca ter favoritado
- **WHEN** um cliente desfavorita um pacote que nunca tinha favoritado
- **THEN** o sistema SHALL responder com sucesso, sem erro

### Requirement: A contagem de favoritos é pública
O sistema SHALL expor a contagem total de favoritos de um pacote em toda
resposta de metadata dele, sem exigir autenticação.

#### Scenario: Contagem visível sem login
- **WHEN** qualquer cliente, autenticado ou não, consulta a metadata de um
  pacote
- **THEN** a resposta SHALL incluir a contagem de favoritos
