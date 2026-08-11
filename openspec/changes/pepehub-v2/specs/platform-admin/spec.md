## ADDED Requirements

### Requirement: Um operador pode banir um publisher
O sistema SHALL permitir que um operador baniba um publisher, ocultando
todos os pacotes dele imediatamente.

#### Scenario: Banimento
- **WHEN** um operador bane um publisher com um motivo
- **THEN** o sistema SHALL marcar o publisher como banido
- **AND** todo pacote dele SHALL passar pro estado de moderação `hidden`

#### Scenario: Sessão comum tenta banir
- **WHEN** uma sessão que não é de operador tenta banir um publisher
- **THEN** o sistema SHALL retornar `403`

### Requirement: Desbanir reverte a ocultação em massa
O sistema SHALL permitir que um operador desbaniba um publisher, revertendo
os pacotes dele que tinham sido ocultados só por causa do banimento.

#### Scenario: Desbanimento
- **WHEN** um operador desbane um publisher previamente banido
- **THEN** os pacotes dele que estavam `hidden` só por causa do banimento
  SHALL voltar a `visible`

### Requirement: Um nome pode ser reservado preventivamente
O sistema SHALL permitir que um operador reserve um nome de pacote ou handle
antes de alguém publicar nele, impedindo publicação por qualquer outra
pessoa.

#### Scenario: Nome reservado recusa publish de terceiro
- **WHEN** um nome está reservado por um operador
- **AND** alguém que não é o destinatário da reserva tenta publicar nesse
  nome
- **THEN** o sistema SHALL recusar a publicação
