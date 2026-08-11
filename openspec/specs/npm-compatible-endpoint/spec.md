## Purpose

Endpoint somente-leitura que serve pacotes do tipo `plugin` no formato que
o protocolo do npm espera, pra quem já tem tooling Node não precisar
reaprender um cliente novo.

## Requirements

### Requirement: Um pacote plugin tem um packument compatível com npm
O sistema SHALL expor `GET /api/npm/<name>` retornando um documento no
formato que ferramentas npm/pnpm/yarn já sabem interpretar, só pra pacotes
do tipo `plugin`.

#### Scenario: Consultar o packument de um plugin
- **WHEN** um cliente chama `GET /api/npm/<name>` pra um pacote do tipo
  `plugin`
- **THEN** o sistema SHALL retornar `dist-tags`, e cada versão publicada com
  `dist.tarball`, `dist.integrity`, `dist.shasum`

#### Scenario: Pacote do tipo skill não tem endpoint npm
- **WHEN** um cliente chama `GET /api/npm/<name>` pra um pacote do tipo
  `skill`
- **THEN** o sistema SHALL retornar `404`

### Requirement: O tarball servido bate com o artefato content-addressed
O sistema SHALL servir, no `dist.tarball`, exatamente o mesmo artefato que
`GET /api/v1/packages/<name>/versions/<version>/download` serve.

#### Scenario: Integridade do tarball
- **WHEN** um cliente baixa o `dist.tarball` de uma versão
- **THEN** o sha256 do conteúdo baixado SHALL bater com o `sha256` registrado
  pra essa versão
