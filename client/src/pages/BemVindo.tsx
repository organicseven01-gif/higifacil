import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ArrowRight, LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "/logo-higifacil.png";

const PLAN_LABELS: Record<string, string> = {
  solo: "Mensal",
  dupla: "Anual",
  equipe: "Anual",
  mensal: "Mensal",
  anual: "Anual",
};

const WHATSAPP_ONBOARDING = "https://wa.me/5582998383003?text=Ol%C3%A1%2C+acabei+de+assinar+o+plano+Anual+do+Higif%C3%A1cil+e+gostaria+de+agendar+meu+onboarding!";

const isAnualPlan = (plan: string) =>
  plan === "equipe" || plan === "dupla" || plan === "anual";

export default function BemVindo() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"welcome" | "login">("welcome");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email") ?? "";
    setEmail(emailParam);
    setPlan(params.get("plano") ?? "");
  }, []);

  const subUserLoginMutation = trpc.companyUsers.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado! Bem-vindo ao Higifácil 🎉");
      window.location.href = "/dashboard?primeiro_acesso=true";
    },
    onError: () => {
      masterLoginMutation.mutate({ email, password });
    },
  });

  const masterLoginMutation = trpc.companyAuth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado! Bem-vindo ao Higifácil 🎉");
      window.location.href = "/dashboard?primeiro_acesso=true";
    },
    onError: () => {
      toast.error("Senha incorreta", { description: "Verifique o e-mail recebido com a senha temporária." });
    },
  });

  const isLoading = subUserLoginMutation.isPending || masterLoginMutation.isPending;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    subUserLoginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0A1628 0%, #0d2040 100%)" }}>
      {/* Logo */}
      <img src={LOGO_URL} alt="Higifácil" className="h-10 object-contain mb-10" />

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {step === "welcome" ? (
          <div className="p-8 text-center">
            {/* Ícone de sucesso */}
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>

            <h1 className="text-2xl font-black text-gray-900 mb-2">
              Pagamento confirmado! 🎉
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Bem-vindo ao Higifácil — plano{" "}
              <span className="font-bold text-blue-600">{PLAN_LABELS[plan] ?? plan}</span>
            </p>

            {/* Instruções */}
            <div className="bg-blue-50 rounded-xl p-5 text-left mb-4 space-y-3">
              <h2 className="font-bold text-gray-800 text-sm">Sua conta foi criada automaticamente:</h2>

              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100">
                <span className="text-xs text-gray-500">E-mail:</span>
                <span className="text-sm font-semibold text-gray-800 break-all">{email || "—"}</span>
              </div>

              <p className="text-xs text-gray-500">
                Uma <strong>senha temporária</strong> foi enviada para este e-mail. Use-a para fazer login agora e depois defina sua própria senha.
              </p>
            </div>

            {/* Onboarding para plano Anual */}
            {isAnualPlan(plan) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Seu plano inclui onboarding gratuito!</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Agende uma call com nossa equipe para configurar o sistema do jeito certo para o seu negócio.
                    </p>
                    <a
                      href={WHATSAPP_ONBOARDING}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-green-700 hover:text-green-800"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Agendar onboarding pelo WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Botão principal */}
            <Button
              className="w-full font-bold text-white text-base h-12"
              style={{ background: "#1A9FE3" }}
              onClick={() => setStep("login")}
            >
              <LogIn className="mr-2 h-5 w-5" />
              Fazer login agora
            </Button>
            <Button
              variant="ghost"
              className="w-full text-gray-400 text-sm mt-2"
              onClick={() => setLocation("/")}
            >
              Voltar para o início
            </Button>
          </div>
        ) : (
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <LogIn className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Entrar no sistema</h2>
              <p className="text-xs text-gray-500 mt-1">Use a senha temporária enviada para o seu e-mail</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* E-mail (pré-preenchido) */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">E-mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-11"
                  required
                />
              </div>

              {/* Senha */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Senha temporária</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Digite a senha do e-mail"
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Não recebeu? Verifique a caixa de spam ou{" "}
                  <button
                    type="button"
                    className="text-blue-500 underline"
                    onClick={() => setLocation("/recuperar-senha")}
                  >
                    redefina sua senha
                  </button>
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full font-bold text-white text-base h-12"
                style={{ background: "#1A9FE3" }}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                ) : (
                  <>Entrar no Dashboard <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <button
              type="button"
              className="w-full text-center text-xs text-gray-400 mt-4 hover:text-gray-600"
              onClick={() => setStep("welcome")}
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>

      <p className="text-white/30 text-xs mt-8">
        Dúvidas? Fale conosco pelo WhatsApp{" "}
        <a href="https://wa.me/5582998383003" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">
          (82) 99838-3003
        </a>
      </p>
    </div>
  );
}
