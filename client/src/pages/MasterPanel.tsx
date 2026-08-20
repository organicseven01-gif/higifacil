import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Building2,
  Plus,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle2,
  Edit,
  Trash2,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Bell,
  ThumbsDown,
  Mail,
  Phone,
  MapPin,
  MessageSquarePlus,
  Star,
  CheckCheck,
  UserCheck,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

// Plano oferecido no onboarding de uma nova empresa — mesmos valores aceitos
// pelo procedure accessRequests.approveAndOnboard no servidor.
type Plan = "free" | "solo" | "equipe";
type SubscriptionStatus = "active" | "expired" | "blocked" | "cancelled";
type PlanType = "free" | "solo" | "dupla" | "equipe";

const planTypeLabels: Record<PlanType, string> = {
  free: "Free",
  solo: "Solo",
  dupla: "Dupla",
  equipe: "Equipe",
};
const planTypeColors: Record<PlanType, string> = {
  free: "bg-gray-100 text-gray-600 border border-gray-200",
  solo: "bg-slate-100 text-slate-700 border border-slate-200",
  dupla: "bg-blue-100 text-blue-700 border border-blue-200",
  equipe: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

const planLabels: Record<Plan, string> = {
  free: "Cortesia",
  solo: "Mensal (R$ 49,90/mês)",
  equipe: "Anual (R$ 490,00/ano)",
};
const planColors: Record<Plan, string> = {
  free: "bg-amber-100 text-amber-800",
  solo: "bg-blue-100 text-blue-800",
  equipe: "bg-green-100 text-green-800",
};
const statusColors: Record<SubscriptionStatus, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  blocked: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};
const statusLabels: Record<SubscriptionStatus, string> = {
  active: "Ativo",
  expired: "Expirado",
  blocked: "Bloqueado",
  cancelled: "Cancelado",
};

