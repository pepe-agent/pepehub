-- Publisher confiável via CI (design.md "Publisher confiável (CI/OIDC)").
-- Um pacote tem no máximo um publisher confiável configurado por vez.
CREATE TABLE trusted_publishers (
  package_id INTEGER PRIMARY KEY REFERENCES packages (id),
  provider TEXT NOT NULL DEFAULT 'github-actions',
  repository TEXT NOT NULL,
  workflow_filename TEXT NOT NULL,
  environment TEXT,
  created_at TEXT NOT NULL
);
