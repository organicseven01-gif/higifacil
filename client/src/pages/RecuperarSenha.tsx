import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "wouter";
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";

const LOGO_URL = "/logo-higifacil.png";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);

  const requestResetMutation = trpc.companyAuth.requestReset.useMutation({
    onSuccess: () => {
      setEnviado(true);
    },
    onError: (e) => toast.error("Erro ao solicitar redefinição", { description: e.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    requestResetMutation.mutate({ email, origin: window.location.origin });
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Lado esquerdo — identidade visual */}
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

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(26,159,227,0.08)", border: "1px solid rgba(26,159,227,0.15)" }}>
            <KeyRound className="h-6 w-6 shrink-0" style={{ color: "#1A9FE3" }} />
            <div>
              <p className="text-white/80 text-sm font-medium">Redefinição segura</p>
              <p className="text-white/40 text-xs mt-0.5">Você receberá um link por e-mail para criar uma nova senha com segurança.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/20 text-xs">
            &copy; {new Date().getFullYear()} Higifácil · higifacil.com.br
          </p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16">
        {/* Logo mobile */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <img src={LOGO_URL} alt="Higifácil" className="h-9 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        </div>

        <div className="w-full max-w-md">
          {!enviado ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Recuperar senha</h1>
                <p className="text-slate-400 mt-2">
                  Informe o e-mail cadastrado e enviaremos as instruções para redefinir sua senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">E-mail cadastrado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="email"
                      placeholder="sua@empresa.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-white font-semibold"
                  style={{ background: "#1A9FE3" }}
                  disabled={requestResetMutation.isPending}
                >
                  {requestResetMutation.isPending ? "Enviando..." : "Enviar instruções"}
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
            /* Estado de sucesso */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(26,159,227,0.15)" }}>
                  <CheckCircle2 className="h-8 w-8" style={{ color: "#1A9FE3" }} />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Instruções enviadas!</h2>
                <p className="text-slate-400 mt-3 text-sm leading-relaxed">
                  Se o e-mail <span className="text-white font-medium">{email}</span> estiver cadastrado no sistema, você receberá um link para redefinir sua senha em breve.
                </p>
                <p className="text-slate-500 mt-2 text-xs">
                  Não recebeu? Verifique a caixa de spam ou entre em contato com o administrador.
                </p>
              </div>
              <Link href="/entrar">
                <Button
                  variant="outline"
                  className="w-full h-11 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para o login
                </Button>
              </Link>
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
