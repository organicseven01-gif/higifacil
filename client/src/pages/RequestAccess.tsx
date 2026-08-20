import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Tag,
  MessageSquare,
  Send,
} from "lucide-react";

const LOGO_URL = "/logo-higifacil.png";

const SEGMENTS = [
  "Higienização de Estofados",
  "Limpeza de Tapetes",
  "Limpeza Pós-Obra",
  "Limpeza Comercial",
  "Limpeza Residencial",
  "Impermeabilização",
  "Outro",
];

export default function RequestAccess() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    phone: "",
    city: "",
    segment: "",
    message: "",
  });

  const submitMutation = trpc.accessRequests.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (e) => toast.error("Erro ao enviar solicitação", { description: e.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.ownerName || !form.email) return;
    submitMutation.mutate(form);
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Solicitação enviada!</h1>
            <p className="text-slate-400 mt-3 leading-relaxed">
              Recebemos sua solicitação de acesso. Nossa equipe irá analisar e entrar em contato com você em breve pelo e-mail <strong className="text-white">{form.email}</strong>.
            </p>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300">
            Tempo médio de resposta: <strong>até 24 horas úteis</strong>
          </div>
          <Link href="/entrar">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Higifácil" className="h-8 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
          </div>
          <Link href="/entrar" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="flex-1 flex items-start justify-center p-6 pt-10">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Solicitar acesso</h1>
            <p className="text-slate-400 mt-2">
              Preencha o formulário abaixo. Nossa equipe irá analisar sua solicitação e liberar o acesso em até 24 horas.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Dados da empresa */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Dados da Empresa</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-sm flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Nome da empresa *
                  </Label>
                  <Input
                    placeholder="Ex: Limpa Mais Higienização"
                    value={form.companyName}
                    onChange={set("companyName")}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-sm flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Segmento
                  </Label>
                  <select
                    value={form.segment}
                    onChange={set("segment")}
                    className="w-full h-9 rounded-md bg-slate-800 border border-slate-700 text-white text-sm px-3 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {SEGMENTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-sm flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Cidade
                  </Label>
                  <Input
                    placeholder="Ex: São Paulo - SP"
                    value={form.city}
                    onChange={set("city")}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-sm flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Telefone / WhatsApp
                  </Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={set("phone")}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Dados do responsável */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Responsável</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-sm flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Seu nome *
                  </Label>
                  <Input
                    placeholder="Nome completo"
                    value={form.ownerName}
                    onChange={set("ownerName")}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-sm flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> E-mail de contato *
                  </Label>
                  <Input
                    type="email"
                    placeholder="voce@empresa.com.br"
                    value={form.email}
                    onChange={set("email")}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Mensagem opcional */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Mensagem (opcional)
              </h2>
              <Textarea
                placeholder="Conte um pouco sobre sua empresa, quantos funcionários tem, volume de atendimentos por mês, etc."
                value={form.message}
                onChange={set("message")}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-medium gap-2 text-base"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar solicitação de acesso
                </>
              )}
            </Button>

            <p className="text-center text-xs text-slate-600">
              Ao enviar, você concorda que seus dados serão usados para análise de acesso ao sistema.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
