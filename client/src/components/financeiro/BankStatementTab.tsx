import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp,
  Trash2, RefreshCw, Tag, X, TrendingUp, TrendingDown, Info, Loader2
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = [
  "Combustível",
  "Alimentação",
  "Equipamentos e Ferramentas",
  "Produtos de Limpeza",
  "Transporte e Frete",
  "Marketing e Publicidade",
  "Telefone e Internet",
  "Aluguel e Infraestrutura",
  "Impostos e Taxas",
  "Salários e Pagamentos",
  "Receita de Serviço",
  "Transferência",
  "Saque",
  "Pessoal (ignorar)",
  "Outros",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Combustível": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Alimentação": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Equipamentos e Ferramentas": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Produtos de Limpeza": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Transporte e Frete": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Marketing e Publicidade": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Telefone e Internet": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "Aluguel e Infraestrutura": "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  "Impostos e Taxas": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "Salários e Pagamentos": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "Receita de Serviço": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Transferência": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  "Saque": "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  "Pessoal (ignorar)": "bg-muted text-muted-foreground",
  "Outros": "bg-muted text-muted-foreground",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// Modal de revisão de uma transação
function ReviewModal({
  transaction,
  onClose,
  onSave,
}: {
  transaction: any;
  onClose: () => void;
  onSave: (category: string, isPersonal: boolean) => void;
}) {
  const [category, setCategory] = useState(transaction.category || transaction.aiSuggestedCategory || "");
  const [isPersonal, setIsPersonal] = useState(transaction.isPersonal ?? false);
  const isDebit = transaction.type === "debit";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Categorizar Transação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Info da transação */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium text-sm">{transaction.description}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">{fmtDate(transaction.transactionDate)}</span>
              <span className={`font-bold text-sm ${isDebit ? "text-red-600" : "text-green-600"}`}>
                {isDebit ? "-" : "+"}{fmt(Number(transaction.amount))}
              </span>
            </div>
            {transaction.aiSuggestedCategory && (
              <p className="text-xs text-muted-foreground mt-1">
                IA sugeriu: <strong>{transaction.aiSuggestedCategory}</strong>
                {transaction.aiConfidence && ` (${Math.round(Number(transaction.aiConfidence) * 100)}% confiança)`}
              </p>
            )}
          </div>

          {/* Seletor de categoria */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categoria</label>
            <Select value={category} onValueChange={v => {
              setCategory(v);
              setIsPersonal(v === "Pessoal (ignorar)");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aviso pessoal */}
          {isPersonal && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Esta transação será marcada como <strong>pessoal</strong> e não entrará nos relatórios da empresa.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              className="flex-1"
              disabled={!category}
              onClick={() => onSave(category, isPersonal)}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente principal da aba de Extrato
export default function BankStatementTab({ selectedMonth }: { selectedMonth: string }) {
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<number | null>(null);
  const [reviewingTransaction, setReviewingTransaction] = useState<any>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [pollingImportId, setPollingImportId] = useState<number | null>(null);

  // Buscar importações
  const { data: imports = [], refetch: refetchImports } = trpc.bankStatement.listImports.useQuery(
    undefined,
    { refetchOnWindowFocus: false, refetchInterval: pollingImportId ? 3000 : false }
  );

  // Quando uma importação termina de processar, parar o polling
  const processingImport = imports.find((i: any) => i.id === pollingImportId);
  if (processingImport && processingImport.status !== "processing" && pollingImportId) {
    setPollingImportId(null);
    refetchImports();
    if (processingImport.status === "done") {
      toast.success(`Extrato processado! ${processingImport.totalTransactions} transações encontradas.`);
      setSelectedImportId(processingImport.id);
    } else {
      toast.error("Erro ao processar extrato. Tente novamente.");
    }
  }

  // Buscar transações do import selecionado
  const { data: transactions = [], refetch: refetchTransactions } = trpc.bankStatement.listTransactions.useQuery(
    { importId: selectedImportId ?? undefined, reviewStatus: showPendingOnly ? "pending" : undefined },
    { enabled: !!selectedImportId, refetchOnWindowFocus: false }
  );

  const importMutation = trpc.bankStatement.import.useMutation({
    onSuccess: (data) => {
      setPollingImportId(data.importId);
      utils.bankStatement.listImports.invalidate();
    },
    onError: (e) => {
      setUploading(false);
      toast.error(e.message);
    },
  });

  const updateMutation = trpc.bankStatement.updateTransaction.useMutation({
    onSuccess: () => {
      utils.bankStatement.listTransactions.invalidate();
      utils.bankStatement.listImports.invalidate();
      setReviewingTransaction(null);
      toast.success("Categoria salva!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.bankStatement.deleteImport.useMutation({
    onSuccess: () => {
      utils.bankStatement.listImports.invalidate();
      setDeleteConfirm(null);
      setSelectedImportId(null);
      toast.success("Extrato removido!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo 16MB.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const fileType = (["pdf", "ofx", "csv"].includes(ext) ? ext : "other") as "pdf" | "ofx" | "csv" | "other";

    setUploading(true);
    toast.info("Enviando arquivo...");

    try {
      // Upload para R2 (bucket privado — extrato bancário é dado sensível)
      const formData = new FormData();
      formData.append("visibility", "private");
      formData.append("category", "bank-statements");
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Erro no upload");
      const { key } = await uploadRes.json();
      if (!key) throw new Error("Erro no upload");

      // Iniciar processamento com IA — persiste-se só a KEY (nunca URL).
      await importMutation.mutateAsync({
        fileUrl: key,
        fileKey: key,
        fileName: file.name,
        fileType,
        referenceMonth: selectedMonth,
      });

      toast.info("Processando extrato com IA... Aguarde alguns segundos.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar extrato");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [selectedMonth, importMutation]);

  // Métricas das transações do import selecionado
  const metrics = transactions.reduce(
    (acc: any, t: any) => {
      if (t.isPersonal) return acc;
      const amt = Number(t.amount);
      if (t.type === "credit") acc.entradas += amt;
      else acc.saidas += amt;
      return acc;
    },
    { entradas: 0, saidas: 0 }
  );

  const pendingCount = transactions.filter((t: any) => t.reviewStatus === "pending").length;
  const filteredTransactions = showPendingOnly
    ? transactions.filter((t: any) => t.reviewStatus === "pending")
    : transactions;

  const currentImport = imports.find((i: any) => i.id === selectedImportId);

  return (
    <div className="space-y-4">
      {/* Aviso educativo */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Dica para melhores resultados</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            Use o extrato da <strong>conta bancária da empresa</strong>. Se você usa a mesma conta para gastos pessoais,
            não tem problema — na revisão você pode marcar como <strong>"Pessoal (ignorar)"</strong> e eles não entrarão nos relatórios.
          </p>
        </div>
      </div>

      {/* Upload */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.ofx,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Enviando e processando...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium text-sm">Enviar extrato bancário</p>
            <p className="text-xs text-muted-foreground">PDF, OFX ou CSV · Máximo 16MB</p>
            <p className="text-xs text-muted-foreground">Nubank, Itaú, Bradesco, Inter, Sicoob e outros</p>
          </div>
        )}
      </div>

      {/* Lista de importações */}
      {imports.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Extratos importados</h3>
          {imports.map((imp: any) => {
            const isSelected = imp.id === selectedImportId;
            const isProcessing = imp.status === "processing";
            const isError = imp.status === "error";
            const isDone = imp.status === "done";
            return (
              <div
                key={imp.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                }`}
                onClick={() => !isProcessing && setSelectedImportId(isSelected ? null : imp.id)}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isProcessing ? "bg-amber-100" : isError ? "bg-red-100" : "bg-green-100"
                }`}>
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                  ) : isError ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <FileText className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{imp.fileName}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {imp.bankName && <span className="text-xs text-muted-foreground">{imp.bankName}</span>}
                    <span className="text-xs text-muted-foreground">
                      {imp.referenceMonth ? (() => {
                        const [y, m] = imp.referenceMonth.split("-");
                        return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                      })() : ""}
                    </span>
                    {isDone && (
                      <span className="text-xs text-muted-foreground">· {imp.totalTransactions} transações</span>
                    )}
                    {isDone && imp.pendingReview > 0 && (
                      <Badge className="text-xs py-0 h-4 bg-amber-500 text-white">{imp.pendingReview} para revisar</Badge>
                    )}
                    {isProcessing && <span className="text-xs text-amber-600">Processando com IA...</span>}
                    {isError && <span className="text-xs text-red-600">Erro ao processar</span>}
                  </div>
                </div>
                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  {isSelected ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  {deleteConfirm === imp.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => deleteMutation.mutate({ id: imp.id })}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded-md"
                      >Sim</button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-xs bg-muted rounded-md"
                      >Não</button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(imp.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transações do import selecionado */}
      {selectedImportId && currentImport?.status === "done" && (
        <div className="space-y-3">
          {/* Métricas do extrato */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-muted-foreground">Entradas</span>
              </div>
              <p className="font-bold text-green-600 text-sm">{fmt(metrics.entradas)}</p>
            </div>
            <div className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs text-muted-foreground">Saídas</span>
              </div>
              <p className="font-bold text-red-600 text-sm">{fmt(metrics.saidas)}</p>
            </div>
          </div>

          {/* Filtros de revisão */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setShowPendingOnly(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!showPendingOnly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Todas ({transactions.length})
              </button>
              <button
                onClick={() => setShowPendingOnly(true)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${showPendingOnly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <Clock className="h-3 w-3" />
                Revisar {pendingCount > 0 && <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-xs leading-none">{pendingCount}</span>}
              </button>
            </div>
            <button
              onClick={() => refetchTransactions()}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Lista de transações */}
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-sm font-medium">Tudo revisado!</p>
              <p className="text-xs text-muted-foreground mt-1">Nenhuma transação pendente de revisão</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredTransactions.map((t: any) => {
                const isDebit = t.type === "debit";
                const isPending = t.reviewStatus === "pending";
                const isPersonal = t.isPersonal;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isPending ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800" :
                      isPersonal ? "border-border bg-muted/30 opacity-60" :
                      "border-border bg-card"
                    }`}
                  >
                    {/* Ícone tipo */}
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isDebit ? "bg-red-100" : "bg-green-100"}`}>
                      {isDebit ? <TrendingDown className="h-4 w-4 text-red-600" /> : <TrendingUp className="h-4 w-4 text-green-600" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isPersonal ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {t.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{fmtDate(t.transactionDate)}</span>
                        {t.category && !isPending ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[t.category] ?? "bg-muted text-muted-foreground"}`}>
                            {t.category}
                          </span>
                        ) : isPending ? (
                          <span className="text-xs text-amber-600 flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> Aguardando revisão
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Valor */}
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm ${isDebit ? "text-red-600" : "text-green-600"}`}>
                        {isDebit ? "-" : "+"}{fmt(Number(t.amount))}
                      </p>
                    </div>

                    {/* Botão categorizar */}
                    <button
                      onClick={() => setReviewingTransaction(t)}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        isPending
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      title="Categorizar"
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de revisão */}
      {reviewingTransaction && (
        <ReviewModal
          transaction={reviewingTransaction}
          onClose={() => setReviewingTransaction(null)}
          onSave={(category, isPersonal) => {
            updateMutation.mutate({
              id: reviewingTransaction.id,
              category,
              isPersonal,
            });
          }}
        />
      )}
    </div>
  );
}
