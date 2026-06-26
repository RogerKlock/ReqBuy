/**
 * Invalidação de Tokens JWT (Blacklist por JTI)
 *
 */

import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from './auth'

const JWT_EXPIRY_SECS = 8 * 60 * 60   // espelha o '8h' usado nas rotas

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32 || secret.includes('coloque_aqui')) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres e não pode usar o valor de exemplo.')
  }
  return secret
}

// Blacklist em memória: jti → expiresAt (ms)
// Em produção use Redis: SET jti "" EX <ttl_seconds>
const revoked = new Map<string, number>()

// Limpeza periódica (1x/hora) para não crescer indefinidamente
setInterval(() => {
  const now = Date.now()
  for (const [jti, exp] of revoked) {
    if (now > exp) revoked.delete(jti)
  }
}, 60 * 60 * 1000)

// Geração de token com JTI
export function generateToken(payload: { id: number; role: string; departmentId: number }): string {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY_SECS }
  )
}

// Revogação (chamar no logout)
export function revokeToken(token: string): void {
  try {
    const decoded = jwt.decode(token) as { jti?: string; exp?: number } | null
    if (decoded?.jti && decoded?.exp) {
      revoked.set(decoded.jti, decoded.exp * 1000)
    }
  } catch { /* token malformado — ignorar */ }
}

export function isTokenRevoked(jti: string): boolean {
  return revoked.has(jti)
}

// Middleware de autenticação com checagem de blacklist
export function authenticateWithBlacklist(req: AuthRequest, res: Response, next: NextFunction): void {
  const token: string | undefined =
    req.cookies?.reqbuy_token ??
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined)

  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' })
    return
  }
  try {
    const payload = jwt.verify(token, getJwtSecret()) as {
      id: number; role: string; departmentId: number; jti: string
    }
    if (isTokenRevoked(payload.jti)) {
      res.status(401).json({ error: 'Token revogado. Faça login novamente.' })
      return
    }
    req.user = { id: payload.id, role: payload.role, departmentId: payload.departmentId }
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}
