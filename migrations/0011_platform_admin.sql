-- Administração de plataforma (design.md não detalha essa capability à
-- parte; schema decidido a partir de platform-admin/spec.md).
ALTER TABLE owners ADD COLUMN banned_at TEXT;

-- reserved_for_owner_id NULL = reservado "pra ninguém em especial" (bloqueia
-- todo mundo até um operador liberar); setado = só esse dono pode publicar
-- ali (o "destinatário da reserva" do spec.md).
CREATE TABLE reserved_names (
  name TEXT PRIMARY KEY,
  reserved_by_owner_id INTEGER NOT NULL REFERENCES owners (id),
  reserved_for_owner_id INTEGER REFERENCES owners (id),
  reason TEXT,
  created_at TEXT NOT NULL
);
