import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

/**
 * Login administrativo — separado do login de empresas/clientes (/entrar).
 * Autentica contra a tabela admin_users (sem cadastro público). Sessão
 * própria (admin_session), independente de qualquer login de empresa.
 */
export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: async () => {
      toast.success("Bem-vindo ao painel administrativo");
      await utils.auth.me.invalidate();
      window.location.href = "/admin";
    },
    onError: (e) => {
      if (e.message?.includes("Muitas tentativas")) {
        toast.error("Acesso temporariamente bloqueado", { description: e.message });
      } else {
        toast.error("Erro no login", { description: "E-mail ou senha inválidos" });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
          <p className="text-slate-500 text-sm mt-1">Acesso restrito ao administrador do Higifácil</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="email"
                placeholder="admin@higifacil.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-11 h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-white font-semibold"
            style={{ background: "#1A9FE3" }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Entrando..." : "Entrar no painel"}
          </Button>
        </form>

        <button
          onClick={() => navigate("/")}
          className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors mt-6"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
