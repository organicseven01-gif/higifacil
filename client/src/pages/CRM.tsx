import DashboardLayout from "@/components/DashboardLayout";
import FeatureGate from "@/components/FeatureGate";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  Users, MessageCircle, Sparkles, Clock, Phone, Copy, Send,
  ChevronDown, ChevronUp, RefreshCw, Filter, Calendar, Bell,
  BellOff, Edit2, Check, X, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

function openWhatsApp(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function applyTemplate(template: string, vars: { nome: string; dias: number | string; empresa: string; telefone: string }) {
  return template
    .replace(/\{nome\}/g, vars.nome)
    .replace(/\{dias\}/g, String(vars.dias))
    .replace(/\{empresa\}/g, vars.empresa)
    .replace(/\{telefone\}/g, vars.telefone);
}

const DEFAULT_TEMPLATE = `Olá {nome}! 👋

Aqui é da {empresa}. Faz {dias} dias desde o seu último serviço conosco e queríamos saber como você está!

Temos condições especiais para clientes como você. Que tal agendar uma higienização? 🛋️

Responda essa mensagem ou ligue: {telefone}`;

const PRESET_DAYS = [30, 60, 90, 120, 180, 365];

// ─── Componente de Mensagens de Relacionamento ─────────────────────────────
const STYLE_OPTIONS = [
  { key: 'aleatorio' as const, label: '🎲 Aleatória', desc: 'Surpresa a cada geração' },
  { key: 'biblico' as const, label: '✝️ Bíblica', desc: 'Versículo ou bênção' },
  { key: 'positivo' as const, label: '🌟 Positiva', desc: 'Esperança e motivação' },
  { key: 'fimdesemana' as const, label: '🏖️ Fim de semana', desc: 'Desejo caloroso' },
  { key: 'semana' as const, label: '💪 Boa semana', desc: 'Energia para a semana' },
  { key: 'feriado' as const, label: '🎉 Feriado', desc: 'Mensagem festiva' },
];

function RelationshipMessagesTab() {
  const [search, setSearch] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'aleatorio' | 'biblico' | 'positivo' | 'fimdesemana' | 'semana' | 'feriado'>('aleatorio');
  const [generatedMessages, setGeneratedMessages] = useState<Record<number, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: clientsList = [], isLoading } = trpc.clients.list.useQuery(
    { search: search || undefined },
  );

  const generateMutation = trpc.crm.generateRelationshipMessage.useMutation();

  async function handleGenerate(client: any) {
    setLoadingIds(prev => { const s = new Set(prev); s.add(client.id); return s; });
    try {
      const result = await generateMutation.mutateAsync({ clientName: client.name, style: selectedStyle });
      setGeneratedMessages(prev => ({ ...prev, [client.id]: result.message }));
    } catch {
      toast.error('Erro ao gerar mensagem. Tente novamente.');
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(client.id); return s; });
    }
  }

  function handleCopy(clientId: number, message: string) {
    navigator.clipboard.writeText(message).then(() => {
      setCopiedId(clientId);
      toast.success('Mensagem copiada!');
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  const filteredClients = (clientsList as any[]).filter((c: any) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Seletor de estilo */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Estilo da mensagem
        </p>
        <div className="grid grid-cols-2 gap-2">
          {STYLE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSelectedStyle(opt.key)}
              className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all ${
                selectedStyle === opt.key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-border bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div>
                <p className="text-xs font-semibold">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      {/* Busca */}
      <Input
        placeholder="Buscar cliente por nome ou telefone..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="bg-white"
      />
      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Carregando clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-border">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filteredClients.length} clientes</p>
          {filteredClients.map((client: any) => {
            const msg = generatedMessages[client.id];
            const loading = loadingIds.has(client.id);
            const copied = copiedId === client.id;
            return (
              <div key={client.id} className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-amber-700 font-bold text-sm">{client.name?.[0]?.toUpperCase() ?? '?'}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPhone(client.phone || '')}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleGenerate(client)}
                    disabled={loading}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs gap-1.5 shrink-0"
                  >
                    {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {loading ? 'Gerando...' : msg ? 'Nova' : 'Gerar'}
                  </Button>
                </div>
                {msg && (
                  <div className="space-y-2">
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                      <p className="text-sm text-foreground whitespace-pre-line">{msg}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleCopy(client.id, msg)} className="flex-1 text-xs gap-1.5">
                        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </Button>
                      <Button size="sm" onClick={() => openWhatsApp(client.phone, msg)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs gap-1.5">
                        <MessageCircle className="h-3 w-3" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CRM() {
  const [activeTab, setActiveTab] = useState<"hoje" | "todos" | "inativos" | "mensagens">("hoje");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [generatingFor, setGeneratingFor] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [editingDaysFor, setEditingDaysFor] = useState<number | null>(null);
  const [editDaysValue, setEditDaysValue] = useState<string>("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [daysSince, setDaysSince] = useState(180);
  const [pendingClientId, setPendingClientId] = useState<number | null>(null);

  const { data: settingsData } = trpc.settings.get.useQuery();
  const companyName = settingsData?.company_name || "Higifácil";
  const companyPhone = settingsData?.company_phone || "";

  const { data: todayClients = [], isLoading: loadingToday, refetch: refetchToday } = trpc.crm.todayReactivations.useQuery();
  const { data: allClients = [], isLoading: loadingAll, refetch: refetchAll } = trpc.crm.allReactivations.useQuery();
  const { data: inactiveClients = [], isLoading: loadingInactive } = trpc.crm.inactiveClients.useQuery(
    { daysSince },
    { enabled: activeTab === "inativos" }
  );

  const setReactivationMutation = trpc.crm.setReactivation.useMutation({
    onSuccess: () => {
      toast.success("Lembrete configurado!");
      refetchToday();
      refetchAll();
      setEditingDaysFor(null);
    },
    onError: () => toast.error("Erro ao configurar lembrete"),
  });

  const removeReactivationMutation = trpc.crm.removeReactivation.useMutation({
    onSuccess: () => {
      toast.success("Lembrete removido");
      refetchToday();
      refetchAll();
    },
    onError: () => toast.error("Erro ao remover lembrete"),
  });

  const generateMsgMutation = trpc.ai.generateReactivationMessage.useMutation({
    onSuccess: (data) => {
      if (pendingClientId !== null) {
        setMessages(prev => ({ ...prev, [pendingClientId]: data.message }));
      }
      setGeneratingFor(null);
      setPendingClientId(null);
      toast.success("Mensagem gerada com IA!");
    },
    onError: () => {
      setGeneratingFor(null);
      toast.error("Erro ao gerar mensagem");
    },
  });

  const handleGenerateMessage = (client: any) => {
    setGeneratingFor(client.id);
    setPendingClientId(client.id);
    generateMsgMutation.mutate({
      clientName: client.name,
      clientPhone: client.phone,
      daysSinceContact: client.daysSinceContact ?? client.reactivationDays ?? 180,
      companyName,
    });
  };

  const handleApplyTemplate = (client: any) => {
    const msg = applyTemplate(template, {
      nome: client.name.split(" ")[0],
      dias: client.reactivationDays ?? client.daysSinceContact ?? "algum tempo",
      empresa: companyName,
      telefone: companyPhone,
    });
    setMessages(prev => ({ ...prev, [client.id]: msg }));
  };

  const handleSendAll = (clients: any[]) => {
    const withPhone = clients.filter((c: any) => c.phone);
    if (withPhone.length === 0) return toast.error("Nenhum cliente com telefone");
    withPhone.forEach((client: any) => {
      const msg = messages[client.id] || applyTemplate(template, {
        nome: client.name.split(" ")[0],
        dias: client.reactivationDays ?? client.daysSinceContact ?? "algum tempo",
        empresa: companyName,
        telefone: companyPhone,
      });
      openWhatsApp(client.phone, msg);
    });
    toast.success(`${withPhone.length} mensagens abertas no WhatsApp!`);
  };

  const handleSaveReactivation = (clientId: number, days: number, lastServiceDate?: string) => {
    setReactivationMutation.mutate({ clientId, reactivationDays: days, lastServiceDate });
  };

  const copyMessage = (id: number) => {
    const msg = messages[id];
    if (!msg) return;
    navigator.clipboard.writeText(msg);
    toast.success("Mensagem copiada!");
  };

  const periodOptions = [
    { label: "30 dias", value: 30 },
    { label: "60 dias", value: 60 },
    { label: "90 dias", value: 90 },
    { label: "6 meses", value: 180 },
    { label: "1 ano", value: 365 },
  ];

  const overdueClients = allClients.filter((c: any) => c.isOverdue);
  const todayAllClients = allClients.filter((c: any) => c.isDueToday);
  const upcomingClients = allClients.filter((c: any) => !c.isOverdue && !c.isDueToday);

  function ClientCard({ client }: { client: any }) {
    const isExpanded = expandedId === client.id;
    const hasMessage = !!messages[client.id];
    const isGenerating = generatingFor === client.id;
    const isEditingDays = editingDaysFor === client.id;
    const daysUntil = client.reactivationDueDate
      ? Math.ceil((new Date(client.reactivationDueDate + 'T12:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div
          className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : client.id)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                client.isOverdue ? "bg-red-100 text-red-700" :
                client.isDueToday ? "bg-amber-100 text-amber-700" :
                "bg-blue-100 text-blue-700"
              }`}>
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{client.name}</p>
                <p className="text-xs text-muted-foreground">{formatPhone(client.phone || "")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {client.reactivationDays && daysUntil !== null && (
                <Badge variant="outline" className={`text-xs ${
                  client.isOverdue ? "border-red-300 text-red-600" :
                  client.isDueToday ? "border-amber-300 text-amber-600" :
                  "border-blue-300 text-blue-600"
                }`}>
                  {client.isOverdue ? `${Math.abs(daysUntil)}d atrasado` :
                   client.isDueToday ? "Hoje!" :
                   `em ${daysUntil}d`}
                </Badge>
              )}
              {client.daysSinceContact != null && (
                <Badge variant="outline" className="text-xs border-gray-300 text-gray-500">
                  {client.daysSinceContact}d sem contato
                </Badge>
              )}
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-border p-4 space-y-4 bg-muted/10">
            {client.reactivationDays && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground bg-white rounded-xl p-3 border border-border">
                <Calendar className="h-4 w-4 shrink-0 text-blue-500" />
                <span>Último serviço: <strong>{formatDate(client.lastServiceDate)}</strong></span>
                <span className="hidden sm:inline">•</span>
                <span>Lembrete: <strong>{client.reactivationDays} dias</strong></span>
                <span className="hidden sm:inline">•</span>
                <span>Data alvo: <strong>{formatDate(client.reactivationDueDate)}</strong></span>
              </div>
            )}

            {isEditingDays ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Lembrar em quantos dias?</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_DAYS.map(d => (
                    <button
                      key={d}
                      onClick={() => setEditDaysValue(String(d))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        editDaysValue === String(d)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                  <Input
                    type="number"
                    value={editDaysValue}
                    onChange={e => setEditDaysValue(e.target.value)}
                    placeholder="Outro"
                    className="h-8 w-20 text-sm"
                    min={1}
                    max={3650}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const days = parseInt(editDaysValue);
                      if (!days || days < 1) return toast.error("Informe um prazo válido");
                      handleSaveReactivation(client.id, days, client.lastServiceDate ?? new Date().toISOString().split('T')[0]);
                    }}
                    disabled={setReactivationMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-1" /> Confirmar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDaysFor(null)}>
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingDaysFor(client.id);
                    setEditDaysValue(String(client.reactivationDays ?? 180));
                  }}
                  className="text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  {client.reactivationDays ? "Editar lembrete" : "Definir lembrete"}
                </Button>
                {client.reactivationDays && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeReactivationMutation.mutate({ clientId: client.id })}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    <BellOff className="h-3 w-3 mr-1" />
                    Remover lembrete
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              {hasMessage ? (
                <>
                  <Textarea
                    value={messages[client.id]}
                    onChange={e => setMessages(prev => ({ ...prev, [client.id]: e.target.value }))}
                    className="text-sm min-h-[100px] resize-none bg-white"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => copyMessage(client.id)} className="text-xs">
                      <Copy className="h-3 w-3 mr-1" /> Copiar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openWhatsApp(client.phone, messages[client.id])}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Send className="h-3 w-3 mr-1" /> Enviar WhatsApp
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleApplyTemplate(client)} className="text-xs">
                      <RefreshCw className="h-3 w-3 mr-1" /> Usar template
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleGenerateMessage(client)}
                      disabled={isGenerating}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Gerar com IA
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApplyTemplate(client)}
                    className="text-xs"
                  >
                    <MessageCircle className="h-3 w-3 mr-1" /> Usar template
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateMessage(client)}
                    disabled={isGenerating}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    {isGenerating ? "Gerando..." : "Gerar com IA"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <FeatureGate featureKey="crm" featureLabel="CRM de Clientes">
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reativação</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Régua de relacionamento com clientes</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplatePanel(!showTemplatePanel)}
            className="text-xs gap-1.5"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Template
          </Button>
        </div>

        {/* Template Panel */}
        {showTemplatePanel && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-foreground">Template de Mensagem</p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setTemplate(DEFAULT_TEMPLATE)} className="text-xs text-muted-foreground">
                  Restaurar padrão
                </Button>
                <Button size="sm" onClick={() => { setShowTemplatePanel(false); toast.success("Template salvo!"); }} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  <Check className="h-3 w-3 mr-1" /> Salvar
                </Button>
              </div>
            </div>
            <Textarea
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="text-sm min-h-[140px] font-mono resize-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {["{nome}", "{dias}", "{empresa}", "{telefone}"].map(v => (
                <button
                  key={v}
                  onClick={() => setTemplate(t => t + v)}
                  className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-mono border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Use as variáveis acima para personalizar a mensagem. Elas serão substituídas automaticamente pelos dados do cliente.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {[
            { key: "hoje", label: "Hoje", count: (todayClients as any[]).length },
            { key: "todos", label: "Todos", count: (allClients as any[]).length },
            { key: "inativos", label: "Inativos", count: null },
            { key: "mensagens", label: "💬 Manter Contato", count: null },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                  activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-muted-foreground/20 text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ABA: HOJE */}
        {activeTab === "hoje" && (
          <div className="space-y-4">
            {loadingToday ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : (todayClients as any[]).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-border">
                <Bell className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Nenhum cliente para contatar hoje!</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Configure lembretes de reativação nos seus clientes para aparecerem aqui.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">{(todayClients as any[]).length} cliente{(todayClients as any[]).length > 1 ? "s" : ""} para contatar hoje</p>
                    <p className="text-xs text-amber-600">Clique em "Enviar todos" para abrir o WhatsApp para cada um</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendAll(todayClients as any[])}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs shrink-0"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Enviar todos
                  </Button>
                </div>
                {(todayClients as any[]).map((client: any) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </>
            )}
          </div>
        )}

        {/* ABA: TODOS */}
        {activeTab === "todos" && (
          <div className="space-y-5">
            {loadingAll ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : (allClients as any[]).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-border">
                <Bell className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Nenhum lembrete configurado</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Configure lembretes de reativação nos seus clientes para aparecerem aqui.
                </p>
              </div>
            ) : (
              <>
                {overdueClients.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> Atrasados ({overdueClients.length})
                    </p>
                    {overdueClients.map((client: any) => <ClientCard key={client.id} client={client} />)}
                  </div>
                )}
                {todayAllClients.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-amber-600 flex items-center gap-1.5">
                      <Bell className="h-4 w-4" /> Para hoje ({todayAllClients.length})
                    </p>
                    {todayAllClients.map((client: any) => <ClientCard key={client.id} client={client} />)}
                  </div>
                )}
                {upcomingClients.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-blue-600 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" /> Próximos ({upcomingClients.length})
                    </p>
                    {upcomingClients.map((client: any) => <ClientCard key={client.id} client={client} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ABA: MENSAGENS DE RELACIONAMENTO */}
        {activeTab === "mensagens" && <RelationshipMessagesTab />}

        {/* ABA: INATIVOS */}
        {activeTab === "inativos" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-border shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">Inativo há mais de</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {periodOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDaysSince(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      daysSince === opt.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 border border-border shadow-sm text-center">
                <p className="text-2xl font-bold text-red-500">{(inactiveClients as any[]).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Clientes inativos</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-border shadow-sm text-center">
                <p className="text-2xl font-bold text-amber-500">
                  {(inactiveClients as any[]).filter((c: any) => (c.daysSinceContact || 0) > 180).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Há mais de 6 meses</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-border shadow-sm text-center">
                <p className="text-2xl font-bold text-blue-500">{Object.keys(messages).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Mensagens geradas</p>
              </div>
            </div>

            {loadingInactive ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground">Buscando clientes inativos...</p>
              </div>
            ) : (inactiveClients as any[]).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-border">
                <Users className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-foreground">Nenhum cliente inativo!</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Todos os clientes tiveram contato nos últimos {daysSince} dias.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    {(inactiveClients as any[]).length} clientes encontrados
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleSendAll(inactiveClients as any[])}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Enviar para todos
                  </Button>
                </div>
                {(inactiveClients as any[]).map((client: any) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
    </FeatureGate>
  );
}
