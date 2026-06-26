import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/useAuth'
import Layout from '../components/Layout'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import { toast } from 'sonner'
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
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

export default function RequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<Requisicao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal de ação
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'aprovado' | 'rejeitado'>('aprovado')
  const [modalRequestId, setModalRequestId] = useState<number>(0)
  const [modalComment, setModalComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  function fetchRequests(showLoading = true) {
    if (showLoading) setLoading(true)
    api
      .get<Requisicao[]>('/requests')
      .then((res) => setRequests(res.data))
      .catch(() => setError('Erro ao carregar requisições.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true

    api
      .get<Requisicao[]>('/requests')
      .then((res) => {
        if (active) setRequests(res.data)
      })
      .catch(() => {
        if (active) setError('Erro ao carregar requisições.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  function openActionModal(id: number, action: 'aprovado' | 'rejeitado') {
    setModalRequestId(id)
    setModalAction(action)
    setModalComment('')
    setModalOpen(true)
  }

  async function handleAction() {
    setActionLoading(true)
    try {
      await api.post(`/requests/${modalRequestId}/action`, {
        action: modalAction,
        comment: modalComment || undefined,
      })
      toast.success(
        modalAction === 'aprovado'
          ? 'Requisição aprovada com sucesso!'
          : 'Requisição rejeitada.'
      )
      fetchRequests(false)
    } catch {
      toast.error('Erro ao processar ação.')
    } finally {
      setActionLoading(false)
      setModalOpen(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <ErrorState message={error} />
      </Layout>
    )
  }

  const canActOnRequest = (r: Requisicao) =>
    (user?.role === 'aprovador' && r.status === 'pendente') ||
    (user?.role === 'financeiro' && r.status === 'aprovado_gestor')

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Requisições"
          subtitle={`${requests.length} ${requests.length === 1 ? 'requisição encontrada' : 'requisições encontradas'}`}
          action={
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                bg-accent text-black font-semibold text-sm
                hover:bg-accent-hover
                transition-colors duration-200 no-underline"
            >
              <Plus size={18} />
              Nova Requisição
            </Link>
          }
        />

        {requests.length === 0 ? (
          <EmptyState
            icon={<Clock size={28} />}
            title="Nenhuma requisição encontrada"
            description="Crie sua primeira requisição de compra"
            action={
              <Link
                to="/requests/new"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl
                  bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20
                  transition-colors no-underline"
              >
                <Plus size={16} /> Criar Requisição
              </Link>
            }
          />
        ) : (
          <div className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-4">
                      Título
                    </th>
                    {(user?.role === 'aprovador' || user?.role === 'financeiro') && (
                      <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-4">
                        Solicitante
                      </th>
                    )}
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-4">
                      Valor
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-4">
                      Data
                    </th>
                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-4">
                      Status
                    </th>
                    {(user?.role === 'aprovador' || user?.role === 'financeiro') && (
                      <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-4">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-text-primary">{r.title}</p>
                        <p className="text-xs text-text-muted mt-0.5 max-w-xs truncate">
                          {r.description}
                        </p>
                      </td>
                      {(user?.role === 'aprovador' || user?.role === 'financeiro') && (
                        <td className="px-5 py-4">
                          <p className="text-sm text-text-secondary">{r.requester_name}</p>
                          <p className="text-xs text-text-muted">{r.department_name}</p>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-text-primary">
                          {Number(r.amount).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-text-secondary whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      {(user?.role === 'aprovador' || user?.role === 'financeiro') && (
                        <td className="px-5 py-4">
                          {canActOnRequest(r) && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openActionModal(r.id, 'aprovado')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                  text-success bg-success-soft hover:bg-success/20 transition-colors
                                  cursor-pointer border-0"
                              >
                                <CheckCircle2 size={14} /> Aprovar
                              </button>
                              <button
                                onClick={() => openActionModal(r.id, 'rejeitado')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                  text-danger bg-danger-soft hover:bg-danger/20 transition-colors
                                  cursor-pointer border-0"
                              >
                                <XCircle size={14} /> Rejeitar
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        disabled={actionLoading}
      >
        <div className="flex items-center gap-3 mb-4 pr-8">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              modalAction === 'aprovado'
                ? 'bg-success-soft text-success'
                : 'bg-danger-soft text-danger'
            }`}
          >
            {modalAction === 'aprovado' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {modalAction === 'aprovado' ? 'Aprovar' : 'Rejeitar'} Requisição
            </h3>
            <p className="text-xs text-text-muted">Adicione um comentário (opcional)</p>
          </div>
        </div>

        <div className="relative mb-4">
          <MessageSquare size={18} className="absolute left-3 top-3 text-text-muted" />
          <textarea
            value={modalComment}
            onChange={(e) => setModalComment(e.target.value)}
            placeholder="Comentário..."
            rows={3}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-input border border-border text-text-primary
              placeholder:text-text-muted/50 text-sm resize-none
              focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-accent/20
              transition-colors duration-200"
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setModalOpen(false)}
            disabled={actionLoading}
          >
            Cancelar
          </Button>
          <Button
            variant={modalAction === 'aprovado' ? 'success' : 'danger'}
            size="md"
            fullWidth
            loading={actionLoading}
            onClick={handleAction}
          >
            {!actionLoading &&
              (modalAction === 'aprovado' ? 'Confirmar Aprovação' : 'Confirmar Rejeição')}
          </Button>
        </div>
      </Modal>
    </Layout>
  )
}
