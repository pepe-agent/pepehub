## ADDED Requirements

### Requirement: Página inicial mostra pacotes e skills
O sistema SHALL exibir na página inicial abas separadas pra Skills e Plugins, com
opção de ordenar por Trending, Featured, Official e New.

#### Scenario: Carregar a página inicial
- **WHEN** uma pessoa acessa a página inicial do PepeHub
- **THEN** o sistema SHALL mostrar cartões com nome, dono, resumo e contagem de
  downloads dos itens mais recentes
- **AND** o sistema SHALL oferecer as opções de ordenação Trending, Featured,
  Official e New

### Requirement: Navegar por categoria
O sistema SHALL exibir a lista fixa de categorias (ver `package-categories`)
como filtro de navegação, permitindo restringir a listagem a uma delas.

#### Scenario: Filtrar a home por categoria
- **WHEN** uma pessoa seleciona uma categoria na página inicial ou numa página
  de listagem
- **THEN** o sistema SHALL mostrar só os pacotes/skills daquela categoria
- **AND** a URL SHALL refletir o filtro aplicado (ex.: `/?category=channel`)

### Requirement: Página de detalhe de um pacote ou skill
O sistema SHALL exibir uma página com a metadata completa e a lista de versões
de um pacote/skill.

#### Scenario: Acessar a página de um pacote existente
- **WHEN** uma pessoa acessa `/packages/<name>` (ou `/skills/<name>` para uma
  skill)
- **THEN** o sistema SHALL mostrar nome, dono, resumo, categoria, selo de
  "oficial" quando aplicável, e a lista de versões publicadas
- **AND** cada versão SHALL ter um link de download

#### Scenario: Acessar a página de um pacote inexistente
- **WHEN** `<name>` não corresponde a nenhum pacote publicado
- **THEN** o sistema SHALL mostrar uma página de "não encontrado" com status
  `404`

### Requirement: Busca acessível pelo site
O sistema SHALL oferecer um campo de busca que usa a mesma API de leitura
pública.

#### Scenario: Buscar pelo site
- **WHEN** uma pessoa digita um termo no campo de busca do site
- **THEN** o sistema SHALL mostrar os resultados vindos de `GET /api/v1/search`
- **AND** cada resultado SHALL linkar pra página de detalhe correspondente

### Requirement: Página de "como publicar"
O sistema SHALL oferecer uma página estática explicando como publicar um pacote
ou skill no PepeHub (login, formato aceito e o comando de publish), sem
duplicar a documentação do formato do manifesto, que continua no site do Pepe.

#### Scenario: Acessar a página de publicação
- **WHEN** uma pessoa acessa `/publish`
- **THEN** o sistema SHALL mostrar o passo a passo de login (Device Flow), o
  comando de publish e o formato de artefato aceito (tarball ou zip)
- **AND** a página SHALL linkar para a documentação do formato do manifesto no
  site do Pepe, em vez de repeti-la
