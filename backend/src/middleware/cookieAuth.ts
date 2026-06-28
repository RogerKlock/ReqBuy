import { Response } from 'express'
import { clearCsrfCookie, issueCsrfCookie } from './csrf'

const COOKIE_NAME  = 'reqbuy_token'
const IS_PROD      = process.env.NODE_ENV === 'production'

export function setTokenCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly:  true,          // inacessível via document.cookie / JS
    secure:    IS_PROD,       // HTTPS obrigatório em produção
    sameSite:  IS_PROD ? 'none' : 'strict',  // 'none' em prod (cross-domain Vercel↔Render)
    maxAge:    8 * 60 * 60 * 1000,
    path:      '/',
  })
  issueCsrfCookie(res)
}

export function clearTokenCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  clearCsrfCookie(res)
}
