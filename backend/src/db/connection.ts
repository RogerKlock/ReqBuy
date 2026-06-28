import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const IS_PROD = process.env.NODE_ENV === 'production'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.trim(),
  ssl: IS_PROD ? { rejectUnauthorized: false } : undefined,
})
