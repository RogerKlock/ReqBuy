import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'

const CSRF_COOKIE_NAME = 'reqbuy_csrf'
const CSRF_HEADER_NAME = 'x-csrf-token'
const IS_PROD = process.env.NODE_ENV === 'production'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32 || secret.includes('coloque_aqui')) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres e não pode usar o valor de exemplo.')
  }
  return secret
}

function signToken(nonce: string): string {
  return crypto.createHmac('sha256', getJwtSecret()).update(nonce).digest('hex')
}

function isValidCsrfToken(token: string): boolean {
  const [nonce, signature] = token.split('.')
  if (!nonce || !signature) return false

  const expected = signToken(nonce)
  if (signature.length !== expected.length) return false

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export function issueCsrfCookie(res: Response): string {
  const nonce = crypto.randomBytes(32).toString('hex')
  const token = `${nonce}.${signToken(nonce)}`

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  })

  return token
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' })
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next()
    return
  }

  const headerToken = req.header(CSRF_HEADER_NAME)
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]

  if (!headerToken || !cookieToken || headerToken !== cookieToken || !isValidCsrfToken(headerToken)) {
    res.status(403).json({ error: 'Token CSRF inválido ou ausente' })
    return
  }

  next()
}
