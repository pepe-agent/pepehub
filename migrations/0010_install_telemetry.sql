-- Telemetria de instalação, opcional e agregada (design.md "Telemetria de
-- instalação"). UNIQUE(package_id, owner_id) faz "instaladores únicos" ser
-- uma contagem de linhas, sem lógica de deduplicação à parte. Nenhum
-- caminho de arquivo, conteúdo, ou prompt do usuário é gravado.
CREATE TABLE install_events (
  id INTEGER PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages (id),
  owner_id INTEGER NOT NULL REFERENCES owners (id),
  first_install_at TEXT NOT NULL,
  UNIQUE (package_id, owner_id)
);