function generatePassword(length = 10): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function MasterPanel() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [passwordCompany, setPasswordCompany] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [credEmail, setCredEmail] = useState("");

  // Onboarding state
  const [onboardingRequest, setOnboardingRequest] = useState<any>(null);
  const [onboardingPassword, setOnboardingPassword] = useState("");
  const [onboardingPlan, setOnboardingPlan] = useState<Plan>("free");
  const [showOnboardingPassword, setShowOnboardingPassword] = useState(false);
  const [onboardingResult, setOnboardingResult] = useState<{
    companyName: string; loginEmail: string; password: string; companyId: number;
  } | null>(null);

  // Quick reset state
  const [quickResetCompany, setQuickResetCompany] = useState<any>(null);
  const [quickResetPassword, setQuickResetPassword] = useState("");
  const [showQuickResetPassword, setShowQuickResetPassword] = useState(false);
  const [quickResetResult, setQuickResetResult] = useState<{ loginEmail: string; password: string } | null>(null);

  const [form, setForm] = useState({ name: "", cnpj: "", email: "", phone: "" });
  const [editForm, setEditForm] = useState<any>({});
  const [activeTab, setActiveTab] = useState<"companies" | "requests" | "feedbacks">("requests");

  const utils = trpc.useUtils();
  const { data: companies = [], isLoading } = trpc.companies.list.useQuery();
  const { data: metrics } = trpc.companies.metrics.useQuery();
  const feedbacksQuery = trpc.betaFeedback.list.useQuery();
  const feedbacks = feedbacksQuery.data ?? [];
  const requestsQuery = trpc.accessRequests.list.useQuery({ status: undefined });
  const pendingRequests = requestsQuery.data?.filter((r: any) => r.status === "pending") ?? [];
  const allRequests = requestsQuery.data ?? [];

  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      utils.companies.list.invalidate();
      utils.companies.metrics.invalidate();
      setShowCreate(false);
      setForm({ name: "", cnpj: "", email: "", phone: "" });
      toast.success("Empresa criada!", { description: "Agora defina as credenciais de acesso na aba Empresas." });
    },
    onError: (e) => toast.error("Erro ao criar empresa", { description: e.message }),
  });

  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      utils.companies.list.invalidate();
      setEditCompany(null);
      toast.success("Empresa atualizada!");
    },
    onError: (e) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const setPasswordMutation = trpc.companyAuth.setPassword.useMutation({
    onSuccess: () => {
      utils.companies.list.invalidate();
      toast.success("Acesso definido!", { description: `${passwordCompany?.name} já pode fazer login.` });
      setPasswordCompany(null);
    },
    onError: (e) => toast.error("Erro ao definir acesso", { description: e.message }),
  });

  const deleteMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      utils.companies.list.invalidate();
      utils.companies.metrics.invalidate();
      setDeleteConfirm(null);
      toast.success("Empresa removida.");
    },
    onError: (e) => toast.error("Erro ao remover", { description: e.message }),
  });

  const approveAndOnboardMutation = trpc.accessRequests.approveAndOnboard.useMutation({
    onSuccess: (data) => {
      utils.companies.list.invalidate();
      utils.companies.metrics.invalidate();
      requestsQuery.refetch();
      setOnboardingResult({
        companyName: data.companyName,
        loginEmail: data.loginEmail,
        password: data.password,
        companyId: data.companyId,
      });
    },
    onError: (e) => toast.error("Erro ao aprovar", { description: e.message }),
  });

  const quickResetMutation = trpc.accessRequests.resetCompanyPassword.useMutation({
    onSuccess: (_, variables) => {
      setQuickResetResult({
        loginEmail: quickResetCompany?.loginEmail ?? quickResetCompany?.email ?? "",
        password: variables.newPassword,
      });
    },
    onError: (e) => toast.error("Erro ao redefinir senha", { description: e.message }),
  });

  const setPlanMutation = trpc.adminPlan.setCompanyPlan.useMutation({
    onSuccess: () => {
      utils.companies.list.invalidate();
      toast.success("Plano atualizado!");
    },
    onError: (e) => toast.error("Erro ao atualizar plano", { description: e.message }),
  });

  const rejectMutation = trpc.accessRequests.reject.useMutation({
    onSuccess: () => {
      requestsQuery.refetch();
      toast.success("Solicitação rejeitada.");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const filtered = companies.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.loginEmail || "").toLowerCase().includes(search.toLowerCase())
  );

  const copyAccessInstructions = (loginEmail: string, password: string) => {
    const loginUrl = window.location.origin + "/empresa/login";
    const text = `Olá! Seu acesso ao Higifácil está pronto 🎉\n\n🔗 Link de acesso: ${loginUrl}\n📧 E-mail: ${loginEmail}\n🔑 Senha: ${password}\n\nRecomendamos trocar a senha após o primeiro acesso.\n\nQualquer dúvida, estamos à disposição!`;
    navigator.clipboard.writeText(text);
    toast.success("Instruções copiadas!", { description: "Cole no WhatsApp ou e-mail para enviar ao cliente." });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Painel Master
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie empresas, acessos e solicitações</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      {/* Alerta de pendentes */}
      {pendingRequests.length > 0 && activeTab !== "requests" && (
        <div
          className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => setActiveTab("requests")}
        >
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {pendingRequests.length} solicitação{pendingRequests.length > 1 ? "ões" : ""} pendente{pendingRequests.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-700">Clique para revisar e aprovar</p>
          </div>
          <Bell className="h-4 w-4 text-amber-600" />
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {(["requests", "companies", "feedbacks"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              {tab === "requests" && <Bell className="h-4 w-4" />}
              {tab === "companies" && <Building2 className="h-4 w-4" />}
              {tab === "feedbacks" && <MessageSquarePlus className="h-4 w-4" />}
              {tab === "requests" ? "Solicitações" : tab === "companies" ? "Empresas" : "Feedbacks"}
              {tab === "requests" && pendingRequests.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {pendingRequests.length}
                </span>
              )}
              {tab === "companies" && (
                <span className="bg-muted text-muted-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {companies.length}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* ─── ABA: SOLICITAÇÕES ─── */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Solicitações de Acesso</h2>
            <p className="text-xs text-muted-foreground">
              Ao aprovar, a empresa e o acesso são criados automaticamente
            </p>
          </div>

          {requestsQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : allRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground">Nenhuma solicitação ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Quando alguém preencher o formulário em <strong>/solicitar-acesso</strong>, aparecerá aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allRequests.map((req: any) => (
                <Card
                  key={req.id}
                  className={
                    req.status === "pending"
                      ? "border-amber-200 bg-amber-50/30"
                      : req.status === "approved"
                      ? "border-green-200 bg-green-50/20"
                      : "opacity-60"
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            req.status === "pending" ? "bg-amber-100 text-amber-700" :
                            req.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {req.status === "pending" ? "⏳ Pendente" : req.status === "approved" ? "✓ Aprovado" : "✗ Rejeitado"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(req.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {req.reviewedBy && (
                            <span className="text-xs text-muted-foreground">· por {req.reviewedBy}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{req.companyName}</p>
                          <p className="text-xs text-muted-foreground">Responsável: {req.ownerName}</p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{req.email}</span>
                          {req.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{req.phone}</span>}
                          {req.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.city}</span>}
                        </div>
                        {req.message && (
                          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">{req.message}</p>
                        )}
                      </div>
                      {req.status === "pending" && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            onClick={() => {
                              setOnboardingRequest(req);
                              setOnboardingPassword(generatePassword());
                              setOnboardingPlan("free");
                              setOnboardingResult(null);
                              setShowOnboardingPassword(true);
                            }}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Aprovar e Criar Acesso
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 gap-1"
                            onClick={() => rejectMutation.mutate({ id: req.id })}
                            disabled={rejectMutation.isPending}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                            Rejeitar
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
      )}

      {/* ─── ABA: EMPRESAS ─── */}
      {activeTab === "companies" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total", value: metrics?.total ?? 0, icon: Building2, color: "blue" },
              { label: "Ativas", value: metrics?.active ?? 0, icon: CheckCircle2, color: "green" },
              { label: "Em Trial", value: metrics?.trial ?? 0, icon: Clock, color: "amber" },
              { label: "Pagas", value: metrics?.paid ?? 0, icon: TrendingUp, color: "purple" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-${color}-100 rounded-lg`}>
                      <Icon className={`h-5 w-5 text-${color}-600`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-2xl font-bold ${color !== "blue" ? `text-${color}-600` : ""}`}>{value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou login..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Empresas Cadastradas ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma empresa encontrada.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((company: any) => (
                    <div key={company.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{company.name}</p>
                              {/* Badge de planType com select rápido */}
                              <select
                                value={company.planType ?? "free"}
                                onChange={(e) => setPlanMutation.mutate({ companyId: company.id, planType: e.target.value as PlanType })}
                                className={`text-xs px-2 py-0.5 rounded-full font-semibold cursor-pointer border-0 outline-none appearance-none pr-5 ${planTypeColors[(company.planType ?? "free") as PlanType]}`}
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
                                title="Alterar plano"
                              >
                                <option value="free">Free</option>
                                <option value="solo">Solo</option>
                                <option value="dupla">Dupla</option>
                                <option value="equipe">Equipe</option>
                              </select>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[company.subscriptionStatus as SubscriptionStatus]}`}>
                                {statusLabels[company.subscriptionStatus as SubscriptionStatus]}
                              </span>
                            </div>

                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                              {company.hasCredentials ? (
                                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                  <Unlock className="h-3 w-3" />
                                  Login: {company.loginEmail}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  <Lock className="h-3 w-3" />
                                  Sem acesso configurado
                                </span>
                              )}
                              {company.lastLoginAt && (
                                <span className="text-xs text-muted-foreground">
                                  Último acesso: {new Date(company.lastLoginAt).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>

                            {company.email && company.email !== company.loginEmail && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Contato: {company.email}{company.phone && ` · ${company.phone}`}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {company.hasCredentials ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs h-8"
                              onClick={() => {
                                setQuickResetCompany(company);
                                setQuickResetPassword(generatePassword());
                                setQuickResetResult(null);
                                setShowQuickResetPassword(true);
                              }}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Redefinir Senha
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => {
                                setPasswordCompany(company);
                                setCredEmail(company.loginEmail || company.email || "");
                                setNewPassword(generatePassword());
                                setShowNewPassword(true);
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Definir Acesso
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setEditCompany(company);
                            setEditForm({ name: company.name, cnpj: company.cnpj || "", email: company.email || "", phone: company.phone || "", plan: company.plan, subscriptionStatus: company.subscriptionStatus });
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(company)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── ABA: FEEDBACKS ─── */}
      {activeTab === "feedbacks" && (
        <div className="space-y-4">
          {feedbacksQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : feedbacks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquarePlus className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground">Nenhum feedback recebido ainda.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {feedbacks.map((fb: any) => (
                <Card key={fb.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-semibold">{fb.companyName ?? `Empresa #${fb.companyId}`}</p>
                        <p className="text-xs text-muted-foreground">{new Date(fb.createdAt).toLocaleString("pt-BR")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          fb.categoria === "bug" ? "bg-red-500/10 text-red-400" :
                          fb.categoria === "sugestao" ? "bg-yellow-500/10 text-yellow-400" :
                          fb.categoria === "elogio" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {fb.categoria === "bug" ? "Bug" : fb.categoria === "sugestao" ? "Sugestão" : fb.categoria === "elogio" ? "Elogio" : "Geral"}
                        </span>
                        {fb.nota && (
                          <span className="flex items-center gap-1 text-sm font-medium text-yellow-500">
                            <Star className="h-3.5 w-3.5 fill-yellow-500" />{fb.nota}/5
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {fb.oQueFuncionou && (
                        <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                          <p className="text-xs font-medium text-green-400 mb-1">✓ O que funcionou</p>
                          <p className="text-sm">{fb.oQueFuncionou}</p>
                        </div>
                      )}
                      {fb.oQueTravou && (
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                          <p className="text-xs font-medium text-red-400 mb-1">✗ O que travou</p>
                          <p className="text-sm">{fb.oQueTravou}</p>
                        </div>
                      )}
                      {fb.oQueFalta && (
                        <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                          <p className="text-xs font-medium text-yellow-400 mb-1">+ O que falta</p>
                          <p className="text-sm">{fb.oQueFalta}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAIS ═══ */}

      {/* Modal: Aprovar + Onboarding */}
      <Dialog open={!!onboardingRequest && !onboardingResult} onOpenChange={(v) => { if (!v) { setOnboardingRequest(null); setOnboardingResult(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              Aprovar e Criar Acesso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800">{onboardingRequest?.companyName}</p>
              <p className="text-xs text-green-700">Responsável: {onboardingRequest?.ownerName}</p>
              <p className="text-xs text-green-700 flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3" /> {onboardingRequest?.email}
              </p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                A empresa será criada automaticamente e você receberá as instruções de acesso para enviar ao cliente.
              </p>
            </div>
            <div>
              <Label>Plano Inicial</Label>
              <Select value={onboardingPlan} onValueChange={(v) => setOnboardingPlan(v as Plan)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Cortesia</SelectItem>
                  <SelectItem value="solo">Mensal (R$ 49,90/mês)</SelectItem>
                  <SelectItem value="equipe">Anual (R$ 490,00/ano)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Senha de Acesso</Label>
              <div className="relative mt-1">
                <Input
                  type={showOnboardingPassword ? "text" : "password"}
                  value={onboardingPassword}
                  onChange={(e) => setOnboardingPassword(e.target.value)}
                  className="pr-20"
                  minLength={6}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={() => setShowOnboardingPassword(!showOnboardingPassword)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    {showOnboardingPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => setOnboardingPassword(generatePassword())} className="p-1.5 text-muted-foreground hover:text-foreground" title="Gerar nova senha">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">E-mail de login: <strong>{onboardingRequest?.email}</strong></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOnboardingRequest(null)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={() => approveAndOnboardMutation.mutate({ requestId: onboardingRequest.id, password: onboardingPassword, plan: onboardingPlan })}
              disabled={approveAndOnboardMutation.isPending || onboardingPassword.length < 6}
            >
              {approveAndOnboardMutation.isPending ? "Criando acesso..." : <><CheckCheck className="h-4 w-4" /> Confirmar e Criar Acesso</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Resultado do Onboarding */}
      <Dialog open={!!onboardingResult} onOpenChange={(v) => { if (!v) { setOnboardingRequest(null); setOnboardingResult(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Acesso Criado com Sucesso!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-green-800">{onboardingResult?.companyName}</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Link:</span>
                  <span className="font-mono text-xs bg-white border rounded px-2 py-1 flex-1 text-right truncate">{window.location.origin}/empresa/login</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">E-mail:</span>
                  <span className="font-mono text-xs bg-white border rounded px-2 py-1">{onboardingResult?.loginEmail}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Senha:</span>
                  <span className="font-mono text-sm bg-white border rounded px-2 py-1 font-bold tracking-wider">{onboardingResult?.password}</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Copie as instruções e envie ao cliente pelo WhatsApp ou e-mail.</p>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button className="gap-2 flex-1" onClick={() => copyAccessInstructions(onboardingResult!.loginEmail, onboardingResult!.password)}>
              <Copy className="h-4 w-4" /> Copiar Instruções para Enviar
            </Button>
            <Button variant="outline" onClick={() => { setOnboardingRequest(null); setOnboardingResult(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Redefinir senha rápida */}
      <Dialog open={!!quickResetCompany && !quickResetResult} onOpenChange={(v) => { if (!v) { setQuickResetCompany(null); setQuickResetResult(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              Redefinir Senha de Acesso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-800">{quickResetCompany?.name}</p>
              <p className="text-xs text-blue-700 flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3" /> Login: {quickResetCompany?.loginEmail}
              </p>
            </div>
            <div>
              <Label>Nova Senha</Label>
              <div className="relative mt-1">
                <Input
                  type={showQuickResetPassword ? "text" : "password"}
                  value={quickResetPassword}
                  onChange={(e) => setQuickResetPassword(e.target.value)}
                  className="pr-20"
                  minLength={6}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={() => setShowQuickResetPassword(!showQuickResetPassword)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    {showQuickResetPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => setQuickResetPassword(generatePassword())} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickResetCompany(null)}>Cancelar</Button>
            <Button onClick={() => quickResetMutation.mutate({ companyId: quickResetCompany.id, newPassword: quickResetPassword })} disabled={quickResetMutation.isPending || quickResetPassword.length < 6}>
              {quickResetMutation.isPending ? "Redefinindo..." : "Redefinir Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Resultado da redefinição */}
      <Dialog open={!!quickResetResult} onOpenChange={(v) => { if (!v) { setQuickResetCompany(null); setQuickResetResult(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Senha Redefinida!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">E-mail:</span>
                <span className="font-mono text-xs bg-white border rounded px-2 py-1">{quickResetResult?.loginEmail}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Nova senha:</span>
                <span className="font-mono text-sm bg-white border rounded px-2 py-1 font-bold tracking-wider">{quickResetResult?.password}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button className="gap-2 flex-1" onClick={() => copyAccessInstructions(quickResetResult!.loginEmail, quickResetResult!.password)}>
              <Copy className="h-4 w-4" /> Copiar Instruções
            </Button>
            <Button variant="outline" onClick={() => { setQuickResetCompany(null); setQuickResetResult(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Criar empresa */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cadastrar Nova Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome da Empresa *</Label>
              <Input placeholder="Ex: Higieniza Bem Ltda" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input placeholder="00.000.000/0001-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input placeholder="contato@empresa.com.br" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
              A empresa será criada com <strong>14 dias de trial</strong>. Após criar, defina as credenciais de acesso.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name.trim()}>
              {createMutation.isPending ? "Criando..." : "Criar Empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar empresa */}
      <Dialog open={!!editCompany} onOpenChange={(v) => !v && setEditCompany(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome</Label>
              <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={editForm.cnpj || ""} onChange={(e) => setEditForm({ ...editForm, cnpj: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>E-mail de Contato</Label>
              <Input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plano</Label>
                <Select value={editForm.plan || "trial"} onValueChange={(v) => setEditForm({ ...editForm, plan: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="professional">Profissional</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editForm.subscriptionStatus || "active"} onValueChange={(v) => setEditForm({ ...editForm, subscriptionStatus: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompany(null)}>Cancelar</Button>
            <Button onClick={() => updateMutation.mutate({ id: editCompany.id, ...editForm })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Definir acesso (empresa sem credenciais) */}
      <Dialog open={!!passwordCompany} onOpenChange={(v) => !v && setPasswordCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Definir Acesso para Empresa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Empresa: <strong>{passwordCompany?.name}</strong>
            </div>
            <div>
              <Label>E-mail de Login</Label>
              <Input type="email" placeholder="email@empresa.com.br" value={credEmail} onChange={(e) => setCredEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Senha</Label>
              <div className="relative mt-1">
                <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-20" minLength={6} />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => setNewPassword(generatePassword())} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Link: <span className="font-mono text-foreground">/empresa/login</span></span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => { navigator.clipboard.writeText(window.location.origin + "/empresa/login"); toast.success("Link copiado!"); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordCompany(null)}>Cancelar</Button>
            <Button onClick={() => setPasswordMutation.mutate({ companyId: passwordCompany.id, email: credEmail, password: newPassword })} disabled={setPasswordMutation.isPending || !credEmail || newPassword.length < 6}>
              {setPasswordMutation.isPending ? "Salvando..." : "Salvar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar exclusão */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remover Empresa</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Tem certeza que deseja remover <strong>{deleteConfirm?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: deleteConfirm.id })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
