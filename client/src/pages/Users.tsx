import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  MessageCircle,
  Crown,
  Wrench,
  ClipboardList,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  UserCheck,
  KeyRound,
  RefreshCw,
  Copy,
  AlertCircle,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type CompanyUserRole = "master" | "tecnico" | "secretaria";

const ROLE_CONFIG: Record<CompanyUserRole, { label: string; color: string; bgColor: string; icon: React.ElementType; description: string }> = {
  master: {
    label: "Master",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: Crown,
    description: "Acesso total ao sistema",
  },
  tecnico: {
    label: "Técnico",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: Wrench,
    description: "Somente Execução",
  },
  secretaria: {
    label: "Secretaria",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: ClipboardList,
    description: "Orçamentos, Clientes, Execução",
  },
};

// ─── Módulos disponíveis por perfil ─────────────────────────────────────────

const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "orcamentos", label: "Orçamentos" },
  { key: "vendas", label: "Vendas" },
  { key: "financeiro", label: "Financeiro" },
  { key: "clientes", label: "Clientes" },
  { key: "tapetes", label: "Tapetes" },
  { key: "execucao", label: "Execução" },
  { key: "servicos", label: "Serviços" },
  { key: "concorrentes", label: "Concorrência" },
  { key: "crm", label: "CRM / Reativação" },
  { key: "configuracoes", label: "Configurações" },
] as const;

type ModuleKey = typeof ALL_MODULES[number]["key"];

const DEFAULT_MODULES: Record<CompanyUserRole, ModuleKey[]> = {
  master: ["dashboard", "orcamentos", "vendas", "financeiro", "clientes", "tapetes", "execucao", "servicos", "concorrentes", "crm", "configuracoes"],
  tecnico: ["execucao"],
  secretaria: ["dashboard", "orcamentos", "clientes", "tapetes", "execucao"],
};

// ─── localStorage para módulos customizados por perfil ───────────────────────

const CUSTOM_MODULES_KEY = "higifacil_custom_modules";

function loadCustomModules(): Record<CompanyUserRole, ModuleKey[]> {
  try {
    const saved = localStorage.getItem(CUSTOM_MODULES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Record<CompanyUserRole, ModuleKey[]>;
      // Garantir que todos os perfis existem
      return {
        master: parsed.master ?? [...DEFAULT_MODULES.master],
        tecnico: parsed.tecnico ?? [...DEFAULT_MODULES.tecnico],
        secretaria: parsed.secretaria ?? [...DEFAULT_MODULES.secretaria],
      };
    }
  } catch {}
  return {
    master: [...DEFAULT_MODULES.master],
    tecnico: [...DEFAULT_MODULES.tecnico],
    secretaria: [...DEFAULT_MODULES.secretaria],
  };
}

