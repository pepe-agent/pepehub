-- "Operador" (design.md "Moderação"): campo booleano simples em owners, não
-- uma tabela de roles separada. Usado por moderation e platform-admin.
ALTER TABLE owners ADD COLUMN is_operator INTEGER NOT NULL DEFAULT 0;

CREATE TABLE package_reports (
  id INTEGER PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages (id),
  package_version_id INTEGER REFERENCES package_versions (id),
  reporter_owner_id INTEGER REFERENCES owners (id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'dismissed')),
  triage_note TEXT,
  triaged_by_owner_id INTEGER REFERENCES owners (id),
  triaged_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_package_reports_package ON package_reports (package_id);

-- Sem linha = estado implícito 'visible' (só grava quando o estado muda).
CREATE TABLE package_moderation_state (
  package_id INTEGER PRIMARY KEY REFERENCES packages (id),
  state TEXT NOT NULL DEFAULT 'visible' CHECK (state IN ('visible', 'held', 'hidden', 'blocked')),
  reason TEXT,
  changed_by_owner_id INTEGER REFERENCES owners (id),
  changed_at TEXT NOT NULL
);
