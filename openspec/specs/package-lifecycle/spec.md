## Purpose

Ciclo de vida completo de um pacote: apagar e restaurar (soft delete),
renomear (com redirecionamento do nome antigo) e transferir de dono (com
aceite explícito de quem recebe).

## Requirements

### Requirement: Apagar um pacote é sempre reversível
O sistema SHALL marcar um pacote como apagado (`deleted_at`) em vez de
excluí-lo fisicamente, preservando os artefatos já publicados no R2.

#### Scenario: Dono apaga o próprio pacote
- **WHEN** o dono de um pacote pede pra apagá-lo
- **THEN** o sistema SHALL gravar `deleted_at`
- **AND** o pacote SHALL parar de aparecer na busca e na navegação
- **AND** os artefatos dele no R2 SHALL NOT ser removidos

#### Scenario: Restaurar um pacote apagado
- **WHEN** o dono (ou um operador) pede pra restaurar um pacote apagado
- **THEN** o sistema SHALL limpar `deleted_at`
- **AND** o pacote SHALL voltar a aparecer normalmente

### Requirement: Renomear preserva o nome antigo como redirecionamento
O sistema SHALL manter o nome anterior de um pacote resolvendo pro nome novo
depois de um rename, em vez de simplesmente deixar de existir.

#### Scenario: Consultar pelo nome antigo depois de um rename
- **WHEN** um pacote é renomeado de `<antigo>` pra `<novo>`
- **AND** um cliente consulta `GET /api/v1/packages/<antigo>`
- **THEN** o sistema SHALL redirecionar (ou retornar a metadata) do pacote
  `<novo>`

#### Scenario: O nome antigo não pode ser reaproveitado por outro dono
- **WHEN** um pacote foi renomeado de `<antigo>` pra `<novo>`
- **AND** outra pessoa tenta publicar um pacote novo chamado `<antigo>`
- **THEN** o sistema SHALL recusar, já que `<antigo>` continua reservado como
  redirecionamento

### Requirement: Transferir de dono exige aceite de quem recebe
O sistema SHALL exigir que o novo dono aceite explicitamente antes de uma
transferência de propriedade se efetivar.

#### Scenario: Transferência pendente de aceite
- **WHEN** o dono atual solicita a transferência de um pacote pra outro
  handle
- **THEN** o sistema SHALL criar um pedido de transferência pendente
- **AND** o pacote SHALL continuar com o dono atual até o aceite

#### Scenario: Aceite conclui a transferência
- **WHEN** o handle de destino aceita o pedido pendente
- **THEN** o sistema SHALL trocar o dono do pacote
- **AND** o namespace do pacote (`@handle/nome`) SHALL passar a exigir o
  handle do novo dono em publicações futuras
