import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon, CreditCard, Building2, Save, QrCode, Plus, Pencil, Trash2, X, Check, MessageSquare, Target, Calculator, Palette, Copy, MessageCircle, Loader2, CheckCircle2, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        {children}
      </label>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

// Componente de acordeão reutilizável
function Accordion({
  id,
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-base leading-tight">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-border space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();

  const [cardFee1x, setCardFee1x] = useState("0");
  const [cardFee2x, setCardFee2x] = useState("3.5");
  const [cardFee3x, setCardFee3x] = useState("5.0");
  const [validDays, setValidDays] = useState("7");
  const [companyName, setCompanyName] = useState("SOS Limpa Tudo Estofados");
  const [companyPhone, setCompanyPhone] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [pixKey, setPixKey] = useState("");
  const [monthlyGoal, setMonthlyGoal] = useState("0");
  const [primaryColor, setPrimaryColor] = useState("#1e3a5f");
  const [secondaryColor, setSecondaryColor] = useState("#22c55e");
  const [budgetTemplate, setBudgetTemplate] = useState("premium");
  const [companyDescription, setCompanyDescription] = useState("");
  const [googleRating, setGoogleRating] = useState("");
  const [googleReviewCount, setGoogleReviewCount] = useState("");
  const [showSobreNos, setShowSobreNos] = useState(false);
  const [showGoogleReviews, setShowGoogleReviews] = useState(false);
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyCnpj, setCompanyCnpj] = useState("");
  const [companyOwner, setCompanyOwner] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountType, setBankAccountType] = useState("");
  const [deslocamentoAtivo, setDeslocamentoAtivo] = useState(false);
  const [timbradoResponsavel, setTimbradoResponsavel] = useState("");
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  // Modelo WhatsApp
  const [whatsappHeaderText, setWhatsappHeaderText] = useState("Preparamos uma proposta personalizada para a higienização dos seus itens, utilizando produtos específicos para remoção de sujeiras, ácaros, odores e microrganismos.");
  const [whatsappDifferentials, setWhatsappDifferentials] = useState("Atendimento realizado por profissionais identificados\nProdutos específicos para cada tipo de tecido\nProcesso seguro para crianças e pets\nRemoção de sujeiras, odores e ácaros\nServiço realizado em domicílio");
  const [whatsappClosingText, setWhatsappClosingText] = useState("Caso deseje agendar, basta responder esta mensagem e reservaremos um horário para você.");

  // Formas de pagamento configuráveis
  type PaymentMethod = {
    id: string;
    label: string;
    enabled: boolean;
    discountPercent: number;
    maxInstallments?: number;
    addFee?: boolean;
    installmentRates?: number[];
  };
  const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
    { id: "cash", label: "Espécie", enabled: true, discountPercent: 10 },
    { id: "pix", label: "À Vista (Pix / Débito)", enabled: true, discountPercent: 5 },
    { id: "credit_cash", label: "Crédito à Vista", enabled: true, discountPercent: 0 },
    { id: "installments", label: "Cartão Parcelado", enabled: true, discountPercent: 0, maxInstallments: 8, addFee: false, installmentRates: [0,0,0,0,0,0,0,0,0,0,0,0] },
  ];
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(DEFAULT_PAYMENT_METHODS);

  useEffect(() => {
    if (settings && !settingsInitialized) {
      setCardFee1x(settings.card_fee_1x);
      setCardFee2x(settings.card_fee_2x);
      setCardFee3x(settings.card_fee_3x);
      setValidDays(settings.valid_days);
      setCompanyName(settings.company_name);
      setCompanyPhone(settings.company_phone);
      if (settings.pix_key_type) setPixKeyType(settings.pix_key_type);
      if (settings.pix_key) setPixKey(settings.pix_key);
      if ((settings as any).monthly_goal) setMonthlyGoal((settings as any).monthly_goal);
      if ((settings as any).primary_color) setPrimaryColor((settings as any).primary_color);
      if ((settings as any).secondary_color) setSecondaryColor((settings as any).secondary_color);
      if ((settings as any).budget_template) setBudgetTemplate((settings as any).budget_template);
      if ((settings as any).company_description) setCompanyDescription((settings as any).company_description);
      if ((settings as any).google_rating) setGoogleRating((settings as any).google_rating);
      if ((settings as any).google_review_count) setGoogleReviewCount((settings as any).google_review_count);
      setShowSobreNos((settings as any).show_sobre_nos === "true");
      setShowGoogleReviews((settings as any).show_google_reviews === "true");
      if ((settings as any).company_email) setCompanyEmail((settings as any).company_email);
      if ((settings as any).company_cnpj) setCompanyCnpj((settings as any).company_cnpj);
      if ((settings as any).company_owner) setCompanyOwner((settings as any).company_owner);
      if ((settings as any).company_address) setCompanyAddress((settings as any).company_address);
      if ((settings as any).company_city) setCompanyCity((settings as any).company_city);
      if ((settings as any).bank_name) setBankName((settings as any).bank_name);
      if ((settings as any).bank_agency) setBankAgency((settings as any).bank_agency);
      if ((settings as any).bank_account) setBankAccount((settings as any).bank_account);
      if ((settings as any).bank_account_type) setBankAccountType((settings as any).bank_account_type);
      setDeslocamentoAtivo((settings as any).deslocamento_ativo === "true");
      if ((settings as any).timbrado_responsavel) setTimbradoResponsavel((settings as any).timbrado_responsavel);
      if ((settings as any).payment_methods_config) {
        try {
          const parsed = JSON.parse((settings as any).payment_methods_config);
          if (Array.isArray(parsed)) setPaymentMethods(parsed);
        } catch {}
      }
      if ((settings as any).whatsapp_header_text) setWhatsappHeaderText((settings as any).whatsapp_header_text);
      if ((settings as any).whatsapp_differentials) setWhatsappDifferentials((settings as any).whatsapp_differentials);
      if ((settings as any).whatsapp_closing_text) setWhatsappClosingText((settings as any).whatsapp_closing_text);
      setSettingsInitialized(true);
    }
  }, [settings, settingsInitialized]);

  // Calculadora de meta
  const goalCalc = useMemo(() => {
    const goal = parseFloat(monthlyGoal.replace(/\D/g, '')) || 0;
    if (!goal) return null;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workDays = 0;
    const weekNumbers = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow !== 0) {
        workDays++;
        weekNumbers.add(Math.ceil(d / 7));
      }
    }
    const workWeeks = weekNumbers.size;
    return { goal, perDay: workDays > 0 ? goal / workDays : 0, perWeek: workWeeks > 0 ? goal / workWeeks : 0, workDays, workWeeks };
  }, [monthlyGoal]);

  const saveMutation = trpc.settings.save.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Configurações salvas com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  // Mensagens Pré-programadas
  const { data: presetMessages = [], refetch: refetchMessages } = trpc.presetMessages.list.useQuery();
  const [showMsgForm, setShowMsgForm] = useState(false);
  const [editingMsg, setEditingMsg] = useState<{ id: number; title: string; message: string } | null>(null);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgText, setMsgText] = useState("");
  const createMsgMutation = trpc.presetMessages.create.useMutation({
    onSuccess: () => { refetchMessages(); setShowMsgForm(false); setMsgTitle(""); setMsgText(""); toast.success("Mensagem criada!"); },
    onError: () => toast.error("Erro ao criar mensagem"),
  });
  const updateMsgMutation = trpc.presetMessages.update.useMutation({
    onSuccess: () => { refetchMessages(); setEditingMsg(null); toast.success("Mensagem atualizada!"); },
    onError: () => toast.error("Erro ao atualizar mensagem"),
  });
  const deleteMsgMutation = trpc.presetMessages.delete.useMutation({
    onSuccess: () => { refetchMessages(); toast.success("Mensagem excluída!"); },
    onError: () => toast.error("Erro ao excluir mensagem"),
  });

  // Auto-save da validade com debounce
  const validDaysTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [validDaysSaveState, setValidDaysSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle');
  const validDaysSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleValidDaysChange = (newVal: string) => {
    setValidDays(newVal);
    setValidDaysSaveState('pending');
    if (validDaysTimerRef.current) clearTimeout(validDaysTimerRef.current);
    if (validDaysSavedTimerRef.current) clearTimeout(validDaysSavedTimerRef.current);
    validDaysTimerRef.current = setTimeout(() => {
      setValidDaysSaveState('saving');
      saveMutation.mutate({ card_fee_1x: cardFee1x, card_fee_2x: cardFee2x, card_fee_3x: cardFee3x, valid_days: newVal }, {
        onSuccess: () => {
          setValidDaysSaveState('saved');
          validDaysSavedTimerRef.current = setTimeout(() => setValidDaysSaveState('idle'), 2000);
        },
        onError: () => setValidDaysSaveState('idle'),
      });
    }, 1500);
  };

  const handleSave = () => {
    saveMutation.mutate({
      card_fee_1x: cardFee1x,
      card_fee_2x: cardFee2x,
      card_fee_3x: cardFee3x,
      valid_days: validDays,
      company_name: companyName,
      company_phone: companyPhone,
      pix_key_type: pixKeyType,
      pix_key: pixKey,
      monthly_goal: monthlyGoal,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      budget_template: budgetTemplate,
      company_description: companyDescription,
      google_rating: googleRating,
      google_review_count: googleReviewCount,
      show_sobre_nos: String(showSobreNos),
      show_google_reviews: String(showGoogleReviews),
      company_email: companyEmail,
      company_cnpj: companyCnpj,
      company_owner: companyOwner,
      company_address: companyAddress,
      company_city: companyCity,
      bank_name: bankName,
      bank_agency: bankAgency,
      bank_account: bankAccount,
      bank_account_type: bankAccountType,
      deslocamento_ativo: String(deslocamentoAtivo),
      payment_methods_config: JSON.stringify(paymentMethods),
      timbrado_responsavel: timbradoResponsavel,
      info_page_text: "enabled",
    });
  };

  const generatePixWhatsAppMessage = () => {
    if (!pixKey) return '';
    const typeLabel: Record<string, string> = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave Aleatória' };
    return `Olá! 😊 Espero que tenha ficado satisfeito com nosso serviço! 🌟\n\nSegue a chave PIX para pagamento:\n\n🔑 *Tipo:* ${typeLabel[pixKeyType] || pixKeyType}\n💳 *Chave:* ${pixKey}\n\nQualquer dúvida, estou à disposição! Obrigado pela confiança! 🙏`;
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-3 pb-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.32 0.14 240)" }}>
            <SettingsIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground text-sm">Toque em cada seção para expandir</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white rounded-2xl animate-pulse border border-border" />)}
          </div>
        ) : (
          <>
            {/* ── 1. DADOS DA EMPRESA ─────────────────────────────────────────── */}
            <Accordion
              id="sec-empresa"
              defaultOpen={true}
              icon={<Building2 className="h-5 w-5" style={{ color: "oklch(0.32 0.14 240)" }} />}
              title="Dados da Empresa"
              subtitle="Nome, telefone, e-mail, CNPJ e endereço"
            >
              <div>
                <FieldLabel>Nome da Empresa</FieldLabel>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="SOS Limpa Tudo Estofados" className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel hint="Aparece no orçamento">Telefone / WhatsApp</FieldLabel>
                  <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="(11) 99999-9999" className="h-11" />
                </div>
                <div>
                  <div className="mb-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      E-mail <span className="text-red-500 font-bold">*</span>
                    </label>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-start gap-1">
                      <span>📧</span>
                      <span>Notificações de agendamento</span>
                    </p>
                  </div>
                  <Input
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="contato@empresa.com"
                    className={`h-11 ${!companyEmail ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    type="email"
                  />
                  {!companyEmail && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Campo obrigatório</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel hint="CPF ou CNPJ da empresa">CNPJ / CPF</FieldLabel>
                  <Input value={companyCnpj} onChange={(e) => setCompanyCnpj(e.target.value)} placeholder="00.000.000/0001-00" className="h-11" />
                </div>
                <div>
                  <FieldLabel hint="Nome do responsável">Responsável / Proprietário</FieldLabel>
                  <Input value={companyOwner} onChange={(e) => setCompanyOwner(e.target.value)} placeholder="Nome do responsável" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel hint="Rua, número, bairro">Endereço</FieldLabel>
                  <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Rua das Flores, 123" className="h-11" />
                </div>
                <div>
                  <FieldLabel hint="Cidade e estado">Cidade / UF</FieldLabel>
                  <Input value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} placeholder="Bauru-SP" className="h-11" />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2 text-white" style={{ background: "oklch(0.32 0.14 240)" }}>
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </Accordion>

            {/* ── 2. ORÇAMENTO ────────────────────────────────────────────────── */}
            <Accordion
              id="sec-orcamento"
              icon={<FileText className="h-5 w-5" style={{ color: "oklch(0.50 0.22 152)" }} />}
              title="Orçamento"
              subtitle="Validade, cores, template, deslocamento e dados bancários"
            >
              {/* Validade */}
              <div>
                <FieldLabel hint="Padrão de validade dos orçamentos">Validade Padrão dos Orçamentos (dias)</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input type="number" min="1" max="365" value={validDays} onChange={(e) => handleValidDaysChange(e.target.value)} className="h-11 w-32" />
                  {validDaysSaveState === 'pending' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Aguardando...</span>}
                  {validDaysSaveState === 'saving' && <span className="flex items-center gap-1 text-xs text-blue-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando...</span>}
                  {validDaysSaveState === 'saved' && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />Salvo!</span>}
                </div>
              </div>

              {/* Cores */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <FieldLabel hint="Personaliza as cores do orçamento">Cores da Empresa</FieldLabel>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Cor Principal</p>
                    <div className="flex items-center gap-3">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                      <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#1e3a5f" className="h-9 font-mono text-sm" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Cor Secundária</p>
                    <div className="flex items-center gap-3">
                      <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                      <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="#22c55e" className="h-9 font-mono text-sm" />
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-xl overflow-hidden border border-border">
                  <div className="h-8" style={{ background: primaryColor }} />
                  <div className="h-4" style={{ background: secondaryColor }} />
                  <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/10">Prévia das cores no orçamento</div>
                </div>
              </div>

              {/* Template */}
              <div>
                <FieldLabel hint="Modelo visual padrão ao abrir um orçamento">Template Padrão do Orçamento</FieldLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {[
                    {
                      key: "premium", label: "Card Premium", desc: "Fundo escuro com gradiente",
                      preview: (
                        <div className="w-full h-full rounded-md overflow-hidden" style={{ background: `linear-gradient(160deg, ${primaryColor}cc 0%, ${primaryColor}99 60%, ${secondaryColor || primaryColor}88 100%)` }}>
                          <div className="h-1.5" style={{ background: secondaryColor || "#86efac" }} />
                          <div className="p-2 space-y-1.5">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1"><div className="h-2.5 w-14 rounded bg-white/80" /><div className="h-1 w-10 rounded bg-white/40" /></div>
                              <div className="w-6 h-6 rounded bg-white/20" />
                            </div>
                            <div className="space-y-0.5"><div className="h-1 w-full rounded bg-white/20" /><div className="h-1 w-full rounded bg-white/10" /></div>
                            <div className="grid grid-cols-2 gap-1 mt-1"><div className="h-4 rounded bg-white/10" /><div className="h-4 rounded" style={{ background: `${secondaryColor || "#86efac"}40` }} /></div>
                          </div>
                          <div className="h-1.5" style={{ background: secondaryColor || "#86efac" }} />
                        </div>
                      ),
                    },
                    {
                      key: "whatsapp", label: "Texto WhatsApp", desc: "Mensagem copiarável",
                      preview: (
                        <div className="w-full h-full rounded-md overflow-hidden" style={{ background: "#e5ddd5" }}>
                          <div className="p-2 space-y-1.5">
                            <div className="bg-white rounded-lg p-1.5 space-y-1 shadow-sm">
                              <div className="h-1.5 w-14 rounded bg-gray-500" /><div className="h-1 w-12 rounded bg-gray-300" /><div className="h-1 w-10 rounded bg-gray-300" />
                            </div>
                            <div className="flex gap-1.5 mt-1"><div className="flex-1 h-4 rounded-lg" style={{ background: "#25D366" }} /><div className="flex-1 h-4 rounded-lg" style={{ background: "#128C7E" }} /></div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "profissional", label: "Timbrado", desc: "Documento formal para órgãos públicos",
                      preview: (
                        <div className="w-full h-full rounded-md overflow-hidden bg-white border border-gray-200">
                          <div className="p-1.5 space-y-1">
                            <div className="border-b border-gray-200 pb-1"><div className="h-2 w-12 rounded bg-gray-700" /><div className="h-1 w-8 rounded bg-gray-300 mt-0.5" /></div>
                            <div className="bg-gray-100 rounded px-1 py-0.5"><div className="h-1.5 w-10 rounded bg-gray-500" /></div>
                            <div className="space-y-0.5"><div className="flex justify-between"><div className="h-1 w-10 rounded bg-gray-200" /><div className="h-1 w-6 rounded bg-gray-200" /></div><div className="flex justify-between"><div className="h-1 w-8 rounded bg-gray-100" /><div className="h-1 w-5 rounded bg-gray-100" /></div></div>
                            <div className="flex justify-end border-t border-gray-200 pt-0.5"><div className="h-1.5 w-8 rounded bg-gray-400" /></div>
                            <div className="border-t border-gray-100 pt-0.5"><div className="h-1 w-6 rounded bg-gray-300" /><div className="h-1 w-10 rounded bg-gray-200 mt-0.5" /></div>
                          </div>
                        </div>
                      ),
                    },
                  ].map(t => (
                    <button key={t.key} type="button" onClick={() => setBudgetTemplate(t.key)}
                      className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all ${budgetTemplate === t.key ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
                      <div className="w-full aspect-[4/3] rounded-md overflow-hidden">{t.preview}</div>
                      <div className="text-left w-full px-1">
                        <p className={`text-xs font-bold ${budgetTemplate === t.key ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Sobre Nós */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Seção "Sobre Nós" no Orçamento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Exibe o nome e descrição da empresa no orçamento enviado ao cliente</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSobreNos(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      showSobreNos ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      showSobreNos ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
                {showSobreNos && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <FieldLabel hint="Texto exibido na seção 'Sobre Nós' do orçamento">Descrição da Empresa</FieldLabel>
                    <textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)}
                      placeholder="Ex: Especializada em higienização de estofados..." rows={3}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                  </div>
                )}
              </div>

              {/* Toggle Avaliações Google */}
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Avaliações Google no Orçamento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Exibe sua nota e número de avaliações do Google no orçamento</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGoogleReviews(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      showGoogleReviews ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      showGoogleReviews ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
                {showGoogleReviews && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <FieldLabel hint="Exibida na seção 'Sobre Nós' do orçamento">Avaliação Google</FieldLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Nota (ex: 5.0)</p>
                        <Input value={googleRating} onChange={(e) => setGoogleRating(e.target.value)} placeholder="5.0" className="h-11" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Nº de avaliações (ex: 293)</p>
                        <Input value={googleReviewCount} onChange={(e) => setGoogleReviewCount(e.target.value)} placeholder="293" className="h-11" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dados Timbrado - só aparece quando template profissional/timbrado está selecionado */}
              {budgetTemplate === "profissional" && (
                <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Dados do Timbrado</p>
                      <p className="text-xs text-muted-foreground">Informações exibidas no cabeçalho do orçamento formal</p>
                    </div>
                  </div>
                  <div>
                    <FieldLabel hint="Nome do responsável ou representante legal que assina o documento">Responsável / Representante Legal</FieldLabel>
                    <Input
                      value={timbradoResponsavel}
                      onChange={(e) => setTimbradoResponsavel(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Os demais dados (nome, CNPJ, endereço) são puxados automaticamente dos Dados da Empresa acima.</p>
                  </div>
                </div>
              )}

              {/* Dados Bancários */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">Dados Bancários (opcional)</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Aparecem no template Timbrado do orçamento.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><FieldLabel>Banco</FieldLabel><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ex: Nubank" className="h-11" /></div>
                  <div><FieldLabel>Agência</FieldLabel><Input value={bankAgency} onChange={(e) => setBankAgency(e.target.value)} placeholder="0001" className="h-11" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div><FieldLabel>Conta</FieldLabel><Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="27232850-1" className="h-11" /></div>
                  <div><FieldLabel>Tipo de Conta</FieldLabel><Input value={bankAccountType} onChange={(e) => setBankAccountType(e.target.value)} placeholder="Conta corrente / digital" className="h-11" /></div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2 text-white" style={{ background: "oklch(0.50 0.22 152)" }}>
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </Accordion>

            {/* ── 3. META MENSAL ──────────────────────────────────────────────── */}
            <Accordion
              id="sec-meta"
              icon={<Target className="h-5 w-5" style={{ color: "oklch(0.55 0.22 30)" }} />}
              title="Meta Mensal de Faturamento"
              subtitle="Defina sua meta e veja quanto precisa faturar por dia"
            >
              <p className="text-sm text-muted-foreground">
                Defina sua meta de faturamento mensal. O sistema calculará quanto você precisa faturar por dia e por semana.
              </p>
              <div>
                <FieldLabel hint="Valor total que deseja faturar no mês">Meta do Mês (R$)</FieldLabel>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={monthlyGoal ? Number(monthlyGoal.replace(/\D/g, '')).toLocaleString('pt-BR') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setMonthlyGoal(raw || '0');
                    }}
                    className="h-11 text-base font-semibold pl-9"
                    placeholder="Ex: 5.000"
                  />
                </div>
              </div>
              {goalCalc && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-bold text-orange-700">Calculadora de Meta</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-orange-100 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Por dia útil</p>
                      <p className="text-lg font-bold text-orange-600">{fmt(goalCalc.perDay)}</p>
                      <p className="text-xs text-muted-foreground">{goalCalc.workDays} dias úteis</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-orange-100 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Por semana</p>
                      <p className="text-lg font-bold text-orange-600">{fmt(goalCalc.perWeek)}</p>
                      <p className="text-xs text-muted-foreground">{goalCalc.workWeeks} semanas</p>
                    </div>
                  </div>
                  <p className="text-xs text-orange-600/70 text-center">🚀 Para bater {fmt(goalCalc.goal)}/mês, fature {fmt(goalCalc.perDay)}/dia!</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={() => saveMutation.mutate({ card_fee_1x: cardFee1x, card_fee_2x: cardFee2x, card_fee_3x: cardFee3x, monthly_goal: monthlyGoal })}
                  disabled={saveMutation.isPending || !monthlyGoal || monthlyGoal === '0'}
                  className="gap-2 text-white"
                  style={{ background: 'linear-gradient(135deg, oklch(0.55 0.22 30), oklch(0.65 0.20 60))' }}
                >
                  <span className="text-base">🚀</span>
                  {saveMutation.isPending ? 'Salvando...' : 'Confirmar Meta'}
                </Button>
              </div>
            </Accordion>

            {/* ── 4. FORMAS DE PAGAMENTO ──────────────────────────────────────── */}
            <Accordion
              id="sec-pagamentos"
              icon={<span className="text-xl">💵</span>}
              title="Formas de Pagamento no Orçamento"
              subtitle="Configure descontos e parcelas para cada forma de pagamento"
            >
              <p className="text-sm text-muted-foreground">
                Configure quais opções de pagamento aparecem no orçamento e os descontos de cada uma.
              </p>
              <div className="space-y-3">
                {paymentMethods.map((method, idx) => (
                  <div key={method.id} className={`rounded-xl border-2 p-4 transition-all ${method.enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-60"}`}>
                    <div className="flex items-center gap-3">
                      <button type="button"
                        onClick={() => { const updated = [...paymentMethods]; updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled }; setPaymentMethods(updated); }}
                        className={`relative inline-flex shrink-0 h-6 w-10 items-center rounded-full transition-colors focus:outline-none ${method.enabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${method.enabled ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground">{method.label}</p></div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">Desconto:</span>
                        <div className="relative w-20">
                          <input type="number" min="0" max="50" step="0.5" value={method.discountPercent} disabled={!method.enabled}
                            onChange={(e) => { const updated = [...paymentMethods]; updated[idx] = { ...updated[idx], discountPercent: parseFloat(e.target.value) || 0 }; setPaymentMethods(updated); }}
                            className="w-full h-8 rounded-lg border border-input bg-background px-2 pr-6 text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                    {method.id === "installments" && method.enabled && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">Número máximo de parcelas:</span>
                          <select value={method.maxInstallments ?? 8}
                            onChange={(e) => { const updated = [...paymentMethods]; updated[idx] = { ...updated[idx], maxInstallments: parseInt(e.target.value) }; setPaymentMethods(updated); }}
                            className="h-8 rounded-lg border border-input bg-background px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring">
                            {[2,3,4,5,6,7,8,9,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Juros por parcela (0% = sem juros):</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {Array.from({ length: method.maxInstallments ?? 8 }, (_, i) => i + 1).map(n => {
                              const rates = method.installmentRates ?? Array(12).fill(0);
                              return (
                                <div key={n} className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2 py-1.5">
                                  <span className="text-xs text-muted-foreground shrink-0 w-6">{n}x</span>
                                  <input type="number" min="0" max="30" step="0.1" value={rates[n - 1] ?? 0}
                                    onChange={(e) => { const updated = [...paymentMethods]; const newRates = [...(updated[idx].installmentRates ?? Array(12).fill(0))]; newRates[n - 1] = parseFloat(e.target.value) || 0; updated[idx] = { ...updated[idx], installmentRates: newRates }; setPaymentMethods(updated); }}
                                    className="w-full text-xs font-semibold text-right bg-transparent focus:outline-none" />
                                  <span className="text-xs text-muted-foreground shrink-0">%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <input type="checkbox" checked={method.addFee ?? false}
                            onChange={(e) => { const updated = [...paymentMethods]; updated[idx] = { ...updated[idx], addFee: e.target.checked }; setPaymentMethods(updated); }}
                            className="rounded" />
                          Acrescentar os juros ao valor total (cliente paga a mais)
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {paymentMethods.some(m => m.enabled) && (
                <div className="mt-2 rounded-xl p-4 border border-dashed border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Prévia — Exemplo com R$ 1.000,00</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {paymentMethods.filter(m => m.enabled).map(m => {
                      const total = 1000;
                      const discounted = total * (1 - m.discountPercent / 100);
                      const installments = m.id === "installments" ? (m.maxInstallments ?? 8) : 1;
                      const perInstallment = discounted / installments;
                      return (
                        <div key={m.id} className="bg-white rounded-lg p-3 border border-border text-center">
                          <p className="text-[10px] text-muted-foreground mb-1 leading-tight">{m.label}</p>
                          {m.id === "installments" ? (
                            <><p className="font-bold text-xs" style={{ color: "oklch(0.32 0.14 240)" }}>{installments}x de {fmt(perInstallment)}</p>{m.discountPercent > 0 && <p className="text-[10px] text-green-600 mt-0.5">-{m.discountPercent}%</p>}</>
                          ) : (
                            <><p className="font-bold text-sm" style={{ color: m.discountPercent > 0 ? "oklch(0.35 0.15 155)" : "oklch(0.32 0.14 240)" }}>{fmt(discounted)}</p>{m.discountPercent > 0 && <p className="text-[10px] text-green-600 mt-0.5">-{m.discountPercent}% de desconto</p>}</>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-1">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2 text-white" style={{ background: "oklch(0.32 0.14 240)" }}>
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </Accordion>

            {/* ── 5. CHAVE PIX ────────────────────────────────────────────────── */}
            <Accordion
              id="sec-pix"
              icon={<QrCode className="h-5 w-5" style={{ color: "oklch(0.35 0.15 155)" }} />}
              title="Chave PIX"
              subtitle="Configure sua chave PIX para recebimento"
            >
              <div>
                <FieldLabel>Tipo de Chave PIX</FieldLabel>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
                  {[
                    { value: "cpf", label: "CPF" },
                    { value: "cnpj", label: "CNPJ" },
                    { value: "email", label: "E-mail" },
                    { value: "telefone", label: "Telefone" },
                    { value: "aleatoria", label: "Aleatória" },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setPixKeyType(opt.value)}
                      className={`py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-all ${pixKeyType === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/40 text-foreground"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel>Chave PIX</FieldLabel>
                <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)}
                  placeholder={pixKeyType === "cpf" ? "000.000.000-00" : pixKeyType === "cnpj" ? "00.000.000/0001-00" : pixKeyType === "email" ? "seu@email.com" : pixKeyType === "telefone" ? "+55 (11) 99999-9999" : "Chave aleatória"}
                  className="h-11 font-mono" />
              </div>
              {pixKey && (
                <div className="mt-2 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" style={{ color: "#25D366" }} />
                    <p className="text-sm font-semibold text-foreground">Enviar chave PIX pelo WhatsApp</p>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{generatePixWhatsAppMessage()}</pre>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { navigator.clipboard.writeText(generatePixWhatsAppMessage()); toast.success("Mensagem copiada!"); }}>
                      <Copy className="h-3.5 w-3.5" /> Copiar Mensagem
                    </Button>
                    <Button size="sm" className="gap-1.5 text-xs text-white" style={{ background: "#25D366" }}
                      onClick={() => { const msg = encodeURIComponent(generatePixWhatsAppMessage()); window.open(`https://wa.me/?text=${msg}`, '_blank'); }}>
                      <MessageCircle className="h-3.5 w-3.5" /> Abrir no WhatsApp
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-1">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2 text-white" style={{ background: "oklch(0.35 0.15 155)" }}>
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </Accordion>

            {/* ── 6. MODELO WHATSAPP ─────────────────────────────────────────── */}
            <Accordion
              id="sec-whatsapp-modelo"
              icon={<MessageCircle className="h-5 w-5" style={{ color: "#25D366" }} />}
              title="Modelo de Orçamento WhatsApp"
              subtitle="Personalize o texto do Modelo Profissional enviado ao cliente"
            >
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 mb-2">
                <p className="text-xs text-green-700 font-medium">
                  Esses textos aparecem na mensagem de orçamento gerada pelo{" "}
                  <strong>Modelo Profissional</strong>. Personalize para combinar com a linguagem da sua empresa.
                </p>
              </div>

              <div>
                <FieldLabel hint="Apresentação logo após o cumprimento ao cliente">Texto de Apresentação</FieldLabel>
                <textarea
                  value={whatsappHeaderText}
                  onChange={(e) => setWhatsappHeaderText(e.target.value)}
                  rows={3}
                  placeholder="Preparamos uma proposta personalizada..."
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div>
                <FieldLabel hint="Um diferencial por linha — aparecem com estrela na mensagem">Diferenciais / Garantias</FieldLabel>
                <textarea
                  value={whatsappDifferentials}
                  onChange={(e) => setWhatsappDifferentials(e.target.value)}
                  rows={6}
                  placeholder="Atendimento realizado por profissionais identificados"
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">Digite um diferencial por linha. Cada linha vira um item com ✨ na mensagem.</p>
              </div>

              <div>
                <FieldLabel hint="Chamada para ação no final da mensagem">Texto de Fechamento</FieldLabel>
                <textarea
                  value={whatsappClosingText}
                  onChange={(e) => setWhatsappClosingText(e.target.value)}
                  rows={2}
                  placeholder="Caso deseje agendar, basta responder esta mensagem..."
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={() => saveMutation.mutate({
                    whatsapp_header_text: whatsappHeaderText,
                    whatsapp_differentials: whatsappDifferentials,
                    whatsapp_closing_text: whatsappClosingText,
                  })}
                  disabled={saveMutation.isPending}
                  className="gap-2 text-white"
                  style={{ background: "#25D366" }}
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar Modelo"}
                </Button>
              </div>
            </Accordion>

            {/* ── 6. MENSAGENS PRÉ-PROGRAMADAS ────────────────────────────────── */}
            <Accordion
              id="sec-mensagens"
              icon={<MessageSquare className="h-5 w-5" style={{ color: "oklch(0.50 0.22 152)" }} />}
              title="Mensagens Pré-programadas"
              subtitle="Mensagens prontas para enviar ao cliente pelo WhatsApp"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Crie mensagens prontas para o técnico enviar ao cliente com um clique.
                </p>
                <Button size="sm" onClick={() => setShowMsgForm(true)} className="gap-1.5 text-white text-xs shrink-0 ml-3" style={{ background: "oklch(0.50 0.22 152)" }}>
                  <Plus className="h-3.5 w-3.5" /> Nova
                </Button>
              </div>
              {showMsgForm && (
                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Nova Mensagem</p>
                  <Input placeholder="Título (ex: A caminho)" value={msgTitle} onChange={e => setMsgTitle(e.target.value)} className="h-9" />
                  <textarea placeholder="Texto da mensagem (use {nome} para o nome do cliente e {endereco} para o endereço)..." value={msgText} onChange={e => setMsgText(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { if (!msgTitle.trim() || !msgText.trim()) { toast.error('Preencha título e mensagem'); return; } createMsgMutation.mutate({ title: msgTitle.trim(), message: msgText.trim() }); }} disabled={createMsgMutation.isPending} className="gap-1 text-white text-xs" style={{ background: "oklch(0.50 0.22 152)" }}>
                      <Check className="h-3 w-3" /> {createMsgMutation.isPending ? 'Salvando...' : 'Criar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowMsgForm(false); setMsgTitle(''); setMsgText(''); }} className="text-xs"><X className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
              {presetMessages.length === 0 && !showMsgForm ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">Nenhuma mensagem cadastrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {presetMessages.map((msg: any) => (
                    <div key={msg.id}>
                      {editingMsg?.id === msg.id ? (
                        <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
                          <Input value={editingMsg!.title} onChange={e => setEditingMsg(prev => prev ? { ...prev, title: e.target.value } : prev)} className="h-8 text-sm" />
                          <textarea value={editingMsg!.message} onChange={e => setEditingMsg(prev => prev ? { ...prev, message: e.target.value } : prev)} rows={3}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => editingMsg && updateMsgMutation.mutate({ id: editingMsg.id, title: editingMsg.title, message: editingMsg.message })} disabled={updateMsgMutation.isPending} className="gap-1 text-white text-xs" style={{ background: "oklch(0.50 0.22 152)" }}>
                              <Check className="h-3 w-3" /> Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingMsg(null)} className="text-xs"><X className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/20 transition-colors">
                          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{msg.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{msg.message}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" onClick={() => setEditingMsg({ id: msg.id, title: msg.title, message: msg.message })} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Excluir a mensagem "${msg.title}"?`)) deleteMsgMutation.mutate({ id: msg.id }); }} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Accordion>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
