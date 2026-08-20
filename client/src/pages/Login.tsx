import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

const LOGO_URL = "/logo-higifacil.png";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// Tipo local para o Google Identity Services (GIS) — não usamos `declare
// global` aqui porque `Map.tsx` já estende `Window.google` com o namespace
// completo do Google Maps (@types/google.maps), e as duas declarações
// globais entrariam em conflito de tipo.
type GoogleIdentityServices = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
      }) => { requestAccessToken: () => void };
    };
  };
};

function getGoogleIdentity(): GoogleIdentityServices | undefined {
  return (window as any).google;
}

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleClientRef = useRef<{ requestAccessToken: () => void } | null>(null);

  // Login com Google — procedure tRPC
  const loginWithGoogle = trpc.companyAuth.loginWithGoogle.useMutation({
    onSuccess: () => {
      toast.success("Bem-vindo ao Higifácil!");
      window.location.href = "/dashboard";
    },
    onError: (e) => {
      setGoogleLoading(false);
      if (e.message?.includes("Nenhuma conta encontrada")) {
        toast.error("Conta não encontrada", {
          description: "Nenhuma empresa cadastrada com este e-mail Google. Verifique se o e-mail é o mesmo do cadastro.",
        });
      } else {
        toast.error("Erro no login com Google", { description: e.message });
      }
    },
  });

  // Inicializar Google Identity Services
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const initGoogle = () => {
      if (!getGoogleIdentity()?.accounts?.oauth2) return;
      googleClientRef.current = getGoogleIdentity()!.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "email profile",
        callback: (response) => {
          if (response.error || !response.access_token) {
            setGoogleLoading(false);
            toast.error("Erro ao autenticar com Google");
            return;
          }
          loginWithGoogle.mutate({ googleToken: response.access_token });
        },
      });
    };

    // Tentar inicializar imediatamente ou aguardar o script carregar
    if (getGoogleIdentity()?.accounts?.oauth2) {
      initGoogle();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener("load", initGoogle);
        return () => script.removeEventListener("load", initGoogle);
      }
    }
  }, []);

  const handleGoogleLogin = () => {
    if (!googleClientRef.current) {
      // Tentar inicializar novamente
      if (getGoogleIdentity()?.accounts?.oauth2) {
        googleClientRef.current = getGoogleIdentity()!.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "email profile",
          callback: (response) => {
            if (response.error || !response.access_token) {
              setGoogleLoading(false);
              toast.error("Erro ao autenticar com Google");
              return;
            }
            loginWithGoogle.mutate({ googleToken: response.access_token });
          },
        });
      } else {
        toast.error("Google não carregado. Tente recarregar a página.");
        return;
      }
    }
    setGoogleLoading(true);
    googleClientRef.current.requestAccessToken();
  };

  // Tenta login como sub-usuário (técnico/secretária) primeiro
  const subUserLoginMutation = trpc.companyUsers.login.useMutation({
    onSuccess: () => {
      toast.success("Bem-vindo ao Higifácil!");
      window.location.href = "/dashboard";
    },
    onError: () => {
      // Se falhar como sub-usuário, tenta como master da empresa
      masterLoginMutation.mutate({ email, password });
    },
  });

  // Tenta login como master da empresa
  const masterLoginMutation = trpc.companyAuth.login.useMutation({
    onSuccess: () => {
      toast.success("Bem-vindo ao Higifácil!");
      window.location.href = "/dashboard";
    },
    onError: (e) => {
      if (e.message?.includes("Muitas tentativas")) {
        toast.error("Acesso temporariamente bloqueado", { description: e.message });
      } else {
        toast.error("Erro no login", { description: "E-mail ou senha inválidos" });
      }
    },
  });

  const loginMutation = { isPending: subUserLoginMutation.isPending || masterLoginMutation.isPending };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    subUserLoginMutation.mutate({ email, password });
  };

  const features = [
    "Orçamentos profissionais em segundos",
    "Gestão completa de clientes e OS",
    "Controle financeiro e relatórios",
    "CRM e reativação de clientes",
  ];

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Lado esquerdo — identidade visual */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0A1628 0%, #0d2040 60%, #0A1628 100%)" }}
      >
        {/* Elementos decorativos */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full -translate-y-1/2 translate-x-1/2" style={{ background: "rgba(26,159,227,0.08)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full translate-y-1/2 -translate-x-1/2" style={{ background: "rgba(26,159,227,0.06)" }} />
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full -translate-x-1/2 -translate-y-1/2" style={{ background: "radial-gradient(circle, rgba(26,159,227,0.05) 0%, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/">
            <img src={LOGO_URL} alt="Higifácil" className="h-12 object-contain cursor-pointer hover:opacity-80 transition-opacity" style={{ filter: "brightness(0) invert(1)" }} />
          </Link>
          <p className="text-white/50 mt-3 text-sm">Sistema de Gestão para Higienizadores</p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium">O que você vai encontrar</p>
          <div className="space-y-3">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "#1A9FE3" }} />
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
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
          <Link href="/">
            <img src={LOGO_URL} alt="Higifácil" className="h-9 object-contain cursor-pointer hover:opacity-80 transition-opacity" style={{ filter: "brightness(0) invert(1)" }} />
          </Link>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Bem-vindo de volta</h1>
            <p className="text-slate-400 mt-2">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">E-mail</Label>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-sm">Senha</Label>
                <Link
                  href="/recuperar-senha"
                  className="text-xs hover:underline transition-colors"
                  style={{ color: "#1A9FE3" }}
                >
                  Esqueci minha senha
                </Link>
              </div>
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
              className="w-full h-11 text-white font-semibold gap-2 group"
              style={{ background: "#1A9FE3" }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                "Entrando..."
              ) : (
                <>
                  Entrar na plataforma
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Botão Google */}
          {GOOGLE_CLIENT_ID && (
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-slate-600 text-xs">ou continue com</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-600 gap-3 font-medium"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loginWithGoogle.isPending}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading || loginWithGoogle.isPending ? "Aguarde..." : "Entrar com Google"}
              </Button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-slate-800 text-center space-y-3">
            <p className="text-slate-500 text-sm">Ainda não tem acesso?</p>
            <Button
              variant="outline"
              className="w-full h-11 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600"
              onClick={() => navigate("/#planos")}
            >
              Ver planos e assinar
            </Button>
          </div>

          <p className="text-center text-xs text-slate-600 mt-6">
            Acesso restrito a empresas cadastradas · <a href="https://higifacil.com.br" className="hover:text-slate-400 transition-colors">higifacil.com.br</a>
          </p>
        </div>
      </div>
    </div>
  );
}
