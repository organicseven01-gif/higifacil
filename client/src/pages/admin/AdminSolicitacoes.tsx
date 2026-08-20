import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Building2,
  Eye,
  EyeOff,
  Mail as MailIcon,
} from "lucide-react";

function generatePassword(length = 10): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const PLAN_LABELS: Record<string, string> = {
  free: "Cortesia (grátis)",
  solo: "Mensal",
  equipe: "Anual",
};

export default function AdminSolicitacoes() {
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [onboardingRequest, setOnboardingRequest] = useState<any>(null);
  const [onboardingPassword, setOnboardingPassword] = useState("");
  const [onboardingPlan, setOnboardingPlan] = useState<"free" | "solo" | "equipe">("free");
  const [trialDays, setTrialDays] = useState<number>(30);
  const [showPassword, setShowPassword] = useState(false);
  const [onboardingResult, setOnboardingResult] = useState<{
    companyName: string; loginEmail: string; password: string; companyId: number;
  } | null>(null);

  const utils = trpc.useUtils();
  const { data: allRequests = [], isLoading } = trpc.admin.listAccessRequests.useQuery({ status: undefined });
  const pendingRequests = allRequests.filter((r: any) => r.status === "pending");
  const displayRequests = activeTab === "pending" ? pendingRequests : allRequests;

  const createMutation = trpc.admin.createCompanyWithCredentials.useMutation({
    onSuccess: (data, vars) => {
      utils.admin.listAccessRequests.invalidate();
      utils.admin.listCompanies.invalidate();
      setOnboardingResult({
        companyName: onboardingRequest?.companyName ?? vars.name,
        loginEmail: vars.email,
        password: vars.password,
        companyId: data.companyId,
      });
    },
    onError: (e) => toast.error("Erro ao aprovar solicitação", { description: e.message }),
  });

  const formatDate = (date: any) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const statusBadge = (status: string) => {
    if (status === "pending") return <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Pendente</Badge>;
    if (status === "approved") return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Aprovado</Badge>;
    return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Recusado</Badge>;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Solicitações de Acesso</h1>
          <p className="text-slate-400 text-sm mt-1">
            {pendingRequests.length} solicitação{pendingRequests.length !== 1 ? "ões" : ""} pendente{pendingRequests.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "pending"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Pendentes ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "all"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Todas ({allRequests.length})
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="h-16 bg-slate-700 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayRequests.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                {activeTab === "pending" ? "Nenhuma solicitação pendente" : "Nenhuma solicitação encontrada"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayRequests.map((req: any) => (
              <Card key={req.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-white">{req.companyName ?? req.name ?? "—"}</h3>
                        {statusBadge(req.status)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        {req.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {req.email}
                          </span>
                        )}
                        {req.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {req.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(req.createdAt)}
                        </span>
                      </div>
                      {req.message && (
                        <p className="text-xs text-slate-500 mt-2 italic">"{req.message}"</p>
                      )}
                    </div>
                    {req.status === "pending" && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="h-8 bg-green-600 hover:bg-green-700 text-white gap-1"
                          onClick={() => {
                            setOnboardingRequest(req);
                            setOnboardingPassword(generatePassword());
                            setOnboardingPlan("free");
                            setTrialDays(30);
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprovar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Aprovar solicitação */}
      <Dialog open={!!onboardingRequest && !onboardingResult} onOpenChange={() => setOnboardingRequest(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Aprovar Solicitação</DialogTitle>
          </DialogHeader>
          {onboardingRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-700 rounded-lg">
                <p className="text-sm text-white font-medium">{onboardingRequest.companyName ?? onboardingRequest.name}</p>
                <p className="text-xs text-slate-400">{onboardingRequest.email}</p>
              </div>

              {/* Senha */}
              <div>
                <Label className="text-slate-300">Senha de acesso inicial</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={onboardingPassword}
                    onChange={(e) => setOnboardingPassword(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-xs text-slate-400 hover:text-white px-0"
                  onClick={() => setOnboardingPassword(generatePassword())}
                >
                  Gerar senha aleatória
                </Button>
              </div>

              {/* Plano */}
              <div>
                <Label className="text-slate-300">Plano inicial</Label>
                <Select value={onboardingPlan} onValueChange={(v: any) => setOnboardingPlan(v)}>
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="free" className="text-white">🎁 Cortesia (grátis)</SelectItem>
                    <SelectItem value="solo" className="text-white">📅 Mensal</SelectItem>
                    <SelectItem value="equipe" className="text-white">⭐ Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dias de trial (apenas para Cortesia) */}
              {onboardingPlan === "free" && (
                <div>
                  <Label className="text-slate-300">Dias de acesso gratuito</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value))}
                    className="mt-1 bg-slate-700 border-slate-600 text-white"
                    placeholder="30"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    O acesso expira em {trialDays} dia{trialDays !== 1 ? "s" : ""} a partir de hoje.
                  </p>
                </div>
              )}

              {/* Aviso de e-mail automático */}
              <div className="flex items-start gap-2 p-3 bg-blue-900/30 border border-blue-700/40 rounded-lg">
                <MailIcon className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300">
                  Um e-mail de boas-vindas com as credenciais de acesso será enviado automaticamente ao aprovar.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOnboardingRequest(null)} className="text-slate-300">Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate({
                name: onboardingRequest.companyName ?? onboardingRequest.name,
                email: onboardingRequest.email,
                password: onboardingPassword,
                phone: onboardingRequest.phone,
                plan: onboardingPlan,
                trialDays: onboardingPlan === "free" ? trialDays : undefined,
                requestId: onboardingRequest.id,
              })}
              disabled={!onboardingPassword || createMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createMutation.isPending ? "Aprovando..." : "Aprovar e Criar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Resultado do onboarding */}
      <Dialog open={!!onboardingResult} onOpenChange={() => setOnboardingResult(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Empresa criada com sucesso!
            </DialogTitle>
          </DialogHeader>
          {onboardingResult && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-green-900/30 border border-green-700/40 rounded-lg">
                <MailIcon className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-300">
                  E-mail de boas-vindas enviado para <strong>{onboardingResult.loginEmail}</strong> com as credenciais de acesso.
                </p>
              </div>
              <p className="text-sm text-slate-400">
                Credenciais de acesso (backup):
              </p>
              <div className="p-4 bg-slate-700 rounded-lg space-y-2 font-mono text-sm">
                <p className="text-slate-300">
                  <span className="text-slate-500">Empresa:</span>{" "}
                  <span className="text-white">{onboardingResult.companyName}</span>
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-500">Login:</span>{" "}
                  <span className="text-white">{onboardingResult.loginEmail}</span>
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-500">Senha:</span>{" "}
                  <span className="text-green-400">{onboardingResult.password}</span>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setOnboardingResult(null)} className="bg-blue-600 hover:bg-blue-700">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
