-- MIGRAÇÃO — Política de retenção de logs (LGPD)
-- Execute: psql -U postgres -d reqbuy -f backend/src/db/migration_lgpd.sql

-- 1. Adiciona coluna expires_at em logs_auditoria
ALTER TABLE logs_auditoria
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
    DEFAULT (NOW() + INTERVAL '90 days') NOT NULL;

-- 2. Preenche registros já existentes
UPDATE logs_auditoria
  SET expires_at = created_at + INTERVAL '90 days'
  WHERE expires_at = (NOW() + INTERVAL '90 days');   -- só os que têm o valor default

-- 3. Índice para o job de limpeza automática rodar rápido
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_expires_at
  ON logs_auditoria (expires_at);

-- 4. (Informativo) IPs existentes no banco estão em texto claro.
--    Após a migration, novos logs já serão gravados pseudonimizados.
--    Para limpar os antigos: UPDATE logs_auditoria SET ip_address = NULL;