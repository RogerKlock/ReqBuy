import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import StatCard from '../components/ui/StatCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import StatusBadge from '../components/ui/StatusBadge'
import {
  FileText,
  FilePlus,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'


interface Requisicao {
  id: number
  title: string
  description: string
  amount: number
  status: string
  requester_name: string
  department_name: string
  requester_id: number
  department_id: number
  created_at: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<Requisicao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<Requisicao[]>('/requests')
      .then((res) => setRequests(res.data))
      .finally(() => setLoading(false))
  }, [])

  const totalRequests = requests.length
  const pendingRequests = requests.filter((r) => r.status === 'pendente').length
  const approvedRequests = requests.filter(
    (r) => r.status === 'aprovado_gestor' || r.status === 'aprovado_financeiro'
  ).length
  const totalValue = requests.reduce((acc, r) => acc + Number(r.amount), 0)

  const stats = [
    {
      label: 'Total de Requisições',
      value: totalRequests,
      icon: <FileText size={22} />,
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
    },
    {
      label: 'Pendentes',
      value: pendingRequests,
      icon: <Clock size={22} />,
      iconColor: 'text-warning',
      iconBg: 'bg-warning-soft',
    },
    {
      label: 'Aprovadas',
      value: approvedRequests,
      icon: <CheckCircle2 size={22} />,
      iconColor: 'text-success',
      iconBg: 'bg-success-soft',
    },
    {
      label: 'Valor Total',
      value: totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: <TrendingUp size={22} />,
      iconColor: 'text-info',
      iconBg: 'bg-info-soft',
    },
  ]

  const quickActions = [
    {
      to: '/requests/new',
      icon: <FilePlus size={24} />,
      title: 'Nova Requisição',
      description: 'Criar uma nova requisição de compra',
    },
    {
      to: '/requests',
      icon: <FileText size={24} />,
      title: 'Ver Requisições',
      description: 'Acompanhar o status dos pedidos',
    },
  ]

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">
            Olá, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-text-secondary text-sm">
            Aqui está o resumo das suas requisições
          </p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            {/* Ações rápidas */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="group glass p-5 flex items-center gap-4
                      hover:bg-bg-card-hover transition-colors duration-200
                      no-underline"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text-primary">{action.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{action.description}</p>
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-text-muted group-hover:text-accent transition-colors duration-200"
                    />
                  </Link>
                ))}
              </div>
            </div>

            {/* Requisições recentes */}
            {requests.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-text-primary">Requisições Recentes</h2>
                  <Link
                    to="/requests"
                    className="text-sm text-accent hover:text-accent-hover transition-colors no-underline flex items-center gap-1"
                  >
                    Ver todas <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="glass overflow-hidden">
                  <div className="divide-y divide-border">
                    {requests.slice(0, 5).map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{req.title}</p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {new Date(req.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <StatusBadge status={req.status} />
                          <span className="text-sm font-semibold text-text-primary">
                            {Number(req.amount).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
