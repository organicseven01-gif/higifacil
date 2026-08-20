import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Droplets, Sparkles, CheckCircle2, ArrowRight, ArrowLeft, Users,
  Building2, Phone, Mail, FileText, MapPin, X, Eye, Palette, Star,
  FileCheck, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

type Step = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'done';

const HOW_FOUND_OPTIONS = [
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'google', label: '🔍 Google' },
  { value: 'indicacao', label: '🤝 Indicação de amigo' },
  { value: 'youtube', label: '▶️ YouTube' },
  { value: 'outro', label: '💬 Outro' },
];

const CHALLENGE_OPTIONS = [
  { value: 'fechar_orcamentos', label: '📋 Fechar mais orçamentos' },
  { value: 'organizar_agenda', label: '📅 Organizar minha agenda' },
  { value: 'controlar_financeiro', label: '💰 Controlar o financeiro' },
  { value: 'imagem_profissional', label: '✨ Ter uma imagem mais profissional' },
  { value: 'fidelizar_clientes', label: '❤️ Fidelizar clientes' },
];

const WORKFLOW_OPTIONS = [
  { value: 'papel', label: '📝 No papel / caderno' },
  { value: 'whatsapp', label: '📱 WhatsApp e anotações no celular' },
  { value: 'planilha', label: '📊 Planilha Excel' },
  { value: 'outro_sistema', label: '💻 Outro sistema' },
  { value: 'nao_organizo', label: '🤷 Não organizo ainda' },
];

// Paletas de cores pré-definidas
const COLOR_PALETTES = [
  { name: 'Azul Profissional', primary: '#1A9FE3', secondary: '#0A1628' },
  { name: 'Verde Natureza', primary: '#22c55e', secondary: '#14532d' },
  { name: 'Laranja Energia', primary: '#f97316', secondary: '#431407' },
  { name: 'Roxo Premium', primary: '#8b5cf6', secondary: '#2e1065' },
  { name: 'Cinza Moderno', primary: '#6b7280', secondary: '#111827' },
];

// Máscara de telefone: (XX) XXXXX-XXXX
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// Máscara de CNPJ: XX.XXX.XXX/XXXX-XX
function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

