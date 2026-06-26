import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import Card from '../components/ui/Card'
import InputField from '../components/ui/InputField'
import Button from '../components/ui/Button'
import { toast } from 'sonner'
import api from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { ShoppingCart, User, Mail, Lock, ArrowRight, Building2 } from 'lucide-react'

interface Department {
  id: number
  name: string
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [departmentId, setDepartmentId] = useState<number>(0)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDepts, setLoadingDepts] = useState(true)

  useEffect(() => {
    api
      .get<Department[]>('/departments')
      .then((res) => {
        setDepartments(res.data)
        if (res.data.length > 0) setDepartmentId(res.data[0].id)
      })
      .catch(() => {
        const fallback = [
          { id: 1, name: 'TI' },
          { id: 2, name: 'RH' },
          { id: 3, name: 'Financeiro' },
          { id: 4, name: 'Operações' },
        ]
        setDepartments(fallback)
        setDepartmentId(1)
      })
      .finally(() => setLoadingDepts(false))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (!/[A-Z]/.test(password)) {
      toast.error('A senha deve conter ao menos uma letra maiúscula.')
      return
    }
    if (!/[0-9]/.test(password)) {
      toast.error('A senha deve conter ao menos um número.')
      return
    }

    setLoading(true)
    try {
      await register({ name, email, password, departmentId })
      toast.success('Conta criada com sucesso! Faça login para continuar.')
      navigate('/login')
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const backendMessage = axiosError?.response?.data?.error
      toast.error(backendMessage || 'Erro ao criar conta. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-4">
            <ShoppingCart size={28} className="text-black" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">ReqBuy</h1>
          <p className="text-text-secondary mt-1 text-sm">Criar sua conta</p>
        </div>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-1">Cadastre-se</h2>
          <p className="text-text-muted text-sm mb-6">Preencha os dados para criar sua conta</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              id="register-name"
              label="Nome completo"
              as="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              placeholder="Seu nome completo"
              icon={<User size={18} />}
            />

            <InputField
              id="register-email"
              label="E-mail"
              as="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              icon={<Mail size={18} />}
            />

            <InputField
              id="register-password"
              label="Senha"
              as="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mín. 8 caracteres, 1 maiúscula e 1 número"
              icon={<Lock size={18} />}
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Setor (Departamento)</label>
              <div className="relative">
                <Building2
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                {loadingDepts ? (
                  <div className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-input border border-border flex items-center">
                    <LoadingSpinner size={16} fullPage={false} />
                  </div>
                ) : (
                  <select
                    id="register-department"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-input border border-border text-text-primary text-sm
                      appearance-none cursor-pointer
                      focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-accent/20
                      transition-colors duration-200"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <Button
              id="register-submit"
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={<ArrowRight size={18} />}
              className="mt-2"
            >
              {!loading && 'Criar conta'}
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Já tem conta?{' '}
            <Link
              to="/login"
              className="text-accent hover:text-accent-hover font-medium transition-colors no-underline"
            >
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
