import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  ChevronRight,
} from 'lucide-react'

const roleLabel: Record<string, string> = {
  solicitante: 'Solicitante',
  aprovador: 'Aprovador',
  financeiro: 'Financeiro',
}

const roleBadgeColor: Record<string, string> = {
  solicitante: 'bg-info-soft text-info',
  aprovador: 'bg-warning-soft text-warning',
  financeiro: 'bg-accent/15 text-accent',
}

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  roles?: string[]
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/requests', icon: <FileText size={20} />, label: 'Requisições' },
  { to: '/requests/new', icon: <FilePlus size={20} />, label: 'Nova Requisição' },
  { to: '/audit', icon: <ShieldCheck size={20} />, label: 'Auditoria', roles: ['financeiro'] },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role ?? '')
  )

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 glass-strong flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <ShoppingCart size={20} className="text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">ReqBuy</h1>
            <p className="text-xs text-text-muted">Requisições de Compra</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-colors duration-200 no-underline
                  ${
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }
                `}
              >
                <span>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight size={14} className="ml-auto text-accent/60" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-border">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-black text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColor[user?.role ?? ''] ?? 'bg-white/10 text-text-secondary'}`}>
                  {roleLabel[user?.role ?? ''] ?? user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm
                text-text-secondary hover:text-danger hover:bg-danger-soft
                transition-colors duration-200 cursor-pointer bg-transparent border-0"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border glass-strong sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-0 text-text-primary"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">ReqBuy</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