// Preview fictício do orçamento Premium
function PremiumPreview({ companyName, primaryColor }: { companyName: string; primaryColor: string }) {
  const name = companyName || 'Sua Empresa';
  const color = primaryColor || '#1A9FE3';
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 text-xs">
      {/* Header */}
      <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${color}dd, ${color})` }}>
        <div className="font-bold text-sm">{name}</div>
        <div className="opacity-80 text-[10px] mt-0.5">Orçamento #001 • João Silva</div>
      </div>
      {/* Itens */}
      <div className="p-3 space-y-1.5">
        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
          <span className="text-gray-700">Higienização Sofá 3 Lugares</span>
          <span className="font-semibold" style={{ color }}>R$ 200,00</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
          <span className="text-gray-700">Higienização Colchão Casal</span>
          <span className="font-semibold" style={{ color }}>R$ 160,00</span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-gray-700">Impermeabilização Sofá</span>
          <span className="font-semibold" style={{ color }}>R$ 160,00</span>
        </div>
      </div>
      {/* Total */}
      <div className="mx-3 mb-3 p-3 rounded-xl" style={{ background: `${color}15` }}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-800">Total</span>
          <span className="font-bold text-base" style={{ color }}>R$ 520,00</span>
        </div>
        <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500">
          <span>💵 À vista: R$ 494,00 (5% off)</span>
          <span>💳 3x de R$ 173,33</span>
        </div>
      </div>
      <div className="px-3 pb-3 text-[10px] text-gray-400 text-center">Proposta válida por 7 dias</div>
    </div>
  );
}

// Preview fictício do orçamento WhatsApp
function WhatsAppPreview({ companyName }: { companyName: string }) {
  const name = companyName || 'Sua Empresa';
  return (
    <div className="bg-[#e5ddd5] rounded-2xl p-3 text-xs font-mono">
      <div className="bg-white rounded-xl p-3 shadow-sm space-y-1 text-gray-800 leading-relaxed text-[11px]">
        <p>🌿 *PROPOSTA DE HIGIENIZAÇÃO*</p>
        <p>*{name}*</p>
        <p></p>
        <p>Olá, João! 😊</p>
        <p>Preparamos uma proposta personalizada para a higienização dos seus itens.</p>
        <p>━━━━━━━━━━━━━━</p>
        <p>✅ Higienização Sofá 3 Lugares — *R$ 200,00*</p>
        <p>✅ Higienização Colchão Casal — *R$ 160,00*</p>
        <p>━━━━━━━━━━━━━━</p>
        <p>💰 *Investimento Total: R$ 360,00*</p>
        <p>💵 À vista via Pix</p>
        <p>━━━━━━━━━━━━━━</p>
        <p>⏰ Proposta válida por 7 dias.</p>
        <p>📱 {name}</p>
      </div>
    </div>
  );
}

// Preview fictício do orçamento Timbrado
function TimbradoPreview({ companyName }: { companyName: string }) {
  const name = companyName || 'Sua Empresa';
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200 text-xs">
      <div className="bg-gray-800 p-3 text-white flex items-center justify-between">
        <div>
          <div className="font-bold text-sm">{name}</div>
          <div className="text-[10px] opacity-70">CNPJ: 00.000.000/0001-00</div>
        </div>
        <div className="text-[10px] opacity-70 text-right">
          <div>Orçamento #001</div>
          <div>13/06/2026</div>
        </div>
      </div>
      <div className="p-3">
        <div className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Cliente: João Silva</div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-1.5 text-gray-600">Serviço</th>
              <th className="text-right p-1.5 text-gray-600">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="p-1.5 text-gray-700">Higienização Sofá 3 Lugares</td>
              <td className="p-1.5 text-right font-semibold">R$ 200,00</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="p-1.5 text-gray-700">Higienização Colchão Casal</td>
              <td className="p-1.5 text-right font-semibold">R$ 160,00</td>
            </tr>
          </tbody>
        </table>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
          <span className="font-bold text-gray-800">Total</span>
          <span className="font-bold text-gray-800">R$ 360,00</span>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingModal() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const { data: onboardingStatus, isLoading } = trpc.onboarding.status.useQuery();
  const { data: authMe } = trpc.auth.me.useQuery();
  const loginEmail = (authMe as any)?.email ?? '';

  // Etapa 1 — dados da empresa
  const [ownerName, setOwnerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [sameEmail, setSameEmail] = useState<boolean | null>(null);
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyState, setCompanyState] = useState('');

  // Etapa 2 — tipo de serviço
  const [serviceType, setServiceType] = useState<'higienizacao' | 'ambos' | null>(null);

  // Etapa 3 — modelo de orçamento
  const [budgetTemplate, setBudgetTemplate] = useState<'premium' | 'whatsapp' | 'timbrado' | null>(null);
  const [previewModal, setPreviewModal] = useState<'premium' | 'whatsapp' | 'timbrado' | null>(null);
  const [companyDescription, setCompanyDescription] = useState('');
  const [selectedPalette, setSelectedPalette] = useState<number | null>(null);
  const [customColor, setCustomColor] = useState('');

  // Etapa 4 — formas de pagamento
  const [payEspecie, setPayEspecie] = useState(true);
  const [payCredito, setPayCredito] = useState(true);
  const [payCreditoParcelado, setPayCreditoParcelado] = useState(false);

  // Etapa 5 — perguntas de perfil
  const [howFoundUs, setHowFoundUs] = useState('');
  const [mainChallenge, setMainChallenge] = useState('');
  const [currentWorkflow, setCurrentWorkflow] = useState('');

  const [step, setStep] = useState<Step>('step1');

  const completeMutation = trpc.onboarding.complete.useMutation({
    onSuccess: () => {
      setStep('step5');
      utils.onboarding.status.invalidate();
      utils.services.list.invalidate();
      utils.settings.get.invalidate();
    },
    onError: () => toast.error("Erro ao salvar configuração"),
  });

  const skipImportMutation = trpc.onboarding.skip.useMutation({
    onSuccess: () => {
      setStep('done');
      utils.onboarding.status.invalidate();
    },
  });

  if (isLoading || onboardingStatus?.done) return null;
  if (step === 'done') return null;

  const handleStep1Next = () => {
    if (!ownerName.trim()) { toast.error("Informe seu nome"); return; }
    if (!companyName.trim()) { toast.error("Informe o nome da empresa"); return; }
    if (!companyPhone.trim()) { toast.error("Informe o telefone/WhatsApp"); return; }
    if (sameEmail === null) { toast.error("Informe o e-mail da empresa"); return; }
    if (sameEmail === false && !companyEmail.trim()) { toast.error("Informe o e-mail da empresa"); return; }
    // Pré-preencher descrição com o nome da empresa
    if (!companyDescription) {
      setCompanyDescription(`A ${companyName} é especializada em higienização de estofados. Contamos com equipe qualificada, métodos eficazes e produtos seguros, sempre com foco na qualidade e na satisfação dos nossos clientes.`);
    }
    setStep('step2');
  };

  const handleStep2Next = () => {
    if (!serviceType) { toast.error("Selecione o tipo de serviço"); return; }
    setStep('step3');
  };

  const handleStep3Next = () => {
    if (!budgetTemplate) { toast.error("Selecione um modelo de orçamento"); return; }
    setStep('step4');
  };

  const handleStep4Next = () => {
    setStep('step5');
  };

  const handleStep5Next = () => {
    if (!howFoundUs) { toast.error("Selecione como nos conheceu"); return; }
    if (!mainChallenge) { toast.error("Selecione seu maior desafio"); return; }
    if (!currentWorkflow) { toast.error("Selecione como organiza seus atendimentos"); return; }
    const emailToSave = sameEmail ? loginEmail : companyEmail;
    // Determinar cor primária
    let primaryColor = '';
    let secondaryColor = '';
    if (selectedPalette !== null) {
      primaryColor = COLOR_PALETTES[selectedPalette].primary;
      secondaryColor = COLOR_PALETTES[selectedPalette].secondary;
    } else if (customColor) {
      primaryColor = customColor;
    }
    completeMutation.mutate({
      serviceType: serviceType!,
      ownerName,
      companyName,
      companyPhone,
      companyEmail: emailToSave || undefined,
      companyCnpj: companyCnpj || undefined,
      companyAddress: companyAddress || undefined,
      companyCity: companyCity || undefined,
      companyState: companyState || undefined,
      howFoundUs,
      mainChallenge,
      currentWorkflow,
      budgetTemplate: budgetTemplate || undefined,
      companyDescription: companyDescription || undefined,
      primaryColor: primaryColor || undefined,
      secondaryColor: secondaryColor || undefined,
      payEspecie,
      payCredito,
      payCreditoParcelado,
    });
  };

  const stepIndex = { step1: 1, step2: 2, step3: 3, step4: 4, step5: 5, step6: 5, done: 5 }[step];
  const totalSteps = 5;

  // Cor primária atual para preview
  const currentPrimaryColor = selectedPalette !== null
    ? COLOR_PALETTES[selectedPalette].primary
    : (customColor || '#1A9FE3');

  return (
    <>
      {/* Modal de preview */}
      {previewModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPreviewModal(null)}
        >
          <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold text-sm">
                {previewModal === 'premium' && '✨ Modelo Premium — Exemplo'}
                {previewModal === 'whatsapp' && '📱 Modelo WhatsApp — Exemplo'}
                {previewModal === 'timbrado' && '📄 Modelo Timbrado — Exemplo'}
              </span>
              <button onClick={() => setPreviewModal(null)} className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {previewModal === 'premium' && <PremiumPreview companyName={companyName} primaryColor={currentPrimaryColor} />}
            {previewModal === 'whatsapp' && <WhatsAppPreview companyName={companyName} />}
            {previewModal === 'timbrado' && <TimbradoPreview companyName={companyName} />}
            <p className="text-white/50 text-[10px] text-center mt-2">Dados fictícios para demonstração</p>
          </div>
        </div>
      )}

      <div
        className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      >
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden my-4">
          {/* Header */}
          <div className="p-5 text-white" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A9FE3 100%)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold opacity-80">
                {step === 'step5' ? 'Quase lá!' : `Passo ${stepIndex} de ${totalSteps}`}
              </div>
              <div className="flex gap-1.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === stepIndex ? '24px' : '8px', background: i <= stepIndex ? 'white' : 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
            </div>
            <div className="text-lg font-bold">
              {step === 'step1' && '🏢 Dados da sua empresa'}
              {step === 'step2' && '🛠️ Tipo de serviço'}
              {step === 'step3' && '📋 Modelo de orçamento'}
              {step === 'step4' && '📊 Só mais algumas perguntas'}
              {step === 'step5' && '📂 Sua lista de clientes'}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              {step === 'step1' && 'Essas informações aparecerão nos seus orçamentos'}
              {step === 'step2' && 'Isso configura automaticamente seu catálogo de serviços'}
              {step === 'step3' && 'Escolha como seus clientes vão receber os orçamentos'}
              {step === 'step4' && 'Isso leva menos de 1 minuto e você só verá isso uma vez'}
              {step === 'step5' && 'Veja como trazer seus clientes para o sistema em minutos'}
            </div>
          </div>

          {/* ETAPA 1 — Dados da empresa */}
          {step === 'step1' && (
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Nome do responsável *
                </label>
                <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Ex: João Silva" className="h-11" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Nome da empresa *
                </label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: HigiClean Bauru" className="h-11" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Telefone / WhatsApp *
                </label>
                <Input
                  value={companyPhone}
                  onChange={e => setCompanyPhone(maskPhone(e.target.value))}
                  placeholder="(14) 99999-9999"
                  className="h-11"
                  type="tel"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> E-mail da empresa *
                </label>
                {loginEmail && sameEmail === null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-gray-600">
                      O e-mail de login é <strong className="text-blue-700">{loginEmail}</strong>. É o mesmo e-mail da empresa?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSameEmail(true)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all"
                        style={{ borderColor: '#1A9FE3', background: '#e8f4fd', color: '#0A1628' }}
                      >
                        ✅ Sim, é o mesmo
                      </button>
                      <button
                        onClick={() => setSameEmail(false)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all"
                        style={{ borderColor: '#e5e7eb', background: '#f9fafb', color: '#374151' }}
                      >
                        ✏️ Não, usar outro
                      </button>
                    </div>
                  </div>
                )}
                {sameEmail === true && (
                  <div className="flex items-center gap-2 h-11 px-3 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-sm text-green-800 truncate">{loginEmail}</span>
                    <button onClick={() => setSameEmail(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600 shrink-0">Alterar</button>
                  </div>
                )}
                {sameEmail === false && (
                  <div className="space-y-1">
                    <Input
                      value={companyEmail}
                      onChange={e => setCompanyEmail(e.target.value)}
                      placeholder="contato@suaempresa.com.br"
                      className="h-11"
                      type="email"
                      autoFocus
                    />
                    <button onClick={() => setSameEmail(null)} className="text-xs text-gray-400 hover:text-gray-600">← Voltar</button>
                  </div>
                )}
                {!loginEmail && (
                  <Input
                    value={companyEmail}
                    onChange={e => setCompanyEmail(e.target.value)}
                    placeholder="contato@suaempresa.com.br"
                    className="h-11"
                    type="email"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> CNPJ <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <Input
                  value={companyCnpj}
                  onChange={e => setCompanyCnpj(maskCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="h-11"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Endereço <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <Input
                  value={companyAddress}
                  onChange={e => setCompanyAddress(e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Cidade <span className="font-normal text-gray-400">(opcional)</span></label>
                  <Input value={companyCity} onChange={e => setCompanyCity(e.target.value)} placeholder="Ex: Bauru" className="h-11" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Estado</label>
                  <Input
                    value={companyState}
                    onChange={e => setCompanyState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    className="h-11 text-center font-semibold"
                    maxLength={2}
                  />
                </div>
              </div>
              <Button
                onClick={handleStep1Next}
                className="w-full mt-2 gap-2 text-white h-12 text-sm font-semibold rounded-xl"
                style={{ background: 'linear-gradient(135deg, #0A1628, #1A9FE3)' }}
              >
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-gray-400 pt-1">
                Dúvidas? Fale com o suporte: <a href="https://wa.me/5582998383003" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">(82) 99838-3003</a>
              </p>
            </div>
          )}

          {/* ETAPA 2 — Tipo de serviço */}
          {step === 'step2' && (
            <div className="p-6">
              <p className="text-sm font-semibold text-foreground mb-1">Sua empresa oferece qual tipo de serviço?</p>
              <p className="text-xs text-muted-foreground mb-4">Isso vai configurar automaticamente os serviços disponíveis para seus orçamentos.</p>
              <div className="space-y-3">
                <button onClick={() => setServiceType('higienizacao')} className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left" style={{ borderColor: serviceType === 'higienizacao' ? '#3b82f6' : '#e5e7eb', background: serviceType === 'higienizacao' ? '#eff6ff' : '#f9fafb' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: serviceType === 'higienizacao' ? '#3b82f6' : '#d1d5db' }}><Droplets className="h-6 w-6 text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">Apenas Higienização</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Limpeza profunda de estofados, colchões e tapetes</p>
                  </div>
                  {serviceType === 'higienizacao' && <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#3b82f6' }} />}
                </button>
                <button onClick={() => setServiceType('ambos')} className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left" style={{ borderColor: serviceType === 'ambos' ? '#22c55e' : '#e5e7eb', background: serviceType === 'ambos' ? '#f0fdf4' : '#f9fafb' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: serviceType === 'ambos' ? '#22c55e' : '#d1d5db' }}><Sparkles className="h-6 w-6 text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">Higienização + Impermeabilização</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Limpeza profunda e proteção contra manchas e umidade</p>
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>Recomendado</span>
                  </div>
                  {serviceType === 'ambos' && <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#22c55e' }} />}
                </button>
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" onClick={() => setStep('step1')} className="flex-1 gap-2 h-12 text-sm font-semibold rounded-xl"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                <Button onClick={handleStep2Next} disabled={!serviceType} className="flex-1 gap-2 text-white h-12 text-sm font-semibold rounded-xl" style={{ background: serviceType ? 'linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))' : undefined }}>Próximo <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* ETAPA 3 — Modelo de orçamento */}
          {step === 'step3' && (
            <div className="p-6 space-y-4">
              <p className="text-sm font-semibold text-foreground">Como seus clientes vão receber os orçamentos?</p>
              <p className="text-xs text-muted-foreground -mt-2">Clique em "Ver exemplo" para ver como fica antes de escolher.</p>

              {/* Cards dos modelos */}
              <div className="space-y-3">
                {/* Premium */}
                <div
                  className="rounded-2xl border-2 transition-all overflow-hidden"
                  style={{ borderColor: budgetTemplate === 'premium' ? '#1A9FE3' : '#e5e7eb', background: budgetTemplate === 'premium' ? '#f0f9ff' : '#f9fafb' }}
                >
                  <button
                    onClick={() => setBudgetTemplate('premium')}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: budgetTemplate === 'premium' ? '#1A9FE3' : '#d1d5db' }}>
                      <Star className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground">Modelo Premium</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#dbeafe', color: '#1d4ed8' }}>Recomendado</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Visual profissional com cores da sua empresa</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setPreviewModal('premium'); }}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all"
                        style={{ borderColor: '#1A9FE3', color: '#1A9FE3', background: 'white' }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                      {budgetTemplate === 'premium' && <CheckCircle2 className="h-5 w-5" style={{ color: '#1A9FE3' }} />}
                    </div>
                  </button>

                  {/* Configurações extras do Premium */}
                  {budgetTemplate === 'premium' && (
                    <div className="px-4 pb-4 space-y-3 border-t border-blue-100 pt-3">
                      {/* Descrição da empresa */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">
                          📝 Descrição da empresa
                        </label>
                        <textarea
                          value={companyDescription}
                          onChange={e => setCompanyDescription(e.target.value)}
                          rows={3}
                          className="w-full text-xs border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                          placeholder="Descreva sua empresa em poucas palavras..."
                        />
                      </div>

                      {/* Paletas de cores */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                          <Palette className="h-3.5 w-3.5" /> Cor da empresa
                        </label>
                        <div className="grid grid-cols-5 gap-2 mb-2">
                          {COLOR_PALETTES.map((palette, i) => (
                            <button
                              key={i}
                              onClick={() => { setSelectedPalette(i); setCustomColor(''); }}
                              title={palette.name}
                              className="relative h-9 rounded-xl transition-all border-2"
                              style={{
                                background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                                borderColor: selectedPalette === i ? 'white' : 'transparent',
                                boxShadow: selectedPalette === i ? `0 0 0 2px ${palette.primary}` : 'none',
                              }}
                            >
                              {selectedPalette === i && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                              )}
                            </button>
                          ))}
                        </div>
                        {selectedPalette !== null && (
                          <p className="text-[10px] text-gray-500 mb-2">
                            Selecionado: <strong>{COLOR_PALETTES[selectedPalette].name}</strong>
                          </p>
                        )}
                        {/* Campo livre */}
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customColor || '#1A9FE3'}
                            onChange={e => { setCustomColor(e.target.value); setSelectedPalette(null); }}
                            className="h-9 w-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                          />
                          <Input
                            value={customColor}
                            onChange={e => { setCustomColor(e.target.value); setSelectedPalette(null); }}
                            placeholder="#1A9FE3 (opcional)"
                            className="h-9 text-xs flex-1"
                          />
                        </div>
                        {/* Aviso de suporte */}
                        <div className="mt-2 p-2.5 rounded-xl text-[10px] text-amber-700" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                          💡 Não conseguiu configurar a cor? Fale com o suporte que te ajudamos! Enquanto isso, o <strong>modelo WhatsApp</strong> já está pronto para usar.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp */}
                <div
                  className="rounded-2xl border-2 transition-all"
                  style={{ borderColor: budgetTemplate === 'whatsapp' ? '#22c55e' : '#e5e7eb', background: budgetTemplate === 'whatsapp' ? '#f0fdf4' : '#f9fafb' }}
                >
                  <button
                    onClick={() => setBudgetTemplate('whatsapp')}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: budgetTemplate === 'whatsapp' ? '#22c55e' : '#d1d5db' }}>
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">Modelo WhatsApp</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Texto formatado para enviar direto no WhatsApp</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setPreviewModal('whatsapp'); }}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all"
                        style={{ borderColor: '#22c55e', color: '#22c55e', background: 'white' }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                      {budgetTemplate === 'whatsapp' && <CheckCircle2 className="h-5 w-5" style={{ color: '#22c55e' }} />}
                    </div>
                  </button>
                </div>

                {/* Timbrado */}
                <div
                  className="rounded-2xl border-2 transition-all"
                  style={{ borderColor: budgetTemplate === 'timbrado' ? '#6b7280' : '#e5e7eb', background: budgetTemplate === 'timbrado' ? '#f9fafb' : '#f9fafb' }}
                >
                  <button
                    onClick={() => setBudgetTemplate('timbrado')}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: budgetTemplate === 'timbrado' ? '#6b7280' : '#d1d5db' }}>
                      <FileCheck className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">Modelo Timbrado</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Estilo formal com cabeçalho e dados da empresa</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); setPreviewModal('timbrado'); }}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all"
                        style={{ borderColor: '#6b7280', color: '#6b7280', background: 'white' }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                      {budgetTemplate === 'timbrado' && <CheckCircle2 className="h-5 w-5" style={{ color: '#6b7280' }} />}
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setStep('step2')} className="flex-1 gap-2 h-12 text-sm font-semibold rounded-xl"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                <Button onClick={handleStep3Next} disabled={!budgetTemplate} className="flex-1 gap-2 text-white h-12 text-sm font-semibold rounded-xl" style={{ background: budgetTemplate ? 'linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))' : undefined }}>
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 4 — Formas de pagamento */}
          {step === 'step4' && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Selecione as formas de pagamento que você aceita. Isso aparecerá nos seus orçamentos.</p>

              <div className="space-y-3">
                {/* Espécie à vista */}
                <button
                  onClick={() => setPayEspecie(v => !v)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                  style={{ borderColor: payEspecie ? '#22c55e' : '#e5e7eb', background: payEspecie ? '#f0fdf4' : '#f9fafb' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ background: payEspecie ? '#22c55e' : '#e5e7eb' }}>
                    <span className="text-white text-base">💵</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground">À vista (Pix ou débito)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Espécie, Pix e cartão de débito</p>
                  </div>
                  {payEspecie && <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#22c55e' }} />}
                </button>

                {/* Crédito à vista */}
                <button
                  onClick={() => setPayCredito(v => !v)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                  style={{ borderColor: payCredito ? '#3b82f6' : '#e5e7eb', background: payCredito ? '#eff6ff' : '#f9fafb' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: payCredito ? '#3b82f6' : '#e5e7eb' }}>
                    <span className="text-white text-base">💳</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground">Crédito à vista</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Cobrança integral na fatura</p>
                  </div>
                  {payCredito && <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#3b82f6' }} />}
                </button>

                {/* Crédito parcelado */}
                <button
                  onClick={() => setPayCreditoParcelado(v => !v)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                  style={{ borderColor: payCreditoParcelado ? '#8b5cf6' : '#e5e7eb', background: payCreditoParcelado ? '#f5f3ff' : '#f9fafb' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: payCreditoParcelado ? '#8b5cf6' : '#e5e7eb' }}>
                    <span className="text-white text-base">📅</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground">Cartão parcelado</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Parcelamento em até 3x</p>
                  </div>
                  {payCreditoParcelado && <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#8b5cf6' }} />}
                </button>
              </div>

              {/* Aviso de configuração posterior */}
              <div className="p-3 rounded-xl text-xs text-amber-700" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                💡 Taxas de cartão e parcelamento podem ser ajustadas depois em <strong>Configurações → Pagamentos</strong>. Dúvidas? Fale com a gente.
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setStep('step3')} className="flex-1 gap-2 h-12 text-sm font-semibold rounded-xl"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                <Button onClick={handleStep4Next} className="flex-1 gap-2 text-white h-12 text-sm font-semibold rounded-xl" style={{ background: 'linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))' }}>
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 5 — Perguntas de perfil */}
          {step === 'step5' && (
            <div className="p-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Como nos conheceu?</p>
                <div className="space-y-2">
                  {HOW_FOUND_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setHowFoundUs(opt.value)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left text-sm transition-all" style={{ borderColor: howFoundUs === opt.value ? '#3b82f6' : '#e5e7eb', background: howFoundUs === opt.value ? '#eff6ff' : '#f9fafb', fontWeight: howFoundUs === opt.value ? 600 : 400 }}>
                      {opt.label}{howFoundUs === opt.value && <CheckCircle2 className="h-4 w-4 ml-auto text-blue-500" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Qual é seu maior desafio hoje?</p>
                <div className="space-y-2">
                  {CHALLENGE_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setMainChallenge(opt.value)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left text-sm transition-all" style={{ borderColor: mainChallenge === opt.value ? '#8b5cf6' : '#e5e7eb', background: mainChallenge === opt.value ? '#f5f3ff' : '#f9fafb', fontWeight: mainChallenge === opt.value ? 600 : 400 }}>
                      {opt.label}{mainChallenge === opt.value && <CheckCircle2 className="h-4 w-4 ml-auto text-purple-500" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Como organiza seus atendimentos hoje?</p>
                <div className="space-y-2">
                  {WORKFLOW_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setCurrentWorkflow(opt.value)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left text-sm transition-all" style={{ borderColor: currentWorkflow === opt.value ? '#f59e0b' : '#e5e7eb', background: currentWorkflow === opt.value ? '#fffbeb' : '#f9fafb', fontWeight: currentWorkflow === opt.value ? 600 : 400 }}>
                      {opt.label}{currentWorkflow === opt.value && <CheckCircle2 className="h-4 w-4 ml-auto text-amber-500" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setStep('step4')} className="flex-1 gap-2 h-12 text-sm font-semibold rounded-xl"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                <Button onClick={handleStep5Next} disabled={completeMutation.isPending} className="flex-1 gap-2 text-white h-12 text-sm font-semibold rounded-xl" style={{ background: 'linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))' }}>
                  {completeMutation.isPending ? 'Salvando...' : <>Próximo <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 6 — Aviso sobre importação de clientes */}
          {step === 'step6' && (
            <div className="p-6 space-y-4">
              {/* Destaque */}
              <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1A9FE3' }}>
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-800">Tem clientes em Excel ou papel?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Você pode importar tudo de uma vez — é rápido e fácil.</p>
                </div>
              </div>

              {/* Passo a passo */}
              <div className="space-y-2.5">
                {[
                  { num: '1', text: 'Acesse a aba \u003cstrong\u003eClientes\u003c/strong\u003e no menu lateral' },
                  { num: '2', text: 'Clique em \u003cstrong\u003eImportar Clientes\u003c/strong\u003e' },
                  { num: '3', text: 'Baixe a planilha modelo e preencha com seus dados' },
                  { num: '4', text: 'Faça o upload — todos os clientes entram automaticamente' },
                ].map(item => (
                  <div key={item.num} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5" style={{ background: '#1A9FE3' }}>{item.num}</div>
                    <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: item.text }} />
                  </div>
                ))}
              </div>

              {/* Aviso de suporte */}
              <div className="p-3 rounded-xl text-xs text-amber-700" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                💡 <strong>Não conseguiu?</strong> Fale com o suporte que fazemos a importação para você!
              </div>

              {/* Aviso de quando fazer */}
              <p className="text-center text-xs text-gray-400">
                Você pode fazer isso a qualquer momento em <strong>Clientes → Importar</strong>
              </p>

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setStep('step5')} className="flex-1 gap-2 h-12 text-sm font-semibold rounded-xl"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                <Button
                  onClick={() => skipImportMutation.mutate()}
                  disabled={skipImportMutation.isPending}
                  className="flex-1 gap-2 text-white h-12 text-sm font-semibold rounded-xl"
                  style={{ background: 'linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))' }}
                >
                  {skipImportMutation.isPending ? 'Finalizando...' : <>✅ Entendi, vamos começar!</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
