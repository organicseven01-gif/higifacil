import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Modal de primeiro acesso — aparece quando o cliente chega ao Dashboard
 * pela primeira vez após a compra (URL contém ?primeiro_acesso=true).
 * Pede para definir uma senha personalizada.
 */
export default function FirstAccessModal({ onDismiss }: { onDismiss: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const changeMyPassword = trpc.companyAuth.changeMyPassword.useMutation({
    onSuccess: () => {
      setDone(true);
      // Remover flag da URL sem recarregar a página
      const url = new URL(window.location.href);
      url.searchParams.delete("primeiro_acesso");
      window.history.replaceState({}, "", url.toString());
    },
    onError: (e) => toast.error("Erro ao definir senha", { description: e.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { toast.error("Informe a nova senha"); return; }
    if (newPassword.length < 8) { toast.error("Senha mínima de 8 caracteres"); return; }
    if (!/[A-Z]/.test(newPassword)) { toast.error("Senha deve ter ao menos uma letra maiúscula"); return; }
    if (!/[0-9]/.test(newPassword)) { toast.error("Senha deve ter ao menos um número"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    changeMyPassword.mutate({ newPassword });
  };

  const passwordStrength = (() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  })();

  const strengthColors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];
  const strengthLabels = ["", "Fraca", "Razoável", "Boa", "Forte"];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {done ? (
          /* Tela de sucesso */
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Senha definida com sucesso!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Agora você pode usar sua nova senha para acessar o sistema.
            </p>
            <Button
              onClick={onDismiss}
              className="w-full font-bold text-white h-11"
              style={{ background: "#1A9FE3" }}
            >
              Começar a usar o Higifácil
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="p-6 text-white text-center"
              style={{ background: "linear-gradient(135deg, #0A1628 0%, #1A9FE3 100%)" }}
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-1">Defina sua senha</h2>
              <p className="text-sm opacity-80">
                Você está usando uma senha temporária. Crie uma senha personalizada para proteger sua conta.
              </p>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nova senha */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nova senha *</label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="h-11 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Indicador de força */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength ? strengthColors[passwordStrength] : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Força: <span className="font-medium">{strengthLabels[passwordStrength] || "—"}</span>
                      <span className="ml-2 text-gray-300">• Use letras maiúsculas, números e símbolos</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmar senha */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Confirmar senha *</label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className={`h-11 pr-10 ${
                      confirmPassword && confirmPassword !== newPassword ? "border-red-400" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={changeMyPassword.isPending}
                className="w-full font-bold text-white h-12"
                style={{ background: "#1A9FE3" }}
              >
                {changeMyPassword.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  <>Definir senha e continuar <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>

              <button
                type="button"
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 pt-1"
                onClick={onDismiss}
              >
                Pular por agora (não recomendado)
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
