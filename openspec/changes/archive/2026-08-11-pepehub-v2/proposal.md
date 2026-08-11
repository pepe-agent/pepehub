## Why

O `pepehub-mvp` cobre o essencial pra existir (buscar, publicar, navegar), mas um
registro que as pessoas confiam de verdade pra rodar código de terceiros precisa
de mais: proteção contra abuso (limite de taxa), um jeito de saber se um pacote
é seguro antes de instalar, um processo pra denunciar e remover algo malicioso,
e as operações de manutenção que todo pacote público eventualmente precisa
(renomear, transferir de dono, apagar). Sem isso, o PepeHub funciona no dia
1, mas não escala pra além de alguns pacotes de confiança pessoal.

Esse change foi desenhado depois de uma varredura completa e deliberada de
como um concorrente direto (mesmo tipo de produto: marketplace de skills e
plugins de agente) resolve exatamente esses mesmos problemas, não pra copiar
a marca ou os nomes deles, mas pra não reinventar o formato de decisões que
outro time público já validou (SLA de rate limit por tipo de operação, eixo de
"risco" separado do veredito de segurança, ciclo de vida de moderação com
apelação, etc.).

## What Changes

- Cria limite de taxa por categoria de operação (leitura, escrita, download),
  diferenciado entre chamada anônima e autenticada.
- Cria a varredura de segurança de um artefato publicado: um pipeline
  assíncrono que produz um veredito (`clean`/`review`/`warning`/`malicious`/
  `pending`/`error`) e um nível de risco independente (`low`/`medium`/`high`),
  integrando com um serviço de terceiros existente para reputação de arquivo
  em vez de construir um motor de análise estática próprio do zero.
- Cria o fluxo de denúncia e moderação: qualquer pessoa denuncia um pacote,
  entra numa fila de revisão, pode ser ocultado/bloqueado, com um processo de
  apelação pro dono.
- Cria o ciclo de vida completo de um pacote: apagar e restaurar (soft
  delete), renomear (com redirecionamento do nome antigo), mesclar dois
  pacotes, e transferir de dono (com aceite explícito de quem recebe).
- Cria favoritar/desfavoritar um pacote ou skill, com contagem exposta na API.
- Cria "publisher confiável": uma automação de CI (GitHub Actions) pode
  publicar sem um humano rodar o login toda vez, provando a origem via OIDC.
- Cria publicar direto de um repositório Git (commit/branch específico) como
  fonte alternativa ao upload manual de artefato.
- Cria um endpoint compatível com o protocolo do npm, pra pacotes do tipo
  plugin poderem ser instalados com as próprias ferramentas do ecossistema
  Node quando fizer sentido, sem reimplementar um cliente próprio.
- Cria telemetria de instalação opcional (com opt-out por variável de
  ambiente): contagem agregada de instaladores únicos por pacote, sem
  caminho de arquivo, conteúdo ou prompt do usuário.
- Cria administração mínima de plataforma: banir/desbanir um publisher,
  reservar um nome/handle preventivamente.

## Capabilities

### New Capabilities
- `rate-limiting`: limite de taxa por categoria de operação, anônimo vs.
  autenticado, com os headers padrão de rate limit.
- `artifact-scanning`: pipeline assíncrono de varredura de segurança de um
  artefato publicado, com veredito e nível de risco.
- `moderation`: denúncia, fila de revisão, ocultar/bloquear, apelação.
- `package-lifecycle`: apagar/restaurar, renomear, mesclar, transferir de
  dono.
- `package-stars`: favoritar/desfavoritar, contagem exposta.
- `trusted-publisher`: publicação automatizada via CI com prova de origem
  (OIDC/GitHub Actions), sem sessão de login humana.
- `source-publish`: publicar direto de um repositório Git (commit/branch),
  em vez de só upload manual de artefato.
- `npm-compatible-endpoint`: endpoint que serve pacotes do tipo plugin no
  formato que o protocolo do npm espera.
- `install-telemetry`: contagem agregada e opcional de instalações, com
  opt-out.
- `platform-admin`: banir/desbanir um publisher, reservar um nome
  preventivamente.

### Modified Capabilities
(nenhuma: este change não altera nenhum requisito do `pepehub-mvp`; tudo
aqui é aditivo e não toca nos arquivos daquele change, que ainda está em
implementação)

## Impact

- **Depende do `pepehub-mvp` já existir** (schema D1 de `packages`/
  `package_versions`/`owners`, o bucket R2, a autenticação via GitHub). Este
  change assume essas peças como dadas, não as recria.
- **Nova dependência externa opcional**: um serviço de terceiros pra
  reputação de arquivo (ex.: VirusTotal, que tem API pública). Se
  indisponível, a varredura fica `pending`/`error`, nunca bloqueia o resto do
  registro de funcionar.
- **Fora deste change**: um motor de análise estática próprio (equivalente a
  construir um scanner de segurança do zero). Não é non-goal permanente,
  mas está fora do que faz sentido construir agora; integrar com um serviço
  existente resolve o mesmo problema com uma fração do esforço.
