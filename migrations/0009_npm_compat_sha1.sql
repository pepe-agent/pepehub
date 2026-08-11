-- npm-compatible-endpoint/spec.md exige um dist.shasum (tradicionalmente
-- sha1 no protocolo do npm) além do dist.integrity (sha256). Calculado uma
-- vez no publish, junto do sha256, em vez de recalculado a cada leitura do
-- packument (que exigiria buscar o artefato inteiro do R2 de novo).
ALTER TABLE package_versions ADD COLUMN sha1 TEXT;
