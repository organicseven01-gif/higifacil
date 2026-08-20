import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Star, CheckCircle2, Bug, Lightbulb, Heart, Smile } from "lucide-react";

const categorias = [
  { value: "geral", label: "Geral", icon: Smile, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "bug", label: "Bug / Problema", icon: Bug, color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { value: "sugestao", label: "Sugestão", icon: Lightbulb, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { value: "elogio", label: "Elogio", icon: Heart, color: "bg-green-500/10 text-green-400 border-green-500/20" },
];

export default function Feedback() {
  const [categoria, setCategoria] = useState<"geral" | "bug" | "sugestao" | "elogio">("geral");
  const [oQueFuncionou, setOQueFuncionou] = useState("");
  const [oQueTravou, setOQueTravou] = useState("");
  const [oQueFalta, setOQueFalta] = useState("");
  const [nota, setNota] = useState<number>(5);
  const [enviado, setEnviado] = useState(false);

  const createFeedback = trpc.betaFeedback.create.useMutation({
    onSuccess: () => {
      setEnviado(true);
      toast.success("Feedback enviado! Obrigado pela sua contribuição.");
    },
    onError: (err) => {
      toast.error("Erro ao enviar feedback: " + err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oQueFuncionou && !oQueTravou && !oQueFalta) {
      toast.error("Preencha pelo menos um campo antes de enviar.");
      return;
    }
    createFeedback.mutate({
      categoria,
      oQueFuncionou: oQueFuncionou || undefined,
      oQueTravou: oQueTravou || undefined,
      oQueFalta: oQueFalta || undefined,
      nota,
    });
  };

  if (enviado) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-6 max-w-md text-center p-8">
          <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "#1A9FE3" }}>
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Feedback enviado!</h2>
            <p className="text-muted-foreground">
              Obrigado por ajudar a melhorar o Higifácil. Sua opinião é muito importante para nós.
              Cada feedback é lido pessoalmente pelo time de desenvolvimento.
            </p>
          </div>
          <Button
            onClick={() => { setEnviado(false); setOQueFuncionou(""); setOQueTravou(""); setOQueFalta(""); setNota(5); }}
            variant="outline"
          >
            Enviar outro feedback
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#1A9FE3" }}>
          <MessageSquarePlus className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enviar Feedback</h1>
          <p className="text-sm text-muted-foreground">Você está no programa beta — sua opinião molda o produto</p>
        </div>
      </div>

      {/* Banner beta */}
      <div className="rounded-xl p-4 border" style={{ background: "rgba(26,159,227,0.08)", borderColor: "rgba(26,159,227,0.2)" }}>
        <p className="text-sm" style={{ color: "#1A9FE3" }}>
          <strong>Você é um beta tester!</strong> Cada feedback enviado aqui chega diretamente para o Israel (fundador do Higifácil).
          Não existe resposta errada — quanto mais honesto, melhor.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Categoria */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de feedback</Label>
          <div className="grid grid-cols-2 gap-2">
            {categorias.map((cat) => {
              const Icon = cat.icon;
              const isSelected = categoria === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoria(cat.value as typeof categoria)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? "border-[#1A9FE3] bg-[#1A9FE3]/10 text-[#1A9FE3]"
                      : "border-border bg-card text-muted-foreground hover:border-[#1A9FE3]/50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nota */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Nota geral do sistema <span className="text-muted-foreground font-normal">({nota}/5)</span>
          </Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNota(n)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className="h-8 w-8"
                  fill={n <= nota ? "#F59E0B" : "transparent"}
                  stroke={n <= nota ? "#F59E0B" : "#6B7280"}
                />
              </button>
            ))}
          </div>
        </div>

        {/* O que funcionou */}
        <div className="space-y-2">
          <Label htmlFor="funcionou" className="text-sm font-medium flex items-center gap-2">
            <span className="text-green-400">✓</span> O que funcionou bem?
          </Label>
          <Textarea
            id="funcionou"
            placeholder="Ex: Criar orçamento foi rápido e fácil, o layout ficou bonito no WhatsApp..."
            value={oQueFuncionou}
            onChange={(e) => setOQueFuncionou(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* O que travou */}
        <div className="space-y-2">
          <Label htmlFor="travou" className="text-sm font-medium flex items-center gap-2">
            <span className="text-red-400">✗</span> O que travou ou confundiu?
          </Label>
          <Textarea
            id="travou"
            placeholder="Ex: Não consegui encontrar onde editar o cliente, o botão de salvar não funcionou..."
            value={oQueTravou}
            onChange={(e) => setOQueTravou(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* O que falta */}
        <div className="space-y-2">
          <Label htmlFor="falta" className="text-sm font-medium flex items-center gap-2">
            <span className="text-yellow-400">+</span> O que está faltando?
          </Label>
          <Textarea
            id="falta"
            placeholder="Ex: Queria poder enviar o orçamento por e-mail, falta um relatório de clientes inativos..."
            value={oQueFalta}
            onChange={(e) => setOQueFalta(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <Button
          type="submit"
          className="w-full text-white font-semibold h-12"
          style={{ background: "#1A9FE3" }}
          disabled={createFeedback.isPending}
        >
          {createFeedback.isPending ? "Enviando..." : "Enviar Feedback"}
        </Button>
      </form>
    </div>
  );
}
