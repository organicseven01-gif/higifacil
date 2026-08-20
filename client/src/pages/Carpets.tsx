import DashboardLayout from "@/components/DashboardLayout";
import FeatureGate from "@/components/FeatureGate";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, Phone, Clock, CheckCircle2, Truck,
  Waves, AlertTriangle, DollarSign, Eye, X, ChevronRight, Calendar,
  PackageCheck, Loader2, UserSearch, Camera, ChevronLeft, ZoomIn, Images
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);
}
function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
function formatPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return p;
}
function isOverdue(order: any) {
  if (order.status === "delivered") return false;
  return new Date(order.expectedDelivery) < new Date();
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  collected: { label: "Recolhido",  icon: PackageCheck, color: "oklch(0.55 0.18 240)", bg: "oklch(0.94 0.04 240)" },
  washing:   { label: "Lavando",    icon: Waves,        color: "oklch(0.55 0.18 200)", bg: "oklch(0.94 0.04 200)" },
  ready:     { label: "Pronto",     icon: CheckCircle2, color: "oklch(0.50 0.18 155)", bg: "oklch(0.94 0.06 155)" },
  delivered: { label: "Entregue",   icon: Truck,        color: "oklch(0.45 0.14 140)", bg: "oklch(0.92 0.04 140)" },
} as const;

const STATUS_FLOW: Array<keyof typeof STATUS_CONFIG> = ["collected", "washing", "ready", "delivered"];

const CARPET_TYPES = ["Persa", "Sisal", "Felpudo", "Vinil", "Shaggy", "Kilim", "Sintético", "Lã", "Juta", "Outro"];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.collected;
  const Icon = cfg.icon;
  if (overdue && status !== "delivered") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
        style={{ background: "oklch(0.55 0.20 25)" }}>
        <AlertTriangle className="h-3 w-3" /> Atrasado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ background: cfg.color }}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="rounded-2xl border border-border p-4 flex items-center gap-4" style={{ background: bg }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color }}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ─── Photo Lightbox ───────────────────────────────────────────────────────────
