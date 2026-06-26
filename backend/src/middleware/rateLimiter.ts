/**
 * Rate Limiting & Bloqueio Temporário de Conta
 *
 * Instalação: npm install express-rate-limit
 */

import rateLimit from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express'

// Camada 1: Rate limiter por IP (20 tentativas / 15 min) 
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
})

// Camada 2: Bloqueio de conta por e-mail após 5 falhas
const MAX_FAILURES = 5
const LOCKOUT_MS   = 15 * 60 * 1000   // 15 min

interface FailureRecord { count: number; lockedUntil: number | null }

// Em produção substitua por Redis para persistência entre instâncias
const store = new Map<string, FailureRecord>()

function getRecord(email: string): FailureRecord {
  return store.get(email) ?? { count: 0, lockedUntil: null }
}

export function isAccountLocked(email: string): boolean {
  const r = getRecord(email)
  if (!r.lockedUntil) return false
  if (Date.now() < r.lockedUntil) return true
  store.delete(email)   // bloqueio expirou
  return false
}

export function recordLoginFailure(email: string): void {
  const r = getRecord(email)
  r.count += 1
  if (r.count >= MAX_FAILURES) r.lockedUntil = Date.now() + LOCKOUT_MS
  store.set(email, r)
}

export function resetLoginFailures(email: string): void {
  store.delete(email)
}

export function accountLockoutMiddleware(req: Request, res: Response, next: NextFunction): void {
  const email: string | undefined = req.body?.email
  if (email && isAccountLocked(email)) {
    res.status(429).json({ error: 'Conta bloqueada temporariamente por excesso de tentativas. Aguarde 15 minutos.' })
    return
  }
  next()
}