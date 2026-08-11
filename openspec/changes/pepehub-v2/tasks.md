## 1. Limite de taxa (rate-limiting)

- [x] 1.1 Configurar o Rate Limiting nativo da Cloudflare (binding no
      `wrangler.toml`) com as categorias leitura/escrita, anônimo/autenticado
- [x] 1.2 Adicionar os headers `RateLimit-Limit`/`RateLimit-Remaining`/
      `RateLimit-Reset` em toda resposta e `Retry-After` no `429`
- [x] 1.3 Testes cobrindo os cenários de `specs/rate-limiting/spec.md`

## 2. Varredura de segurança (artifact-scanning)

- [x] 2.1 Migration: tabela `artifact_scans`
- [x] 2.2 Enfileirar uma varredura ao final de todo publish bem-sucedido
      (fora do caminho crítico da resposta)
- [x] 2.3 Integração com um serviço de reputação de arquivo de terceiros
      (VirusTotal) - grava `status`/`risk_level`/`findings_json` quando a
      resposta chega. Precisa de `VIRUSTOTAL_API_KEY` configurada (secret) pra
      funcionar de verdade em produção; sem ela toda varredura termina em
      `error`, nunca bloqueando o registro (comportamento intencional)
- [x] 2.4 Bloquear download (`403`) de uma versão com `status = malicious`,
      sem afetar outras versões do mesmo pacote
- [x] 2.5 Expor `scan.status`/`scan.riskLevel` na metadata de uma versão
- [x] 2.6 Testes cobrindo os cenários de `specs/artifact-scanning/spec.md`

## 3. Moderação (moderation)

- [x] 3.1 Migration: tabelas `package_reports` e `package_moderation_state`
      (+ `owners.is_operator`, campo que faltava no schema do MVP)
- [x] 3.2 Implementar a denúncia (`POST` autenticado)
- [x] 3.3 Implementar a transição de estado de moderação, restrita a um
      operador
- [x] 3.4 Aplicar o estado de moderação em toda superfície de leitura
      (busca, navegação, download)
- [x] 3.5 Implementar a apelação (dono de um pacote `hidden`/`blocked`)
- [x] 3.6 Testes cobrindo os cenários de `specs/moderation/spec.md`

## 4. Ciclo de vida de pacote (package-lifecycle)

- [x] 4.1 Migration: colunas `deleted_at` e `renamed_from` em `packages` (+
      `transfer_pending_to_owner_id`, necessária pro handshake de
      transferência da task 4.4, não prevista à parte no design.md)
- [x] 4.2 Implementar apagar/restaurar (soft delete)
- [x] 4.3 Implementar renomear com redirecionamento do nome antigo
- [x] 4.4 Implementar a solicitação e o aceite de transferência de dono
- [x] 4.5 Testes cobrindo os cenários de `specs/package-lifecycle/spec.md`

## 5. Favoritos (package-stars)

- [x] 5.1 Migration: tabela de favoritos (`package_id`, `owner_id`, única)
- [x] 5.2 Implementar favoritar/desfavoritar, idempotente
- [x] 5.3 Expor a contagem na metadata do pacote
- [x] 5.4 Testes cobrindo os cenários de `specs/package-stars/spec.md`

## 6. Publisher confiável (trusted-publisher)

- [x] 6.1 Migration: tabela `trusted_publishers`
- [x] 6.2 Implementar o registro do publisher confiável, restrito ao dono
- [x] 6.3 Implementar a validação do token OIDC do GitHub Actions no publish
      (`jose`, sem reimplementar verificação de JWT)
- [x] 6.4 Testes cobrindo os cenários de `specs/trusted-publisher/spec.md`

## 7. Publicar de um repositório (source-publish)

- [x] 7.1 Implementar `source: { repo, ref }` no publish, com clone raso (na
      prática: tarball/zipball da API do GitHub pro `ref` pedido, sem
      histórico — não tem binário `git` disponível no runtime de Workers)
- [x] 7.2 Recusar repositório privado, fork, ou arquivado (`422`)
- [x] 7.3 Testes cobrindo os cenários de `specs/source-publish/spec.md`

## 8. Endpoint compatível com npm (npm-compatible-endpoint)

- [ ] 8.1 Implementar `GET /api/npm/<name>` (packument), só pra `kind = plugin`
- [ ] 8.2 Garantir que `dist.tarball`/`dist.integrity`/`dist.shasum` batem
      com o artefato já servido por `GET /api/v1/packages/<name>/versions/
      <version>/download`
- [ ] 8.3 Testes cobrindo os cenários de `specs/npm-compatible-endpoint/spec.md`

## 9. Telemetria de instalação (install-telemetry)

- [ ] 9.1 Migration: tabela `install_events`
- [ ] 9.2 Gravar o evento só em instalação autenticada, bem-sucedida, sem
      opt-out
- [ ] 9.3 Respeitar o cabeçalho de opt-out
- [ ] 9.4 Expor a contagem agregada na metadata do pacote
- [ ] 9.5 Testes cobrindo os cenários de `specs/install-telemetry/spec.md`

## 10. Administração de plataforma (platform-admin)

- [ ] 10.1 Implementar banir/desbanir um publisher, restrito a um operador
- [ ] 10.2 Implementar a reserva preventiva de um nome
- [ ] 10.3 Testes cobrindo os cenários de `specs/platform-admin/spec.md`