function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
  onUpdateCaption,
  onDeletePhoto,
}: {
  photos: any[];
  initialIndex: number;
  onClose: () => void;
  onUpdateCaption?: (id: number, caption: string) => void;
  onDeletePhoto?: (id: number) => void;
}) {
  const [current, setCurrent] = useState(initialIndex);
  const [caption, setCaption] = useState(photos[initialIndex]?.caption ?? "");
  const [saving, setSaving] = useState(false);

  const photo = photos[current];

  useEffect(() => {
    setCaption(photos[current]?.caption ?? "");
  }, [current]);

  // Fechar com ESC, navegar com setas
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && current > 0) setCurrent(c => c - 1);
      if (e.key === "ArrowRight" && current < photos.length - 1) setCurrent(c => c + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, photos.length, onClose]);

  async function handleSaveCaption() {
    if (!onUpdateCaption || !photo?.id) return;
    setSaving(true);
    try {
      await onUpdateCaption(photo.id, caption);
      toast.success("Observação salva!");
    } catch {
      toast.error("Erro ao salvar observação");
    } finally {
      setSaving(false);
    }
  }

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: photo.photoType === "before" ? "oklch(0.55 0.18 240)" : "oklch(0.50 0.18 155)" }}
          >
            {photo.photoType === "before" ? "Antes" : photo.photoType === "after" ? "Depois" : "Outro"}
          </span>
          <span className="text-white/60 text-sm">{current + 1} / {photos.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {onDeletePhoto && (
            <button
              onClick={() => {
                if (!confirm("Excluir esta foto?")) return;
                onDeletePhoto(photo.id);
                if (photos.length === 1) { onClose(); return; }
                setCurrent(c => Math.max(0, c - 1));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-medium transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Imagem */}
      <div className="flex-1 flex items-center justify-center relative px-12 min-h-0">
        {/* Navegar anterior */}
        {current > 0 && (
          <button
            onClick={() => setCurrent(c => c - 1)}
            className="absolute left-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}

        <img
          src={photo.photoUrl}
          alt="foto do tapete"
          className="max-w-full max-h-full object-contain rounded-xl"
          style={{ maxHeight: "calc(100vh - 220px)" }}
        />

        {/* Navegar próximo */}
        {current < photos.length - 1 && (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="absolute right-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 justify-center px-4 py-2 shrink-0 overflow-x-auto">
          {photos.map((p: any, i: number) => (
            <button
              key={p.id ?? i}
              onClick={() => setCurrent(i)}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === current ? "border-white scale-110" : "border-white/20 opacity-60 hover:opacity-90"}`}
            >
              <img src={p.photoUrl ?? p.preview} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Campo de observação */}
      <div className="px-4 pb-4 shrink-0">
        <div className="flex gap-2 items-end bg-white/5 rounded-xl p-3">
          <div className="flex-1">
            <label className="text-xs text-white/50 mb-1 block">Observação desta foto</label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Ex: Mancha de gordura no canto superior direito..."
              rows={2}
              className="w-full bg-white/10 text-white placeholder:text-white/30 rounded-lg border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
            />
          </div>
          {onUpdateCaption && (
            <Button
              size="sm"
              disabled={saving || caption === (photos[current]?.caption ?? "")}
              onClick={handleSaveCaption}
              className="shrink-0 text-white h-9"
              style={{ background: "oklch(0.50 0.18 155)" }}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Client Search Autocomplete ─────────────────────────────────────────────
function ClientSearch({ onSelect }: { onSelect: (name: string, phone: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: clients = [] } = trpc.clients.list.useQuery(
    { search: query },
    { enabled: query.length >= 2 }
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative col-span-2">
      <label className="text-xs text-muted-foreground mb-1 block">Buscar cliente cadastrado</label>
      <div className="relative">
        <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Digite nome ou telefone para buscar..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
        />
      </div>
      {open && clients.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {clients.slice(0, 6).map((c: any) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
              onClick={() => {
                onSelect(c.name, c.phone);
                setQuery("");
                setOpen(false);
              }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "oklch(0.32 0.14 240)" }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.length >= 2 && clients.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-lg px-3 py-2.5">
          <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
        </div>
      )}
    </div>
  );
}

// ─── Order Form Modal ─────────────────────────────────────────────────────────
function OrderFormModal({ editingOrder, onClose, onSuccess }: {
  editingOrder: any | null; onClose: () => void; onSuccess: () => void;
}) {
  const utils = trpc.useUtils();
  const today = new Date().toISOString().split("T")[0];
  const defaultDelivery = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    clientName: editingOrder?.clientName ?? "",
    clientPhone: editingOrder?.clientPhone ?? "",
    observations: editingOrder?.observations ?? "",
    collectedAt: editingOrder?.collectedAt ? new Date(editingOrder.collectedAt).toISOString().split("T")[0] : today,
    expectedDelivery: editingOrder?.expectedDelivery ? new Date(editingOrder.expectedDelivery).toISOString().split("T")[0] : defaultDelivery,
    paid: editingOrder?.paid ?? false,
    notes: editingOrder?.notes ?? "",
  });

  // Múltiplos tapetes
  type CarpetItemForm = { carpetType: string; carpetSize: string; carpetColor: string; price: string; observations: string; };
  const defaultItem = (): CarpetItemForm => ({ carpetType: "", carpetSize: "", carpetColor: "", price: "", observations: "" });

  // Carregar itens existentes ao editar
  const { data: existingItems = [] } = trpc.carpet.getItems.useQuery(
    { carpetOrderId: editingOrder?.id ?? 0 },
    { enabled: !!editingOrder?.id }
  );

  const [carpetItems, setCarpetItemsState] = useState<CarpetItemForm[]>(() => {
    // Se for nova OS, começa com 1 item vazio
    if (!editingOrder) return [defaultItem()];
    // Se for edição, aguarda o carregamento (será atualizado via useEffect)
    return [defaultItem()];
  });

  // Quando os itens existentes carregarem, preencher o estado
  useEffect(() => {
    if (existingItems.length > 0) {
      setCarpetItemsState(existingItems.map((it: any) => ({
        carpetType: it.carpetType ?? "",
        carpetSize: it.carpetSize ?? "",
        carpetColor: it.carpetColor ?? "",
        price: it.price ? String(parseFloat(String(it.price))) : "",
        observations: it.observations ?? "",
      })));
    } else if (editingOrder && existingItems.length === 0) {
      // OS antiga sem itens: pré-preencher com dados legados da OS
      setCarpetItemsState([{
        carpetType: editingOrder.carpetType ?? "",
        carpetSize: editingOrder.carpetSize ?? "",
        carpetColor: editingOrder.carpetColor ?? "",
        price: editingOrder.price ? String(parseFloat(String(editingOrder.price))) : "",
        observations: editingOrder.observations ?? "",
      }]);
    }
  }, [existingItems.length]);

  const totalPrice = carpetItems.reduce((sum, it) => sum + (parseFloat(it.price) || 0), 0);

  function addCarpetItem() {
    setCarpetItemsState(prev => [...prev, defaultItem()]);
  }
  function removeCarpetItem(idx: number) {
    setCarpetItemsState(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }
  function updateCarpetItem(idx: number, field: keyof CarpetItemForm, value: string) {
    setCarpetItemsState(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  // Fotos pendentes de upload (nova OS)
  const [pendingPhotos, setPendingPhotos] = useState<Array<{ file: File; preview: string; type: "before" | "after"; caption: string }>>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fotos já salvas (modo edição)
  const { data: savedPhotos = [], refetch: refetchPhotos } = trpc.carpet.getPhotos.useQuery(
    { carpetOrderId: editingOrder?.id ?? 0 },
    { enabled: !!editingOrder?.id }
  );
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const addPhotoMutation = trpc.carpet.addPhoto.useMutation({
    onSuccess: () => refetchPhotos(),
  });
  const deletePhotoMutation = trpc.carpet.deletePhoto.useMutation({
    onSuccess: () => { refetchPhotos(); setDeletingPhotoId(null); },
    onError: (e) => { toast.error(e.message); setDeletingPhotoId(null); },
  });
  const updateCaptionMutation = trpc.carpet.updatePhotoCaption.useMutation({
    onSuccess: () => refetchPhotos(),
  });

  // Input de arquivo para modo edição
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editPhotoType, setEditPhotoType] = useState<"before" | "after">("before");

  async function handleUploadNewPhotoInEdit(file: File, type: "before" | "after") {
    try {
      setUploadingPhotos(true);
      const formData = new FormData();
      formData.append("visibility", "public");
      formData.append("category", "carpets");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        await addPhotoMutation.mutateAsync({ carpetOrderId: editingOrder.id, photoUrl: url, photoType: type });
        toast.success("Foto adicionada!");
      } else {
        toast.error("Erro ao enviar foto");
      }
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhotos(false);
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setPendingPhotos(prev => [...prev, { file, preview: ev.target?.result as string, type: "before", caption: "" }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removePhoto(idx: number) {
    setPendingPhotos(prev => prev.filter((_, i) => i !== idx));
  }

  function togglePhotoType(idx: number) {
    setPendingPhotos(prev => prev.map((p, i) => i === idx ? { ...p, type: p.type === "before" ? "after" : "before" } : p));
  }

  function updatePendingCaption(idx: number, caption: string) {
    setPendingPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption } : p));
  }

  const createMutation = trpc.carpet.create.useMutation({
    onSuccess: async (data: any) => {
      if (pendingPhotos.length > 0 && data?.id) {
        setUploadingPhotos(true);
        for (const p of pendingPhotos) {
          try {
            const formData = new FormData();
            formData.append("visibility", "public");
            formData.append("category", "carpets");
            formData.append("file", p.file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (res.ok) {
              const { url } = await res.json();
              await addPhotoMutation.mutateAsync({
                carpetOrderId: data.id,
                photoUrl: url,
                photoType: p.type,
                caption: p.caption || undefined,
              });
            }
          } catch { /* ignora erros individuais de foto */ }
        }
        setUploadingPhotos(false);
      }
      utils.carpet.list.invalidate();
      utils.carpet.metrics.invalidate();
      onSuccess();
      toast.success("OS criada com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.carpet.update.useMutation({
    onSuccess: async () => {
      utils.carpet.list.invalidate();
      utils.carpet.metrics.invalidate();
      onSuccess();
      toast.success("OS atualizada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending || uploadingPhotos;

  const setItemsMutation = trpc.carpet.setItems.useMutation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName.trim() || !form.clientPhone.trim()) { toast.error("Nome e telefone são obrigatórios"); return; }
    if (!form.expectedDelivery) { toast.error("Informe a previsão de entrega"); return; }
    if (carpetItems.length === 0) { toast.error("Adicione pelo menos um tapete"); return; }

    // Primeiro tapete como dados legados da OS (compatibilidade)
    const firstItem = carpetItems[0];
    const itemsPayload = carpetItems.map(it => ({
      carpetType: it.carpetType || undefined,
      carpetSize: it.carpetSize || undefined,
      carpetColor: it.carpetColor || undefined,
      price: parseFloat(it.price) || 0,
      observations: it.observations || undefined,
    }));

    const payload = {
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone.trim(),
      carpetType: firstItem.carpetType || undefined,
      carpetSize: firstItem.carpetSize || undefined,
      carpetColor: firstItem.carpetColor || undefined,
      observations: form.observations || undefined,
      collectedAt: new Date(form.collectedAt),
      expectedDelivery: new Date(form.expectedDelivery),
      price: totalPrice,
      paid: form.paid,
      notes: form.notes || undefined,
    };

    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, ...payload }, {
        onSuccess: async () => {
          await setItemsMutation.mutateAsync({ carpetOrderId: editingOrder.id, items: itemsPayload });
        }
      });
    } else {
      createMutation.mutate({ ...payload, items: itemsPayload });
    }
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? "Editar OS de Tapete" : "Nova OS de Tapete"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Cliente */}
            <div className="bg-muted/30 rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</p>
              <div className="grid grid-cols-2 gap-2">
                {!editingOrder && (
                  <ClientSearch
                    onSelect={(name, phone) => {
                      set("clientName", name);
                      set("clientPhone", phone);
                      toast.success(`Cliente "${name}" selecionado!`);
                    }}
                  />
                )}
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                  <Input value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder="Nome do cliente" required />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Telefone *</label>
                  <Input value={form.clientPhone} onChange={e => set("clientPhone", e.target.value)} placeholder="(11) 99999-0000" required />
                </div>
              </div>
            </div>

            {/* Múltiplos Tapetes */}
            <div className="bg-muted/30 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tapetes <span className="text-primary font-bold">({carpetItems.length})</span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={addCarpetItem}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar tapete
                </Button>
              </div>

              {carpetItems.map((item, idx) => (
                <div key={idx} className="bg-background border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">
                      Tapete {idx + 1}
                    </span>
                    {carpetItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCarpetItem(idx)}
                        className="w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                      <select
                        value={item.carpetType}
                        onChange={e => updateCarpetItem(idx, "carpetType", e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione...</option>
                        {CARPET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tamanho</label>
                      <Input
                        value={item.carpetSize}
                        onChange={e => updateCarpetItem(idx, "carpetSize", e.target.value)}
                        placeholder="ex: 2x3m"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Cor / Descrição</label>
                      <Input
                        value={item.carpetColor}
                        onChange={e => updateCarpetItem(idx, "carpetColor", e.target.value)}
                        placeholder="ex: Bege com detalhes azuis"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price}
                        onChange={e => updateCarpetItem(idx, "price", e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Observações (manchas, danos)</label>
                      <textarea
                        value={item.observations}
                        onChange={e => updateCarpetItem(idx, "observations", e.target.value)}
                        placeholder="Manchas, danos ou características especiais..."
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {carpetItems.length > 1 && (
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-sm font-bold" style={{ color: "oklch(0.50 0.18 155)" }}>
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              )}
            </div>

            {/* Datas e Pagamento */}
            <div className="bg-muted/30 rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datas e Pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Recolhido em</label>
                  <Input type="date" value={form.collectedAt} onChange={e => set("collectedAt", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Previsão de entrega *</label>
                  <Input type="date" value={form.expectedDelivery} onChange={e => set("expectedDelivery", e.target.value)} required />
                </div>
                <div className="col-span-2 flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={form.paid} onChange={e => set("paid", e.target.checked)}
                      className="w-4 h-4 rounded accent-green-500" />
                    Pago
                  </label>
                  <span className="text-sm text-muted-foreground">
                    Total: <strong style={{ color: "oklch(0.50 0.18 155)" }}>{formatCurrency(totalPrice)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Fotos — modo edição */}
            {editingOrder && (
              <div className="bg-muted/30 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Fotos do Tapete {savedPhotos.length > 0 && <span className="text-primary">({savedPhotos.length})</span>}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={editPhotoType}
                      onChange={e => setEditPhotoType(e.target.value as "before" | "after")}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none"
                    >
                      <option value="before">Antes</option>
                      <option value="after">Depois</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-7"
                      disabled={uploadingPhotos}
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      {uploadingPhotos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      {uploadingPhotos ? "Enviando..." : "Adicionar"}
                    </Button>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        for (const file of files) {
                          await handleUploadNewPhotoInEdit(file, editPhotoType);
                        }
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
                {savedPhotos.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Camera className="h-7 w-7" />
                    <p className="text-sm font-medium">Nenhuma foto ainda. Toque para adicionar.</p>
                  </button>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {savedPhotos.map((p: any, idx: number) => (
                      <div
                        key={p.id}
                        className="relative group rounded-xl overflow-hidden border border-border cursor-pointer"
                        onClick={() => setLightboxIndex(idx)}
                      >
                        <img src={p.photoUrl} alt="foto" className="w-full h-24 object-cover" />
                        {/* Ícone de zoom */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {/* Badge tipo */}
                        <span
                          className="absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: p.photoType === "before" ? "oklch(0.55 0.18 240)" : "oklch(0.50 0.18 155)" }}
                        >
                          {p.photoType === "before" ? "Antes" : "Depois"}
                        </span>
                        {/* Indicador de observação */}
                        {p.caption && (
                          <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-yellow-400" title={p.caption} />
                        )}
                        {/* Botão excluir */}
                        <button
                          type="button"
                          disabled={deletingPhotoId === p.id}
                          onClick={(e) => { e.stopPropagation(); setDeletingPhotoId(p.id); deletePhotoMutation.mutate({ id: p.id }); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-60"
                        >
                          {deletingPhotoId === p.id
                            ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                            : <X className="h-3 w-3 text-white" />}
                        </button>
                      </div>
                    ))}
                    {/* Botão adicionar mais */}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-[10px]">Mais</span>
                    </button>
                  </div>
                )}
                {savedPhotos.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">Toque em uma foto para ampliar e adicionar observações.</p>
                )}
              </div>
            )}

            {/* Fotos — nova OS */}
            {!editingOrder && (
              <div className="bg-muted/30 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Fotos do Tapete {pendingPhotos.length > 0 && <span className="text-primary">({pendingPhotos.length})</span>}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar Foto
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </div>
                {pendingPhotos.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    <Camera className="h-8 w-8" />
                    <p className="text-sm font-medium">Toque para tirar foto ou escolher da galeria</p>
                    <p className="text-xs">JPG, PNG — máx. 16 MB por foto</p>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {pendingPhotos.map((p, idx) => (
                      <div key={idx} className="flex gap-3 items-start bg-background rounded-xl border border-border p-2">
                        {/* Miniatura */}
                        <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border">
                          <img src={p.preview} alt="foto" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
                          >
                            <X className="h-2.5 w-2.5 text-white" />
                          </button>
                        </div>
                        {/* Controles */}
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => togglePhotoType(idx)}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                              style={{ background: p.type === "before" ? "oklch(0.55 0.18 240)" : "oklch(0.50 0.18 155)" }}
                            >
                              {p.type === "before" ? "Antes" : "Depois"}
                            </button>
                            <span className="text-[10px] text-muted-foreground">Toque para alternar</span>
                          </div>
                          <textarea
                            value={p.caption}
                            onChange={e => updatePendingCaption(idx, e.target.value)}
                            placeholder="Observação desta foto (opcional)..."
                            rows={2}
                            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                          />
                        </div>
                      </div>
                    ))}
                    {/* Botão adicionar mais */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-10 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-xs"
                    >
                      <Plus className="h-4 w-4" /> Adicionar mais fotos
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Observações internas */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas internas</label>
              <textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Anotações internas sobre esta OS..."
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button type="submit" disabled={isPending} className="flex-1 text-white gap-1.5"
                style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {uploadingPhotos ? "Enviando fotos..." : editingOrder ? "Salvar" : "Criar OS"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lightbox de fotos no modo edição */}
      {lightboxIndex !== null && savedPhotos.length > 0 && (
        <PhotoLightbox
          photos={savedPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onUpdateCaption={async (id, cap) => {
            await updateCaptionMutation.mutateAsync({ id, caption: cap });
          }}
          onDeletePhoto={(id) => {
            setDeletingPhotoId(id);
            deletePhotoMutation.mutate({ id });
            setLightboxIndex(null);
          }}
        />
      )}
    </>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose, onEdit }: { order: any; onClose: () => void; onEdit: () => void }) {
  const utils = trpc.useUtils();
  const { data: carpetItemsList = [] } = trpc.carpet.getItems.useQuery({ carpetOrderId: order.id });
  const { data: photos = [], refetch: refetchPhotos, isLoading: photosLoading } = trpc.carpet.getPhotos.useQuery(
    { carpetOrderId: order.id },
    { refetchOnWindowFocus: true }
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addPhotoType, setAddPhotoType] = useState<"before" | "after">("before");
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const updateStatusMutation = trpc.carpet.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      utils.carpet.list.invalidate();
      utils.carpet.metrics.invalidate();
      if (variables.status === 'ready') {
        const phone = order.clientPhone.replace(/\D/g, '');
        const orderNum = String(order.orderNumber ?? order.id).padStart(4, '0');
        const carpetInfo = [order.carpetType, order.carpetSize].filter(Boolean).join(' ');
        const msg = `Olá, *${order.clientName}*! 😊\n\n` +
          `Seu tapete${carpetInfo ? ` (${carpetInfo})` : ''} está *pronto para retirada*! 🎉\n\n` +
          `📋 OS #${orderNum}\n` +
          `💰 Valor: ${formatCurrency(order.price)}\n\n` +
          `Entre em contato para combinar a entrega.\n\n` +
          `_SOS Limpa Tudo Estofados_ 🌟`;
        const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
        toast.success(
          `Tapete pronto! Notificar ${order.clientName} via WhatsApp?`,
          {
            duration: 8000,
            action: { label: 'Abrir WhatsApp', onClick: () => window.open(url, '_blank') },
          }
        );
      } else {
        toast.success('Status atualizado!');
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const updateCaptionMutation = trpc.carpet.updatePhotoCaption.useMutation({
    onSuccess: () => refetchPhotos(),
  });
  const deletePhotoMutation = trpc.carpet.deletePhoto.useMutation({
    onSuccess: () => refetchPhotos(),
    onError: (e) => toast.error(e.message),
  });
  const addPhotoMutation = trpc.carpet.addPhoto.useMutation({
    onSuccess: () => { refetchPhotos(); toast.success("Foto adicionada!"); },
    onError: (e) => toast.error(e.message),
  });

  async function handleAddPhoto(file: File, type: "before" | "after") {
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append("visibility", "public");
      formData.append("category", "carpets");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        await addPhotoMutation.mutateAsync({ carpetOrderId: order.id, photoUrl: url, photoType: type });
      } else {
        toast.error("Erro ao enviar foto");
      }
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const overdue = isOverdue(order);
  const currentIdx = STATUS_FLOW.indexOf(order.status);

  // Separar fotos antes/depois
  const beforePhotos = photos.filter((p: any) => p.photoType === "before");
  const afterPhotos = photos.filter((p: any) => p.photoType === "after");

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-muted-foreground font-normal text-sm">OS</span>
              <span className="font-bold">#{String(order.orderNumber ?? order.id).padStart(4, "0")}</span>
              <StatusBadge status={order.status} overdue={overdue} />
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Alerta de atraso */}
            {overdue && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  Entrega atrasada! Prevista para {formatDate(order.expectedDelivery)}
                </p>
              </div>
            )}

            {/* Cliente */}
            <div className="bg-muted/40 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</p>
              <p className="text-sm font-semibold">{order.clientName}</p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {formatPhone(order.clientPhone)}
              </div>
            </div>

            {/* Tapetes */}
            <div className="bg-muted/40 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tapetes {carpetItemsList.length > 0 && <span className="text-primary">({carpetItemsList.length})</span>}
              </p>
              {carpetItemsList.length > 0 ? (
                carpetItemsList.map((item: any, idx: number) => (
                  <div key={item.id ?? idx} className="border border-border rounded-lg p-2 space-y-1">
                    <p className="text-xs font-semibold text-foreground">Tapete {idx + 1}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                      {item.carpetType && <><span className="text-muted-foreground">Tipo:</span><span>{item.carpetType}</span></>}
                      {item.carpetSize && <><span className="text-muted-foreground">Tamanho:</span><span>{item.carpetSize}</span></>}
                      {item.carpetColor && <><span className="text-muted-foreground">Cor:</span><span>{item.carpetColor}</span></>}
                      {item.price > 0 && <><span className="text-muted-foreground">Valor:</span><span style={{ color: "oklch(0.50 0.18 155)" }}>{formatCurrency(item.price)}</span></>}
                    </div>
                    {item.observations && <p className="text-xs text-muted-foreground italic">"{item.observations}"</p>}
                  </div>
                ))
              ) : (
                // Fallback para OS antigas sem itens
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {order.carpetType && <><span className="text-muted-foreground">Tipo:</span><span>{order.carpetType}</span></>}
                  {order.carpetSize && <><span className="text-muted-foreground">Tamanho:</span><span>{order.carpetSize}</span></>}
                  {order.carpetColor && <><span className="text-muted-foreground">Cor:</span><span>{order.carpetColor}</span></>}
                </div>
              )}
              {order.observations && (
                <p className="text-sm text-muted-foreground mt-1 italic">"{order.observations}"</p>
              )}
            </div>

            {/* Galeria de fotos — sempre visível */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Images className="h-3.5 w-3.5" /> Fotos {photos.length > 0 && <span className="text-primary">({photos.length})</span>}
                </p>
                <div className="flex items-center gap-1.5">
                  {photos.length > 0 && (
                    <button
                      onClick={() => setLightboxIndex(0)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ZoomIn className="h-3.5 w-3.5" /> Ampliar
                    </button>
                  )}
                  <select
                    value={addPhotoType}
                    onChange={e => setAddPhotoType(e.target.value as "before" | "after")}
                    className="h-6 rounded-md border border-input bg-background px-1.5 text-xs focus:outline-none"
                  >
                    <option value="before">Antes</option>
                    <option value="after">Depois</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs h-6 px-2"
                    disabled={uploadingPhoto}
                    onClick={() => addFileInputRef.current?.click()}
                  >
                    {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    {uploadingPhoto ? "Enviando..." : "Foto"}
                  </Button>
                  <input
                    ref={addFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      for (const file of files) await handleAddPhoto(file, addPhotoType);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {photosLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : photos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => addFileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Camera className="h-7 w-7" />
                  <p className="text-sm font-medium">Nenhuma foto. Toque para adicionar.</p>
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Antes */}
                  {beforePhotos.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "oklch(0.55 0.18 240)" }} />
                        Antes ({beforePhotos.length})
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {beforePhotos.map((p: any) => {
                          const idx = photos.findIndex((x: any) => x.id === p.id);
                          return (
                            <div
                              key={p.id}
                              className="relative group rounded-xl overflow-hidden border border-border cursor-pointer aspect-square"
                              onClick={() => setLightboxIndex(idx)}
                            >
                              <img src={p.photoUrl} alt="antes" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {p.caption && (
                                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-yellow-400" title={p.caption} />
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); if (confirm("Excluir foto?")) deletePhotoMutation.mutate({ id: p.id }); }}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3 text-white" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Depois */}
                  {afterPhotos.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: "oklch(0.50 0.18 155)" }} />
                        Depois ({afterPhotos.length})
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {afterPhotos.map((p: any) => {
                          const idx = photos.findIndex((x: any) => x.id === p.id);
                          return (
                            <div
                              key={p.id}
                              className="relative group rounded-xl overflow-hidden border border-border cursor-pointer aspect-square"
                              onClick={() => setLightboxIndex(idx)}
                            >
                              <img src={p.photoUrl} alt="depois" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {p.caption && (
                                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-yellow-400" title={p.caption} />
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); if (confirm("Excluir foto?")) deletePhotoMutation.mutate({ id: p.id }); }}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3 text-white" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {photos.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">Toque em uma foto para ampliar e editar observações.</p>
                  )}
                </div>
              )}
            </div>

            {/* Datas */}
            <div className="bg-muted/40 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datas</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Recolhido:</span><span>{formatDate(order.collectedAt)}</span>
                <span className="text-muted-foreground">Previsão:</span>
                <span className={overdue ? "text-red-500 font-semibold" : ""}>{formatDate(order.expectedDelivery)}</span>
                {order.deliveredAt && <><span className="text-muted-foreground">Entregue:</span><span>{formatDate(order.deliveredAt)}</span></>}
              </div>
            </div>

            {/* Valor */}
            <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valor</p>
                <p className="text-lg font-bold" style={{ color: "oklch(0.50 0.18 155)" }}>
                  {formatCurrency(order.price)}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${order.paid ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                {order.paid ? "✓ Pago" : "Pendente"}
              </span>
            </div>

            {/* Fluxo de Status */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
              <div className="flex gap-2 flex-wrap">
                {/* Botão voltar */}
                {currentIdx > 0 && (() => {
                  const prevStatus = STATUS_FLOW[currentIdx - 1];
                  const prevCfg = STATUS_CONFIG[prevStatus];
                  const PrevIcon = prevCfg.icon;
                  return (
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: order.id, status: prevStatus })}
                      disabled={updateStatusMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-muted/60 text-muted-foreground transition-opacity hover:opacity-80"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <PrevIcon className="h-3.5 w-3.5" />
                      Voltar para {prevCfg.label}
                    </button>
                  );
                })()}
                {/* Botões avançar */}
                {STATUS_FLOW.map((s, idx) => {
                  if (idx <= currentIdx) return null;
                  const cfg = STATUS_CONFIG[s];
                  const Icon = cfg.icon;
                  return (
                    <button key={s}
                      onClick={() => updateStatusMutation.mutate({ id: order.id, status: s })}
                      disabled={updateStatusMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
                      style={{ background: cfg.color }}>
                      <Icon className="h-3.5 w-3.5" />
                      Marcar como {cfg.label}
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notas internas */}
            {order.notes && (
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas Internas</p>
                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1">Fechar</Button>
              <Button onClick={onEdit} className="flex-1 text-white gap-1.5"
                style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onUpdateCaption={async (id, cap) => {
            await updateCaptionMutation.mutateAsync({ id, caption: cap });
          }}
          onDeletePhoto={(id) => {
            deletePhotoMutation.mutate({ id });
            setLightboxIndex(null);
          }}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Carpets() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);

  const utils = trpc.useUtils();
  const { data: orders = [], isLoading } = trpc.carpet.list.useQuery({ status: statusFilter, search });
  const { data: metrics } = trpc.carpet.metrics.useQuery();

  const deleteMutation = trpc.carpet.delete.useMutation({
    onSuccess: () => { utils.carpet.list.invalidate(); utils.carpet.metrics.invalidate(); toast.success("OS excluída!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMutation = trpc.carpet.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      utils.carpet.list.invalidate();
      utils.carpet.metrics.invalidate();
      if (variables.status === 'ready') {
        // Busca a ordem atualizada para notificar via WhatsApp
        const order = orders.find((o: any) => o.id === variables.id);
        if (order) {
          const phone = order.clientPhone.replace(/\D/g, '');
          const orderNum = String(order.orderNumber ?? order.id).padStart(4, '0');
          const carpetInfo = [order.carpetType, order.carpetSize].filter(Boolean).join(' ');
          const msg = `Olá, *${order.clientName}*! 😊\n\n` +
            `Seu tapete${carpetInfo ? ` (${carpetInfo})` : ''} está *pronto para retirada*! 🎉\n\n` +
            `📋 OS #${orderNum}\n` +
            `💰 Valor: ${formatCurrency(order.price)}\n\n` +
            `Entre em contato para combinar a entrega.\n\n` +
            `_SOS Limpa Tudo Estofados_ 🌟`;
          const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
          toast.success(
            `Tapete pronto! Clique para notificar ${order.clientName} via WhatsApp`,
            {
              duration: 8000,
              action: { label: 'Abrir WhatsApp', onClick: () => window.open(url, '_blank') },
            }
          );
        }
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const overdueCount = useMemo(() => orders.filter(isOverdue).length, [orders]);

  function handleDelete(order: any) {
    if (!confirm(`Excluir OS #${String(order.orderNumber ?? order.id).padStart(4, "0")} de ${order.clientName}?`)) return;
    deleteMutation.mutate({ id: order.id });
  }

  const statusTabs = [
    { key: "all",       label: "Todos" },
    { key: "collected", label: "Recolhidos" },
    { key: "washing",   label: "Lavando" },
    { key: "ready",     label: "Prontos" },
    { key: "delivered", label: "Entregues" },
  ];

  return (
    <FeatureGate featureKey="tapetes" featureLabel="Tapetes (Lavanderia)">
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tapetes</h1>
            <p className="text-sm text-muted-foreground">Lavanderia — controle de recolhimento e entrega</p>
          </div>
          <Button onClick={() => { setEditingOrder(null); setShowForm(true); }}
            className="text-white gap-2"
            style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
            <Plus className="h-4 w-4" /> Nova OS
          </Button>
        </div>

        {/* Alerta de atrasos */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {overdueCount} {overdueCount === 1 ? "tapete está" : "tapetes estão"} com entrega atrasada!
            </p>
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={Waves}        label="Em Processo"       value={metrics?.inProgress ?? 0}           color="oklch(0.55 0.18 200)" bg="oklch(0.97 0.02 200)" />
          <MetricCard icon={CheckCircle2} label="Prontos p/ Entrega" value={metrics?.ready ?? 0}               color="oklch(0.50 0.18 155)" bg="oklch(0.97 0.03 155)" />
          <MetricCard icon={Truck}        label="Entregues no Mês"   value={metrics?.deliveredThisMonth ?? 0}  color="oklch(0.45 0.14 140)" bg="oklch(0.97 0.02 140)" />
          <MetricCard icon={DollarSign}   label="Receita do Mês"     value={formatCurrency(metrics?.revenueThisMonth ?? 0)} color="oklch(0.32 0.14 240)" bg="oklch(0.97 0.02 240)" />
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por cliente ou telefone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Abas de status */}
        <div className="flex gap-1 flex-wrap border-b border-border pb-0">
          {statusTabs.map(tab => (
            <button key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${statusFilter === tab.key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Waves className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma OS encontrada</p>
            <p className="text-sm mt-1">Clique em "Nova OS" para registrar um tapete</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order: any) => {
              const overdue = isOverdue(order);
              const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.collected;
              const currentIdx = STATUS_FLOW.indexOf(order.status);
              const nextStatus = STATUS_FLOW[currentIdx + 1];
              const nextCfg = nextStatus ? STATUS_CONFIG[nextStatus] : null;
              const prevStatus = STATUS_FLOW[currentIdx - 1];
              const prevCfg = prevStatus ? STATUS_CONFIG[prevStatus] : null;

              return (
                <div key={order.id}
                  className={`rounded-xl border p-3 sm:p-4 flex items-center gap-3 transition-colors hover:bg-muted/20 ${overdue ? "border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10" : "border-border bg-card"}`}>
                  {/* Número */}
                  <div className="text-center shrink-0 hidden sm:block">
                    <p className="text-xs text-muted-foreground">OS</p>
                    <p className="text-sm font-bold">#{String(order.orderNumber ?? order.id).padStart(4, "0")}</p>
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{order.clientName}</p>
                      <StatusBadge status={order.status} overdue={overdue} />
                      {order.paid && <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Pago</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {formatPhone(order.clientPhone)}
                      </span>
                      {order.carpetType && <span className="text-xs text-muted-foreground">{order.carpetType}{order.carpetSize ? ` · ${order.carpetSize}` : ""}</span>}
                      <span className={`text-xs flex items-center gap-1 ${overdue ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                        <Calendar className="h-3 w-3" />
                        {overdue ? "Atrasado: " : "Entrega: "}{formatDate(order.expectedDelivery)}
                      </span>
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-bold" style={{ color: "oklch(0.50 0.18 155)" }}>
                      {formatCurrency(order.price)}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    {prevStatus && prevCfg && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: prevStatus })}
                        disabled={updateStatusMutation.isPending}
                        title={`Voltar para ${prevCfg.label}`}
                        className="p-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 hidden sm:flex items-center gap-1 border border-border"
                        style={{ color: prevCfg.color, background: prevCfg.bg }}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {nextStatus && nextCfg && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: nextStatus })}
                        disabled={updateStatusMutation.isPending}
                        title={`Avançar para ${nextCfg.label}`}
                        className="p-1.5 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-80 hidden sm:flex items-center gap-1"
                        style={{ background: nextCfg.color }}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => setViewingOrder(order)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Ver detalhes">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => { setEditingOrder(order); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Editar">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(order)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Excluir">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      {showForm && (
        <OrderFormModal
          editingOrder={editingOrder}
          onClose={() => { setShowForm(false); setEditingOrder(null); }}
          onSuccess={() => { setShowForm(false); setEditingOrder(null); }}
        />
      )}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onEdit={() => { setEditingOrder(viewingOrder); setViewingOrder(null); setShowForm(true); }}
        />
      )}
    </DashboardLayout>
    </FeatureGate>
  );
}
