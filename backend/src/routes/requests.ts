import { Router, Response } from 'express'
import { z } from 'zod'
import { pool } from '../db/connection'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { logAudit } from '../services/audit'

const router = Router()

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  amount: z.number().positive(),
})

const actionSchema = z.object({
  action: z.enum(['aprovado', 'rejeitado']),
  comment: z.string().optional(),
})

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    return
  }

  const { title, description, amount } = parsed.data
  const user = req.user!
  const ip = req.ip ?? 'unknown'

  try {
    const result = await pool.query(
      `INSERT INTO solicitacoes_compra (title, description, amount, requester_id, department_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, amount, status, requester_id, department_id, created_at`,
      [title, description, amount, user.id, user.departmentId]
    )
    await logAudit({
      userId: user.id,
      action: 'CRIAR_REQUISICAO',
      resource: 'solicitacoes_compra',
      resourceId: result.rows[0].id,
      ip,
    })
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!
  try {
    let query: string
    let params: unknown[]

    if (user.role === 'solicitante') {
      query = `SELECT pr.*, u.name as requester_name, d.name as department_name
               FROM solicitacoes_compra pr
               JOIN usuarios u ON pr.requester_id = u.id
               JOIN departamentos d ON pr.department_id = d.id
               WHERE pr.requester_id = $1
               ORDER BY pr.created_at DESC`
      params = [user.id]
    } else if (user.role === 'aprovador') {
      query = `SELECT pr.*, u.name as requester_name, d.name as department_name
               FROM solicitacoes_compra pr
               JOIN usuarios u ON pr.requester_id = u.id
               JOIN departamentos d ON pr.department_id = d.id
               WHERE pr.department_id = $1
               ORDER BY pr.created_at DESC`
      params = [user.departmentId]
    } else {
      query = `SELECT pr.*, u.name as requester_name, d.name as department_name
               FROM solicitacoes_compra pr
               JOIN usuarios u ON pr.requester_id = u.id
               JOIN departamentos d ON pr.department_id = d.id
               ORDER BY pr.created_at DESC`
      params = []
    }

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.post(
  '/:id/action',
  authenticate,
  authorize('aprovador', 'financeiro'),
  async (req: AuthRequest, res: Response) => {
    const parsed = actionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos' })
      return
    }

    const user = req.user!
    const idParam = req.params.id
    const requestId = parseInt(Array.isArray(idParam) ? idParam[0] : idParam, 10)
    const { action, comment } = parsed.data
    const ip = req.ip ?? 'unknown'

    try {
      const reqResult = await pool.query('SELECT * FROM solicitacoes_compra WHERE id = $1', [requestId])
      const pr = reqResult.rows[0]
      if (!pr) {
        res.status(404).json({ error: 'Requisição não encontrada' })
        return
      }

      if (user.role === 'aprovador') {
        if (pr.department_id !== user.departmentId) {
          await logAudit({
            userId: user.id,
            action: 'ACESSO_NAO_AUTORIZADO',
            resource: 'solicitacoes_compra',
            resourceId: requestId,
            ip,
          })
          res.status(403).json({ error: 'Acesso não autorizado' })
          return
        }
        if (pr.status !== 'pendente') {
          res.status(400).json({ error: 'Requisição não está pendente' })
          return
        }
      }

      if (user.role === 'financeiro' && pr.status !== 'aprovado_gestor') {
        res.status(400).json({ error: 'Requisição não aguarda aprovação financeira' })
        return
      }

      const newStatus =
        user.role === 'aprovador'
          ? action === 'aprovado'
            ? 'aprovado_gestor'
            : 'rejeitado_gestor'
          : action === 'aprovado'
          ? 'aprovado_financeiro'
          : 'rejeitado_financeiro'

      await pool.query(
        'UPDATE solicitacoes_compra SET status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, requestId]
      )
      await pool.query(
        'INSERT INTO acoes_solicitacao (request_id, user_id, action, comment) VALUES ($1, $2, $3, $4)',
        [requestId, user.id, action, comment ?? null]
      )
      await logAudit({
        userId: user.id,
        action: `${action.toUpperCase()}_REQUISICAO`,
        resource: 'solicitacoes_compra',
        resourceId: requestId,
        ip,
      })

      res.json({ message: `Requisição ${action} com sucesso`, status: newStatus })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }
)

export default router
