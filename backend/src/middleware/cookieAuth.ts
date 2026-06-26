/**
 * Cookie HttpOnly + Secure no lugar de sessionStorage
 *
 * Instalação: npm install cookie-parser  &&  npm i -D @types/cookie-parser
 */

import { Response } from 'express'

const COOKIE_NAME  = 'reqbuy_token'
const IS_PROD      = process.env.NODE_ENV === 'production'

export function setTokenCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly:  true,          // inacessível via document.cookie / JS
    secure:    IS_PROD,       // HTTPS obrigatório em produção
    sameSite:  'strict',      // proteção extra contra CSRF
    maxAge:    8 * 60 * 60 * 1000,
    path:      '/',
  })
}

export function clearTokenCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}