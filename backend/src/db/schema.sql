-- =============================================
-- ReqBuy — Schema inicial do banco de dados
-- Idempotente: seguro para re-executar (IF NOT EXISTS)
-- =============================================

CREATE TABLE IF NOT EXISTS departamentos (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('solicitante', 'aprovador', 'financeiro')),
  department_id INTEGER     REFERENCES departamentos(id),
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitacoes_compra (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200)   NOT NULL,
  description   TEXT           NOT NULL,
  amount        DECIMAL(12, 2) NOT NULL,
  status        VARCHAR(30)    NOT NULL DEFAULT 'pendente'
                  CHECK (status IN (
                    'pendente',
                    'aprovado_gestor',    'rejeitado_gestor',
                    'aprovado_financeiro','rejeitado_financeiro'
                  )),
  requester_id  INTEGER NOT NULL REFERENCES usuarios(id),
  department_id INTEGER NOT NULL REFERENCES departamentos(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acoes_solicitacao (
  id         SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES solicitacoes_compra(id),
  user_id    INTEGER NOT NULL REFERENCES usuarios(id),
  action     VARCHAR(30) NOT NULL CHECK (action IN ('aprovado', 'rejeitado')),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs_auditoria (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER     REFERENCES usuarios(id),
  action      VARCHAR(100) NOT NULL,
  resource    VARCHAR(100),
  resource_id INTEGER,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days') NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'departamentos_name_key'
      AND conrelid = 'departamentos'::regclass
  ) THEN
    ALTER TABLE departamentos ADD CONSTRAINT departamentos_name_key UNIQUE (name);
  END IF;
END $$;

-- Departamentos iniciais (ON CONFLICT para ser idempotente)
INSERT INTO departamentos (name) VALUES
  ('TI'),
  ('RH'),
  ('Financeiro'),
  ('Operações')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- Índices de performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_solicitacoes_requester_id  ON solicitacoes_compra (requester_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_department_id ON solicitacoes_compra (department_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status        ON solicitacoes_compra (status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created_at    ON solicitacoes_compra (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acoes_request_id           ON acoes_solicitacao (request_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id               ON logs_auditoria (user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at            ON logs_auditoria (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_expires_at            ON logs_auditoria (expires_at);
