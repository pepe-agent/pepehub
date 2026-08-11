-- owners: uma linha por pessoa que já autenticou pra publicar
CREATE TABLE owners (
  id INTEGER PRIMARY KEY,
  github_id INTEGER NOT NULL UNIQUE,
  handle TEXT NOT NULL UNIQUE, -- github login, em minúsculo
  display_name TEXT,
  created_at TEXT NOT NULL
);

-- packages: um pacote (plugin) ou skill publicado, identificado por "@handle/nome"
CREATE TABLE packages (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('plugin', 'skill')),
  name TEXT NOT NULL UNIQUE, -- "@handle/nome"
  owner_id INTEGER NOT NULL REFERENCES owners (id),
  summary TEXT,
  category TEXT NOT NULL CHECK (
    category IN (
      'channel',
      'tool',
      'integration',
      'model',
      'automation',
      'other'
    )
  ),
  official INTEGER NOT NULL DEFAULT 0, -- boolean
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- package_versions: cada versão publicada de um pacote, content-addressed por sha256
CREATE TABLE package_versions (
  id INTEGER PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages (id),
  version TEXT NOT NULL, -- semver
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  changelog TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (package_id, version)
);

-- dist_tags: aponta um nome de tag ("latest", "beta", ...) pra uma versão publicada
CREATE TABLE dist_tags (
  package_id INTEGER NOT NULL REFERENCES packages (id),
  tag TEXT NOT NULL,
  version TEXT NOT NULL,
  PRIMARY KEY (package_id, tag)
);

-- filtro da aba "Official" (search/listagem por kind + official)
CREATE INDEX idx_packages_kind_official ON packages (kind, official);

-- filtro por categoria
CREATE INDEX idx_packages_category ON packages (category);

-- listar versões de um pacote em ordem sem full scan
CREATE INDEX idx_package_versions_package_created ON package_versions (package_id, created_at);
