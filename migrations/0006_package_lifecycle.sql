-- Ciclo de vida de pacote (design.md "Ciclo de vida de pacote").
-- deleted_at: soft delete, artefatos no R2 nunca são removidos.
-- renamed_from: nome anterior (um hop só, não uma cadeia) — uma consulta por
-- name = ? OR renamed_from = ? resolve tanto o nome atual quanto o antigo, e
-- como o nome é sempre "@handle/nome" completo, isso também impede outro
-- dono de reaproveitar o nome antigo (o handle não bate).
ALTER TABLE packages ADD COLUMN deleted_at TEXT;
ALTER TABLE packages ADD COLUMN renamed_from TEXT;

-- Transferência de dono: pedido pendente até o destinatário aceitar
-- explicitamente (design.md "Transferir é uma troca só de owner_id,
-- condicionada a um aceite explícito de quem recebe").
ALTER TABLE packages ADD COLUMN transfer_pending_to_owner_id INTEGER REFERENCES owners (id);
