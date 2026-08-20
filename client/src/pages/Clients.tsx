import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, Phone, Mail, MapPin, Users, TrendingUp, DollarSign, Star,
  Eye, Upload, X, Camera, ChevronDown, ChevronUp, FileText, ExternalLink, Wrench, CheckCircle2, Clock,
  Download, FileSpreadsheet, AlertCircle, CheckCircle
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import AddressSearch from "@/components/AddressSearch";
import GoogleAddressSearch from "@/components/GoogleAddressSearch";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return phone;
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

type ClientForm = {
  name: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  notes: string;
};

const emptyForm: ClientForm = {
  name: "", phone: "", email: "",
  cep: "", street: "", addressNumber: "", complement: "", neighborhood: "", city: "", state: "",
  notes: "",
};

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card rounded-2xl p-3 sm:p-5 border border-border shadow-sm flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="rounded-xl p-2 shrink-0" style={{ background: `${color}18` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <p className="text-xs text-muted-foreground font-medium leading-tight">{label}</p>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight break-all">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Client Detail Modal ──────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  pending:  { label: "Pendente",  color: "oklch(0.70 0.20 60)" },
  sent:     { label: "Enviado",   color: "oklch(0.55 0.18 240)" },
  accepted: { label: "Aceito",    color: "oklch(0.50 0.18 155)" },
  rejected: { label: "Recusado", color: "oklch(0.55 0.20 25)" },
};

const carpetStatusConfig: Record<string, { label: string; color: string }> = {
  collected: { label: "Recolhido",  color: "oklch(0.55 0.18 240)" },
  washing:   { label: "Lavando",    color: "oklch(0.65 0.20 200)" },
  ready:     { label: "Pronto",     color: "oklch(0.50 0.18 155)" },
  delivered: { label: "Entregue",   color: "oklch(0.55 0.15 155)" },
};

function ClientDetailModal({ client, onClose, onEdit }: { client: any; onClose: () => void; onEdit: () => void }) {
  const { data: photos = [] } = trpc.clients.getPhotos.useQuery({ clientId: client.id });
  const { data: clientBudgets = [], isLoading: budgetsLoading } = trpc.clients.getBudgets.useQuery({ phone: client.phone });
  const { data: clientCarpets = [], isLoading: carpetsLoading } = trpc.carpet.getByClientPhone.useQuery({ phone: client.phone });
  const { data: clientSales = [], isLoading: salesLoading } = trpc.sales.getByClientId.useQuery(
    { clientId: client.id },
    { enabled: !!client.id }
  );
  const { data: clientExecutions = [], isLoading: executionsLoading } = trpc.execution.getByClient.useQuery(
    { clientId: client.id },
    { enabled: !!client.id }
  );
  // Buscar avaliações do cliente (pelo telefone)
  const { data: clientReviews = [] } = trpc.reviews.getByClientPhone.useQuery(
    { phone: client.phone },
    { enabled: !!client.phone }
  );
  const utils = trpc.useUtils();
  const deletePhotoMutation = trpc.clients.deletePhoto.useMutation({
    onSuccess: () => utils.clients.getPhotos.invalidate({ clientId: client.id }),
  });

  const fullAddress = [client.street, client.addressNumber, client.complement, client.neighborhood, client.city, client.state]
    .filter(Boolean).join(", ");
  const clientMapsUrl = fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : null;
  const clientWazeUrl = fullAddress ? `https://waze.com/ul?q=${encodeURIComponent(fullAddress)}&navigate=yes` : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            {client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Contato */}
          <div className="bg-muted/40 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</p>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{formatPhone(client.phone)}</span>
            </div>
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="break-all">{client.email}</span>
              </div>
            )}
          </div>

          {/* Endereço com botões de navegação */}
          {fullAddress && (
            <div className="bg-muted/40 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Endereço</p>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="flex-1">{fullAddress}{client.cep ? ` — CEP ${client.cep}` : ""}</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={clientMapsUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors"
                >
                  🗺️ Google Maps
                </a>
                <a
                  href={clientWazeUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-xs font-medium hover:bg-cyan-600 transition-colors"
                >
                  🗯️ Waze
                </a>
              </div>
            </div>
          )}

          {/* Observações */}
          {client.notes && (
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          {/* Fotos dos Móveis */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Galeria de Fotos dos Móveis</p>
            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma foto cadastrada</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo: any) => (
                  <div key={photo.id} className="relative rounded-xl overflow-hidden border border-border group">
                    <img src={photo.photoUrl} alt={photo.furnitureType} className="w-full h-28 object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-white text-xs truncate">{photo.furnitureType}</p>
                    </div>
                    <button
                      onClick={() => deletePhotoMutation.mutate({ id: photo.id })}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de Orçamentos */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Histórico de Orçamentos
            </p>
            {budgetsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : clientBudgets.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum orçamento encontrado para este cliente</p>
            ) : (
              <div className="space-y-2">
                {clientBudgets.map((budget: any) => {
                  const cfg = statusConfig[budget.status] ?? statusConfig.pending;
                  return (
                    <div key={budget.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            #{String(budget.budgetNumber ?? budget.id).padStart(4, "0")}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium text-white"
                            style={{ background: cfg.color }}>
                            {budget.sold ? "Vendido" : cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(budget.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: "oklch(0.50 0.18 155)" }}>
                          {formatCurrency(parseFloat(String(budget.total ?? 0)))}
                        </p>
                      </div>
                      <Link href={`/orcamentos/${budget.id}/visualizar`} onClick={onClose}>
                        <button className="p-1 rounded hover:bg-muted transition-colors" title="Ver orçamento">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Histórico de Tapetes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Histórico de Tapetes
            </p>
            {carpetsLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : clientCarpets.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma OS de tapete encontrada para este cliente</p>
            ) : (
              <div className="space-y-2">
                {clientCarpets.map((carpet: any) => {
                  const cfg = carpetStatusConfig[carpet.status] ?? carpetStatusConfig.collected;
                  return (
                    <div key={carpet.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            #{String(carpet.orderNumber ?? carpet.id).padStart(4, "0")}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium text-white"
                            style={{ background: cfg.color }}>
                            {cfg.label}
                          </span>
                          {carpet.carpetType && (
                            <span className="text-xs text-muted-foreground truncate">{carpet.carpetType}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(carpet.collectedAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: "oklch(0.50 0.18 155)" }}>
                          {formatCurrency(parseFloat(String(carpet.price ?? 0)))}
                        </p>
                        {carpet.paid && (
                          <span className="text-xs text-green-600 font-medium">Pago</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Histórico de Vendas */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Histórico de Vendas
            </p>
            {salesLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : clientSales.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma venda registrada para este cliente</p>
            ) : (
              <div className="space-y-2">
                {clientSales.map((sale: any) => {
                  const statusColor = sale.paymentStatus === 'paid' ? 'text-green-600' : sale.paymentStatus === 'partial' ? 'text-yellow-600' : 'text-gray-500';
                  const statusLabel = sale.paymentStatus === 'paid' ? 'Pago' : sale.paymentStatus === 'partial' ? 'Parcial' : 'Pendente';
                  return (
                    <div key={sale.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 border border-border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            #{String(sale.saleCode ?? sale.id).padStart(4, "0")}
                          </span>
                          <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sale.description || "Venda"} · {formatDate(sale.saleDate)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: "oklch(0.50 0.18 155)" }}>
                          {formatCurrency(parseFloat(String(sale.total ?? 0)))}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {/* Total gasto */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 mt-1">
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">Total gasto</span>
                  <span className="text-sm font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(clientSales.reduce((sum: number, s: any) => sum + parseFloat(String(s.total ?? 0)), 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Histórico de OS de Execução */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" /> Histórico de OS de Execução
            </p>
            {executionsLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : clientExecutions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma OS de execução encontrada para este cliente</p>
            ) : (
              <div className="space-y-2">
                {clientExecutions.map((os: any) => {
                  const isDone = os.status === 'done';
                  return (
                    <div key={os.id} className="flex items-start gap-3 bg-muted/30 rounded-lg px-3 py-2 border border-border">
                      <div className="mt-0.5 shrink-0">
                        {isDone
                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                          : <Clock className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            #{String(os.orderNumber ?? os.id).padStart(4, "0")}
                          </span>
                          <span className={`text-xs font-medium ${
                            isDone ? 'text-green-600' : 'text-amber-600'
                          }`}>{isDone ? 'Concluído' : 'Pendente'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {os.serviceDescription || "Serviço"} · {os.scheduledDate ? new Date(os.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                        </p>
                        {os.assignedTo && (
                          <p className="text-xs text-muted-foreground">Resp.: {os.assignedTo}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: "oklch(0.50 0.18 155)" }}>
                          {formatCurrency(parseFloat(String(os.totalValue ?? 0)))}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {/* Total de OS */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 mt-1">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">{clientExecutions.length} OS · Total executado</span>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {formatCurrency(clientExecutions.reduce((sum: number, os: any) => sum + parseFloat(String(os.totalValue ?? 0)), 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Avaliações */}
          {clientReviews.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-yellow-500" /> Avaliações Recebidas
              </p>
              <div className="space-y-2">
                {clientReviews.map((rev: any) => (
                  <div key={rev.id} className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= (rev.rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {rev.respondedAt ? new Date(rev.respondedAt).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{rev.comment}"</p>
                    )}
                    {rev.serviceDescription && (
                      <p className="text-xs text-muted-foreground mt-0.5">{rev.serviceDescription}</p>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                  <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                    Média: {(clientReviews.filter((r: any) => r.rating).reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / clientReviews.filter((r: any) => r.rating).length || 0).toFixed(1)} ★
                  </span>
                  <span className="text-xs text-muted-foreground">{clientReviews.filter((r: any) => r.rating).length} avaliações</span>
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
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
  );
}

// ─── Client Form Modal ────────────────────────────────────────────────────────
function ClientFormModal({ editingClient, onClose, onSuccess }: {
  editingClient: any | null; onClose: () => void; onSuccess: () => void;
}) {
  const utils = trpc.useUtils();
  const [photoEntries, setPhotoEntries] = useState<{ furnitureType: string; file: File | null; previewUrl: string }[]>([]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); utils.clients.metrics.invalidate(); onSuccess(); toast.success("Cliente cadastrado!"); },
    onError: () => toast.error("Erro ao cadastrar cliente"),
  });
  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); utils.clients.metrics.invalidate(); onSuccess(); toast.success("Cliente atualizado!"); },
    onError: () => toast.error("Erro ao atualizar cliente"),
  });
  const addPhotoMutation = trpc.clients.addPhoto.useMutation();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ClientForm>({
    defaultValues: editingClient ? {
      name: editingClient.name || "",
      phone: editingClient.phone || "",
      email: editingClient.email || "",
      cep: editingClient.cep || "",
      street: editingClient.street || "",
      addressNumber: editingClient.addressNumber || "",
      complement: editingClient.complement || "",
      neighborhood: editingClient.neighborhood || "",
      city: editingClient.city || "",
      state: editingClient.state || "",
      notes: editingClient.notes || "",
    } : emptyForm,
  });

  const addressValue = {
    cep: watch("cep") || "",
    street: watch("street") || "",
    number: watch("addressNumber") || "",
    complement: watch("complement") || "",
    neighborhood: watch("neighborhood") || "",
    city: watch("city") || "",
    state: watch("state") || "",
  };

  const handleAddressChange = (data: Partial<typeof addressValue>) => {
    if (data.cep !== undefined) setValue("cep", data.cep);
    if (data.street !== undefined) setValue("street", data.street);
    if (data.number !== undefined) setValue("addressNumber", data.number);
    if (data.complement !== undefined) setValue("complement", data.complement);
    if (data.neighborhood !== undefined) setValue("neighborhood", data.neighborhood);
    if (data.city !== undefined) setValue("city", data.city);
    if (data.state !== undefined) setValue("state", data.state);
  };

  const addPhotoEntry = () => setPhotoEntries(prev => [...prev, { furnitureType: "", file: null, previewUrl: "" }]);
  const removePhotoEntry = (i: number) => setPhotoEntries(prev => prev.filter((_, idx) => idx !== i));
  const updatePhotoType = (i: number, val: string) => setPhotoEntries(prev => prev.map((e, idx) => idx === i ? { ...e, furnitureType: val } : e));
  const handleFileChange = (i: number, file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoEntries(prev => prev.map((e, idx) => idx === i ? { ...e, file, previewUrl: url } : e));
  };

  const onSubmit = async (data: ClientForm) => {
    const payload = {
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      cep: data.cep || undefined,
      street: data.street || undefined,
      addressNumber: data.addressNumber || undefined,
      complement: data.complement || undefined,
      neighborhood: data.neighborhood || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      notes: data.notes || undefined,
    };

    let clientId: number | undefined;
    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, ...payload });
      clientId = editingClient.id;
    } else {
      // For new clients, we need to get the ID from the response
      // Since create returns { success: true }, we'll use list to find the new client
      await createMutation.mutateAsync(payload);
      // Photos will be added after creation via a separate flow if needed
      return;
    }

    // Upload photos for existing clients
    if (clientId && photoEntries.length > 0) {
      for (const entry of photoEntries) {
        if (!entry.furnitureType || !entry.file) continue;
        try {
          const formData = new FormData();
          formData.append("visibility", "public");
          formData.append("category", "clients");
          formData.append("file", entry.file);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const { url } = await uploadRes.json();
            await addPhotoMutation.mutateAsync({ clientId, furnitureType: entry.furnitureType, photoUrl: url });
          }
        } catch {
          toast.error(`Erro ao enviar foto: ${entry.furnitureType}`);
        }
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingClient ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Dados principais */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Nome Completo *</label>
              <Input {...register("name", { required: true })} placeholder="Nome completo do cliente"
                className={errors.name ? "border-red-400" : ""} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefone *</label>
              <Input {...register("phone", { required: true })} placeholder="(00) 00000-0000"
                className={errors.phone ? "border-red-400" : ""} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input {...register("email")} type="email" placeholder="email@exemplo.com" />
            </div>
          </div>

          {/* Endereço */}
          <div className="border border-border rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Endereço</p>
            <GoogleAddressSearch
              onAddressSelected={(addr) => {
                handleAddressChange({
                  street: addr.street,
                  number: addr.number,
                  complement: addr.complement,
                  neighborhood: addr.neighborhood,
                  city: addr.city,
                  state: addr.state,
                  cep: addr.cep,
                });
              }}
            />
            <div className="border-t border-dashed border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">Ou preencha manualmente:</p>
              <AddressSearch
                value={addressValue}
                onChange={handleAddressChange}
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Observações / Anotações</label>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="Informações adicionais sobre o cliente..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Fotos dos Móveis (apenas para edição) */}
          {editingClient && (
            <div className="border border-border rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Galeria de Fotos dos Móveis</p>
                <Button type="button" variant="outline" size="sm" onClick={addPhotoEntry} className="gap-1 h-7 text-xs">
                  <Plus className="h-3 w-3" /> Adicionar Foto
                </Button>
              </div>
              {photoEntries.map((entry, i) => (
                <div key={i} className="border border-border rounded-lg p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={entry.furnitureType}
                      onChange={e => updatePhotoType(i, e.target.value)}
                      placeholder="Ex: Sofá 3 lugares, Cadeira..."
                      className="flex-1 text-sm"
                    />
                    <button type="button" onClick={() => removePhotoEntry(i)} className="text-red-400 hover:text-red-600 p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={el => { fileInputRefs.current[i] = el; }}
                      onChange={e => handleFileChange(i, e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm" className="gap-1 text-xs"
                      onClick={() => fileInputRefs.current[i]?.click()}>
                      <Camera className="h-3 w-3" /> Escolher Foto
                    </Button>
                    {entry.previewUrl && (
                      <img src={entry.previewUrl} alt="preview" className="h-10 w-10 rounded object-cover border border-border" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={isPending} className="flex-1 text-white"
              style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
              {isPending ? "Salvando..." : editingClient ? "Salvar" : "Cadastrar Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Importação ───────────────────────────────────────────────────────────────────────────────
function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [preview, setPreview] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [fileBase64, setFileBase64] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; phone: string; city: string }>({ name: "", phone: "", city: "" });
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      setFileBase64(base64);
      try {
        const res = await fetch("/api/clients/import-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileBase64: base64 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPreview(data.preview);
        setTotalRows(data.total);
        setStep("preview");
      } catch (err: any) {
        toast.error("Erro ao ler planilha: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const startEdit = (i: number, row: any) => {
    setEditingIdx(i);
    setEditValues({ name: row.name, phone: row.phone, city: row.city });
  };

  const saveEdit = (i: number) => {
    setPreview(prev => prev.map((row, idx) => {
      if (idx !== i) return row;
      const phone = editValues.phone.replace(/\D/g, "");
      const valid = !!(editValues.name.trim() && phone);
      // Re-check duplicate against other rows
      const otherPhones = prev.filter((_, j) => j !== i).map(r => r.phone?.replace(/\D/g, ""));
      const duplicate = otherPhones.includes(phone) && row.duplicate; // keep original duplicate flag from server
      return { ...row, name: editValues.name.trim(), phone, city: editValues.city.trim(), valid, duplicate: row.duplicate && otherPhones.includes(phone) };
    }));
    setEditingIdx(null);
  };

  const removeRow = (i: number) => {
    setPreview(prev => prev.filter((_, idx) => idx !== i));
    if (editingIdx === i) setEditingIdx(null);
  };

  const handleImport = async () => {
    setStep("importing");
    setProgress(0);
    setProgressLabel("Preparando importação...");

    // Simulate progress stages while waiting for server
    const stages = [
      { pct: 15, label: "Lendo dados da planilha..." },
      { pct: 35, label: "Verificando duplicatas..." },
      { pct: 60, label: "Cadastrando clientes..." },
      { pct: 85, label: "Finalizando..." },
    ];
    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < stages.length) {
        setProgress(stages[stageIdx].pct);
        setProgressLabel(stages[stageIdx].label);
        stageIdx++;
      }
    }, 600);

    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64 }),
      });
      const data = await res.json();
      clearInterval(interval);
      if (!res.ok) throw new Error(data.error);
      setProgress(100);
      setProgressLabel("Concluído!");
      setTimeout(() => {
        setResult(data);
        setStep("done");
        onSuccess();
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      setStep("preview");
      toast.error("Erro ao importar: " + err.message);
    }
  };

  const validToImport = preview.filter(r => r.valid && !r.duplicate).length;

  return (
    <Dialog open onOpenChange={step === "importing" ? undefined : onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Clientes
          </DialogTitle>
        </DialogHeader>

        {/* Etapa 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4 mt-2">
            <div className="bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Como importar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Baixe o modelo de planilha abaixo</li>
                <li>Preencha com seus clientes no Excel ou Google Planilhas</li>
                <li>Salve como .xlsx ou .csv e faça upload aqui</li>
              </ol>
            </div>
            <a
              href="/api/clients/template"
              download
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-sm font-medium w-full"
            >
              <Download className="h-4 w-4 text-green-600" />
              Baixar modelo de planilha (.xlsx)
            </a>
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx ou .csv</p>
              <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>
        )}

        {/* Etapa 2: Prévia com edição inline */}
        {step === "preview" && (
          <div className="space-y-4 mt-2">
            {/* Contador */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium">{totalRows} linha(s) encontrada(s)</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-green-600 font-medium">{validToImport} para importar</span>
              {preview.filter(r => r.duplicate).length > 0 && (
                <span className="text-amber-600 font-medium">{preview.filter(r => r.duplicate).length} duplicado(s)</span>
              )}
              {preview.filter(r => !r.valid).length > 0 && (
                <span className="text-red-500 font-medium">{preview.filter(r => !r.valid).length} inválido(s)</span>
              )}
            </div>

            {/* Legenda */}
            <p className="text-xs text-muted-foreground">Clique em qualquer linha para editar os dados antes de importar. Linhas inválidas ou duplicadas podem ser corrigidas ou removidas.</p>

            {/* Tabela */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[2fr_1.5fr_1fr_auto_auto] gap-1 px-3 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                <span>Nome</span><span>Telefone</span><span>Cidade</span><span>Status</span><span></span>
              </div>
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {preview.map((row, i) => (
                  <div key={i}>
                    {editingIdx === i ? (
                      /* Linha em modo de edição */
                      <div className="px-3 py-2 bg-blue-50 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-0.5 block">Nome *</label>
                            <input
                              value={editValues.name}
                              onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder="Nome completo"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-0.5 block">Telefone *</label>
                            <input
                              value={editValues.phone}
                              onChange={e => setEditValues(v => ({ ...v, phone: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder="11999990000"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-0.5 block">Cidade</label>
                            <input
                              value={editValues.city}
                              onChange={e => setEditValues(v => ({ ...v, city: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder="São Paulo"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingIdx(null)} className="text-xs px-3 py-1 rounded-md border border-border hover:bg-muted transition-colors">Cancelar</button>
                          <button onClick={() => saveEdit(i)} className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      /* Linha normal */
                      <div
                        className={`grid grid-cols-[2fr_1.5fr_1fr_auto_auto] gap-1 px-3 py-2 text-sm items-center cursor-pointer hover:bg-muted/30 transition-colors ${
                          row.duplicate ? "bg-amber-50" : !row.valid ? "bg-red-50" : ""
                        }`}
                        onClick={() => startEdit(i, row)}
                        title="Clique para editar"
                      >
                        <span className="truncate font-medium">{row.name || <em className="text-muted-foreground text-xs">sem nome</em>}</span>
                        <span className="text-muted-foreground text-xs">{row.phone || "—"}</span>
                        <span className="text-muted-foreground text-xs truncate">{row.city || "—"}</span>
                        <span>
                          {row.duplicate ? (
                            <span className="flex items-center gap-0.5 text-amber-600 text-xs"><AlertCircle className="h-3 w-3" /> Dup.</span>
                          ) : row.valid ? (
                            <span className="flex items-center gap-0.5 text-green-600 text-xs"><CheckCircle className="h-3 w-3" /> OK</span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-red-500 text-xs"><X className="h-3 w-3" /> Invál.</span>
                          )}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); removeRow(i); }}
                          className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Remover linha"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")} className="flex-1">Voltar</Button>
              <Button
                onClick={handleImport}
                disabled={validToImport === 0}
                className="flex-1 text-white"
                style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}
              >
                Importar {validToImport} cliente{validToImport !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Etapa 3: Progresso animado */}
        {step === "importing" && (
          <div className="space-y-6 mt-4 py-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
                {/* Spinner */}
                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="font-semibold text-foreground text-base">Importando clientes...</p>
              <p className="text-sm text-muted-foreground mt-1">{progressLabel}</p>
            </div>

            {/* Barra de progresso */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))",
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">Não feche esta janela durante a importação.</p>
          </div>
        )}

        {/* Etapa 4: Concluído */}
        {step === "done" && result && (
          <div className="space-y-4 mt-2 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold">{result.imported} cliente(s) importado(s)!</p>
              {result.skipped > 0 && <p className="text-sm text-muted-foreground mt-1">{result.skipped} pulado(s) (duplicados ou inválidos)</p>}
              {result.errors.length > 0 && <p className="text-sm text-red-500 mt-1">{result.errors.length} erro(s)</p>}
            </div>
            <Button onClick={onClose} className="text-white" style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
              Concluído
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────────────────────
export default function Clients() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("lista");
  const [editingClient, setEditingClient] = useState<any>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: clientsList = [], isLoading } = trpc.clients.list.useQuery({ search });
  const { data: metrics } = trpc.clients.metrics.useQuery();
  const { data: topClients = [] } = trpc.clients.topClients.useQuery();

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); utils.clients.metrics.invalidate(); toast.success("Cliente excluído!"); },
    onError: () => toast.error("Erro ao excluir cliente"),
  });

  const openCreate = () => { setEditingClient(null); setIsFormOpen(true); };
  const openEdit = (client: any) => { setViewingClient(null); setEditingClient(client); setIsFormOpen(true); };
  const handleDelete = (client: any) => {
    if (confirm(`Excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate({ id: client.id });
    }
  };

  const getFullAddress = (c: any) =>
    [c.street, c.addressNumber, c.neighborhood, c.city, c.state].filter(Boolean).join(", ");

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gerencie informações completas dos seus clientes</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/api/clients/export"}
              className="gap-2 flex"
              title="Exportar clientes para Excel"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportOpen(true)}
              className="gap-2 flex"
              title="Importar clientes de planilha"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button onClick={openCreate} className="gap-2 text-white"
              style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon={Users} label="Total de Clientes" color="oklch(0.32 0.14 240)"
            value={String(metrics?.total ?? 0)}
            sub={`+${metrics?.newThisMonth ?? 0} este mês`}
          />
          <MetricCard
            icon={TrendingUp} label="Novos Este Mês" color="oklch(0.50 0.18 155)"
            value={String(metrics?.newThisMonth ?? 0)}
            sub="Clientes cadastrados"
          />
          <MetricCard
            icon={DollarSign} label="Faturamento Total" color="oklch(0.60 0.20 150)"
            value={formatCurrency(metrics?.totalRevenue ?? 0)}
            sub="Receita acumulada"
          />
          <MetricCard
            icon={Star} label="Ticket Médio" color="oklch(0.70 0.20 60)"
            value={formatCurrency(metrics?.avgTicket ?? 0)}
            sub="Por cliente"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/60">
            <TabsTrigger value="lista">Lista de Clientes</TabsTrigger>
            <TabsTrigger value="top10">Top 10 Clientes</TabsTrigger>
          </TabsList>

          {/* ── Lista de Clientes ── */}
          <TabsContent value="lista" className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-card rounded-xl animate-pulse border border-border" />
                ))}
              </div>
            ) : clientsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
                <Users className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">{search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
                <p className="text-sm mt-1">{search ? "Tente outro termo de busca" : 'Clique em "Novo Cliente" para começar'}</p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Table Header — desktop only */}
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Telefone</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cadastrado em</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações</span>
                </div>
                <div className="divide-y divide-border">
                  {clientsList.map((client) => (
                    <div key={client.id} className="hover:bg-muted/20 transition-colors">
                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_auto] gap-4 items-center px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground truncate">{client.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatPhone(client.phone)}</span>
                        <span className="text-sm text-muted-foreground truncate">{client.email || "—"}</span>
                        <span className="text-sm text-muted-foreground">{formatDate(client.createdAt)}</span>
                        <div className="flex gap-1">
                          <button onClick={() => setViewingClient(client)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Visualizar">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Editar">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(client)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Excluir">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile row */}
                      <div className="md:hidden flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPhone(client.phone)}</p>
                          {getFullAddress(client) && (
                            <p className="text-xs text-muted-foreground truncate">{getFullAddress(client)}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setViewingClient(client)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(client)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Top 10 Clientes ── */}
          <TabsContent value="top10" className="mt-4">
            {topClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
                <Star className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">Nenhum dado disponível</p>
                <p className="text-sm mt-1">Os top clientes aparecem após orçamentos aceitos</p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="divide-y divide-border">
                  {topClients.map((client: any, index: number) => (
                    <div key={client.clientId ?? index} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: index === 0 ? "oklch(0.80 0.18 60)" : index === 1 ? "oklch(0.75 0.05 240)" : index === 2 ? "oklch(0.65 0.12 40)" : "oklch(0.90 0.01 240)",
                          color: index < 3 ? "white" : "oklch(0.40 0.01 240)",
                        }}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{client.clientName}</p>
                        <p className="text-xs text-muted-foreground">{client.clientPhone} · {client.budgetCount} orçamento{client.budgetCount !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-foreground" style={{ color: "oklch(0.50 0.18 155)" }}>
                          {formatCurrency(client.totalRevenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">faturado</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {isFormOpen && (
        <ClientFormModal
          editingClient={editingClient}
          onClose={() => { setIsFormOpen(false); setEditingClient(null); }}
          onSuccess={() => { setIsFormOpen(false); setEditingClient(null); }}
        />
      )}
      {viewingClient && (
        <ClientDetailModal
          client={viewingClient}
          onClose={() => setViewingClient(null)}
          onEdit={() => openEdit(viewingClient)}
        />
      )}
      {isImportOpen && (
        <ImportModal
          onClose={() => setIsImportOpen(false)}
          onSuccess={() => {
            utils.clients.list.invalidate();
            utils.clients.metrics.invalidate();
            setIsImportOpen(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}
