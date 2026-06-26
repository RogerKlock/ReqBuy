/**
 * Pseudonimização de IPs + Política de Retenção (LGPD)
 */

import crypto from 'crypto'
import { pool } from '../db/connection'

const IP_HASH_SALT = process.env.IP_HASH_SALT ?? 'DEFINA_IP_HASH_SALT_NO_ENV'
const RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS ?? '90', 10)

/** Pseudonimiza o IP com HMAC-SHA256 — não é reversível sem o salt */
function pseudonymizeIp(ip: string): string {
  return crypto
    .createHmac('sha256', IP_HASH_SALT)
    .update(ip)
    .digest('hex')
    .slice(0, 16)
}

interface AuditEntry {
  userId:     number | null
  action:     string
  resource?:  string
  resourceId?: number
  ip?:        string
}

export async function logAudit({ userId, action, resource, resourceId, ip }: AuditEntry) {
  const ipHashed = ip ? pseudonymizeIp(ip) : null
  // grava ip pseudonimizado + expires_at para retenção automática
  await pool.query(
    `INSERT INTO logs_auditoria (user_id, action, resource, resource_id, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' days')::INTERVAL)`,
    [userId ?? null, action, resource ?? null, resourceId ?? null, ipHashed, RETENTION_DAYS]
  ).catch(err => {
    // Se a coluna expires_at ainda não existir (antes da migration), cai no fallback
    if ((err as any).code === '42703') {
      return pool.query(
        `INSERT INTO logs_auditoria (user_id, action, resource, resource_id, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId ?? null, action, resource ?? null, resourceId ?? null, ipHashed]
      )
    }
    throw err
  })
}

// Job de limpeza automática (roda 1x/dia)
async function purgeExpiredLogs() {
  try {
    const r = await pool.query('DELETE FROM logs_auditoria WHERE expires_at < NOW()')
    console.info(`[audit] Limpeza: ${r.rowCount} log(s) expirado(s) removidos.`)
  } catch (err) {
    console.error('[audit] Erro na limpeza de logs:', err)
  }
}

// Agenda para a meia-noite UTC seguinte, depois repete a cada 24h
const now      = new Date()
const midnight = new Date(now)
midnight.setUTCHours(24, 0, 0, 0)
setTimeout(() => {
  purgeExpiredLogs()
  setInterval(purgeExpiredLogs, 24 * 60 * 60 * 1000)
}, midnight.getTime() - now.getTime())