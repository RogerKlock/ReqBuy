import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { pool } from '../db/connection'
import { logAudit } from '../services/audit'
import { loginRateLimiter, accountLockoutMiddleware, recordLoginFailure, resetLoginFailures } from '../middleware/rateLimiter'
import { generateToken, revokeToken } from '../middleware/jwtBlacklist'
import { authenticateWithBlacklist } from '../middleware/jwtBlacklist'
import { setTokenCookie, clearTokenCookie } from '../middleware/cookieAuth'

const router = Router()

// Schemas

// registerSchema não aceita `role` — sempre cria como solicitante
const registerSchema = z.object({
  name:         z.string().min(3).max(150),
  email:        z.email(),
  password:     z.string().min(8).max(72)
                  .regex(/[A-Z]/, 'Precisa de ao menos uma letra maiúscula')
                  .regex(/[0-9]/, 'Precisa de ao menos um número'),
  departmentId: z.number().int().positive(),
})

const loginSchema = z.object({
  email:    z.email(),
  password: z.string().min(1),
})

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    return
  }

  const { name, email, password, departmentId } = parsed.data
  const ROLE_PADRAO = 'solicitante'   // role forçado, nunca do body
  const ip = req.ip ?? 'unknown'

  try {
    const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email])
    if (exists.rows.length > 0) {
      res.status(409).json({ error: 'E-mail já cadastrado' })
      return
    }

    const password_hash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      `INSERT INTO usuarios (name, email, password_hash, role, department_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, department_id`,
      [name, email, password_hash, ROLE_PADRAO, departmentId]
    )

    const user = result.rows[0]
    await logAudit({ userId: user.id, action: 'CADASTRO', resource: 'usuarios', resourceId: user.id, ip })

    res.status(201).json({ message: 'Conta criada com sucesso. Faça login para continuar.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /auth/login
// loginRateLimiter (por IP) + accountLockoutMiddleware (por e-mail)
router.post('/login', loginRateLimiter, accountLockoutMiddleware, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    return
  }

  const { email, password } = parsed.data
  const ip = req.ip ?? 'unknown'

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, department_id FROM usuarios WHERE email = $1',
      [email]
    )
    const user = result.rows[0]

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      recordLoginFailure(email)   // conta falhas por e-mail
      await logAudit({ userId: null, action: 'LOGIN_FALHOU', resource: 'usuarios', ip })
      res.status(401).json({ error: 'Credenciais inválidas' })
      return
    }

    resetLoginFailures(email)   // reseta contador após sucesso

    // token com JTI único
    const token = generateToken({ id: user.id, role: user.role, departmentId: user.department_id })

    await logAudit({ userId: user.id, action: 'LOGIN', resource: 'usuarios', ip })

    // emite token como cookie HttpOnly + Secure
    setTokenCookie(res, token)

    res.json({
      message: 'Login efetuado com sucesso.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /auth/logout
// revoga o token atual na blacklist
router.post('/logout', authenticateWithBlacklist, (req: Request, res: Response) => {
  const token = req.cookies?.reqbuy_token ?? req.headers.authorization?.slice(7)
  if (token) revokeToken(token)
  clearTokenCookie(res)   // limpa o cookie
  res.json({ message: 'Logout efetuado com sucesso.' })
})

export default router