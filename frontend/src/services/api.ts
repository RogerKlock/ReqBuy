import axios from 'axios'

const api = axios.create({
  baseURL:      import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
  withCredentials: true,   // envia/recebe cookies HttpOnly automaticamente
})

// token não está mais em sessionStorage — removido o interceptor de Authorization.
// O cookie HttpOnly é enviado automaticamente pelo browser em toda requisição.

// Interceptor de resposta: redireciona para login em caso de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api