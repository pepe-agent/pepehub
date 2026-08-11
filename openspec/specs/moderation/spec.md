## Purpose

Fluxo de denúncia e moderação de um pacote/skill: qualquer pessoa denuncia,
entra numa fila de revisão, um operador pode ocultar/bloquear, com um
processo de apelação pro dono.

## Requirements

### Requirement: Qualquer pessoa pode denunciar um pacote
O sistema SHALL aceitar uma denúncia de qualquer sessão autenticada contra
um pacote ou uma versão específica.

#### Scenario: Denúncia registrada
- **WHEN** um cliente autenticado denuncia um pacote com um motivo
- **THEN** o sistema SHALL criar uma linha em `package_reports` com
  `status = open`

#### Scenario: Denúncia sem autenticação
- **WHEN** um cliente sem sessão tenta denunciar
- **THEN** o sistema SHALL retornar `401`

### Requirement: Estado de moderação controla a visibilidade
O sistema SHALL respeitar o estado de moderação de um pacote (`visible`,
`held`, `hidden`, `blocked`) em toda superfície de leitura.

#### Scenario: Pacote em held aparece com aviso
- **WHEN** um pacote está `held`
- **THEN** ele SHALL continuar aparecendo na busca e na navegação
- **AND** a resposta de metadata dele SHALL incluir o estado `held`

#### Scenario: Pacote hidden não aparece na busca
- **WHEN** um pacote está `hidden`
- **THEN** ele SHALL NOT aparecer em `GET /api/v1/search` nem na navegação
- **AND** o dono dele SHALL continuar conseguindo consultar a metadata dele
  diretamente

#### Scenario: Pacote blocked recusa download pra todo mundo
- **WHEN** um pacote está `blocked`
- **THEN** o download de qualquer versão dele SHALL retornar `403`, inclusive
  pro dono

### Requirement: Só um operador transiciona o estado de moderação
O sistema SHALL restringir a mudança de estado de moderação a uma sessão
marcada como operador.

#### Scenario: Sessão comum tenta mudar o estado
- **WHEN** uma sessão que não é de operador tenta mudar o estado de
  moderação de um pacote
- **THEN** o sistema SHALL retornar `403`

### Requirement: Um dono pode apelar de um estado de moderação
O sistema SHALL permitir que o dono de um pacote registre uma apelação
quando o pacote está `hidden` ou `blocked`.

#### Scenario: Apelação registrada
- **WHEN** o dono de um pacote `hidden`/`blocked` registra uma apelação com
  uma justificativa
- **THEN** o sistema SHALL gravar a apelação vinculada ao pacote
- **AND** um operador SHALL conseguir ver essa apelação na fila de revisão
