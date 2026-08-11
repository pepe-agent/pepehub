-- Requisitos de ambiente declarados no manifesto (env/bins), gravados verbatim
-- e sem validação — quem checa presença é o cliente que instala (ver design.md
-- "Requisitos declarados").
ALTER TABLE package_versions ADD COLUMN requires_json TEXT;
