## ADDED Requirements

### Requirement: Flag "oficial" é exposta na API e no site
O sistema SHALL expor se um pacote é oficial em toda resposta de metadata da API
e em toda página que o exiba.

#### Scenario: Pacote oficial
- **WHEN** um pacote tem `official = true`
- **THEN** toda resposta de metadata dele na API SHALL incluir `"official": true`
- **AND** a página de detalhe dele no site SHALL mostrar um selo de "oficial"

#### Scenario: Pacote não oficial (padrão)
- **WHEN** um pacote nunca foi marcado como oficial
- **THEN** toda resposta de metadata dele SHALL incluir `"official": false`
- **AND** nenhum selo de "oficial" SHALL aparecer na página de detalhe dele

### Requirement: Curadoria de "oficial" é manual na v1
O sistema SHALL NOT expor, na v1, nenhum endpoint público que permita marcar um
pacote como oficial. Apenas um operador com acesso direto ao D1 pode alterar
essa flag.

#### Scenario: Tentativa de marcar como oficial por uma rota pública
- **WHEN** qualquer cliente, autenticado ou não, tenta encontrar uma rota da API
  documentada que altere `official`
- **THEN** o sistema SHALL NOT ter nenhuma rota pública com esse efeito