function saveCustomModules(modules: Record<CompanyUserRole, ModuleKey[]>) {
  localStorage.setItem(CUSTOM_MODULES_KEY, JSON.stringify(modules));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: CompanyUserRole }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bgColor} ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
      title={checked ? "Clique para desativar" : "Clique para ativar"}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-[18px]" : "translate-x-[3px]"
      }`} />
    </button>
  );
}

// ─── Formulário de criar/editar ───────────────────────────────────────────────

type FormState = {
  id?: number;
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  role: CompanyUserRole;
  modules: ModuleKey[];
  active: boolean;
};

const emptyForm = (customModules?: Record<CompanyUserRole, ModuleKey[]>): FormState => ({
  name: "",
  email: "",
  phone: "",
  password: "",
  passwordConfirm: "",
  role: "tecnico" as CompanyUserRole,
  modules: [...(customModules?.tecnico ?? DEFAULT_MODULES.tecnico)],
  active: true,
});

function UserForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [showModules, setShowModules] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const isEditing = !!initial.id;
  const passwordMismatch = form.password && form.password !== form.passwordConfirm;
  const passwordMatch = form.password && form.password === form.passwordConfirm;

  const handleRoleChange = (role: CompanyUserRole) => {
    const custom = loadCustomModules();
    setForm(f => ({ ...f, role, modules: [...(custom[role] ?? DEFAULT_MODULES[role])] }));
  };

  const toggleModule = (key: ModuleKey) => {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(key)
        ? f.modules.filter(m => m !== key)
        : [...f.modules, key],
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    if (!form.email.trim()) { toast.error("E-mail obrigatório"); return; }
    if (!isEditing && !form.password) { toast.error("Senha obrigatória"); return; }
    if (form.password) {
      if (form.password.length < 8) { toast.error("Senha mínima de 8 caracteres"); return; }
      if (!/[A-Z]/.test(form.password)) { toast.error("Senha deve ter ao menos uma letra maiúscula"); return; }
      if (!/[0-9]/.test(form.password)) { toast.error("Senha deve ter ao menos um número"); return; }
    }
    if (form.password && form.password !== form.passwordConfirm) { toast.error("As senhas não coincidem"); return; }
    onSave(form);
  };

  const cfg = ROLE_CONFIG[form.role];
  const Icon = cfg.icon;

  return (
    <div className="mb-5 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/60 to-white p-5 shadow-sm">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: "oklch(0.55 0.22 280)" }}>
            {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{isEditing ? `Editando: ${initial.name}` : "Novo Usuário"}</p>
            <p className="text-xs text-muted-foreground">Preencha os dados e defina os módulos de acesso</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Nome */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Nome completo *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: João Silva" className="h-10" />
        </div>

        {/* E-mail */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">E-mail de acesso *</label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@empresa.com" className="h-10" />
        </div>

        {/* Telefone/WhatsApp */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">WhatsApp (para envio de credenciais)</label>
          <Input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="(14) 99999-9999"
            className="h-10"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">Opcional. Usado para enviar as credenciais de acesso via WhatsApp.</p>
        </div>

        {/* Perfil base */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Perfil base *</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(ROLE_CONFIG) as [CompanyUserRole, typeof ROLE_CONFIG[CompanyUserRole]][]).map(([role, c]) => {
              const RIcon = c.icon;
              const selected = form.role === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                    selected
                      ? `${c.bgColor} ${c.color} border-current shadow-sm`
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <RIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status (somente edição) */}
        {isEditing && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Status</label>
            <div className="flex items-center gap-3 h-10">
              <ToggleSwitch checked={form.active} onChange={() => setForm(f => ({ ...f, active: !f.active }))} />
              <span className={`text-sm font-medium ${form.active ? "text-green-700" : "text-red-600"}`}>
                {form.active ? "Ativo — pode fazer login" : "Inativo — acesso bloqueado"}
              </span>
            </div>
          </div>
        )}

        {/* Senha — apenas no cadastro novo; na edição usa o botão de chave */}
        {!isEditing && (
          <>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Senha *
              </label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="h-10 pr-10"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Confirmar senha *
              </label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={form.passwordConfirm}
                  onChange={e => setForm(f => ({ ...f, passwordConfirm: e.target.value }))}
                  placeholder="Repita a senha exatamente"
                  className={`h-10 pr-10 ${
                    passwordMismatch ? "border-red-400 focus-visible:ring-red-400" : passwordMatch ? "border-green-400 focus-visible:ring-green-400" : ""
                  }`}
                  autoComplete="new-password"
                />
                {form.passwordConfirm && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordMatch
                      ? <Check className="h-4 w-4 text-green-500" />
                      : <X className="h-4 w-4 text-red-400" />
                    }
                  </div>
                )}
              </div>
              {passwordMismatch && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> As senhas não coincidem
                </p>
              )}
              {passwordMatch && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Senhas conferem
                </p>
              )}
              {!form.passwordConfirm && (
                <p className="text-xs text-muted-foreground mt-1">Repita a senha para confirmar</p>
              )}
            </div>

            {/* Dicas de senha */}
            {form.password && (
              <div className="col-span-full">
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${form.password.length >= 8 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {form.password.length >= 8 ? '✓' : '✗'} 8+ caracteres
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${/[A-Z]/.test(form.password) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {/[A-Z]/.test(form.password) ? '✓' : '✗'} Maiúscula
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${/[0-9]/.test(form.password) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {/[0-9]/.test(form.password) ? '✓' : '✗'} Número
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Aviso na edição: usar botão de chave para alterar senha */}
        {isEditing && (
          <div className="col-span-full">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <KeyRound className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                Para alterar a senha deste usuário, use o <strong>botão de chave (🔑)</strong> na lista de usuários.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Módulos de acesso */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowModules(v => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-full"
        >
          <div className={`p-1 rounded ${cfg.bgColor}`}>
            <Icon className={`h-3 w-3 ${cfg.color}`} />
          </div>
          <span>Módulos de acesso ({form.modules.length}/{ALL_MODULES.length})</span>
          <span className="ml-auto text-muted-foreground">
            {showModules ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        </button>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
          Pré-selecionados pelo perfil "{cfg.label}". Ajuste conforme necessário.
        </p>

        {showModules && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2 p-3 rounded-xl bg-muted/30 border border-border">
            {ALL_MODULES.map(mod => {
              const active = form.modules.includes(mod.key);
              return (
                <button
                  key={mod.key}
                  type="button"
                  onClick={() => toggleModule(mod.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    active
                      ? "bg-green-50 text-green-700 border-green-300"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {active ? <Check className="h-3 w-3 flex-shrink-0" /> : <X className="h-3 w-3 flex-shrink-0 opacity-40" />}
                  {mod.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-purple-200">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSaving}
          className="gap-1.5 text-white"
          style={{ background: "oklch(0.55 0.22 280)" }}
        >
          <Check className="h-3.5 w-3.5" />
          {isSaving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Usuário"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Users() {
  const { user: currentUser } = useAuth();
  const [customModules, setCustomModules] = useState<Record<CompanyUserRole, ModuleKey[]>>(() => loadCustomModules());
  const [editingProfiles, setEditingProfiles] = useState(false);

  const handleToggleProfileModule = (role: CompanyUserRole, key: ModuleKey) => {
    setCustomModules(prev => {
      const updated = {
        ...prev,
        [role]: prev[role].includes(key)
          ? prev[role].filter(m => m !== key)
          : [...prev[role], key],
      };
      saveCustomModules(updated);
      return updated;
    });
  };

  const handleResetProfileModules = (role: CompanyUserRole) => {
    setCustomModules(prev => {
      const updated = { ...prev, [role]: [...DEFAULT_MODULES[role]] };
      saveCustomModules(updated);
      return updated;
    });
  };
  const hasCompany = !!(currentUser?.companyId);
  const { data: companyUsers = [], isLoading, refetch } = trpc.companyUsers.list.useQuery(
    undefined,
    { enabled: hasCompany } // Só busca se o usuário tem empresa associada
  );

  const [showForm, setShowForm] = useState(false);
  const [editingForm, setEditingForm] = useState<FormState | null>(null);

  const createMutation = trpc.companyUsers.create.useMutation({
    onSuccess: (_, vars) => {
      refetch();
      setShowForm(false);
      toast.success("Usuário criado com sucesso!");
      setLastCreated({ name: vars.name, email: vars.email, phone: vars.phone, password: vars.password });
      // Se tiver telefone, enviar credenciais automaticamente por WhatsApp
      if (vars.phone) {
        const loginUrl = window.location.origin + "/entrar";
        const msg = encodeURIComponent(
          `Olá ${vars.name}! 👋\n\nSeu acesso ao sistema foi criado. Veja os dados abaixo:\n\n` +
          `🔗 Link: ${loginUrl}\n` +
          `📧 E-mail: ${vars.email}\n` +
          `🔑 Senha: ${vars.password}\n\n` +
          `Acesse e troque sua senha após o primeiro login. Qualquer dúvida, entre em contato!`
        );
        const phoneClean = vars.phone.replace(/\D/g, "");
        window.open(`https://wa.me/55${phoneClean}?text=${msg}`, "_blank");
        toast.success("📱 WhatsApp aberto com as credenciais!", { duration: 4000 });
      }
    },
    onError: (e) => toast.error(e.message || "Erro ao criar usuário"),
  });

  const updateMutation = trpc.companyUsers.update.useMutation({
    onSuccess: () => { refetch(); setEditingForm(null); toast.success("Usuário atualizado!"); },
    onError: (e) => toast.error(e.message || "Erro ao atualizar usuário"),
  });

  const deleteMutation = trpc.companyUsers.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Usuário excluído"); },
    onError: () => toast.error("Erro ao excluir usuário"),
  });

  const [lastCreated, setLastCreated] = useState<{ name: string; email: string; phone?: string; password: string } | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Estado do modal de redefinição de senha
  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: number; name: string; email: string; phone?: string } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [showResetPass, setShowResetPass] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
    const pwd = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setResetPassword(pwd);
    setResetPasswordConfirm(pwd);
  };

  const handleResetPassword = () => {
    if (!resetPasswordUser) return;
    if (!resetPassword || resetPassword.length < 6) { toast.error("Senha mínima de 6 caracteres"); return; }
    if (resetPassword !== resetPasswordConfirm) { toast.error("As senhas não coincidem"); return; }
    setIsResetting(true);
    updateMutation.mutate(
      { id: resetPasswordUser.id, password: resetPassword },
      {
        onSuccess: () => {
          toast.success(`Senha de ${resetPasswordUser.name} redefinida com sucesso!`);
          // Enviar automaticamente por WhatsApp se o usuário tiver telefone
          if (resetPasswordUser.phone) {
            const loginUrl = window.location.origin + "/entrar";
            const msg = encodeURIComponent(
              `Olá ${resetPasswordUser.name}! 🔑\n\nSua senha foi redefinida. Novos dados de acesso:\n\n` +
              `🔗 Link: ${loginUrl}\n` +
              `📧 E-mail: ${resetPasswordUser.email}\n` +
              `🔑 Nova senha: ${resetPassword}\n\n` +
              `Acesse e troque sua senha após o login. Qualquer dúvida, entre em contato!`
            );
            const phoneClean = resetPasswordUser.phone.replace(/\D/g, "");
            window.open(`https://wa.me/55${phoneClean}?text=${msg}`, "_blank");
            toast.success("📱 WhatsApp aberto com a nova senha!", { duration: 4000 });
          }
          setResetPasswordUser(null);
          setResetPassword("");
          setResetPasswordConfirm("");
          setIsResetting(false);
        },
        onError: (e) => {
          toast.error(e.message || "Erro ao redefinir senha");
          setIsResetting(false);
        },
      }
    );
  };

  // O usuário master da empresa tem role="admin" no objeto User sintético.
  // Sub-usuários com perfil master também têm role="admin".
  // Sub-usuários técnico/secretaria têm role="user".
  const isMaster = currentUser?.role === "admin" || currentUser?.role === "master";

  const handleToggleActive = (u: { id: number; active: boolean; name: string; email: string; role: string }) => {
    setTogglingId(u.id);
    updateMutation.mutate(
      { id: u.id, active: !u.active },
      {
        onSettled: () => setTogglingId(null),
      }
    );
  };

  const handleSendWhatsApp = (name: string, email: string, password: string, phone?: string) => {
    const loginUrl = window.location.origin + "/entrar";
    const msg = encodeURIComponent(
      `Olá ${name}! 👋\n\nSeu acesso ao sistema foi criado. Veja os dados abaixo:\n\n` +
      `🔗 Link: ${loginUrl}\n` +
      `📧 E-mail: ${email}\n` +
      `🔑 Senha: ${password}\n\n` +
      `Acesse e troque sua senha após o primeiro login. Qualquer dúvida, entre em contato!`
    );
    // Se tiver telefone, abre WhatsApp direto para o número; senão, abre sem número
    const phoneClean = phone ? phone.replace(/\D/g, "") : "";
    const waUrl = phoneClean
      ? `https://wa.me/55${phoneClean}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(waUrl, "_blank");
  };

  const handleCreate = (form: FormState) => {
    createMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      role: form.role,
      modules: form.modules as string[], // módulos customizados salvos no banco
    });
  };

  const handleUpdate = (form: FormState) => {
    updateMutation.mutate({
      id: form.id!,
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      role: form.role as any,
      active: form.active,
      modules: form.modules as string[], // módulos customizados salvos no banco
      ...(form.password ? { password: form.password } : {}),
    });
  };

  const startEdit = (u: any) => {
    // Carregar módulos do banco se existirem, senão usar padrão do role
    let savedModules: ModuleKey[];
    if (u.allowedModules) {
      try {
        savedModules = JSON.parse(u.allowedModules) as ModuleKey[];
      } catch {
        savedModules = [...(DEFAULT_MODULES[u.role as CompanyUserRole] ?? DEFAULT_MODULES.tecnico)];
      }
    } else {
      savedModules = [...(DEFAULT_MODULES[u.role as CompanyUserRole] ?? DEFAULT_MODULES.tecnico)];
    }
    setEditingForm({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? "",
      password: "",
      passwordConfirm: "",
      role: u.role as CompanyUserRole,
      modules: savedModules,
      active: u.active,
    });
    setShowForm(false);
    setLastCreated(null);
  };

  // Se o usuário não tem empresa associada (ex: dono da plataforma via Manus OAuth)
  if (!hasCompany) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Gerenciamento de Equipe</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Esta área é para que as empresas cadastradas gerenciem sua equipe interna.
            Para acessar, entre com as credenciais de uma empresa pelo botão abaixo.
          </p>
          <a
            href="/entrar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm"
            style={{ background: "oklch(0.55 0.22 280)" }}
          >
            Entrar como Empresa
          </a>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <UsersIcon className="h-5 w-5" style={{ color: "oklch(0.55 0.22 280)" }} />
              Usuários da Equipe
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie quem acessa o sistema e o que cada um pode ver
            </p>
          </div>
          {isMaster && !showForm && !editingForm && (
            <Button
              size="sm"
              onClick={() => { setShowForm(true); setEditingForm(null); setLastCreated(null); }}
              className="gap-1.5 text-white"
              style={{ background: "oklch(0.55 0.22 280)" }}
            >
              <Plus className="h-4 w-4" /> Novo Usuário
            </Button>
          )}
        </div>

        {/* Formulário de criação */}
        {showForm && (
          <UserForm
            initial={emptyForm(customModules)}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            isSaving={createMutation.isPending}
          />
        )}

        {/* Formulário de edição */}
        {editingForm && (
          <UserForm
            initial={editingForm}
            onSave={handleUpdate}
            onCancel={() => setEditingForm(null)}
            isSaving={updateMutation.isPending}
          />
        )}

        {/* Banner de credenciais criadas */}
        {lastCreated && (
          <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-green-800">Usuário criado com sucesso!</p>
                <p className="text-xs text-green-700 mt-0.5 mb-2">
                  Anote as credenciais abaixo e envie ao usuário:
                </p>
                <div className="bg-white rounded-lg border border-green-200 p-3 space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium w-16">Nome:</span>
                    <span className="text-xs text-gray-800 font-semibold">{lastCreated.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium w-16">E-mail:</span>
                    <span className="text-xs text-gray-800 font-mono">{lastCreated.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium w-16">Senha:</span>
                    <span className="text-xs text-gray-800 font-mono font-bold bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">{lastCreated.password}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 font-medium w-16">Link:</span>
                    <span className="text-xs text-blue-600 font-mono">{window.location.origin}/entrar</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSendWhatsApp(lastCreated.name, lastCreated.email, lastCreated.password, lastCreated.phone)}
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Enviar por WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const text = `Nome: ${lastCreated.name}\nE-mail: ${lastCreated.email}\nSenha: ${lastCreated.password}\nLink: ${window.location.origin}/entrar`;
                      navigator.clipboard.writeText(text).then(() => toast.success("Credenciais copiadas!"));
                    }}
                    className="gap-1.5 border-green-400 text-green-700 hover:bg-green-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setLastCreated(null)} className="text-green-700 ml-auto">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de usuários */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="animate-spin h-6 w-6 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Carregando usuários...</p>
          </div>
        ) : companyUsers.length === 0 ? (
          <div className="text-center py-14 rounded-2xl border border-dashed border-border bg-muted/20">
            <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum usuário adicional cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie usuários para que sua equipe acesse o sistema com perfis específicos.</p>
            {isMaster && (
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="mt-4 gap-1.5 text-white"
                style={{ background: "oklch(0.55 0.22 280)" }}
              >
                <Plus className="h-4 w-4" /> Criar primeiro usuário
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(companyUsers as any[]).map((u) => {
              const cfg = ROLE_CONFIG[u.role as CompanyUserRole] ?? ROLE_CONFIG.tecnico;
              const Icon = cfg.icon;
              const isToggling = togglingId === u.id;

              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                    u.active ? "border-border bg-white hover:bg-muted/20" : "border-dashed border-gray-200 bg-gray-50/60 opacity-70"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: u.active ? "oklch(0.55 0.22 280)" : "oklch(0.65 0.05 280)" }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{u.name}</span>
                      <RoleBadge role={u.role as CompanyUserRole} />
                      {!u.active && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                          <X className="h-2.5 w-2.5" /> Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.phone && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> {u.phone}
                      </p>
                    )}
                    {u.lastLoginAt ? (
                      <p className="text-xs text-muted-foreground">
                        Último acesso: {new Date(u.lastLoginAt).toLocaleDateString("pt-BR")}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3" /> Nunca acessou — redefina a senha se necessário
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  {isMaster && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle ativo/inativo */}
                      <div className="flex flex-col items-center gap-0.5">
                        <ToggleSwitch
                          checked={u.active}
                          onChange={() => handleToggleActive(u)}
                          disabled={isToggling}
                        />
                        <span className={`text-[10px] font-medium ${u.active ? "text-green-600" : "text-gray-400"}`}>
                          {isToggling ? "..." : u.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      {/* Enviar WhatsApp */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const pwd = prompt(`Digite a senha atual de ${u.name} para enviar por WhatsApp:`);
                          if (pwd) handleSendWhatsApp(u.name, u.email, pwd, u.phone);
                        }}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title={u.phone ? `Enviar credenciais para ${u.phone}` : "Enviar credenciais por WhatsApp"}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>

                      {/* Editar */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(u)}
                        className="h-8 w-8 p-0"
                        title="Editar usuário"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {/* Redefinir senha */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setResetPasswordUser({ id: u.id, name: u.name, email: u.email, phone: u.phone });
                          setResetPassword("");
                          setResetPasswordConfirm("");
                          setShowResetPass(false);
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-purple-600 hover:bg-purple-50"
                        title="Redefinir senha"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>

                      {/* Excluir */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Excluir o usuário "${u.name}"? Esta ação não pode ser desfeita.`)) {
                            deleteMutation.mutate({ id: u.id });
                          }
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                        title="Excluir usuário"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de redefinição de senha */}
        {resetPasswordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              {/* Cabeçalho */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "oklch(0.55 0.22 280)" }}>
                    <KeyRound className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Redefinir Senha</p>
                    <p className="text-xs text-muted-foreground">{resetPasswordUser.name} · {resetPasswordUser.email}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setResetPasswordUser(null)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Gerador automático */}
              <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-100">
                <p className="text-xs text-purple-700 font-medium mb-2">Gerar senha automática</p>
                <Button
                  size="sm"
                  onClick={generatePassword}
                  className="gap-1.5 text-white w-full"
                  style={{ background: "oklch(0.55 0.22 280)" }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Gerar Senha Segura
                </Button>
              </div>

              {/* Campos de senha */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Nova senha *</label>
                  <div className="relative">
                    <Input
                      type={showResetPass ? "text" : "password"}
                      value={resetPassword}
                      onChange={e => setResetPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showResetPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Confirmar nova senha *</label>
                  <Input
                    type={showResetPass ? "text" : "password"}
                    value={resetPasswordConfirm}
                    onChange={e => setResetPasswordConfirm(e.target.value)}
                    placeholder="Repita a nova senha"
                    className={`h-10 ${
                      resetPasswordConfirm && resetPassword !== resetPasswordConfirm
                        ? "border-red-400 focus-visible:ring-red-400"
                        : resetPasswordConfirm && resetPassword === resetPasswordConfirm
                        ? "border-green-400 focus-visible:ring-green-400"
                        : ""
                    }`}
                  />
                  {resetPasswordConfirm && resetPassword !== resetPasswordConfirm && (
                    <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                  )}
                  {resetPasswordConfirm && resetPassword === resetPasswordConfirm && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check className="h-3 w-3" /> Senhas coincidem</p>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 mt-5">
                <Button
                  onClick={handleResetPassword}
                  disabled={isResetting || !resetPassword || resetPassword !== resetPasswordConfirm}
                  className="flex-1 gap-1.5 text-white"
                  style={{ background: "oklch(0.55 0.22 280)" }}
                >
                  {isResetting ? (
                    <><div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                  ) : (
                    <><KeyRound className="h-3.5 w-3.5" /> Redefinir Senha</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (resetPassword && resetPasswordUser) {
                      handleSendWhatsApp(resetPasswordUser.name, resetPasswordUser.email, resetPassword, resetPasswordUser.phone);
                    }
                  }}
                  disabled={!resetPassword || resetPassword !== resetPasswordConfirm}
                  className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Enviar nova senha por WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>

                {/* Botão Copiar Senha */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (resetPassword) {
                      navigator.clipboard.writeText(resetPassword)
                        .then(() => toast.success("📋 Senha copiada para a área de transferência!"))
                        .catch(() => toast.error("Não foi possível copiar"));
                    }
                  }}
                  disabled={!resetPassword}
                  className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  title="Copiar senha para a área de transferência"
                >
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de perfis editável */}
        <div className="rounded-2xl border border-border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Permissões por perfil</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingProfiles ? "Clique nos checkboxes para liberar ou bloquear módulos por perfil" : "Defina quais módulos cada perfil pode acessar"}
              </p>
            </div>
            {isMaster && (
              <Button
                size="sm"
                variant={editingProfiles ? "default" : "outline"}
                onClick={() => setEditingProfiles(v => !v)}
                className={`gap-1.5 text-xs ${editingProfiles ? "text-white" : ""}`}
                style={editingProfiles ? { background: "oklch(0.55 0.22 280)" } : {}}
              >
                {editingProfiles ? <><Check className="h-3 w-3" /> Concluído</> : <><Pencil className="h-3 w-3" /> Editar permissões</>}
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-4 font-semibold text-muted-foreground">Módulo</th>
                  {(Object.entries(ROLE_CONFIG) as [CompanyUserRole, typeof ROLE_CONFIG[CompanyUserRole]][]).map(([role, c]) => {
                    const RIcon = c.icon;
                    const isModified = JSON.stringify(customModules[role].sort()) !== JSON.stringify([...DEFAULT_MODULES[role]].sort());
                    return (
                      <th key={role} className="text-center py-2.5 px-3 font-semibold">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${c.bgColor} ${c.color}`}>
                            <RIcon className="h-3 w-3" />
                            {c.label}
                          </div>
                          {editingProfiles && isModified && (
                            <button
                              onClick={() => handleResetProfileModules(role)}
                              className="text-[10px] text-orange-500 hover:text-orange-700 underline"
                            >
                              Restaurar padrão
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ALL_MODULES.map(mod => (
                  <tr key={mod.key} className="hover:bg-muted/10">
                    <td className="py-2 px-4 text-foreground font-medium">{mod.label}</td>
                    {(Object.keys(ROLE_CONFIG) as CompanyUserRole[]).map(role => {
                      const hasModule = customModules[role].includes(mod.key);
                      return (
                        <td key={role} className="text-center py-2 px-3">
                          {editingProfiles ? (
                            <button
                              onClick={() => handleToggleProfileModule(role, mod.key)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                                hasModule
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-gray-300 hover:border-gray-400 bg-white"
                              }`}
                              title={hasModule ? "Clique para remover acesso" : "Clique para conceder acesso"}
                            >
                              {hasModule && <Check className="h-3 w-3" />}
                            </button>
                          ) : (
                            hasModule ? (
                              <span className="text-green-500 font-bold">✓</span>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editingProfiles && (
            <div className="px-4 py-2.5 border-t border-border bg-amber-50">
              <p className="text-xs text-amber-700">
                <strong>Atenção:</strong> As alterações aqui afetam os módulos pré-selecionados ao criar novos usuários com cada perfil. Usuários já criados não são afetados automaticamente.
              </p>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
