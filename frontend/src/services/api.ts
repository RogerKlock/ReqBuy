import axios from 'axios'

const api = axios.create({
  baseURL:      import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
  withCredentials: true,   // envia/recebe cookies HttpOnly automaticamente
})

function readCookie(name: string): string | null {
  const value = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]

  return value ? decodeURIComponent(value) : null
}

// Token JWT fica em cookie HttpOnly. O token CSRF é legível e enviado em
// operações mutáveis para proteger o cookie de sessão.
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase()
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = readCookie('reqbuy_csrf')
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken
  }

  return config
})

// Interceptor de resposta: redireciona para login em caso de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url ?? ''
    if (
      error.response?.status === 401 &&
      !requestUrl.endsWith('/auth/me') &&
      !requestUrl.endsWith('/auth/login')
    ) {
      sessionStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
