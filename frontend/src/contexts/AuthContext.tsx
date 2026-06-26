import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import api from '../services/api'
import { AuthContext } from './authContextValue'
import type { RegisterData, User } from './authTypes'

export function AuthProvider({ children }: { children: ReactNode }) {
  // token agora fica em cookie HttpOnly — não mais em sessionStorage.
  // Apenas o objeto `user` (sem dados sensíveis) é mantido em estado React.
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('user')
    return stored ? (JSON.parse(stored) as User) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ user: User }>('/auth/me')
      .then(({ data }) => {
        sessionStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
      })
      .catch(() => {
        sessionStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    // o backend emite o token como cookie HttpOnly.
    // O body da resposta contém apenas os dados do usuário (sem token).
    const { data } = await api.post<{ message: string; user: User }>('/auth/login', {
      email,
      password,
    })
    // Apenas dados não-sensíveis em sessionStorage (sem token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  async function register(data: RegisterData) {
    await api.post('/auth/register', data)
    // Não faz auto-login — usuário deve logar após o cadastro
  }

  async function logout() {
    try {
      // chama /logout para revogar o token na blacklist do backend
      // o backend também limpa o cookie HttpOnly
      await api.post('/auth/logout')
    } catch {
      // ignora erros de rede no logout
    } finally {
      sessionStorage.removeItem('user')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
