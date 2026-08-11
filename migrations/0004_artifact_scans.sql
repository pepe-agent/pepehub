-- Varredura de segurança assíncrona de um artefato publicado (design.md
-- "Varredura de segurança"). status e risk_level são eixos independentes.
CREATE TABLE artifact_scans (
  id INTEGER PRIMARY KEY,
  package_version_id INTEGER NOT NULL REFERENCES package_versions (id),
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'clean', 'review', 'warning', 'malicious', 'error')
  ),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  findings_json TEXT,
  provider TEXT,
  provider_ref TEXT,
  scanned_at TEXT,
  created_at TEXT NOT NULL
);

-- Busca da varredura mais recente de uma versão (a query dominante).
CREATE INDEX idx_artifact_scans_version_created ON artifact_scans (package_version_id, created_at);
