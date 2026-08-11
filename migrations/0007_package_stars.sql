-- Favoritos (design.md/package-stars spec.md). Chave primária composta faz
-- favoritar duas vezes ser naturalmente idempotente (INSERT OR IGNORE).
CREATE TABLE package_stars (
  package_id INTEGER NOT NULL REFERENCES packages (id),
  owner_id INTEGER NOT NULL REFERENCES owners (id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (package_id, owner_id)
);
