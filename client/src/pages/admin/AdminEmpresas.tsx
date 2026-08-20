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
  Building2,
  Plus,
  Search,
  Lock,
  Unlock,
  KeyRound,
  Edit,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Calendar,
  Users,
  FileText,
  TrendingUp,
  Gift,
  User,
  UserPlus,
  UsersRound,
  Crown,
} from "lucide-react";

type HigiPlanType = "free" | "solo" | "dupla" | "equipe";

const HIGI_PLAN_LABELS: Record<HigiPlanType, string> = {
  free: "Cortesia",
  solo: "Mensal (R$49,90)",
  dupla: "Mensal (R$49,90)",
  equipe: "Anual (R$490)",
};

const HIGI_PLAN_COLORS: Record<HigiPlanType, string> = {
  free: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  solo: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  dupla: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  equipe: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

type Plan = "trial" | "basic" | "professional" | "premium" | "free" | "solo" | "dupla" | "equipe";
type SubscriptionStatus = "active" | "expired" | "blocked" | "cancelled";

const planLabels: Record<Plan, string> = {
  free: "Cortesia",
  solo: "Mensal",
  dupla: "Mensal",
  equipe: "Anual",
  trial: "Trial",
  basic: "Mensal",
  professional: "Mensal",
  premium: "Anual",
};

const planColors: Record<Plan, string> = {
  free: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  solo: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  dupla: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  equipe: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  trial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  basic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  professional: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  premium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const statusColors: Record<SubscriptionStatus, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  blocked: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
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

export default function AdminEmpresas() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const [resetPasswordCompany, setResetPasswordCompany] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", email: "", password: "", phone: "", cnpj: "", plan: "trial" as Plan,
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState<number | null>(null);
  // Modal de prazo de trial ao atribuir Cortesia
  const [trialModal, setTrialModal] = useState<{ companyId: number; companyName: string } | null>(null);
  const [trialDays, setTrialDays] = useState<string>("30");

  const utils = trpc.useUtils();
  const { data: companies = [], isLoading } = trpc.admin.listCompanies.useQuery();
  const { data: planCompanies = [] } = trpc.adminPlan.listCompanyPlans.useQuery();

  const setPlanMutation = trpc.adminPlan.setCompanyPlan.useMutation({
    onSuccess: () => {
      toast.success("Plano Higifácil atualizado!");
      utils.adminPlan.listCompanyPlans.invalidate();
      setUpdatingPlan(null);
      setTrialModal(null);
    },
    onError: (e) => {
      toast.error("Erro ao atualizar plano", { description: e.message });
      setUpdatingPlan(null);
    },
  });

  function handlePlanChange(companyId: number, planType: HigiPlanType, companyName?: string) {
    if (planType === "free") {
      // Abrir modal para definir prazo
      setTrialModal({ companyId, companyName: companyName ?? "" });
      setTrialDays("30");
      return;
    }
    setUpdatingPlan(companyId);
    setPlanMutation.mutate({ companyId, planType });
  }

  function confirmTrialPlan() {
    if (!trialModal) return;
    const days = parseInt(trialDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error("Prazo inválido", { description: "Informe entre 1 e 365 dias" });
      return;
    }
    setUpdatingPlan(trialModal.companyId);
    setPlanMutation.mutate({ companyId: trialModal.companyId, planType: "free", trialDays: days });
  }

  // Merge plan data into companies list
  const planMap = Object.fromEntries(planCompanies.map((c: any) => [c.id, c.planType as HigiPlanType]));

  const createMutation = trpc.admin.createCompanyWithCredentials.useMutation({
    onSuccess: () => {
      utils.admin.listCompanies.invalidate();
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", phone: "", cnpj: "", plan: "trial" });
      toast.success("Empresa criada com sucesso!");
    },
    onError: (e) => toast.error("Erro ao criar empresa", { description: e.message }),
  });

  const updateMutation = trpc.admin.updateCompany.useMutation({
    onSuccess: () => {
      utils.admin.listCompanies.invalidate();
      setEditCompany(null);
      toast.success("Empresa atualizada!");
    },
    onError: (e) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const toggleBlockMutation = trpc.admin.toggleBlock.useMutation({
    onSuccess: (_, vars) => {
      utils.admin.listCompanies.invalidate();
      toast.success(vars.block ? "Empresa bloqueada." : "Empresa desbloqueada.");
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const resetPasswordMutation = trpc.admin.resetCompanyPassword.useMutation({
    onSuccess: () => {
      utils.admin.listCompanies.invalidate();
      setResetPasswordCompany(null);
      setNewPassword("");
      toast.success("Senha redefinida com sucesso!");
    },
    onError: (e) => toast.error("Erro ao redefinir senha", { description: e.message }),
  });

  const filtered = companies.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.loginEmail?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: any) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Empresas Cadastradas</h1>
            <p className="text-slate-400 text-sm mt-1">{companies.length} empresa{companies.length !== 1 ? "s" : ""} no sistema</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Nova Empresa
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Company list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="h-16 bg-slate-700 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma empresa encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((company: any) => {
              const higiPlan: HigiPlanType = planMap[company.id] ?? "free";
              return (
              <Card key={company.id} className={`bg-slate-800 border-slate-700 transition-all ${company.subscriptionStatus === "blocked" ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Company info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-white">{company.name}</h3>
                        <Badge variant="outline" className={`text-xs ${planColors[company.plan as Plan] ?? ""}`}>
                          {planLabels[company.plan as Plan] ?? company.plan}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${statusColors[company.subscriptionStatus as SubscriptionStatus] ?? ""}`}>
                          {statusLabels[company.subscriptionStatus as SubscriptionStatus] ?? company.subscriptionStatus}
                        </Badge>
                        {/* Higifácil Plan Badge */}
                        <Badge variant="outline" className={`text-xs ${HIGI_PLAN_COLORS[higiPlan]}`}>
                          <Crown className="h-3 w-3 mr-1" />
                          {HIGI_PLAN_LABELS[higiPlan]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        {company.loginEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {company.loginEmail}
                          </span>
                        )}
                        {(company.companyPhone || company.phone) && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {company.companyPhone || company.phone}
                          </span>
                        )}
                        {(company.companyEmail || company.loginEmail) && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {company.companyEmail || company.loginEmail}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Cadastro: {formatDate(company.createdAt)}
                        </span>
                        {company.lastLoginAt && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Último acesso: {formatDate(company.lastLoginAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Plan Control */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 whitespace-nowrap">Plano Higifácil:</span>
                        <Select
                          value={higiPlan}
                          onValueChange={(val) => handlePlanChange(company.id, val as HigiPlanType, company.name)}
                          disabled={updatingPlan === company.id}
                        >
                          <SelectTrigger className="w-36 h-7 text-xs bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="free" className="text-white text-xs">🎁 Cortesia (grátis)</SelectItem>
                            <SelectItem value="solo" className="text-white text-xs">Mensal — R$49,90/mês</SelectItem>
                            <SelectItem value="equipe" className="text-white text-xs">Anual — R$490/ano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Mostrar prazo do trial se for Cortesia com data */}
                      {(() => {
                        const planData = planCompanies.find((p: any) => p.id === company.id);
                        if (higiPlan === "free" && planData?.trialEndsAt) {
                          const trialDate = new Date(planData.trialEndsAt);
                          const now = new Date();
                          const expired = trialDate < now;
                          const daysLeft = Math.ceil((trialDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <span className={`text-[10px] ${expired ? "text-red-400" : "text-amber-400"}`}>
                              {expired
                                ? `⚠️ Trial expirado em ${trialDate.toLocaleDateString("pt-BR")}`
                                : `⏳ Trial: ${daysLeft}d restante${daysLeft !== 1 ? "s" : ""} (até ${trialDate.toLocaleDateString("pt-BR")})`
                              }
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={() => {
                          setEditCompany({ ...company });
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={() => {
                          setResetPasswordCompany(company);
                          setNewPassword(generatePassword());
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5 mr-1" />
                        Senha
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-8 px-3 border-slate-600 hover:bg-slate-700 ${
                          company.subscriptionStatus === "blocked"
                            ? "text-green-400 hover:text-green-300"
                            : "text-red-400 hover:text-red-300"
                        }`}
                        onClick={() => toggleBlockMutation.mutate({
                          companyId: company.id,
                          block: company.subscriptionStatus !== "blocked",
                        })}
                      >
                        {company.subscriptionStatus === "blocked" ? (
                          <><Unlock className="h-3.5 w-3.5 mr-1" />Desbloquear</>
                        ) : (
                          <><Lock className="h-3.5 w-3.5 mr-1" />Bloquear</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>

      {/* Modal: Criar empresa */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Nova Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Nome da empresa *</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Limpeza Express"
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">E-mail de acesso *</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                placeholder="empresa@email.com"
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Senha inicial *</Label>
              <div className="relative mt-1">
                <Input
                  type={showCreatePassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-slate-700 border-slate-600 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 text-xs text-slate-400 hover:text-white px-0"
                onClick={() => setCreateForm(f => ({ ...f, password: generatePassword() }))}
              >
                Gerar senha aleatória
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300">Telefone</Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">CNPJ</Label>
                <Input
                  value={createForm.cnpj}
                  onChange={(e) => setCreateForm(f => ({ ...f, cnpj: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Plano</Label>
              <Select value={createForm.plan} onValueChange={(v) => setCreateForm(f => ({ ...f, plan: v as Plan }))}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="trial" className="text-white">Trial</SelectItem>
                  <SelectItem value="basic" className="text-white">Básico</SelectItem>
                  <SelectItem value="professional" className="text-white">Profissional</SelectItem>
                  <SelectItem value="premium" className="text-white">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-slate-300">Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate(createForm as any)}
              disabled={!createForm.name || !createForm.email || !createForm.password || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? "Criando..." : "Criar Empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar empresa */}
      <Dialog open={!!editCompany} onOpenChange={() => setEditCompany(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Empresa</DialogTitle>
          </DialogHeader>
          {editCompany && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Nome</Label>
                <Input
                  value={editCompany.name ?? ""}
                  onChange={(e) => setEditCompany((c: any) => ({ ...c, name: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Telefone</Label>
                <Input
                  value={editCompany.phone ?? ""}
                  onChange={(e) => setEditCompany((c: any) => ({ ...c, phone: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Plano</Label>
                <Select
                  value={editCompany.plan}
                  onValueChange={(v) => setEditCompany((c: any) => ({ ...c, plan: v }))}
                >
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="trial" className="text-white">Trial</SelectItem>
                    <SelectItem value="basic" className="text-white">Básico</SelectItem>
                    <SelectItem value="professional" className="text-white">Profissional</SelectItem>
                    <SelectItem value="premium" className="text-white">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Status da assinatura</Label>
                <Select
                  value={editCompany.subscriptionStatus}
                  onValueChange={(v) => setEditCompany((c: any) => ({ ...c, subscriptionStatus: v }))}
                >
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="active" className="text-white">Ativo</SelectItem>
                    <SelectItem value="expired" className="text-white">Expirado</SelectItem>
                    <SelectItem value="blocked" className="text-white">Bloqueado</SelectItem>
                    <SelectItem value="cancelled" className="text-white">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditCompany(null)} className="text-slate-300">Cancelar</Button>
            <Button
              onClick={() => updateMutation.mutate({
                id: editCompany.id,
                name: editCompany.name,
                phone: editCompany.phone,
                plan: editCompany.plan,
                subscriptionStatus: editCompany.subscriptionStatus,
              })}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Redefinir senha */}
      <Dialog open={!!resetPasswordCompany} onOpenChange={() => setResetPasswordCompany(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Redefinir Senha</DialogTitle>
          </DialogHeader>
          {resetPasswordCompany && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Defina uma nova senha de acesso para <strong className="text-white">{resetPasswordCompany.name}</strong>.
              </p>
              <div>
                <Label className="text-slate-300">Nova senha</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                  onClick={() => setNewPassword(generatePassword())}
                >
                  Gerar senha aleatória
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetPasswordCompany(null)} className="text-slate-300">Cancelar</Button>
            <Button
              onClick={() => resetPasswordMutation.mutate({
                companyId: resetPasswordCompany.id,
                newPassword,
              })}
              disabled={!newPassword || newPassword.length < 6 || resetPasswordMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {resetPasswordMutation.isPending ? "Salvando..." : "Redefinir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal: Definir prazo de trial (Cortesia) */}
      <Dialog open={!!trialModal} onOpenChange={() => setTrialModal(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Definir Prazo de Cortesia</DialogTitle>
          </DialogHeader>
          {trialModal && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Defina por quantos dias <strong className="text-white">{trialModal.companyName}</strong> terá acesso gratuito ao sistema.
              </p>
              <div>
                <Label className="text-slate-300">Duração do período de cortesia</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white w-24"
                  />
                  <span className="text-slate-400 text-sm">dias</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {[7, 15, 30, 60].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTrialDays(String(d))}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        trialDays === String(d)
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                {trialDays && !isNaN(parseInt(trialDays)) && parseInt(trialDays) > 0 && (
                  <p className="text-xs text-amber-400 mt-2">
                    ⏳ Acesso até {new Date(Date.now() + parseInt(trialDays) * 86400000).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTrialModal(null)} className="text-slate-300">Cancelar</Button>
            <Button
              onClick={confirmTrialPlan}
              disabled={setPlanMutation.isPending || !trialDays || isNaN(parseInt(trialDays)) || parseInt(trialDays) < 1}
              className="bg-green-600 hover:bg-green-700"
            >
              {setPlanMutation.isPending ? "Salvando..." : "Confirmar Cortesia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
