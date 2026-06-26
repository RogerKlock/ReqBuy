import { Router, Response } from 'express'
import { pool } from '../db/connection'

const router = Router()

/**
 * GET /api/departments
 * Lista todos os departamentos disponíveis.
 * Público para permitir carregar o cadastro antes do login.
 */
router.get('/', async (_req, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name FROM departamentos ORDER BY name ASC')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
