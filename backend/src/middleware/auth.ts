import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { isTokenRevoked } from './jwtBlacklist'

export interface AuthRequest extends Request {
  user?: { id: number; role: string; departmentId: number }
}

// lê token do cookie HttpOnly primeiro, depois do header Authorization
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
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
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number; role: string; departmentId: number; jti: string
    }
    // rejeita tokens revogados (blacklist)
    if (isTokenRevoked(payload.jti)) {
      res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' })
      return
    }
    req.user = { id: payload.id, role: payload.role, departmentId: payload.departmentId }
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso não autorizado' })
      return
    }
    next()
  }
}