import DashboardLayout from "@/components/DashboardLayout";
import FeatureGate from "@/components/FeatureGate";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  ShoppingCart, TrendingUp, DollarSign, Clock, CheckCircle2, X, Eye,
  Trash2, Plus, Upload, Camera, FileText, Search, Receipt, CheckCheck, CalendarCheck, Pencil
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
function fmt(val: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val) || 0);
}
function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

/**
 * Comprovante é arquivo PRIVADO: o banco guarda só a KEY do objeto (nunca
 * URL). Este componente resolve a URL assinada temporária sob demanda antes
 * de renderizar a miniatura. `onResolvedClick` recebe a URL já resolvida
 * (útil pro lightbox, que só precisa exibir, não precisa saber de key).
 * Aceita também URL http(s) direta, para dado antigo salvo antes desta
 * mudança (fallback de compatibilidade).
 */
function ComprovanteThumb({
  value, alt, className, onResolvedClick,
}: { value: string; alt?: string; className?: string; onResolvedClick?: (url: string) => void }) {
  const isLegacyUrl = /^https?:\/\//i.test(value);
  const { data, isLoading } = trpc.storage.getSignedUrl.useQuery(
    { key: value },
    { enabled: !isLegacyUrl, staleTime: 55 * 60 * 1000 } // < 1h de validade do link assinado
  );
  const resolvedUrl = isLegacyUrl ? value : data?.url;

  if (!resolvedUrl) {
    return <div className={`${className ?? ""} bg-muted animate-pulse`} title={isLoading ? "Carregando..." : "Não foi possível carregar"} />;
  }
  return (
    <img
      src={resolvedUrl}
      alt={alt || "Comprovante"}
      className={className}
      onClick={() => onResolvedClick?.(resolvedUrl)}
    />
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX", card: "Cartão", cash: "Dinheiro", boleto: "Boleto",
  card_1x: "Cartão 1x", card_2x: "Cartão 2x", card_3x: "Cartão 3x",
  card_2x_ant: "Cartão 2x Ant.", card_3x_ant: "Cartão 3x Ant.",
};
const PAYMENT_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "cash", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "card_1x", label: "Cartão 1x" },
  { value: "card_2x", label: "Cartão 2x" },
  { value: "card_3x", label: "Cartão 3x" },
  { value: "card_2x_ant", label: "Cartão 2x Antecipado" },
  { value: "card_3x_ant", label: "Cartão 3x Antecipado" },
];
const STATUS_LABELS: Record<string, string> = { paid: "Pago", partial: "Parcial", pending: "Pendente" };
const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-500/10 text-green-600 border-green-500/30",
  partial: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  pending: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};
const PAYMENT_COLORS: Record<string, string> = {
  pix: "bg-blue-500/10 text-blue-600",
  card: "bg-purple-500/10 text-purple-600",
  cash: "bg-green-500/10 text-green-600",
  boleto: "bg-orange-500/10 text-orange-600",
};

// ─── Transaction Form Modal ──────────────────────────────────────────────────
// ─── Modal Registrar Venda (sem orçamento) ───────────────────────────────────
type SaleItem = { id: string; name: string; price: string; qty: number };

function RegisterSaleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: clientsData } = trpc.clients.list.useQuery(undefined, { enabled: open });
  const { data: servicesData } = trpc.services.list.useQuery({ activeOnly: true }, { enabled: open });
  const clients = clientsData ?? [];
  const allServices = (servicesData ?? []) as any[];

  // Cliente
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id?: number; name: string; phone: string } | null>(null);
  const [newClientPhone, setNewClientPhone] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: (result: any) => {
      utils.clients.list.invalidate();
      if (selectedClient) {
        setSelectedClient({ id: result.id, name: selectedClient.name, phone: newClientPhone });
      }
      setNewClientPhone("");
      setSavingClient(false);
      toast.success("Cliente cadastrado!");
    },
    onError: (e) => { setSavingClient(false); toast.error(e.message); },
  });

  // Itens
  const [items, setItems] = useState<SaleItem[]>([{ id: crypto.randomUUID(), name: "", price: "", qty: 1 }]);
  const [serviceSearch, setServiceSearch] = useState<Record<string, string>>({});
  const [showServiceDropdown, setShowServiceDropdown] = useState<Record<string, boolean>>({});

  // Pagamento / data
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Comprovante — disponível após salvar
  const [createdSaleId, setCreatedSaleId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptCaption, setReceiptCaption] = useState("");
  const [receiptType, setReceiptType] = useState<"pix" | "card" | "cash" | "boleto" | "other">("pix");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const { data: receiptsData, refetch: refetchReceipts } = trpc.sales.getReceipts.useQuery(
    { saleId: createdSaleId! },
    { enabled: !!createdSaleId }
  );
  const receipts = receiptsData ?? [];
  const addReceiptMutation = trpc.sales.addReceipt.useMutation({
    onSuccess: () => { refetchReceipts(); setReceiptCaption(""); toast.success("Comprovante adicionado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteReceiptMutation = trpc.sales.deleteReceipt.useMutation({
    onSuccess: () => { refetchReceipts(); toast.success("Comprovante removido"); },
    onError: (e) => toast.error(e.message),
  });

  async function handleReceiptUpload(file: File) {
    if (!createdSaleId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("visibility", "private");
      formData.append("category", "sale-receipts");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      const { key } = await res.json();
      if (!key) throw new Error("Falha no upload");
      // Upload privado: persiste-se só a KEY (nunca URL) — ver server/storage.ts.
      await addReceiptMutation.mutateAsync({ saleId: createdSaleId, receiptUrl: key, receiptKey: key, caption: receiptCaption || undefined, receiptType });
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  const filteredClients = useMemo(() => {
    if (!clientSearch || clientSearch.length < 2) return [];
    const q = clientSearch.toLowerCase();
    return clients.filter((c: any) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))).slice(0, 6);
  }, [clientSearch, clients]);

  function getFilteredServices(itemId: string) {
    const q = (serviceSearch[itemId] || "").toLowerCase();
    if (!q || q.length < 1) return [];
    return allServices.filter(s => s.name.toLowerCase().includes(q)).slice(0, 6);
  }

  const total = useMemo(() => {
    return items.reduce((sum, it) => {
      const p = parseFloat(it.price.replace(",", ".")) || 0;
      return sum + p * (it.qty || 1);
    }, 0);
  }, [items]);

  function addItem() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), name: "", price: "", qty: 1 }]);
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function updateItem(id: string, field: keyof SaleItem, value: string | number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  const createMutation = trpc.sales.create.useMutation({
    onSuccess: (sale: any) => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      utils.sales.pending.invalidate();
      toast.success("Venda registrada! Adicione comprovantes se desejar.");
      if (sale?.id) setCreatedSaleId(sale.id);
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleSaveNewClient() {
    if (!selectedClient?.name.trim()) return;
    setSavingClient(true);
    createClientMutation.mutate({ name: selectedClient.name, phone: newClientPhone || "" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient?.name.trim()) { toast.error("Informe o nome do cliente"); return; }
    if (items.every(i => !i.name.trim())) { toast.error("Adicione pelo menos um item/serviço"); return; }
    if (total <= 0) { toast.error("O valor total deve ser maior que zero"); return; }
    const description = items.filter(i => i.name.trim()).map(i => `${i.qty}x ${i.name}`).join(", ");
    createMutation.mutate({
      transactionType: "receita",
      clientName: selectedClient.name,
      clientPhone: selectedClient.phone || undefined,
      clientId: selectedClient.id,
      total: total.toFixed(2),
      amountReceived: paymentStatus === "paid" ? total.toFixed(2) : "0",
      paymentMethod: paymentMethod as any,
      paymentStatus,
      description,
      notes: notes || undefined,
      saleDate: saleDate ? new Date(saleDate) : undefined,
    });
  }

  const fmt2 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Registrar Venda
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Cliente */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">1. Cliente *</Label>
            <div className="relative">
              <Input
                placeholder="Buscar cliente pelo nome ou telefone..."
                value={clientSearch || selectedClient?.name || ""}
                onChange={e => {
                  setClientSearch(e.target.value);
                  setSelectedClient(prev => prev ? { ...prev, name: e.target.value } : { name: e.target.value, phone: "" });
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                className="pr-10"
              />
              {selectedClient?.id && (
                <button type="button" onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
              {showClientDropdown && filteredClients.length > 0 && (
                <div className="absolute z-50 w-full bg-popover border rounded-md shadow-lg top-full mt-1 max-h-48 overflow-y-auto">
                  {filteredClients.map((c: any) => (
                    <button key={c.id} type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                      onMouseDown={() => { setSelectedClient({ id: c.id, name: c.name, phone: c.phone ?? "" }); setClientSearch(""); setShowClientDropdown(false); }}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedClient && !selectedClient.id && (
              <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-md p-3 space-y-2">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                  <span>⚠</span> Cliente não cadastrado. Deseja cadastrar agora?
                </p>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Telefone (opcional)"
                    value={newClientPhone}
                    onChange={e => setNewClientPhone(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewClient}
                    disabled={savingClient}
                    className="h-8 px-3 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 shrink-0"
                  >
                    {savingClient ? "Salvando..." : "Cadastrar"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Ou continue sem cadastrar — a venda será registrada com o nome digitado.</p>
              </div>
            )}
            {selectedClient?.id && (
              <p className="text-xs text-green-600 flex items-center gap-1">✓ {selectedClient.name} {selectedClient.phone && `· ${selectedClient.phone}`}</p>
            )}
          </div>

          {/* 2. Itens / Serviços */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">2. Serviços / Itens *</Label>
              <button type="button" onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-start">
                  {/* Nome do serviço */}
                  <div className="flex-1 relative">
                    <Input
                      placeholder={`Serviço ${idx + 1}...`}
                      value={serviceSearch[item.id] !== undefined ? serviceSearch[item.id] : item.name}
                      onChange={e => {
                        setServiceSearch(prev => ({ ...prev, [item.id]: e.target.value }));
                        updateItem(item.id, "name", e.target.value);
                        setShowServiceDropdown(prev => ({ ...prev, [item.id]: true }));
                      }}
                      onFocus={() => setShowServiceDropdown(prev => ({ ...prev, [item.id]: true }))}
                      onBlur={() => setTimeout(() => setShowServiceDropdown(prev => ({ ...prev, [item.id]: false })), 200)}
                      className="text-sm"
                    />
                    {showServiceDropdown[item.id] && getFilteredServices(item.id).length > 0 && (
                      <div className="absolute z-50 w-full bg-popover border rounded-md shadow-lg top-full mt-1 max-h-40 overflow-y-auto">
                        {getFilteredServices(item.id).map((s: any) => (
                          <button key={s.id} type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                            onMouseDown={() => {
                              updateItem(item.id, "name", s.name);
                              updateItem(item.id, "price", String(Number(s.price).toFixed(2)));
                              setServiceSearch(prev => ({ ...prev, [item.id]: s.name }));
                              setShowServiceDropdown(prev => ({ ...prev, [item.id]: false }));
                            }}
                          >
                            <span className="font-medium">{s.name}</span>
                            <span className="text-xs text-muted-foreground">{Number(s.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Qtd */}
                  <Input
                    type="number" min="1" value={item.qty}
                    onChange={e => updateItem(item.id, "qty", parseInt(e.target.value) || 1)}
                    className="w-14 text-sm text-center"
                    placeholder="Qtd"
                  />
                  {/* Preço */}
                  <Input
                    type="number" step="0.01" min="0" value={item.price}
                    onChange={e => updateItem(item.id, "price", e.target.value)}
                    className="w-24 text-sm"
                    placeholder="R$"
                  />
                  {/* Remover */}
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(item.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 mt-0.5">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Somatório */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">{fmt2(total)}</span>
            </div>
          </div>

          {/* 3. Data do serviço */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold">3. Data do Serviço</Label>
            <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
          </div>

          {/* 4. Forma de pagamento */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">4. Forma de Pagamento</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`px-2 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                    paymentMethod === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:border-primary/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Status do pagamento */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">5. Pagamento</Label>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => setPaymentStatus("paid")}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  paymentStatus === "paid"
                    ? 'border-green-500 bg-green-500/10 text-green-700'
                    : 'border-border bg-background text-foreground hover:border-green-300'
                }`}
              >
                ✓ Já Pago
              </button>
              <button type="button"
                onClick={() => setPaymentStatus("pending")}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  paymentStatus === "pending"
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700'
                    : 'border-border bg-background text-foreground hover:border-amber-300'
                }`}
              >
                ⏳ A Receber
              </button>
            </div>
          </div>

          {/* 6. Observações */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold">6. Observações (opcional)</Label>
            <Textarea placeholder="Ex: cliente solicitou retorno, produto utilizado..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          {/* 7. Comprovantes — aparece após salvar */}
          {createdSaleId && (
            <div className="space-y-3 border-t border-border pt-4">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                7. Comprovantes (opcional)
              </Label>
              {/* Tipo + legenda */}
              <div className="flex gap-2">
                <Select value={receiptType} onValueChange={(v) => setReceiptType(v as typeof receiptType)}>
                  <SelectTrigger className="w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Descrição (opcional)"
                  value={receiptCaption}
                  onChange={e => setReceiptCaption(e.target.value)}
                  className="flex-1 text-sm"
                />
              </div>
              {/* Botões de upload */}
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); e.target.value = ""; }} />
                <input ref={captureInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); e.target.value = ""; }} />
                <Button type="button" variant="outline" size="sm" className="flex-1 gap-2" disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />{uploading ? "Enviando..." : "Galeria"}
                </Button>
                <Button type="button" variant="outline" size="sm" className="flex-1 gap-2" disabled={uploading}
                  onClick={() => captureInputRef.current?.click()}>
                  <Camera className="h-4 w-4" />Câmera
                </Button>
              </div>
              {/* Galeria de comprovantes */}
              {receipts.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {receipts.map((r: any) => (
                    <div key={r.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
                      <img src={r.url} alt={r.caption || "Comprovante"} className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setLightboxUrl(r.url)} />
                      <button type="button"
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteReceiptMutation.mutate({ id: r.id })}>
                        <X className="h-3 w-3 text-white" />
                      </button>
                      {r.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                          <p className="text-white text-[10px] truncate">{r.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            {!createdSaleId ? (
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Registrar Venda"}
              </Button>
            ) : (
              <Button type="button" className="flex-1 bg-green-600 hover:bg-green-700" onClick={onClose}>
                ✓ Concluir
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
    {/* Lightbox */}
    {lightboxUrl && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setLightboxUrl(null)}>
        <img src={lightboxUrl} alt="Comprovante" className="max-w-full max-h-full object-contain rounded-lg" />
        <button type="button" onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full">
          <X className="h-6 w-6 text-white" />
        </button>
      </div>
    )}
    </>
  );
}

// ─── Edit Sale Modal ─────────────────────────────────────────────────────────
function EditSaleModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [clientName, setClientName] = useState(sale.clientName || "");
  const [clientPhone, setClientPhone] = useState(sale.clientPhone || "");
  const [total, setTotal] = useState(String(Number(sale.total || 0).toFixed(2)));
  const [amountReceived, setAmountReceived] = useState(String(Number(sale.amountReceived || sale.total || 0).toFixed(2)));
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod || "pix");
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid'>(sale.paymentStatus || "pending");
  const [saleDate, setSaleDate] = useState(() => {
    const d = sale.saleDate || sale.createdAt;
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState(sale.notes || "");
  // Comprovantes
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptType, setReceiptType] = useState<"pix" | "card" | "cash" | "boleto" | "other">("other");
  const [receiptCaption, setReceiptCaption] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const { data: receipts = [] } = trpc.sales.getReceipts.useQuery({ saleId: sale.id });
  const addReceiptMutation = trpc.sales.addReceipt.useMutation({
    onSuccess: () => { utils.sales.getReceipts.invalidate({ saleId: sale.id }); setReceiptCaption(""); toast.success("Comprovante adicionado!"); },
    onError: () => toast.error("Erro ao adicionar comprovante"),
  });
  const deleteReceiptMutation = trpc.sales.deleteReceipt.useMutation({
    onSuccess: () => { utils.sales.getReceipts.invalidate({ saleId: sale.id }); toast.success("Comprovante removido"); },
    onError: () => toast.error("Erro ao remover comprovante"),
  });
  const handleReceiptUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Arquivo muito grande (máx. 16MB)"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("visibility", "private");
      formData.append("category", "sale-receipts");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.key) throw new Error(data.error || "Erro no upload");
      // Upload privado: persiste-se só a KEY (nunca URL) — ver server/storage.ts.
      await addReceiptMutation.mutateAsync({ saleId: sale.id, receiptUrl: data.key, receiptKey: data.key, receiptType, caption: receiptCaption || undefined });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar comprovante");
    } finally {
      setUploading(false);
    }
  };

  const updateMutation = trpc.sales.update.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      utils.sales.pending.invalidate();
      toast.success("Venda atualizada!");
      onClose();
    },
    onError: () => toast.error("Erro ao atualizar venda"),
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      id: sale.id,
      clientName: clientName.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      total,
      amountReceived,
      paymentMethod: paymentMethod as any,
      paymentStatus,
      saleDate: saleDate ? new Date(saleDate + "T12:00:00") : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-bold text-foreground">Editar Venda #{String(sale.saleCode).padStart(4, "0")}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Cliente */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</p>
            <div>
              <Label className="text-xs mb-1 block">Nome</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Telefone</Label>
              <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valores</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Total (R$)</Label>
                <Input type="number" step="0.01" min="0" value={total} onChange={e => setTotal(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Recebido (R$)</Label>
                <Input type="number" step="0.01" min="0" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Pagamento */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Forma de Pagamento</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setPaymentMethod(opt.value)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    paymentMethod === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted bg-background"
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status de Pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {(['pending', 'partial', 'paid'] as const).map(s => (
                <button key={s} type="button" onClick={() => setPaymentStatus(s)}
                  className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                    paymentStatus === s
                      ? s === 'paid' ? 'bg-green-500 text-white border-green-500'
                        : s === 'partial' ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-gray-500 text-white border-gray-500'
                      : 'border-border text-muted-foreground hover:bg-muted bg-background'
                  }`}>{STATUS_LABELS[s]}</button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <Label className="text-xs mb-1 block">Data do Serviço</Label>
            <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Observações */}
          <div>
            <Label className="text-xs mb-1 block">Observações</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observações sobre a venda..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          {/* Comprovantes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Comprovantes {(receipts as any[]).length > 0 && <span className="text-primary">({(receipts as any[]).length})</span>}
            </p>
            {(receipts as any[]).length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {(receipts as any[]).map((r: any) => (
                  <div key={r.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <ComprovanteThumb value={r.receiptUrl} alt={r.caption} className="w-full h-full object-cover cursor-pointer" onResolvedClick={setLightboxUrl} />
                    <button type="button" onClick={() => deleteReceiptMutation.mutate({ id: r.id })} className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3 text-white" />
                    </button>
                    {r.caption && <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1"><p className="text-[10px] text-white truncate">{r.caption}</p></div>}
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 rounded-xl bg-muted/20 border border-dashed border-border space-y-2">
              <div className="flex gap-2">
                <select value={receiptType} onChange={e => setReceiptType(e.target.value as any)} className="flex-1 px-2 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none">
                  <option value="pix">PIX</option>
                  <option value="card">Cartão</option>
                  <option value="cash">Espécie</option>
                  <option value="boleto">Boleto</option>
                  <option value="other">Outro</option>
                </select>
                <Input value={receiptCaption} onChange={e => setReceiptCaption(e.target.value)} placeholder="Descrição (opcional)" className="flex-[2] text-xs h-8" />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleReceiptUpload(e.target.files[0]); e.target.value = ""; }} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1" />{uploading ? "Enviando..." : "Galeria"}
                </Button>
                <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" disabled={uploading}
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.setAttribute("capture", "environment"); fileInputRef.current.click(); } }}>
                  <Camera className="h-3.5 w-3.5 mr-1" />Câmera
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
    {/* Lightbox */}
    {lightboxUrl && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setLightboxUrl(null)}>
        <img src={lightboxUrl} alt="Comprovante" className="max-w-full max-h-full object-contain rounded-lg" />
        <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full">
          <X className="h-6 w-6 text-white" />
        </button>
      </div>
    )}
    </>
  );
}

// ─── Sale Detail Modal ────────────────────────────────────────────────────────
function SaleDetailModal({ sale, onClose, onStatusChange }: { sale: any; onClose: () => void; onStatusChange?: (updated: any) => void }) {
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptCaption, setReceiptCaption] = useState("");
  const [receiptType, setReceiptType] = useState<"pix" | "card" | "cash" | "boleto" | "other">("other");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(sale.paymentStatus);
  const [editTotal, setEditTotal] = useState(String(Number(sale.total).toFixed(2)));
  const [editReceived, setEditReceived] = useState(String(Number(sale.amountReceived || sale.total).toFixed(2)));
  const [editPaymentMethod, setEditPaymentMethod] = useState(sale.paymentMethod || "pix");
  const [editingPayment, setEditingPayment] = useState(false);
  // Modal de orçamento inline
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  // Buscar OS vinculada à venda (para exibir upsell items)
  const { data: executionData } = trpc.execution.getBySaleId.useQuery(
    { saleId: sale.id },
    { enabled: !!sale.id }
  );
  // Buscar orçamento vinculado (se houver budgetId)
  const { data: linkedBudget } = trpc.budgets.getById.useQuery(
    { id: sale.budgetId! },
    { enabled: !!sale.budgetId && showBudgetModal }
  );

  const updateStatusMutation = trpc.sales.update.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      toast.success(`Status atualizado para ${STATUS_LABELS[currentStatus] || currentStatus}`);
      if (onStatusChange) onStatusChange({ ...sale, paymentStatus: currentStatus });
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const updatePaymentMutation = trpc.sales.update.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      toast.success("Pagamento atualizado!");
      setEditingPayment(false);
      if (onStatusChange) onStatusChange({ ...sale, total: editTotal, amountReceived: editReceived, paymentMethod: editPaymentMethod });
    },
    onError: () => toast.error("Erro ao atualizar pagamento"),
  });

  function handleSavePayment() {
    updatePaymentMutation.mutate({
      id: sale.id,
      total: editTotal,
      amountReceived: editReceived,
      paymentMethod: editPaymentMethod as any,
    });
  }

  const { data: receipts = [], isLoading: loadingReceipts } = trpc.sales.getReceipts.useQuery({ saleId: sale.id });

  const addReceiptMutation = trpc.sales.addReceipt.useMutation({
    onSuccess: () => {
      utils.sales.getReceipts.invalidate({ saleId: sale.id });
      setReceiptCaption("");
      toast.success("Comprovante adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar comprovante"),
  });

  const deleteReceiptMutation = trpc.sales.deleteReceipt.useMutation({
    onSuccess: () => {
      utils.sales.getReceipts.invalidate({ saleId: sale.id });
      toast.success("Comprovante removido");
    },
    onError: () => toast.error("Erro ao remover comprovante"),
  });

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Arquivo muito grande (máx. 16MB)"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("visibility", "private");
      formData.append("category", "sale-receipts");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.key) throw new Error(data.error || "Erro no upload");
      // Upload privado: persiste-se só a KEY (nunca URL) — ver server/storage.ts.
      await addReceiptMutation.mutateAsync({
        saleId: sale.id,
        receiptUrl: data.key,
        receiptKey: data.key,
        receiptType,
        caption: receiptCaption || undefined,
      });
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar comprovante");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Comprovante" className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-500" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Venda #{String(sale.saleCode).padStart(4, "0")}</h2>
              <p className="text-xs text-muted-foreground">{fmtDate(sale.saleDate || sale.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Cliente */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cliente</p>
            <p className="font-semibold text-foreground">{sale.clientName}</p>
            {sale.clientPhone && <p className="text-sm text-muted-foreground">{sale.clientPhone}</p>}
            {sale.budgetId && (
              <button
                type="button"
                onClick={() => setShowBudgetModal(true)}
                className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer flex items-center gap-1 mt-1 font-medium"
              >
                <FileText className="h-3 w-3" /> Ver Orçamento #{String(sale.budgetId).padStart(4, "0")}
              </button>
            )}
          </div>

          {/* Itens da Venda (apenas vendas registradas pelo modal, sem orçamento) */}
          {sale.description && !sale.budgetId && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Itens da Venda</p>
              <div className="space-y-2">
                {sale.description.split(", ").map((item: string, idx: number) => {
                  const match = item.match(/^(\d+)x\s+(.+)$/);
                  const qty = match ? match[1] : "1";
                  const name = match ? match[2] : item;
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{qty}</span>
                        <span className="text-sm text-foreground">{name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Total</span>
                <span className="font-bold text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(sale.total))}</span>
              </div>
            </div>
          )}

          {/* Upsell Items (serviços adicionais fechados na casa) */}
          {executionData && executionData.upsellItems.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Serviços Adicionais (Upsell)
                </p>
                {sale.budgetId && (
                  <button
                    type="button"
                    onClick={() => setShowBudgetModal(true)}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" /> Orçamento original
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {executionData.upsellItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {item.quantity}
                      </span>
                      <span className="text-sm text-foreground">{item.description}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.total))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between">
                <span className="text-xs text-amber-700 font-semibold">Total Upsell</span>
                <span className="font-bold text-amber-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    executionData.upsellItems.reduce((acc: number, i: any) => acc + Number(i.total), 0)
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Pagamento */}
          <div className="space-y-3">
            {/* Cabeçalho da seção */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</p>
              <button
                type="button"
                onClick={() => setEditingPayment(v => !v)}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {editingPayment ? "✕ Cancelar" : "✏️ Editar"}
              </button>
            </div>

            {editingPayment ? (
              /* Modo edição */
              <div className="p-4 rounded-xl border-2 border-blue-400 bg-blue-50/30 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Total (R$)</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={editTotal}
                      onChange={e => setEditTotal(e.target.value)}
                      className="font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Recebido (R$)</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={editReceived}
                      onChange={e => setEditReceived(e.target.value)}
                      className="font-bold text-green-600"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Forma de Pagamento</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditPaymentMethod(opt.value)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          editPaymentMethod === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:bg-muted bg-background"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleSavePayment}
                  disabled={updatePaymentMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {updatePaymentMutation.isPending ? "Salvando..." : "✓ Salvar alterações"}
                </Button>
              </div>
            ) : (
              /* Modo visualização */
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="font-bold text-foreground text-lg">{fmt(editTotal)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Recebido</p>
                  <p className="font-bold text-green-500 text-lg">{fmt(editReceived)}</p>
                </div>
                {currentStatus !== 'pending' && editPaymentMethod && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Forma de Pagamento</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PAYMENT_COLORS[editPaymentMethod] || ''}` }>
                      {PAYMENT_LABELS[editPaymentMethod] || editPaymentMethod}
                    </span>
                  </div>
                )}
                {currentStatus === 'pending' && (sale as any).paymentDueDate && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 col-span-2">
                    <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                      <span>⏰</span> Pagamento Programado
                    </p>
                    <p className="text-sm font-bold text-amber-800 mt-0.5">
                      Vence em: {new Date((sale as any).paymentDueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    {(sale as any).paymentDueDays && (
                      <p className="text-xs text-amber-600 mt-0.5">Prazo de {(sale as any).paymentDueDays} dias após a venda</p>
                    )}
                  </div>
                )}
                {currentStatus === 'pending' && !(sale as any).paymentDueDate && (
                  <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 col-span-2">
                    <p className="text-xs text-yellow-700 font-medium">⏳ Aguardando confirmação de pagamento</p>
                    <p className="text-xs text-yellow-600 mt-0.5">Clique em ✏️ Editar para registrar a forma de pagamento após receber.</p>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Status de Pagamento</p>
              <div className="flex gap-2">
                {(['pending', 'partial', 'paid'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setCurrentStatus(s);
                      updateStatusMutation.mutate({ id: sale.id, paymentStatus: s });
                    }}
                    disabled={updateStatusMutation.isPending}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      currentStatus === s
                        ? s === 'paid' ? 'bg-green-500 text-white border-green-500'
                          : s === 'partial' ? 'bg-yellow-500 text-white border-yellow-500'
                          : 'bg-gray-500 text-white border-gray-500'
                        : 'bg-transparent border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {sale.notes && (
            <div className="p-3 rounded-xl bg-muted/30 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
              <p className="text-sm text-foreground">{sale.notes}</p>
            </div>
          )}

          {/* Comprovantes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" /> Comprovantes
              </p>
              <span className="text-xs text-muted-foreground">{receipts.length} arquivo(s)</span>
            </div>

            {/* Grid de comprovantes */}
            {loadingReceipts ? (
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map(i => <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : receipts.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {receipts.map((r: any) => (
                  <div key={r.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <ComprovanteThumb
                      value={r.receiptUrl}
                      alt={r.caption}
                      className="w-full h-full object-cover cursor-pointer"
                      onResolvedClick={setLightboxUrl}
                    />
                    {r.receiptType && (
                      <span className="absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">
                        {PAYMENT_LABELS[r.receiptType] || r.receiptType}
                      </span>
                    )}
                    <button
                      onClick={() => deleteReceiptMutation.mutate({ id: r.id })}
                      className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                    {r.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                        <p className="text-[10px] text-white truncate">{r.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 bg-muted/20 rounded-xl border border-dashed border-border mb-3">
                <Receipt className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum comprovante adicionado</p>
              </div>
            )}

            {/* Upload de comprovante */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adicionar Comprovante</p>
              <div className="flex gap-2">
                <select
                  value={receiptType}
                  onChange={e => setReceiptType(e.target.value as any)}
                  className="flex-1 px-2 py-1.5 rounded-md border border-input bg-background text-xs focus:outline-none"
                >
                  <option value="pix">PIX</option>
                  <option value="card">Cartão</option>
                  <option value="cash">Espécie</option>
                  <option value="boleto">Boleto</option>
                  <option value="other">Outro</option>
                </select>
                <Input
                  value={receiptCaption}
                  onChange={e => setReceiptCaption(e.target.value)}
                  placeholder="Descrição (opcional)"
                  className="flex-[2] text-xs h-8"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ""; }}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  disabled={uploading}
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute("capture");
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploading ? "Enviando..." : "Galeria"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  disabled={uploading}
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute("capture", "environment");
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Camera className="h-3.5 w-3.5 mr-1" />
                  {uploading ? "Enviando..." : "Câmera"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Modal inline: Visualizar Orçamento Original */}
    {showBudgetModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-bold text-foreground">
                Orçamento #{sale.budgetId ? String(sale.budgetId).padStart(4, '0') : '—'}
              </h2>
            </div>
            <button onClick={() => setShowBudgetModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {!linkedBudget ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Cliente */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
                  <p className="font-semibold text-foreground">{linkedBudget.clientName}</p>
                  {linkedBudget.clientPhone && <p className="text-sm text-muted-foreground">{linkedBudget.clientPhone}</p>}
                </div>

                {/* Itens do orçamento */}
                {linkedBudget.items && linkedBudget.items.length > 0 && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Itens do Orçamento</p>
                    <div className="space-y-2">
                      {linkedBudget.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {item.quantity}
                            </span>
                            <span className="text-sm text-foreground">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.subtotal))}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-semibold">Total do Orçamento</span>
                      <span className="font-bold text-foreground text-base">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(linkedBudget.total))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Observações */}
                {linkedBudget.notes && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                    <p className="text-sm text-foreground">{linkedBudget.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="p-5 border-t border-border">
            <Button className="w-full" onClick={() => setShowBudgetModal(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Sales() {
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [viewingSale, setViewingSale] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  // Mini-modal de método de pagamento
  const [payModal, setPayModal] = useState<{ sale: any } | null>(null);
  const [payModalMethod, setPayModalMethod] = useState('pix');
  // Modal de confirmar serviço realizado
  const [completedModal, setCompletedModal] = useState<{ sale: any } | null>(null);
  // Modal de registrar pagamento (após realizado)
  const [registerPayModal, setRegisterPayModal] = useState<{ sale: any } | null>(null);
  const [registerPayMethod, setRegisterPayMethod] = useState('pix');
  const [registerPayAmount, setRegisterPayAmount] = useState('');
  // Filtro de mês (igual ao Financeiro)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterAllMonths, setFilterAllMonths] = useState(false);
  // Filtro de período customizado (data início / fim)
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [usePeriodFilter, setUsePeriodFilter] = useState(false);

  const utils = trpc.useUtils();

  // Calcular datas do mês selecionado ou período customizado
  const { startDate, endDate } = useMemo(() => {
    if (usePeriodFilter && periodStart) {
      return {
        startDate: new Date(periodStart + "T00:00:00"),
        endDate: periodEnd ? new Date(periodEnd + "T23:59:59") : new Date(periodStart + "T23:59:59"),
      };
    }
    if (filterAllMonths) return { startDate: undefined, endDate: undefined };
    const [y, m] = selectedMonth.split('-').map(Number);
    return {
      startDate: new Date(y, m - 1, 1),
      endDate: new Date(y, m, 0, 23, 59, 59),
    };
  }, [selectedMonth, filterAllMonths, usePeriodFilter, periodStart, periodEnd]);

  const monthLabel = useMemo(() => {
    if (usePeriodFilter && periodStart) {
      const start = new Date(periodStart + "T00:00:00").toLocaleDateString('pt-BR');
      const end = periodEnd ? new Date(periodEnd + "T23:59:59").toLocaleDateString('pt-BR') : start;
      return `${start}${start !== end ? ` até ${end}` : ''}`;
    }
    if (filterAllMonths) return 'Todos os períodos';
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [selectedMonth, filterAllMonths, usePeriodFilter, periodStart, periodEnd]);

  const { data: sales = [], isLoading } = trpc.sales.list.useQuery({
    paymentMethod: filterPayment !== "all" ? filterPayment : undefined,
    paymentStatus: filterStatus !== "all" ? filterStatus : undefined,
    search: search || undefined,
    startDate: startDate,
    endDate: endDate,
  });

  const { data: pendingData, isLoading: pendingLoading } = trpc.sales.pending.useQuery({
    search: search || undefined,
  });

  const { data: metrics } = trpc.sales.metrics.useQuery();

  const deleteSaleMutation = trpc.sales.delete.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      utils.sales.pending.invalidate();
      setDeleteConfirm(null);
      toast.success("Venda removida");
    },
    onError: () => toast.error("Erro ao remover venda"),
  });

  const quickStatusMutation = trpc.sales.update.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      utils.sales.pending.invalidate();
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const markAsCompletedMutation = trpc.sales.markAsCompleted.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      utils.sales.pending.invalidate();
      const sale = completedModal?.sale;
      setCompletedModal(null);
      if (sale) {
        setRegisterPayMethod(sale.paymentMethod || 'pix');
        setRegisterPayAmount('');
        setRegisterPayModal({ sale });
      }
      toast.success('Serviço marcado como realizado!');
    },
    onError: () => toast.error('Erro ao marcar como realizado'),
  });

  const registerPaymentMutation = trpc.sales.registerPayment.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.metrics.invalidate();
      utils.sales.pending.invalidate();
      setRegisterPayModal(null);
      toast.success('Pagamento registrado! ✓');
    },
    onError: () => toast.error('Erro ao registrar pagamento'),
  });

  function cycleStatus(sale: any) {
    const order: Array<'pending' | 'partial' | 'paid'> = ['pending', 'partial', 'paid'];
    const idx = order.indexOf(sale.paymentStatus);
    const next = order[(idx + 1) % order.length];
    quickStatusMutation.mutate({ id: sale.id, paymentStatus: next });
    toast.success(`${sale.clientName}: ${STATUS_LABELS[next]}`);
  }

  function openPayModal(sale: any) {
    setPayModalMethod(sale.paymentMethod || 'pix');
    setPayModal({ sale });
  }

  function confirmPayModal() {
    if (!payModal) return;
    quickStatusMutation.mutate(
      { id: payModal.sale.id, paymentStatus: 'paid', paymentMethod: payModalMethod as any },
      {
        onSuccess: () => {
          toast.success(`${payModal.sale.clientName}: Marcado como Pago`);
          setPayModal(null);
        },
      }
    );
  }

  function getDaysPending(sale: any): number {
    const ref = sale.saleDate || sale.createdAt;
    if (!ref) return 0;
    const diff = Date.now() - new Date(ref).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function daysBadgeColor(days: number) {
    if (days <= 1) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (days <= 3) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    return 'bg-red-500/10 text-red-600 border-red-500/30';
  }

  return (
    <FeatureGate featureKey="vendas" featureLabel="Vendas e Pagamentos">
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
            <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setFilterAllMonths(false); }}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => setFilterAllMonths(v => !v)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                filterAllMonths
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-input hover:text-foreground'
              }`}
            >
              Todos
            </button>
            <Button onClick={() => setShowForm(true)} size="sm" className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Registrar Venda
            </Button>
          </div>
        </div>

        {/* Filtro de período customizado */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-muted/40">
          <button
            onClick={() => { setUsePeriodFilter(v => !v); if (usePeriodFilter) { setPeriodStart(""); setPeriodEnd(""); } }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
              usePeriodFilter
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            {usePeriodFilter ? '✓ Filtro por período ativo' : 'Filtrar por período'}
          </button>
          {usePeriodFilter && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">De</span>
                <input
                  type="date"
                  value={periodStart}
                  onChange={e => setPeriodStart(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">até</span>
                <input
                  type="date"
                  value={periodEnd}
                  min={periodStart}
                  onChange={e => setPeriodEnd(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {(periodStart || periodEnd) && (
                <button
                  onClick={() => { setPeriodStart(""); setPeriodEnd(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Limpar datas
                </button>
              )}
            </>
          )}
          {!usePeriodFilter && (
            <span className="text-xs text-muted-foreground">Usando filtro de mês: <strong className="text-foreground capitalize">{monthLabel}</strong></span>
          )}
        </div>

        {/* Abas principais */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todas as Vendas
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Pendentes a Receber
            {pendingData && pendingData.items.length > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {pendingData.items.length}
              </span>
            )}
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 sm:p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10"><ShoppingCart className="h-3.5 w-3.5 text-blue-500" /></div>
              <span className="text-xs text-muted-foreground leading-tight">Vendas no Mês</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{metrics?.thisMonthSales ?? 0}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-green-500/10"><DollarSign className="h-3.5 w-3.5 text-green-500" /></div>
              <span className="text-xs text-muted-foreground leading-tight">Faturamento</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-green-500 break-all leading-tight">{fmt(metrics?.thisMonthRevenue ?? 0)}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-purple-500/10"><TrendingUp className="h-3.5 w-3.5 text-purple-500" /></div>
              <span className="text-xs text-muted-foreground leading-tight">Ticket Médio</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-foreground break-all leading-tight">{fmt(metrics?.avgTicket ?? 0)}</p>
          </div>
          {/* Card Aguardando Pagamento - usa pendingData (sem filtro de período/status) */}
          <div className="p-3 sm:p-4 rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10"><Clock className="h-3.5 w-3.5 text-amber-500" /></div>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-tight">A Receber</span>
            </div>
            <p className="text-base sm:text-xl font-bold text-amber-600 break-all leading-tight">{fmt(pendingData?.totalPending ?? 0)}</p>
            <p className="text-xs text-amber-500 mt-0.5">{pendingData?.items?.length ?? 0} venda{(pendingData?.items?.length ?? 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Somatório de Pendentes */}
        {(() => {
          const allSales = sales as any[];
          const pendingSales = allSales.filter(s => s.paymentStatus === 'pending' || s.paymentStatus === 'partial');
          if (pendingSales.length === 0) return null;
          const totalPending = pendingSales.reduce((sum: number, s: any) => {
            const total = parseFloat(String(s.total ?? 0));
            const received = parseFloat(String(s.amountReceived ?? 0));
            return sum + Math.max(0, total - received);
          }, 0);
          const countPending = pendingSales.filter((s: any) => s.paymentStatus === 'pending').length;
          const countPartial = pendingSales.filter((s: any) => s.paymentStatus === 'partial').length;
          return (
            <div className="flex flex-col gap-2 p-4 rounded-xl border-2 border-amber-400/60 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-400/20 flex-shrink-0">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Total a Receber (Geral)</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300 break-all leading-tight">{fmt(totalPending)}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {countPending > 0 && `${countPending} pendente${countPending > 1 ? 's' : ''}`}
                {countPending > 0 && countPartial > 0 && ' · '}
                {countPartial > 0 && `${countPartial} parcial${countPartial > 1 ? 'is' : ''}`}
                {' · total de todas as vendas não quitadas'}
              </p>
            </div>
          );
        })()}



        {/* Filtros de busca (apenas na aba Todas) */}
        {activeTab === 'all' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por cliente ou telefone..."
                className="pl-9"
              />
            </div>
            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Todos os pagamentos</option>
              <option value="pix">PIX</option>
              <option value="card">Cartão</option>
              <option value="cash">Espécie</option>
              <option value="boleto">Boleto</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Todos os status</option>
              <option value="paid">Pago</option>
              <option value="partial">Parcial</option>
              <option value="pending">Pendente</option>
            </select>
          </div>
        )}

        {/* Lista */}
        {activeTab === 'pending' ? (
          // ─── ABA PENDENTES A RECEBER ───
          pendingLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : !pendingData || pendingData.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500/40 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Tudo em dia!</h3>
              <p className="text-sm text-muted-foreground">Não há vendas pendentes a receber no período selecionado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Resumo total */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400/60">
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Total a Receber</p>
                  <p className="text-xs text-amber-600">{pendingData.items.length} venda{pendingData.items.length !== 1 ? 's' : ''} em aberto</p>
                </div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingData.totalPending)}
                </p>
              </div>
              {/* Lista de pendentes */}
              {pendingData.items.map((sale: any) => {
                const total = Number(sale.total ?? 0);
                const received = Number(sale.amountReceived ?? 0);
                const remaining = Math.max(0, total - received);
                return (
                  <div key={sale.id} className="rounded-xl border-2 border-amber-200 dark:border-amber-800/40 bg-card hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-colors overflow-hidden">
                    {/* Linha 1: avatar + nome + valor a receber */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm">
                        {sale.clientName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className="font-bold text-foreground text-base leading-tight truncate">{sale.clientName}</p>
                          <span className="text-xs text-muted-foreground font-mono flex-shrink-0">#{String(sale.saleCode).padStart(4, '0')}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{fmtDate(sale.saleDate || sale.createdAt)}</span>
                          {sale.clientPhone && (
                            <span className="text-xs text-muted-foreground">· {sale.clientPhone}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-amber-600 text-lg">{fmt(remaining)}</p>
                        {sale.paymentStatus === 'partial' && (
                          <p className="text-xs text-muted-foreground">de {fmt(total)}</p>
                        )}
                      </div>
                    </div>

                    {/* Barra de progresso (apenas parcial) */}
                    {sale.paymentStatus === 'partial' && (
                      <div className="px-4 pb-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Recebido: {fmt(received)}</span>
                          <span>Falta: {fmt(remaining)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-amber-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (received / total) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Indicador de pagamento programado */}
                    {sale.paymentDueDate && (
                      <div className="px-4 pb-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
                          <span className="text-sm">⏰</span>
                          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            Vence em: {new Date(sale.paymentDueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {sale.paymentDueDays && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">· {sale.paymentDueDays} dias</span>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Linha 2: badge status + ações */}
                    {(() => {
                      const days = getDaysPending(sale);
                      return (
                        <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1 border-t border-amber-100 dark:border-amber-800/30 mt-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                              sale.paymentStatus === 'partial'
                                ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                                : 'bg-gray-500/10 text-gray-500 border-gray-500/30'
                            }`}>
                              {sale.paymentStatus === 'partial' ? 'Parcial' : 'Pendente'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${daysBadgeColor(days)}`}
                              title={`Há ${days} dia${days !== 1 ? 's' : ''}`}>
                              {days === 0 ? 'Hoje' : days === 1 ? '1 dia' : `${days} dias`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openPayModal(sale)}
                              disabled={quickStatusMutation.isPending}
                              title="Clique para marcar como pago"
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500 hover:text-white transition-all"
                            >
                              Marcar Pago
                            </button>
                            <button
                              onClick={() => setViewingSale(sale)}
                              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {deleteConfirm === sale.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteSaleMutation.mutate({ id: sale.id })}
                                  className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1 text-xs bg-muted text-foreground rounded-md hover:bg-muted/80"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(sale.id)}
                                title="Excluir venda pendente"
                                className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

            </div>
          )
        ) : isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma venda encontrada</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              As vendas aparecem aqui automaticamente quando você marca um orçamento como vendido.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale: any) => (
              <div key={sale.id} className="rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors overflow-hidden">
                {/* Linha superior: avatar + nome + código + valor */}
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
                  {/* Avatar */}
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0 shadow-sm">
                    {sale.clientName?.charAt(0)?.toUpperCase() || "?"}
                  </div>

                  {/* Nome + código */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <p className="font-bold text-foreground text-sm sm:text-base leading-tight truncate">{sale.clientName}</p>
                      <span className="text-xs text-muted-foreground font-mono flex-shrink-0">#{String(sale.saleCode).padStart(4, "0")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(sale.saleDate || sale.createdAt)}</p>
                  </div>

                  {/* Valor */}
                  <div className="text-right flex-shrink-0">
                    {sale.paymentStatus === 'pending' ? (
                      <>
                        <p className="font-bold text-amber-600 text-sm sm:text-base">{fmt(Number(sale.total ?? 0))}</p>
                        <p className="text-xs text-muted-foreground">a receber</p>
                      </>
                    ) : sale.paymentStatus === 'partial' ? (
                      <>
                        <p className="font-bold text-yellow-600 text-sm sm:text-base">{fmt(Math.max(0, Number(sale.total ?? 0) - Number(sale.amountReceived ?? 0)))}</p>
                        <p className="text-xs text-muted-foreground">de {fmt(Number(sale.total ?? 0))}</p>
                      </>
                    ) : (
                      <p className="font-bold text-green-600 text-sm sm:text-base">{fmt(Number(sale.amountReceived ?? sale.total ?? 0))}</p>
                    )}
                  </div>
                </div>

                {/* Linha inferior: status + ações */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 sm:px-4 pb-3 pt-1 border-t border-border/50 mt-1">
                  {/* Badge de status */}
                  <div className="flex items-center gap-1 min-w-0 flex-shrink">
                    {sale.serviceStatus === 'scheduled' ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-500/10 text-blue-600 border border-blue-500/30 flex items-center gap-1 whitespace-nowrap">
                        <CalendarCheck className="h-3 w-3 flex-shrink-0" />
                        {sale.scheduledDate
                          ? `Agendado ${new Date(sale.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
                          : 'Agendado'}
                      </span>
                    ) : sale.paymentStatus === 'paid' ? (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${PAYMENT_COLORS[sale.paymentMethod] || 'bg-muted text-muted-foreground'}`}>
                        {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
                        {(sale.paymentMethod?.startsWith('card')) && sale.installments > 1 && ` ${sale.installments}x`}
                      </span>
                    ) : sale.paymentStatus === 'pending' ? (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-700 whitespace-nowrap">
                        Aguard. pgto
                      </span>
                    ) : null}
                  </div>

                  {/* Botões de ação */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {sale.serviceStatus === 'scheduled' ? (
                      <button
                        onClick={() => setCompletedModal({ sale })}
                        disabled={markAsCompletedMutation.isPending}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1 whitespace-nowrap"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Realizado
                      </button>
                    ) : sale.paymentStatus === 'pending' ? (
                      <button
                        onClick={() => { setRegisterPayMethod(sale.paymentMethod || 'pix'); setRegisterPayModal({ sale }); }}
                        disabled={registerPaymentMutation.isPending}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500 hover:text-white transition-all whitespace-nowrap"
                      >
                        💰 Reg. Pgto
                      </button>
                    ) : (
                      <button
                        onClick={() => cycleStatus(sale)}
                        disabled={quickStatusMutation.isPending}
                        title="Clique para alternar status"
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:opacity-80 whitespace-nowrap ${
                          sale.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500 hover:text-white'
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/30 hover:bg-gray-500 hover:text-white'
                        }`}
                      >
                        {STATUS_LABELS[sale.paymentStatus] || sale.paymentStatus}
                      </button>
                    )}
                    <button
                      onClick={() => setViewingSale(sale)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingSale(sale)}
                      className="p-2 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors"
                      title="Editar venda"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {deleteConfirm === sale.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteSaleMutation.mutate({ id: sale.id })}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-muted text-foreground rounded-md hover:bg-muted/80"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(sale.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Confirmar que o serviço foi realizado */}
      {completedModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground text-base">Serviço Realizado?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{completedModal.sale.clientName} · {fmt(completedModal.sale.total)}</p>
              </div>
              <button onClick={() => setCompletedModal(null)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">Confirme que o serviço foi executado. Em seguida, você poderá registrar o pagamento.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCompletedModal(null)}>Cancelar</Button>
                <Button
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => markAsCompletedMutation.mutate({ id: completedModal.sale.id })}
                  disabled={markAsCompletedMutation.isPending}
                >
                  {markAsCompletedMutation.isPending ? 'Salvando...' : '✓ Sim, foi realizado'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pagamento (após serviço realizado) */}
      {registerPayModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground text-base">Registrar Pagamento</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{registerPayModal.sale.clientName} · {fmt(registerPayModal.sale.total)}</p>
              </div>
              <button onClick={() => setRegisterPayModal(null)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Forma de Pagamento</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'pix', label: 'PIX' },
                    { value: 'cash', label: 'Dinheiro' },
                    { value: 'card_1x', label: 'Cartão 1x' },
                    { value: 'card_2x', label: 'Cartão 2x' },
                    { value: 'card_3x', label: 'Cartão 3x' },
                    { value: 'boleto', label: 'Boleto' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setRegisterPayMethod(opt.value)}
                      className={`px-2 py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${
                        registerPayMethod === opt.value
                          ? 'border-green-500 bg-green-500/10 text-green-700'
                          : 'border-border bg-background text-foreground hover:border-green-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold mb-2 block">Valor Recebido (R$)</Label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={`${Number(registerPayModal.sale.total).toFixed(2)}`}
                  value={registerPayAmount}
                  onChange={e => setRegisterPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-muted-foreground mt-1">Deixe em branco para usar o valor total: R$ {Number(registerPayModal.sale.total).toFixed(2)}</p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setRegisterPayModal(null)}>Cancelar</Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => registerPaymentMutation.mutate({ id: registerPayModal.sale.id, paymentMethod: registerPayMethod as any, amountReceived: registerPayAmount || String(registerPayModal.sale.total) })}
                  disabled={registerPaymentMutation.isPending}
                >
                  {registerPaymentMutation.isPending ? 'Salvando...' : '✓ Confirmar Pago'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini-modal: Confirmar Pagamento */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground text-base">Confirmar Pagamento</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{payModal.sale.clientName} · {fmt(payModal.sale.total)}</p>
              </div>
              <button onClick={() => setPayModal(null)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Método de Pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPayModalMethod(opt.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                        payModalMethod === opt.value
                          ? 'border-green-500 bg-green-500/10 text-green-700'
                          : 'border-border bg-background text-foreground hover:border-green-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setPayModal(null)}>Cancelar</Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  onClick={confirmPayModal}
                  disabled={quickStatusMutation.isPending}
                >
                  {quickStatusMutation.isPending ? 'Salvando...' : '✓ Confirmar Pago'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      {viewingSale && (
        <SaleDetailModal
          sale={viewingSale}
          onClose={() => setViewingSale(null)}
          onStatusChange={(updated) => setViewingSale(updated)}
        />
      )}

      {/* Modal de registrar venda */}
      {showForm && (
        <RegisterSaleModal
          open={showForm}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Modal de editar venda */}
      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
        />
      )}
    </DashboardLayout>
    </FeatureGate>
  );
}
