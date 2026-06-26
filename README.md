## ReqBuy - Sistema de Requisições Internas (P08-A)

Projeto desenvolvido para a Avaliação N3 da disciplina de Segurança da Informação do curso de Engenharia de Software (Católica SC).

**Professor:** Edson Vaz Lopes  
**Tema-base:** P08-A - Compras internas (Requisição de compra)

## Equipe
* Roger Klock
* Miguel David Hort
* Lucas Klug Sebastião
* Kauã Martins Bassan
* Matheus Ferreira Fagundes

---

## Sobre o Projeto

O **ReqBuy** é uma aplicação web focada na gestão segura de requisições de compras internas. O sistema permite que solicitantes registrem pedidos, aprovadores analisem as requisições de seus respectivos setores, e o setor financeiro faça a auditoria e aprovação final do fluxo.

O foco principal do desenvolvimento é a aplicação prática de controles de **Segurança da Informação**, incluindo:

* **Autenticação Segura:** Senhas armazenadas com bcrypt (hash + salt) e sessão em cookie HttpOnly.
* **Autorização (RBAC):** Controle estrito de acesso baseado em perfis; usuários comuns visualizam apenas seus próprios dados.
* **Trilhas de Auditoria:** Registro de ações críticas (login, criação, aprovação, rejeição e tentativas de acesso não autorizado).
* **Gestão de Segredos:** Variáveis sensíveis isoladas em `.env` (não versionado).
* **Validação no Servidor:** Sanitização e validação de entradas via Zod antes de qualquer operação no banco.
* **Proteção CSRF:** Operações mutáveis autenticadas exigem cabeçalho `X-CSRF-Token`.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Front-end | React 19 + Vite 8 + TypeScript |
| Back-end | Node.js + Express 5 + TypeScript |
| Banco de Dados | PostgreSQL |
| Autenticação | JWT (jsonwebtoken) + bcrypt |
| Validação de entrada | Zod |
| HTTP Client | Axios |
| Query / Driver BD | node-postgres (pg) |
| Logger HTTP | Morgan |

---

## Perfis de Acesso

O sistema implementa três níveis de privilégio:

| Perfil | Papel no sistema |
|---|---|
| **Solicitante** | Registra requisições e acompanha apenas o status dos próprios pedidos. |
| **Aprovador** | Analisa, aprova ou rejeita requisições do seu setor antes do envio ao financeiro. |
| **Setor Financeiro** | Possui visão global, realiza a aprovação final e acessa os logs de auditoria. |

---

## Funcionalidades Mínimas Previstas

1. Cadastro e autenticação de usuários com senhas protegidas por bcrypt.
2. Geração e validação de tokens JWT para sessões autenticadas (8h de validade).
3. Criação de requisição de compra (título, descrição, valor, setor).
4. Listagem de requisições filtrada por perfil (próprias / setor / todas).
5. Aprovação ou rejeição pelo aprovador do setor (com comentário opcional).
6. Aprovação ou rejeição final pelo setor financeiro (com comentário opcional).
7. Registro automático de logs de auditoria para todas as ações relevantes.
8. Consulta de logs de auditoria, exclusiva ao perfil Financeiro.

---

## Matriz de Permissões

| Funcionalidade | Solicitante | Aprovador | Financeiro |
|---|:---:|:---:|:---:|
| Criar requisição | ✅ | ✅ | ✅ |
| Ver próprias requisições | ✅ | ✅ | ✅ |
| Ver requisições do setor | ❌ | ✅ | ✅ |
| Ver todas as requisições | ❌ | ❌ | ✅ |
| Aprovar / Rejeitar (nível gestor) | ❌ | ✅ | ❌ |
| Aprovar / Rejeitar (nível financeiro) | ❌ | ❌ | ✅ |
| Visualizar logs de auditoria | ❌ | ❌ | ✅ |
| Gerenciar usuários | ❌ | ❌ | ✅ |

---

## Entidades Principais

| Entidade | Descrição |
|---|---|
| `usuarios` | Usuários do sistema com perfil RBAC e setor associado. |
| `departamentos` | Setores / departamentos da organização. |
| `solicitacoes_compra` | Requisições de compra com status de aprovação em duas etapas (gestor → financeiro). |
| `acoes_solicitacao` | Histórico de ações (aprovação / rejeição) realizadas sobre cada requisição. |
| `logs_auditoria` | Trilha de auditoria de todas as ações relevantes do sistema. |

