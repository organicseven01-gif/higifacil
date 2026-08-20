/**
 * DemoPainel — Painel de controle de demonstração
 * Visível apenas para demo@limpafacil.com.br
 * Permite zerar e popular dados fictícios por aba.
 *
 * IMPORTANTE: Todos os hooks devem ser chamados ANTES de qualquer return condicional
 * para respeitar as regras dos hooks do React (React Error #310).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Wand2, X, Trash2, Sparkles, ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from "lucide-react";

const DEMO_EMAIL = "demo@limpafacil.com.br";
const DEMO_COMPANY_ID = 60002; // companyId da conta demo@limpafacil.com.br

export function DemoPainel() {
  // ─── TODOS os hooks ANTES de qualquer return condicional ──────────────────────
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<"clear" | "populate" | null>(null);
  const utils = trpc.useUtils();

  const invalidateAll = () => {
    utils.clients.list.invalidate();
    utils.clients.metrics.invalidate();
    utils.services.list.invalidate();
    utils.budgets.list.invalidate();
    utils.carpet.list.invalidate();
    utils.execution.list.invalidate();
  };

  // ─── Mutations (todos declarados antes do return condicional) ─────────────────
  const clearAll = trpc.demo.clearAll.useMutation({
    onSuccess: (data) => { toast.success(data.message); invalidateAll(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const clearServices = trpc.demo.clearServices.useMutation({
    onSuccess: () => { toast.success("Serviços apagados!"); utils.services.list.invalidate(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const clearCarpets = trpc.demo.clearCarpets.useMutation({
    onSuccess: () => { toast.success("Tapetes apagados!"); utils.carpet.list.invalidate(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const clearClients = trpc.demo.clearClients.useMutation({
    onSuccess: () => { toast.success("Clientes apagados!"); utils.clients.list.invalidate(); utils.clients.metrics.invalidate(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const clearBudgets = trpc.demo.clearBudgets.useMutation({
    onSuccess: () => { toast.success("Orçamentos apagados!"); utils.budgets.list.invalidate(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const clearExecutions = trpc.demo.clearExecutions.useMutation({
    onSuccess: () => { toast.success("Execuções apagadas!"); utils.execution.list.invalidate(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const populateAll = trpc.demo.populateAll.useMutation({
    onSuccess: (data) => { toast.success(data.message); invalidateAll(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const populateClients = trpc.demo.populateClients.useMutation({
    onSuccess: (data) => { toast.success(`${data.count} clientes fictícios adicionados!`); utils.clients.list.invalidate(); utils.clients.metrics.invalidate(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const populateServices = trpc.demo.populateServices.useMutation({
    onSuccess: (data) => { toast.success(`${data.count} serviços fictícios adicionados!`); utils.services.list.invalidate(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  const populateCarpets = trpc.demo.populateCarpets.useMutation({
    onSuccess: (data) => { toast.success(`${data.count} tapetes fictícios adicionados!`); utils.carpet.list.invalidate(); },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // ─── Return condicional DEPOIS de todos os hooks ──────────────────────────────
  // Só mostra para a conta demo (verifica email OU companyId como fallback)
  const isDemoAccount = user?.email === DEMO_EMAIL || user?.companyId === DEMO_COMPANY_ID;
  if (!isDemoAccount) return null;

  const anyLoading = clearAll.isPending || clearServices.isPending || clearCarpets.isPending ||
    clearClients.isPending || clearBudgets.isPending || clearExecutions.isPending ||
    populateAll.isPending || populateClients.isPending || populateServices.isPending || populateCarpets.isPending;

  const confirmAction = (msg: string, fn: () => void) => {
    if (window.confirm(msg)) fn();
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-110"
        style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
        title="Painel Demo"
      >
        {open ? <X className="h-5 w-5" /> : <Wand2 className="h-5 w-5" />}
      </button>

      {/* Painel lateral */}
      {open && (
        <div className="fixed top-16 right-4 z-50 w-80 rounded-2xl shadow-2xl border border-purple-200 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #1e1b4b 0%, #1e3a5f 100%)" }}>

          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-purple-300" />
            <span className="text-sm font-bold text-white">Painel Demo</span>
            <span className="ml-auto text-xs text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded-full">demo@limpafacil</span>
          </div>

          <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">

            {/* Reset completo */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                onClick={() => confirmAction(
                  "⚠️ ATENÇÃO: Isso vai apagar TODOS os dados (clientes, orçamentos, serviços, tapetes, execuções). Continuar?",
                  () => clearAll.mutate()
                )}
                disabled={anyLoading}
              >
                <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                  <RefreshCw className="h-3.5 w-3.5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Zerar TUDO</p>
                  <p className="text-xs text-white/50">Sistema limpo como 1º acesso</p>
                </div>
                {clearAll.isPending && <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />}
              </button>
            </div>

            {/* Popular tudo */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                onClick={() => confirmAction(
                  "Isso vai adicionar clientes, serviços, orçamentos, tapetes e execuções fictícios. Continuar?",
                  () => populateAll.mutate()
                )}
                disabled={anyLoading}
              >
                <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Popular TUDO</p>
                  <p className="text-xs text-white/50">Dados fictícios em todas as abas</p>
                </div>
                {populateAll.isPending && <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />}
              </button>
            </div>

            {/* Divisor */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30">por aba</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Seção: Zerar por aba */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                onClick={() => setExpandedSection(s => s === "clear" ? null : "clear")}
              >
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </div>
                <span className="text-sm font-medium text-white flex-1">Zerar por aba</span>
                {expandedSection === "clear" ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
              </button>
              {expandedSection === "clear" && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {[
                    { label: "Serviços", fn: () => confirmAction("Apagar todos os serviços?", () => clearServices.mutate()), loading: clearServices.isPending },
                    { label: "Clientes", fn: () => confirmAction("Apagar todos os clientes?", () => clearClients.mutate()), loading: clearClients.isPending },
                    { label: "Orçamentos", fn: () => confirmAction("Apagar todos os orçamentos?", () => clearBudgets.mutate()), loading: clearBudgets.isPending },
                    { label: "Tapetes", fn: () => confirmAction("Apagar todos os tapetes?", () => clearCarpets.mutate()), loading: clearCarpets.isPending },
                    { label: "Execuções", fn: () => confirmAction("Apagar todas as execuções?", () => clearExecutions.mutate()), loading: clearExecutions.isPending },
                  ].map(item => (
                    <button
                      key={item.label}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm text-white/70 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50"
                      onClick={item.fn}
                      disabled={anyLoading}
                    >
                      <span>Zerar {item.label}</span>
                      {item.loading
                        ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 className="h-3 w-3 opacity-50" />
                      }
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Seção: Popular por aba */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                onClick={() => setExpandedSection(s => s === "populate" ? null : "populate")}
              >
                <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-green-400" />
                </div>
                <span className="text-sm font-medium text-white flex-1">Popular por aba</span>
                {expandedSection === "populate" ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
              </button>
              {expandedSection === "populate" && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {[
                    { label: "Serviços", fn: () => populateServices.mutate(), loading: populateServices.isPending },
                    { label: "Clientes", fn: () => populateClients.mutate(), loading: populateClients.isPending },
                    { label: "Tapetes", fn: () => populateCarpets.mutate(), loading: populateCarpets.isPending },
                  ].map(item => (
                    <button
                      key={item.label}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm text-white/70 hover:bg-green-500/10 hover:text-green-300 transition-colors disabled:opacity-50"
                      onClick={item.fn}
                      disabled={anyLoading}
                    >
                      <span>Popular {item.label}</span>
                      {item.loading
                        ? <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                        : <Sparkles className="h-3 w-3 opacity-50" />
                      }
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80">Ações de zerar são irreversíveis. Use com cuidado durante demonstrações.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
