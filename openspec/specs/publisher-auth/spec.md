## Purpose

Login de quem publica no PepeHub via GitHub OAuth Device Flow (mesmo modelo do
`gh auth login`), e gestão da sessão opaca resultante.

## Requirements

### Requirement: Iniciar o login via GitHub Device Flow
O sistema SHALL iniciar um fluxo de autenticação via GitHub OAuth Device Flow
quando solicitado por um cliente.

#### Scenario: Início do login
- **WHEN** um cliente chama `POST /api/v1/auth/device/start`
- **THEN** o sistema SHALL retornar `deviceCode`, `userCode`, `verificationUri` e
  `interval`

### Requirement: Concluir o login via polling
O sistema SHALL emitir uma sessão do PepeHub assim que a pessoa aprovar o pedido
no GitHub.

#### Scenario: Aprovação concedida
- **WHEN** um cliente chama `POST /api/v1/auth/device/poll` com um `deviceCode` já
  aprovado pela pessoa no GitHub
- **THEN** o sistema SHALL retornar um token de sessão opaco do PepeHub
- **AND** o sistema SHALL NOT retornar o token de acesso do GitHub em nenhuma
  resposta ao cliente

#### Scenario: Aprovação ainda pendente
- **WHEN** um cliente chama `POST /api/v1/auth/device/poll` antes da pessoa aprovar
- **THEN** o sistema SHALL retornar um status indicando "pendente", sem token

#### Scenario: Código expirado
- **WHEN** um cliente chama `POST /api/v1/auth/device/poll` com um `deviceCode`
  expirado
- **THEN** o sistema SHALL retornar um erro indicando que o login expirou e
  precisa recomeçar

### Requirement: Consultar a identidade da sessão atual
O sistema SHALL permitir que um cliente autenticado confirme quem ele é.

#### Scenario: Sessão válida
- **WHEN** um cliente chama `GET /api/v1/auth/whoami` com um token de sessão
  válido no header `Authorization`
- **THEN** o sistema SHALL retornar o `handle` e o `githubId` do dono da sessão

#### Scenario: Sessão inválida ou ausente
- **WHEN** um cliente chama `GET /api/v1/auth/whoami` sem token ou com um token
  inválido/expirado
- **THEN** o sistema SHALL retornar `401`