---

## Modelo de Dados Inicial

```sql
-- Setores da organização
CREATE TABLE IF NOT EXISTS departamentos (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Usuários com perfil RBAC
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('solicitante', 'aprovador', 'financeiro')),
  department_id INTEGER     REFERENCES departamentos(id),
  created_at    TIMESTAMP   DEFAULT NOW()
);

-- Requisições de compra (fluxo de duas aprovações)
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
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Histórico de ações sobre cada requisição
CREATE TABLE IF NOT EXISTS acoes_solicitacao (
  id         SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES solicitacoes_compra(id),
  user_id    INTEGER NOT NULL REFERENCES usuarios(id),
  action     VARCHAR(30) NOT NULL CHECK (action IN ('aprovado', 'rejeitado')),
  comment    TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trilha de auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER     REFERENCES usuarios(id),
  action      VARCHAR(100) NOT NULL,
  resource    VARCHAR(100),
  resource_id INTEGER,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Departamentos iniciais (ON CONFLICT para ser idempotente)
INSERT INTO departamentos (name) VALUES
  ('TI'),
  ('RH'),
  ('Financeiro'),
  ('Operações')
ON CONFLICT (name) DO NOTHING;
```

---

## Arquitetura Inicial

```
┌──────────────────────┐        HTTP / HTTPS        ┌────────────────────────────┐
│  Frontend            │ ─────────────────────────► │  Backend                   │
│  React + Vite + TS   │ ◄───────────────────────── │  Node.js + Express 5 + TS  │
│  :5173 (dev)         │      JSON  (REST API)       │  :3001                     │
└──────────────────────┘                            └────────────────┬───────────┘
                                                                     │
                                                          node-postgres (pg)
                                                                     │
                                                                     ▼
                                                    ┌────────────────────────────┐
                                                    │  PostgreSQL                │
                                                    │  :5432                     │
                                                    └────────────────────────────┘

Fluxo de autenticação
  1. Cliente envia e-mail + senha  →  POST /api/auth/login
  2. Backend valida credenciais e emite JWT assinado (8h) em cookie HttpOnly
  3. Backend também emite cookie legível `reqbuy_csrf` para proteção CSRF
  4. Cliente mantém apenas dados não sensíveis do usuário em sessionStorage
  5. Ao recarregar a página, GET /api/auth/me restaura a sessão pelo cookie
  6. Operações POST/PUT/PATCH/DELETE enviam X-CSRF-Token
  7. Middleware verifica JWT, blacklist, RBAC e CSRF antes dos handlers
  8. Todas as ações críticas são registradas em logs_auditoria

Segurança em camadas
  • CORS restrito à origem do frontend
  • Cookies HttpOnly, SameSite=Strict e Secure em produção
  • Proteção CSRF por token assinado
  • Validação de entrada via Zod (antes do banco)
  • RBAC aplicado no middleware de autorização
  • Verificação de dono do recurso nas rotas de listagem
  • Validação de JWT_SECRET forte na inicialização
  • Variáveis sensíveis isoladas em .env (não versionado)
```

---

## Análise de Riscos

| Risco | Probabilidade | Impacto | Controle Aplicado |
|---|:---:|:---:|---|
| Força bruta na autenticação | Alta | Alto | Hash bcrypt (custo 12) + registro de tentativas falhas no log |
| Token JWT comprometido | Média | Alto | Cookie HttpOnly, segredo longo em `.env`, expiração de 8h e blacklist no logout |
| CSRF em rotas autenticadas | Média | Alto | SameSite=Strict + token CSRF assinado em operações mutáveis |
| Acesso indevido de perfil inferior | Média | Alto | Middleware RBAC em todas as rotas protegidas |
| Injeção de dados maliciosos (SQL/XSS) | Média | Alto | Validação Zod no servidor + queries parametrizadas (pg) |
| Exposição de credenciais do banco | Baixa | Crítico | Variáveis em `.env` não versionado, `.gitignore` configurado |
| Escalada de privilégio | Baixa | Alto | Verificação de perfil e dono do recurso em cada endpoint |
| Acesso a logs por perfil errado | Baixa | Médio | Rota `/api/audit` restrita ao perfil `financeiro` |

---

## Plano de Logs de Auditoria

Todos os eventos são registrados na tabela `audit_logs` com `user_id`, `action`, `resource`, `resource_id`, `ip_address` e `created_at`.

