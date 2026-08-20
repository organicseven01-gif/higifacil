import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Building2, Eye, EyeOff, Lock, Mail, KeyRound } from "lucide-react";

type View = "login" | "forgot" | "reset";

export default function CompanyLogin() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>("login");
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Forgot form
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const subUserLoginMutation = trpc.companyUsers.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      window.location.href = "/dashboard";
    },
    onError: () => {
      // Se falhar como sub-usuário, tenta como master da empresa
      masterLoginMutation.mutate({ email, password });
    },
  });

  const masterLoginMutation = trpc.companyAuth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      window.location.href = "/dashboard";
    },
    onError: (e) => {
      if (e.message?.includes("Muitas tentativas")) {
        toast.error("Acesso temporariamente bloqueado", { description: e.message });
      } else {
        toast.error("E-mail ou senha incorretos", { description: e.message });
      }
    },
  });

  const loginMutation = { isPending: subUserLoginMutation.isPending || masterLoginMutation.isPending };

  const forgotMutation = trpc.companyAuth.requestReset.useMutation({
    onSuccess: () => {
      // O servidor não retorna mais o token diretamente (por segurança) —
      // ele é enviado por e-mail com um link para /redefinir-senha.
      toast.success("Se o e-mail existir, enviamos um link de recuperação.", {
        description: "Confira sua caixa de entrada (e o spam).",
      });
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const resetMutation = trpc.companyAuth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso! Faça login.");
      setView("login");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    // Tenta login como sub-usuário primeiro; se falhar, tenta como master da empresa
    subUserLoginMutation.mutate({ email, password });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    forgotMutation.mutate({ email: forgotEmail });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    resetMutation.mutate({ token: resetToken, newPassword });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 mb-2">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Portal da Empresa</h1>
          <p className="text-slate-400 text-sm">Acesse o sistema de gestão da sua empresa</p>
        </div>

        {/* Login */}
        {view === "login" && (
          <Card className="border-slate-700 bg-slate-800/80 backdrop-blur shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg">Entrar</CardTitle>
              <CardDescription className="text-slate-400">Use o e-mail e senha fornecidos pelo administrador</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-slate-300">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="empresa@email.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="w-full text-sm text-slate-400 hover:text-blue-400 transition-colors text-center"
                >
                  Esqueci minha senha
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Esqueci a senha */}
        {view === "forgot" && (
          <Card className="border-slate-700 bg-slate-800/80 backdrop-blur shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg">Recuperar Senha</CardTitle>
              <CardDescription className="text-slate-400">Informe o e-mail cadastrado para receber o token de recuperação</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-slate-300">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="empresa@email.com.br"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={forgotMutation.isPending}
                >
                  {forgotMutation.isPending ? "Enviando..." : "Solicitar Recuperação"}
                </Button>
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="w-full text-sm text-slate-400 hover:text-blue-400 transition-colors text-center"
                >
                  ← Voltar ao login
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Redefinir senha */}
        {view === "reset" && (
          <Card className="border-slate-700 bg-slate-800/80 backdrop-blur shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg">Nova Senha</CardTitle>
              <CardDescription className="text-slate-400">Digite o token recebido e escolha uma nova senha</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-slate-300">Token de Recuperação</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cole o token aqui"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 font-mono text-xs"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? "Salvando..." : "Redefinir Senha"}
                </Button>
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="w-full text-sm text-slate-400 hover:text-blue-400 transition-colors text-center"
                >
                  ← Voltar ao login
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-slate-500">
          Problemas para acessar? Entre em contato com o administrador do sistema.
        </p>
      </div>
    </div>
  );
}
