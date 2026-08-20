import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Plus, X, Search, Camera, Trash2, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  MapPin, Phone, Ruler, AlertTriangle, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Tipos de sujidade com visual enfático
const DIRT_LEVELS = [
  {
    value: "light" as const,
    label: "Leve",
    description: "Poeira superficial, manchas leves",
    color: "green",
    bgClass: "bg-green-500/10 border-green-500 text-green-600",
    inactiveClass: "border-border hover:border-green-400",
    dotClass: "bg-green-500",
    icon: "✓",
  },
  {
    value: "moderate" as const,
    label: "Moderada",
    description: "Manchas visíveis, sujeira acumulada",
    color: "yellow",
    bgClass: "bg-yellow-500/10 border-yellow-500 text-yellow-600",
    inactiveClass: "border-border hover:border-yellow-400",
    dotClass: "bg-yellow-500",
    icon: "⚠",
  },
  {
    value: "heavy" as const,
    label: "Pesada",
    description: "Manchas profundas, odores, muito sujo",
    color: "red",
    bgClass: "bg-red-500/10 border-red-500 text-red-600",
    inactiveClass: "border-border hover:border-red-400",
    dotClass: "bg-red-500",
    icon: "✕",
  },
];

const CARPET_TYPES = [
  "Lã", "Sintético", "Sisal", "Vinil", "Juta", "Algodão", "Bambú", "Acrílico", "Outro"
];

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// ─── Formulário de OS de Tapete ─────────────────────────────────────────────
function CarpetForm({
  onClose,
  onSuccess,
  initialDate,
}: {
  onClose: () => void;
  onSuccess: () => void;
  initialDate: string;
}) {
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string; phone?: string; street?: string; neighborhood?: string; city?: string } | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [carpetType, setCarpetType] = useState("");
  const [customType, setCustomType] = useState("");
  const [widthMeters, setWidthMeters] = useState("");
  const [lengthMeters, setLengthMeters] = useState("");
  const [dirtLevel, setDirtLevel] = useState<"light" | "moderate" | "heavy">("light");
  const [observations, setObservations] = useState("");
  const [scheduledDate, setScheduledDate] = useState(initialDate);
  const [scheduledTime, setScheduledTime] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedMemberId, setAssignedMemberId] = useState<number | undefined>();

  const { data: clients = [] } = trpc.clients.list.useQuery(
    { search: clientSearch },
    { enabled: clientSearch.length >= 2 }
  );
  const { data: activeMembers = [] } = trpc.teams.activeMembers.useQuery();

  const createMutation = trpc.executionCarpets.create.useMutation({
    onSuccess: () => {
      toast.success("OS de tapete criada com sucesso!");
      onSuccess();
    },
    onError: () => toast.error("Erro ao criar OS de tapete"),
  });

  const squareMeters = widthMeters && lengthMeters
    ? (parseFloat(widthMeters) * parseFloat(lengthMeters)).toFixed(2)
    : "";

  const clientName = selectedClient?.name || manualName;
  const clientPhone = selectedClient?.phone || manualPhone;

  const handleSubmit = () => {
    if (!clientName.trim()) { toast.error("Informe o nome do cliente"); return; }
    if (!scheduledDate) { toast.error("Informe a data de execução"); return; }

    createMutation.mutate({
      clientId: selectedClient?.id,
      clientName: clientName.trim(),
      clientPhone: clientPhone || undefined,
      street: (selectedClient?.street || street) || undefined,
      addressNumber: addressNumber || undefined,
      neighborhood: (selectedClient?.neighborhood || neighborhood) || undefined,
      city: (selectedClient?.city || city) || undefined,
      carpetType: carpetType === "Outro" ? customType : carpetType || undefined,
      widthMeters: widthMeters || undefined,
      lengthMeters: lengthMeters || undefined,
      squareMeters: squareMeters || undefined,
      dirtLevel,
      observations: observations || undefined,
      scheduledDate,
      scheduledTime: scheduledTime || undefined,
      assignedTo: assignedTo || undefined,
      assignedMemberId,
      totalValue: totalValue || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border my-4">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-bold text-foreground">Nova OS de Tapete</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Cliente */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Cliente</h3>
            {selectedClient ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">{selectedClient.name}</p>
                  {selectedClient.phone && <p className="text-xs text-muted-foreground">{selectedClient.phone}</p>}
                  {selectedClient.street && <p className="text-xs text-muted-foreground">{selectedClient.street}</p>}
                </div>
                <button onClick={() => setSelectedClient(null)} className="p-1 rounded hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente cadastrado..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {clientSearch.length >= 2 && clients.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden shadow-lg">
                    {clients.slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedClient({ id: c.id, name: c.name, phone: c.phone || undefined, street: c.street || undefined, neighborhood: c.neighborhood || undefined, city: c.city || undefined });
                          setClientSearch("");
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left border-b border-border last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.name}</p>
                          {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Nome do cliente *" value={manualName} onChange={e => setManualName(e.target.value)} />
                  <Input placeholder="Telefone" value={manualPhone} onChange={e => setManualPhone(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Rua/Av." value={street} onChange={e => setStreet(e.target.value)} />
                  <Input placeholder="Número" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
                  <Input placeholder="Cidade" value={city} onChange={e => setCity(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Dados do Tapete */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Dados do Tapete</h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo de Tapete</label>
              <div className="flex flex-wrap gap-2">
                {CARPET_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCarpetType(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      carpetType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50 text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {carpetType === "Outro" && (
                <Input className="mt-2" placeholder="Especifique o tipo..." value={customType} onChange={e => setCustomType(e.target.value)} />
              )}
            </div>

            {/* Metragem */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> Metragem</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Largura (m)"
                    value={widthMeters}
                    onChange={e => setWidthMeters(e.target.value)}
                  />
                </div>
                <span className="text-muted-foreground font-bold">×</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Comprimento (m)"
                    value={lengthMeters}
                    onChange={e => setLengthMeters(e.target.value)}
                  />
                </div>
                {squareMeters && (
                  <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-sm font-bold text-primary whitespace-nowrap">
                    {squareMeters} m²
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nível de Sujidade — visual enfático */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Nível de Sujidade
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {DIRT_LEVELS.map(level => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setDirtLevel(level.value)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    dirtLevel === level.value ? level.bgClass : level.inactiveClass + " opacity-60"
                  }`}
                >
                  {dirtLevel === level.value && (
                    <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${level.dotClass}`} />
                  )}
                  <span className="text-2xl">{level.icon}</span>
                  <span className="font-bold text-sm">{level.label}</span>
                  <span className="text-xs text-center leading-tight opacity-80">{level.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Observações</label>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              rows={3}
              placeholder="Manchas específicas, histórico, cuidados especiais..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Agendamento */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Agendamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data de Execução *</label>
                <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Horário</label>
                <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Responsável</label>
              <select
                value={assignedMemberId ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  if (!val) { setAssignedMemberId(undefined); setAssignedTo(''); }
                  else {
                    const member = activeMembers.find(m => m.id === Number(val));
                    setAssignedMemberId(Number(val));
                    setAssignedTo(member?.name ?? '');
                  }
                }}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sem responsável definido</option>
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor Total (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={totalValue}
                onChange={e => setTotalValue(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex-1 text-white font-semibold"
            style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 280), oklch(0.55 0.20 310))" }}
          >
            {createMutation.isPending ? "Criando..." : "Criar OS de Tapete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de OS de Tapete ────────────────────────────────────────────────────
function CarpetCard({ carpet, onRefresh }: { carpet: any; onRefresh: () => void }) {
  const [showDetail, setShowDetail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: photos = [], refetch: refetchPhotos } = trpc.executionCarpets.getPhotos.useQuery(
    { executionCarpetId: carpet.id },
    { enabled: showDetail }
  );

  const updateMutation = trpc.executionCarpets.update.useMutation({
    onSuccess: () => { onRefresh(); toast.success("OS atualizada!"); },
  });

  const deleteMutation = trpc.executionCarpets.delete.useMutation({
    onSuccess: () => { onRefresh(); toast.success("OS removida."); },
  });

  const addPhotoMutation = trpc.executionCarpets.addPhoto.useMutation({
    onSuccess: () => { refetchPhotos(); toast.success("Foto adicionada!"); },
  });

  const deletePhotoMutation = trpc.executionCarpets.deletePhoto.useMutation({
    onSuccess: () => refetchPhotos(),
  });

  const dirtInfo = DIRT_LEVELS.find(d => d.value === carpet.dirtLevel) ?? DIRT_LEVELS[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("visibility", "public");
      formData.append("category", "execution-carpets");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        await addPhotoMutation.mutateAsync({
          executionCarpetId: carpet.id,
          photoUrl: data.url,
          photoKey: data.key,
          photoType: "before",
        });
      }
    } catch {
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const isDone = carpet.status === "done";

  return (
    <>
      <div
        className={`bg-card rounded-xl border transition-all cursor-pointer hover:shadow-md ${
          isDone ? "border-green-500/30 opacity-75" : "border-border"
        }`}
        onClick={() => setShowDetail(true)}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">#{carpet.orderNumber}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${dirtInfo.bgClass}`}>
                  {dirtInfo.icon} {dirtInfo.label}
                </span>
                {isDone && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500">
                    Concluído
                  </span>
                )}
              </div>
              <p className="font-semibold text-foreground truncate">{carpet.clientName}</p>
              {carpet.clientPhone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" /> {carpet.clientPhone}
                </p>
              )}
              {carpet.street && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0" /> {carpet.street}{carpet.addressNumber ? `, ${carpet.addressNumber}` : ""}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">{formatDate(carpet.scheduledDate)}</p>
              {carpet.scheduledTime && <p className="text-xs text-muted-foreground">{carpet.scheduledTime}</p>}
              {carpet.squareMeters && (
                <p className="text-xs font-semibold text-primary mt-1">{carpet.squareMeters} m²</p>
              )}
              {carpet.totalValue && parseFloat(carpet.totalValue) > 0 && (
                <p className="text-sm font-bold text-foreground">{formatCurrency(parseFloat(carpet.totalValue))}</p>
              )}
            </div>
          </div>
          {carpet.carpetType && (
            <p className="text-xs text-muted-foreground mt-2">Tipo: {carpet.carpetType}</p>
          )}
          {carpet.assignedTo && (
            <p className="text-xs text-muted-foreground mt-1">Responsável: {carpet.assignedTo}</p>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border my-4">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-500" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">OS Tapete #{carpet.orderNumber}</h2>
                  <p className="text-xs text-muted-foreground">{carpet.clientName}</p>
                </div>
              </div>
              <button onClick={() => setShowDetail(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Info do cliente */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                  <p className="text-sm font-semibold">{carpet.clientName}</p>
                  {carpet.clientPhone && <p className="text-xs text-muted-foreground">{carpet.clientPhone}</p>}
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Agendamento</p>
                  <p className="text-sm font-semibold">{formatDate(carpet.scheduledDate)}</p>
                  {carpet.scheduledTime && <p className="text-xs text-muted-foreground">{carpet.scheduledTime}</p>}
                </div>
              </div>

              {/* Endereço */}
              {carpet.street && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Endereço</p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent([carpet.street, carpet.addressNumber, carpet.neighborhood, carpet.city].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {[carpet.street, carpet.addressNumber, carpet.neighborhood, carpet.city].filter(Boolean).join(', ')}
                  </a>
                </div>
              )}

              {/* Dados do tapete */}
              <div className="grid grid-cols-3 gap-3">
                {carpet.carpetType && (
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                    <p className="text-sm font-semibold">{carpet.carpetType}</p>
                  </div>
                )}
                {carpet.squareMeters && (
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Metragem</p>
                    <p className="text-sm font-bold text-primary">{carpet.squareMeters} m²</p>
                    {carpet.widthMeters && carpet.lengthMeters && (
                      <p className="text-xs text-muted-foreground">{carpet.widthMeters}×{carpet.lengthMeters}m</p>
                    )}
                  </div>
                )}
                <div className={`p-3 rounded-lg border-2 text-center ${dirtInfo.bgClass}`}>
                  <p className="text-xs opacity-70 mb-1">Sujidade</p>
                  <p className="text-lg">{dirtInfo.icon}</p>
                  <p className="text-sm font-bold">{dirtInfo.label}</p>
                </div>
              </div>

              {/* Observações */}
              {carpet.observations && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm text-foreground">{carpet.observations}</p>
                </div>
              )}

              {/* Fotos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Camera className="h-4 w-4" /> Fotos ({photos.length})
                  </p>
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? "Enviando..." : "+ Foto"}
                    </Button>
                  </div>
                </div>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo: any) => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square">
                        <img src={photo.photoUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => deletePhotoMutation.mutate({ id: photo.id })}
                            className="p-1.5 rounded-full bg-red-500 text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                          {photo.photoType === 'before' ? 'Antes' : photo.photoType === 'after' ? 'Depois' : 'Outro'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    Nenhuma foto adicionada
                  </div>
                )}
              </div>

              {/* Responsável e valor */}
              <div className="grid grid-cols-2 gap-3">
                {carpet.assignedTo && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Responsável</p>
                    <p className="text-sm font-semibold">{carpet.assignedTo}</p>
                  </div>
                )}
                {carpet.totalValue && parseFloat(carpet.totalValue) > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Valor</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(parseFloat(carpet.totalValue))}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm("Remover esta OS de tapete?")) {
                    deleteMutation.mutate({ id: carpet.id });
                    setShowDetail(false);
                  }
                }}
                className="text-red-500 border-red-500/30 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDetail(false)}
                className="flex-1"
              >
                Fechar
              </Button>
              {!isDone ? (
                <Button
                  onClick={() => {
                    updateMutation.mutate({ id: carpet.id, status: "done", completedAt: new Date() });
                    setShowDetail(false);
                  }}
                  disabled={updateMutation.isPending}
                  className="flex-1 text-white font-semibold bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Concluir
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    updateMutation.mutate({ id: carpet.id, status: "pending" });
                    setShowDetail(false);
                  }}
                  className="flex-1"
                >
                  Reabrir OS
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function ExecutionCarpets() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("all");
  // Abrir modal automaticamente se vier com ?new=true na URL (ex: atalho do FAB)
  const [showForm, setShowForm] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('new') === 'true';
    }
    return false;
  });

  const { data: carpets = [], refetch } = trpc.executionCarpets.list.useQuery({
    date: selectedDate,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Navegar datas
  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === today;
  const pending = carpets.filter(c => c.status === "pending").length;
  const done = carpets.filter(c => c.status === "done").length;
  const totalValue = carpets.reduce((sum, c) => sum + parseFloat(c.totalValue ?? "0"), 0);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Layers className="h-6 w-6 text-purple-500" />
              OS de Tapetes
            </h1>
            <p className="text-sm text-muted-foreground">Registro e execução de tapetes</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="text-white font-semibold"
            style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 280), oklch(0.55 0.20 310))" }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova OS
          </Button>
        </div>

        {/* Navegação de data */}
        <div className="flex items-center gap-3">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg border border-border hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 text-center">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-sm font-semibold bg-transparent border-none outline-none text-center text-foreground cursor-pointer"
            />
            {isToday && <span className="ml-2 text-xs text-primary font-medium">Hoje</span>}
          </div>
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg border border-border hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-2xl font-bold text-foreground">{carpets.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-2xl font-bold text-yellow-500">{pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-2xl font-bold text-green-500">{done}</p>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </div>
        </div>
        {totalValue > 0 && (
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-lg font-bold text-foreground">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-muted-foreground">Valor do dia</p>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2">
          {(["all", "pending", "done"] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                statusFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Concluídos"}
            </button>
          ))}
        </div>

        {/* Lista */}
        {carpets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma OS de tapete para este dia</p>
            <p className="text-sm mt-1">Clique em "Nova OS" para registrar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {carpets.map((carpet: any) => (
              <CarpetCard key={carpet.id} carpet={carpet} onRefresh={refetch} />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <CarpetForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
          initialDate={selectedDate}
        />
      )}
    </DashboardLayout>
  );
}
