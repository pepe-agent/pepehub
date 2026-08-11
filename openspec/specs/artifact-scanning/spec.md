## Purpose

Pipeline assíncrono de varredura de segurança de um artefato publicado, com
veredito (`status`) e nível de risco (`risk_level`) como eixos independentes,
integrando com um serviço de reputação de arquivo de terceiros.

## Requirements

### Requirement: Toda versão publicada é enfileirada pra varredura
O sistema SHALL enfileirar uma varredura de segurança assim que uma versão é
publicada, sem que o publish espere o resultado.

#### Scenario: Publish enfileira a varredura
- **WHEN** uma versão é publicada com sucesso
- **THEN** o sistema SHALL criar uma linha de varredura com `status = pending`
- **AND** o publish SHALL retornar antes da varredura terminar

### Requirement: Uma varredura pendente não bloqueia a instalação
O sistema SHALL permitir instalar uma versão cuja varredura ainda está
`pending` ou terminou em `error`.

#### Scenario: Download com varredura pendente
- **WHEN** um cliente baixa uma versão cuja varredura está `pending` ou
  `error`
- **THEN** o sistema SHALL permitir o download normalmente

### Requirement: Um veredito malicioso bloqueia o download daquela versão
O sistema SHALL recusar o download de uma versão específica cuja varredura
terminou em `malicious`, sem afetar outras versões do mesmo pacote.

#### Scenario: Download de uma versão maliciosa
- **WHEN** um cliente tenta baixar uma versão com `status = malicious`
- **THEN** o sistema SHALL retornar `403`

#### Scenario: Outra versão do mesmo pacote continua disponível
- **WHEN** a versão `2.0.0` de um pacote está `malicious` e a `1.9.0` está
  `clean`
- **THEN** o download da `1.9.0` SHALL continuar funcionando normalmente

### Requirement: Veredito e risco são expostos na API
O sistema SHALL expor `status` e `risk_level` de uma versão como campos
independentes na resposta de metadata dela.

#### Scenario: Consultar o veredito de uma versão
- **WHEN** um cliente consulta a metadata de uma versão já varrida
- **THEN** a resposta SHALL incluir `scan.status` e `scan.riskLevel`
- **AND** os dois campos SHALL poder variar independentemente (ex.: `review`
  com risco `high`, sem ser `malicious`)
