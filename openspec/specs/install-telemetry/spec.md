## Purpose

Contagem agregada e opcional de instaladores únicos por pacote, com
opt-out, sem gravar caminho de arquivo, conteúdo ou prompt do usuário.

## Requirements

### Requirement: Instalação bem-sucedida registra um evento agregável
O sistema SHALL registrar, só em uma instalação bem-sucedida e autenticada,
o par pacote/instalador, nunca caminho de arquivo, conteúdo, ou prompt do
usuário.

#### Scenario: Instalação autenticada registra o evento
- **WHEN** uma instalação autenticada termina com sucesso
- **THEN** o sistema SHALL gravar um evento com o pacote e o instalador
- **AND** o evento SHALL NOT conter caminho de arquivo, conteúdo do pacote,
  ou qualquer texto de prompt do usuário

#### Scenario: Instalação anônima não gera evento
- **WHEN** uma instalação acontece sem sessão autenticada
- **THEN** o sistema SHALL NOT registrar nenhum evento de telemetria

### Requirement: Opt-out por variável de ambiente é respeitado
O sistema SHALL aceitar um cabeçalho indicando que o cliente desativou
telemetria, e SHALL NOT gravar nenhum evento quando presente.

#### Scenario: Cliente com telemetria desativada
- **WHEN** uma instalação chega com o cabeçalho de opt-out
- **THEN** o sistema SHALL NOT gravar nenhum evento, mesmo que a instalação
  seja autenticada e bem-sucedida

### Requirement: A contagem exposta é agregada, nunca individual
O sistema SHALL expor só a contagem de instaladores únicos de um pacote,
nunca a lista de quem instalou.

#### Scenario: Metadata mostra só o total
- **WHEN** um cliente consulta a metadata de um pacote
- **THEN** a resposta SHALL incluir a contagem total de instaladores únicos
- **AND** a resposta SHALL NOT incluir a identidade de nenhum instalador
