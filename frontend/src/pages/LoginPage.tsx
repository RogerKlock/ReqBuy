import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import Card from "../components/ui/Card";
import InputField from "../components/ui/InputField";
import Button from "../components/ui/Button";
import { toast } from "sonner";
import { ShoppingCart, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Login realizado com sucesso!')
      navigate('/dashboard')
    } catch {
      toast.error('E-mail ou senha inválidos.')
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            ReqBuy
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Sistema de Requisições de Compra
          </p>
        </div>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-1">
            Bem-vindo de volta
          </h2>
          <p className="text-text-muted text-sm mb-6">
            Entre com suas credenciais para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <InputField
              id="login-email"
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
              id="login-password"
              label="Senha"
              as="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
            />

            <Button
              id="login-submit"
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={<ArrowRight size={18} />}
            >
              {!loading && "Entrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Não tem conta?{" "}
            <Link
              to="/register"
              className="text-accent hover:text-accent-hover font-medium transition-colors no-underline"
            >
              Criar conta
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
