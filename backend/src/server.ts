import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

dotenv.config()

// rotas agora sob /api/v1/
import authRoutes       from './routes/auth'
import requestRoutes    from './routes/requests'
import auditRoutes      from './routes/audit'
import departmentRoutes from './routes/departments'

const app  = express()
const PORT = process.env.PORT ?? 3001

// Helmet — headers de segurança HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 365 * 24 * 60 * 60, includeSubDomains: true, preload: true },
  noSniff:       true,
  hidePoweredBy: true,
  frameguard:    { action: 'deny' },
}))

// CORS
app.use(cors({
  origin:      process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,   // necessário para enviar/receber cookies
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))

app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())   // parse de cookies HttpOnly
app.use(morgan('dev'))

// redireciona HTTP → HTTPS em produção
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next()
    res.redirect(301, `https://${req.headers.host}${req.url}`)
  })
}

// prefixo /api/v1/
app.use('/api/v1/auth',        authRoutes)
app.use('/api/v1/requests',    requestRoutes)
app.use('/api/v1/audit',       auditRoutes)
app.use('/api/v1/departments', departmentRoutes)

// Manter compatibilidade com /api/* durante a transição (deprecado)
app.use('/api/auth',        authRoutes)
app.use('/api/requests',    requestRoutes)
app.use('/api/audit',       auditRoutes)
app.use('/api/departments', departmentRoutes)

app.listen(PORT, () => {
  console.log(`[ReqBuy] Backend rodando em http://localhost:${PORT}`)
})