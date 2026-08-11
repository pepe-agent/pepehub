-- Suporte às ordenações "Trending" e "Featured" da home (browse-site).
-- downloads_count é incrementado de forma assíncrona (via waitUntil, depois da
-- resposta de download já ter sido enviada). Nunca bloqueia o GET de download,
-- conforme o risco registrado em design.md ("download NÃO pode escrever no D1
-- de forma síncrona a cada request").
-- featured segue o mesmo modelo de curadoria manual de `official`: só um
-- operador com acesso direto ao D1 marca essa flag (ver README).
ALTER TABLE packages ADD COLUMN downloads_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE packages ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
