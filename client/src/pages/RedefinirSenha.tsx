import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const LOGO_URL = "/logo-higifacil.png";

export default function RedefinirSenha() {
  const [, navigate] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [concluido, setConcluido] = useState(false);

  // Extrair token da URL: /redefinir-senha?token=xxx
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const resetMutation = trpc.companyAuth.resetPassword.useMutation({
    onSuccess: () => {
      setConcluido(true);
      toast.success("Senha redefinida com sucesso!");
    },
    onError: (e) => toast.error("Erro ao redefinir senha", { description: e.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    resetMutation.mutate({ token, newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-500/15">
              <AlertCircle className="h-7 w-7 text-red-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">Link inválido</h2>
          <p className="text-slate-400 text-sm">Este link de redefinição de senha é inválido ou expirou. Solicite um novo link.</p>
          <Link href="/recuperar-senha">
            <Button className="w-full" style={{ background: "#1A9FE3" }}>
              Solicitar novo link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Lado esquerdo */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0A1628 0%, #0d2040 60%, #0A1628 100%)" }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full -translate-y-1/2 translate-x-1/2" style={{ background: "rgba(26,159,227,0.08)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full translate-y-1/2 -translate-x-1/2" style={{ background: "rgba(26,159,227,0.06)" }} />

        <div className="relative z-10">
          <img src={LOGO_URL} alt="Higifácil" className="h-12 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-white/50 mt-3 text-sm">Sistema de Gestão para Higienizadores</p>
        </div>

        <div className="relative z-10 space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium">Dicas de segurança</p>
          {["Use pelo menos 8 caracteres", "Combine letras, números e símbolos", "Evite senhas óbvias como datas de nascimento"].map((tip) => (
            <div key={tip} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#1A9FE3" }} />
              <span className="text-white/60 text-sm">{tip}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <p className="text-white/20 text-xs">
            &copy; {new Date().getFullYear()} Higifácil · higifacil.com.br
          </p>
        </div>
      </div>

      {/* Lado direito */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16">
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <img src={LOGO_URL} alt="Higifácil" className="h-9 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        </div>

        <div className="w-full max-w-md">
          {!concluido ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Nova senha</h1>
                <p className="text-slate-400 mt-2">Escolha uma senha segura para sua conta.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-11 h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                      required
                      minLength={6}
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

                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> As senhas não coincidem
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-white font-semibold"
                  style={{ background: "#1A9FE3" }}
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                <Link href="/entrar">
                  <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mx-auto">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o login
                  </button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(26,159,227,0.15)" }}>
                  <CheckCircle2 className="h-8 w-8" style={{ color: "#1A9FE3" }} />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Senha redefinida!</h2>
                <p className="text-slate-400 mt-3 text-sm">
                  Sua senha foi atualizada com sucesso. Você já pode entrar na plataforma com a nova senha.
                </p>
              </div>
              <Button
                className="w-full h-11 text-white font-semibold"
                style={{ background: "#1A9FE3" }}
                onClick={() => navigate("/entrar")}
              >
                Ir para o login
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-slate-600 mt-6">
            Acesso restrito a empresas cadastradas · <a href="https://higifacil.com.br" className="hover:text-slate-400 transition-colors">higifacil.com.br</a>
          </p>
        </div>
      </div>
    </div>
  );
}