| Evento | Ação registrada | Gatilho |
|---|---|---|
| Login bem-sucedido | `LOGIN` | POST /api/auth/login com credenciais válidas |
| Falha de login | `LOGIN_FALHOU` | POST /api/auth/login com credenciais inválidas |
| Cadastro de usuário | `CADASTRO` | POST /api/auth/register |
| Criação de requisição | `CRIAR_REQUISICAO` | POST /api/requests |
| Aprovação de requisição | `APROVADO_REQUISICAO` | POST /api/requests/:id/action |
| Rejeição de requisição | `REJEITADO_REQUISICAO` | POST /api/requests/:id/action |
| Tentativa de acesso não autorizado | `ACESSO_NAO_AUTORIZADO` | Aprovador tenta agir em setor diferente do seu |

Consulta de logs disponível exclusivamente ao perfil **Financeiro** via `GET /api/audit`.

---

## Plano de Controles de Segurança

| Controle | Categoria | Implementação |
|---|---|---|
| Hash de senhas | Autenticação | bcrypt com custo 12 e salt automático |
| Tokens de sessão | Autenticação | JWT assinado com `JWT_SECRET`, validade de 8h |
| Controle de acesso por perfil | Autorização | Middleware `authorize(...roles)` em todas as rotas |
| Controle por dono do recurso | Autorização | Filtro de `requester_id` / `department_id` nas queries |
| Validação de entrada | Integridade | Zod valida todos os corpos de requisição antes do banco |
| Queries parametrizadas | Integridade | node-postgres com `$1, $2...` — sem interpolação de string |
| Isolamento de segredos | Confidencialidade | Variáveis sensíveis em `.env` fora do versionamento |
| CORS restrito | Confidencialidade | Apenas a origem do frontend é aceita pelo servidor |
| Trilha de auditoria | Rastreabilidade | `logAudit()` chamado em cada ação crítica do sistema |

---

## Como Executar

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose (recomendado para o banco de dados)

### 1. Banco de dados (Docker — recomendado)

```bash
# Iniciar o PostgreSQL via Docker
docker compose up -d

# Aguardar o container ficar saudável (~10s) e inicializar o banco
npm run db:init

# Popular o banco com dados de teste (usuários + requisições de exemplo)
npm run db:seed
```

### 2. Backend

```bash
# Na raiz do projeto — copiar e configurar o .env
copy backend\.env.example .env
# Editar .env se necessário (padrão funciona com o Docker Compose)

# Instalar dependências e iniciar
npm install
npm run dev
```

O backend estará disponível em `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend

# Instalar dependências
npm install

npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

---

## Variáveis de Ambiente

### Backend (`.env` na raiz do projeto)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reqbuy
JWT_SECRET=<valor longo e aleatório>
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```
VITE_API_URL=http://localhost:3001/api
```

---

## Usuários de Teste

Execute `npm run db:seed` para criar automaticamente os usuários abaixo com senhas já hasheadas (bcrypt custo 12):

| Nome | E-mail | Senha | Perfil | Departamento |
|---|---|---|---|---|
| Ana Solicitante | solicitante@reqbuy.dev | `Senha@123` | `solicitante` | TI |
| Bruno Aprovador | aprovador@reqbuy.dev | `Senha@123` | `aprovador` | TI |
| Carla Financeiro | financeiro@reqbuy.dev | `Senha@123` | `financeiro` | Financeiro |

> As senhas são armazenadas como hash bcrypt (custo 12). Nunca em texto puro.



---

## Ativos e Dados Sensíveis

| Ativo | Localização | Risco | Controle aplicado |
|---|---|---|---|
| Hashes de senha | Tabela `users` | Comprometimento de conta | bcrypt com salt automático |
| Segredo JWT | Variável `JWT_SECRET` | Forja de tokens | `.env` não versionado |
| Valores financeiros | Tabela `purchase_requests` | Exposição de dados internos | RBAC + autenticação obrigatória |
| Logs de auditoria | Tabela `audit_logs` | Rastreabilidade de usuários | Acesso restrito ao perfil Financeiro |
| Credenciais do banco | Variável `DATABASE_URL` | Acesso direto ao BD | `.env` não versionado |
| Endereços IP | Tabela `audit_logs` | Privacidade dos usuários | Acesso restrito ao perfil Financeiro |
