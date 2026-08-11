## ADDED Requirements

### Requirement: Um dono pode registrar um publisher confiável
O sistema SHALL permitir que o dono de um pacote registre um repositório e
workflow do GitHub Actions autorizado a publicar sem sessão de login humana.

#### Scenario: Registro do publisher confiável
- **WHEN** o dono, autenticado normalmente, registra `repository` e
  `workflowFilename` pra um pacote seu
- **THEN** o sistema SHALL gravar essa configuração vinculada ao pacote

#### Scenario: Só o dono pode registrar
- **WHEN** alguém que não é dono do pacote tenta registrar um publisher
  confiável nele
- **THEN** o sistema SHALL retornar `403`

### Requirement: Publicar via publisher confiável valida o token OIDC
O sistema SHALL aceitar um publish autenticado por um token OIDC do GitHub
Actions no lugar de uma sessão, desde que o token corresponda ao repositório
e workflow registrados.

#### Scenario: Token OIDC válido e correspondente
- **WHEN** um publish chega com um token OIDC do GitHub Actions cujo
  `repository`/`workflow` batem com o publisher confiável registrado pro
  pacote
- **THEN** o sistema SHALL aceitar o publish sem exigir sessão de usuário

#### Scenario: Token OIDC de um repositório diferente
- **WHEN** o token OIDC recebido é de um repositório diferente do
  registrado pro pacote
- **THEN** o sistema SHALL retornar `403`
- **AND** o sistema SHALL NOT publicar a versão
