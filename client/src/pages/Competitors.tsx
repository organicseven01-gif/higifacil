import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import FeatureGate from "@/components/FeatureGate";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, RefreshCw, Star, Instagram, ExternalLink,
  Building2, TrendingUp, ListChecks, BarChart3, Globe, DollarSign,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type Competitor = {
  id: number; name: string; services: string | null; siteUrl: string | null;
  priceRange: string | null; instagramUrl: string | null; googleUrl: string | null;
  googleReviews: number | null; googleRating: string | null; notes: string | null;
  lastUpdatedAt: Date; createdAt: Date;
};
type Criteria = {
  id: number; name: string; description: string | null; unit: string | null;
  type: "number" | "text" | "rating" | "boolean"; sortOrder: number | null;
};
type Score = { id: number; competitorId: number; criteriaId: number; value: string | null; notes: string | null };
type CompetitorService = { id: number; competitorId: number; serviceName: string; price: string | null; notes: string | null; createdAt: Date };

const TABS = ["Empresas", "Critérios", "Comparativo"] as const;
type Tab = typeof TABS[number];

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-muted-foreground text-xs">—</span>;
  const num = parseFloat(rating);
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.floor(num) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
        ))}
      </div>
      <span className="text-sm font-semibold">{num.toFixed(1)}</span>
    </div>
  );
}

// ─── Empty forms ──────────────────────────────────────────────────────────────
const emptyComp = { name: "", siteUrl: "", instagramUrl: "", googleUrl: "", googleReviews: "", googleRating: "", notes: "" };
const emptyCrit = { name: "", description: "", unit: "", type: "text" as Criteria["type"] };
const emptySvc = { serviceName: "", price: "", notes: "" };

// ─── Modal de Serviços/Preços ─────────────────────────────────────────────────
function PricesModal({ competitor, onClose }: { competitor: Competitor; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: svcList = [], isLoading } = trpc.competitorServices.list.useQuery({ competitorId: competitor.id });
  const [form, setForm] = useState(emptySvc);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const createSvc = trpc.competitorServices.create.useMutation({
    onSuccess: () => { utils.competitorServices.list.invalidate({ competitorId: competitor.id }); toast.success("Serviço adicionado!"); setForm(emptySvc); },
    onError: () => toast.error("Erro ao adicionar serviço."),
  });
  const updateSvc = trpc.competitorServices.update.useMutation({
    onSuccess: () => { utils.competitorServices.list.invalidate({ competitorId: competitor.id }); toast.success("Serviço atualizado!"); setForm(emptySvc); setEditingId(null); },
    onError: () => toast.error("Erro ao atualizar."),
  });
  const deleteSvc = trpc.competitorServices.delete.useMutation({
    onSuccess: () => { utils.competitorServices.list.invalidate({ competitorId: competitor.id }); toast.success("Serviço removido."); setDeletingId(null); },
    onError: () => toast.error("Erro ao remover."),
  });

  function openEdit(s: CompetitorService) { setEditingId(s.id); setForm({ serviceName: s.serviceName, price: s.price ?? "", notes: s.notes ?? "" }); }
  function submit() {
    if (!form.serviceName.trim()) { toast.error("Nome do serviço obrigatório."); return; }
    const p = { serviceName: form.serviceName.trim(), price: form.price || undefined, notes: form.notes || undefined };
    editingId !== null ? updateSvc.mutate({ id: editingId, ...p }) : createSvc.mutate({ competitorId: competitor.id, ...p });
  }

  return (
    <>
      <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Tabela de Preços — {competitor.name}
            </DialogTitle>
          </DialogHeader>

          {/* Formulário de adição/edição */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
            <p className="text-sm font-semibold text-muted-foreground">{editingId ? "Editando serviço" : "Adicionar serviço"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome do Serviço *</Label>
                <Input className="mt-1" placeholder="Ex: Higienização de sofá 3 lugares" value={form.serviceName} onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))} />
              </div>
              <div>
                <Label>Valor Praticado</Label>
                <Input className="mt-1" placeholder="Ex: R$ 120,00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>Observações</Label>
                <Input className="mt-1" placeholder="Ex: inclui impermeabilização" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              {editingId && (
                <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setForm(emptySvc); }}>Cancelar</Button>
              )}
              <Button size="sm" onClick={submit} disabled={createSvc.isPending || updateSvc.isPending} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                {createSvc.isPending || updateSvc.isPending ? "Salvando..." : editingId ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </div>

          {/* Tabela de serviços */}
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : svcList.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto opacity-20 mb-2" />
              <p className="text-sm">Nenhum serviço cadastrado ainda para esta empresa.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Serviço</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Valor</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Obs.</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {svcList.map((s, idx) => (
                    <tr key={s.id} className={`border-b last:border-0 hover:bg-muted/20 ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-2.5 font-medium">{s.serviceName}</td>
                      <td className="px-4 py-2.5">
                        {s.price ? <Badge variant="secondary" className="font-mono text-xs">{s.price}</Badge> : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.notes ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={deletingId !== null} onOpenChange={open => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover serviço?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deletingId !== null && deleteSvc.mutate({ id: deletingId })}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Competitors() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("Empresas");

  // Queries
  const { data: competitors = [], isLoading: loadingComp } = trpc.competitors.list.useQuery();
  const { data: criteriaList = [], isLoading: loadingCrit } = trpc.criteria.list.useQuery();
  const { data: scores = [] } = trpc.scores.list.useQuery();

  // ─── Competitors CRUD ───────────────────────────────────────────────────────
  const [showCompForm, setShowCompForm] = useState(false);
  const [editingCompId, setEditingCompId] = useState<number | null>(null);
  const [deletingCompId, setDeletingCompId] = useState<number | null>(null);
  const [compForm, setCompForm] = useState(emptyComp);
  const [pricesComp, setPricesComp] = useState<Competitor | null>(null);

  const createComp = trpc.competitors.create.useMutation({ onSuccess: () => { utils.competitors.list.invalidate(); toast.success("Empresa adicionada!"); setShowCompForm(false); setCompForm(emptyComp); }, onError: () => toast.error("Erro ao adicionar empresa.") });
  const updateComp = trpc.competitors.update.useMutation({ onSuccess: () => { utils.competitors.list.invalidate(); toast.success("Empresa atualizada!"); setShowCompForm(false); setEditingCompId(null); setCompForm(emptyComp); }, onError: () => toast.error("Erro ao atualizar.") });
  const deleteComp = trpc.competitors.delete.useMutation({ onSuccess: () => { utils.competitors.list.invalidate(); toast.success("Empresa removida."); setDeletingCompId(null); }, onError: () => toast.error("Erro ao remover.") });
  const refreshComp = trpc.competitors.update.useMutation({ onSuccess: () => { utils.competitors.list.invalidate(); toast.info("Data de atualização registrada."); } });

  function openEditComp(c: Competitor) {
    setEditingCompId(c.id);
    setCompForm({ name: c.name, siteUrl: c.siteUrl ?? "", instagramUrl: c.instagramUrl ?? "", googleUrl: c.googleUrl ?? "", googleReviews: c.googleReviews?.toString() ?? "", googleRating: c.googleRating ?? "", notes: c.notes ?? "" });
    setShowCompForm(true);
  }
  function submitComp() {
    if (!compForm.name.trim()) { toast.error("Nome obrigatório."); return; }
    const p = {
      name: compForm.name.trim(),
      siteUrl: compForm.siteUrl || undefined,
      instagramUrl: compForm.instagramUrl || undefined,
      googleUrl: compForm.googleUrl || undefined,
      googleReviews: compForm.googleReviews ? parseInt(compForm.googleReviews) : undefined,
      googleRating: compForm.googleRating || undefined,
      notes: compForm.notes || undefined,
    };
    editingCompId !== null ? updateComp.mutate({ id: editingCompId, ...p }) : createComp.mutate(p);
  }

  // ─── Criteria CRUD ──────────────────────────────────────────────────────────
  const [showCritForm, setShowCritForm] = useState(false);
  const [editingCritId, setEditingCritId] = useState<number | null>(null);
  const [deletingCritId, setDeletingCritId] = useState<number | null>(null);
  const [critForm, setCritForm] = useState(emptyCrit);

  const createCrit = trpc.criteria.create.useMutation({ onSuccess: () => { utils.criteria.list.invalidate(); toast.success("Critério adicionado!"); setShowCritForm(false); setCritForm(emptyCrit); }, onError: () => toast.error("Erro ao adicionar critério.") });
  const updateCrit = trpc.criteria.update.useMutation({ onSuccess: () => { utils.criteria.list.invalidate(); toast.success("Critério atualizado!"); setShowCritForm(false); setEditingCritId(null); setCritForm(emptyCrit); }, onError: () => toast.error("Erro ao atualizar.") });
  const deleteCrit = trpc.criteria.delete.useMutation({ onSuccess: () => { utils.criteria.list.invalidate(); utils.scores.list.invalidate(); toast.success("Critério removido."); setDeletingCritId(null); }, onError: () => toast.error("Erro ao remover.") });

  function openEditCrit(c: Criteria) { setEditingCritId(c.id); setCritForm({ name: c.name, description: c.description ?? "", unit: c.unit ?? "", type: c.type }); setShowCritForm(true); }
  function submitCrit() {
    if (!critForm.name.trim()) { toast.error("Nome obrigatório."); return; }
    const p = { name: critForm.name.trim(), description: critForm.description || undefined, unit: critForm.unit || undefined, type: critForm.type };
    editingCritId !== null ? updateCrit.mutate({ id: editingCritId, ...p }) : createCrit.mutate(p);
  }

  // ─── Scores (inline edit) ───────────────────────────────────────────────────
  const upsertScore = trpc.scores.upsert.useMutation({ onSuccess: () => utils.scores.list.invalidate(), onError: () => toast.error("Erro ao salvar valor.") });
  const [editingCell, setEditingCell] = useState<{ compId: number; critId: number } | null>(null);
  const [cellValue, setCellValue] = useState("");

  function getScore(compId: number, critId: number) { return scores.find(s => s.competitorId === compId && s.criteriaId === critId)?.value ?? ""; }
  function startEdit(compId: number, critId: number) { setEditingCell({ compId, critId }); setCellValue(getScore(compId, critId)); }
  function commitEdit() {
    if (!editingCell) return;
    upsertScore.mutate({ competitorId: editingCell.compId, criteriaId: editingCell.critId, value: cellValue });
    setEditingCell(null);
  }

  const typeLabel: Record<Criteria["type"], string> = { number: "Número", text: "Texto", rating: "Nota (0-10)", boolean: "Sim/Não" };

  return (
    <FeatureGate featureKey="concorrentes" featureLabel="Análise de Concorrência">
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Análise de Concorrência</h1>
            <p className="text-muted-foreground text-sm mt-1">Monitore empresas, critérios e compare o mercado.</p>
          </div>
          {tab === "Empresas" && (
            <Button onClick={() => { setEditingCompId(null); setCompForm(emptyComp); setShowCompForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar Empresa
            </Button>
          )}
          {tab === "Critérios" && (
            <Button onClick={() => { setEditingCritId(null); setCritForm(emptyCrit); setShowCritForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Critério
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "Empresas" && <Building2 className="h-4 w-4" />}
              {t === "Critérios" && <ListChecks className="h-4 w-4" />}
              {t === "Comparativo" && <BarChart3 className="h-4 w-4" />}
              {t}
            </button>
          ))}
        </div>

        {/* ── ABA: EMPRESAS ─────────────────────────────────────────────────── */}
        {tab === "Empresas" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Empresas</p><p className="text-2xl font-bold mt-1">{competitors.length}</p></div>
              <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Com Site</p><p className="text-2xl font-bold mt-1">{competitors.filter(c => c.siteUrl).length}</p></div>
              <div className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground uppercase tracking-wide">Com Google</p><p className="text-2xl font-bold mt-1">{competitors.filter(c => c.googleUrl).length}</p></div>
            </div>

            {/* Gráfico de barras — avaliações por empresa */}
            {competitors.filter(c => c.googleReviews).length > 0 && (
              <div className="bg-card border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-sm">Avaliações no Google por Empresa</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[...competitors]
                      .filter(c => c.googleReviews)
                      .sort((a, b) => (b.googleReviews ?? 0) - (a.googleReviews ?? 0))
                      .map(c => ({ name: c.name, avaliações: c.googleReviews ?? 0 }))}
                    margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [v.toLocaleString("pt-BR"), "Avaliações"]}
                    />
                    <Bar dataKey="avaliações" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {[...competitors]
                        .filter(c => c.googleReviews)
                        .sort((a, b) => (b.googleReviews ?? 0) - (a.googleReviews ?? 0))
                        .map((_, i, arr) => (
                          <Cell
                            key={i}
                            fill={i === 0
                              ? "hsl(var(--primary))"
                              : `hsl(var(--primary) / ${Math.max(0.35, 1 - i * (0.55 / Math.max(arr.length - 1, 1)))})`
                            }
                          />
                        ))
                      }
                      <LabelList dataKey="avaliações" position="top" style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {loadingComp ? <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
              : competitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground border rounded-xl bg-card">
                  <TrendingUp className="h-12 w-12 opacity-30" />
                  <p className="font-medium">Nenhuma empresa cadastrada ainda.</p>
                  <Button variant="outline" onClick={() => { setEditingCompId(null); setCompForm(emptyComp); setShowCompForm(true); }} className="gap-2"><Plus className="h-4 w-4" /> Adicionar primeira empresa</Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border bg-card">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Empresa</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Site</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Valores</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Redes</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Avaliações</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Estrelas</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Atualizado</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Ações</th>
                    </tr></thead>
                    <tbody>
                      {competitors.map((c, idx) => (
                        <tr key={c.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Building2 className="h-4 w-4 text-primary" /></div>
                              <span className="font-semibold">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {c.siteUrl ? (
                              <a href={c.siteUrl.startsWith("http") ? c.siteUrl : `https://${c.siteUrl}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-xs font-medium transition-colors group">
                                <Globe className="h-3.5 w-3.5" />
                                <span className="group-hover:underline truncate max-w-[120px]">{c.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </a>
                            ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 bg-transparent" onClick={() => setPricesComp(c)}>
                              <DollarSign className="h-3.5 w-3.5 text-primary" />
                              Ver preços
                            </Button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {c.instagramUrl && <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-500 hover:text-pink-600 text-xs font-medium"><Instagram className="h-3.5 w-3.5" />Instagram</a>}
                              {c.googleUrl && <a href={c.googleUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-xs font-medium"><ExternalLink className="h-3.5 w-3.5" />Google</a>}
                              {!c.instagramUrl && !c.googleUrl && <span className="text-muted-foreground/40">—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">{c.googleReviews != null && c.googleReviews > 0 ? <span className="font-semibold">{c.googleReviews.toLocaleString("pt-BR")}</span> : <span className="text-muted-foreground/40">—</span>}</td>
                          <td className="px-4 py-3"><StarRating rating={c.googleRating} /></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(c.lastUpdatedAt).toLocaleDateString("pt-BR")}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Atualizar data" onClick={() => refreshComp.mutate({ id: c.id })}><RefreshCw className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEditComp(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir" onClick={() => setDeletingCompId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </>
        )}

        {/* ── ABA: CRITÉRIOS ────────────────────────────────────────────────── */}
        {tab === "Critérios" && (
          <>
            {loadingCrit ? <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
              : criteriaList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground border rounded-xl bg-card">
                  <ListChecks className="h-12 w-12 opacity-30" />
                  <p className="font-medium">Nenhum critério cadastrado ainda.</p>
                  <p className="text-sm text-center max-w-xs">Cadastre critérios como "Tempo de Resposta", "Flexibilidade de Horário", "Duração do Serviço" para comparar as empresas.</p>
                  <Button variant="outline" onClick={() => { setEditingCritId(null); setCritForm(emptyCrit); setShowCritForm(true); }} className="gap-2"><Plus className="h-4 w-4" /> Criar primeiro critério</Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Critério</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Descrição</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Unidade</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Ações</th>
                    </tr></thead>
                    <tbody>
                      {criteriaList.map((c, idx) => (
                        <tr key={c.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                          <td className="px-4 py-3 font-semibold">{c.name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-[220px]">{c.description ?? "—"}</td>
                          <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{typeLabel[c.type]}</Badge></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{c.unit ?? "—"}</td>
                          <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCrit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingCritId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </>
        )}

        {/* ── ABA: COMPARATIVO ──────────────────────────────────────────────── */}
        {tab === "Comparativo" && (
          <>
            {competitors.length === 0 || criteriaList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground border rounded-xl bg-card">
                <BarChart3 className="h-12 w-12 opacity-30" />
                <p className="font-medium">Para ver o comparativo, cadastre pelo menos uma empresa e um critério.</p>
                <div className="flex gap-2 mt-1">
                  {competitors.length === 0 && <Button variant="outline" size="sm" onClick={() => setTab("Empresas")}>Ir para Empresas</Button>}
                  {criteriaList.length === 0 && <Button variant="outline" size="sm" onClick={() => setTab("Critérios")}>Ir para Critérios</Button>}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Clique em qualquer célula para editar o valor daquele critério para a empresa.</p>
                <div className="overflow-x-auto rounded-xl border bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-muted/40 min-w-[160px]">Critério</th>
                        {competitors.map(c => (
                          <th key={c.id} className="text-center px-4 py-3 font-semibold text-muted-foreground min-w-[130px]">
                            <div className="flex flex-col items-center gap-1">
                              <Building2 className="h-4 w-4 text-primary" />
                              <span className="text-xs">{c.name}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {criteriaList.map((crit, idx) => (
                        <tr key={crit.id} className={`border-b last:border-0 ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                          <td className="px-4 py-3 sticky left-0 bg-background border-r">
                            <div>
                              <p className="font-semibold">{crit.name}</p>
                              {crit.unit && <p className="text-xs text-muted-foreground">{crit.unit}</p>}
                            </div>
                          </td>
                          {competitors.map(comp => {
                            const isEditing = editingCell?.compId === comp.id && editingCell?.critId === crit.id;
                            const val = getScore(comp.id, crit.id);
                            return (
                              <td key={comp.id} className="px-2 py-2 text-center">
                                {isEditing ? (
                                  <Input autoFocus value={cellValue} onChange={e => setCellValue(e.target.value)}
                                    onBlur={commitEdit} onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingCell(null); }}
                                    className="h-7 text-xs text-center" />
                                ) : (
                                  <button onClick={() => startEdit(comp.id, crit.id)}
                                    className={`w-full min-h-[32px] px-2 py-1 rounded text-xs transition-colors hover:bg-primary/10 ${val ? "font-medium" : "text-muted-foreground/40 italic"}`}>
                                    {val || "Clique para preencher"}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Modal: Empresa ────────────────────────────────────────────────── */}
        <Dialog open={showCompForm} onOpenChange={open => { if (!open) { setShowCompForm(false); setEditingCompId(null); setCompForm(emptyComp); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingCompId ? "Editar Empresa" : "Adicionar Empresa"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Nome da Empresa *</Label><Input className="mt-1" placeholder="Ex: Higienização Silva" value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Site da Empresa</Label><Input className="mt-1" placeholder="Ex: https://empresa.com.br" value={compForm.siteUrl} onChange={e => setCompForm(f => ({ ...f, siteUrl: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Instagram (URL)</Label><Input className="mt-1" placeholder="https://instagram.com/..." value={compForm.instagramUrl} onChange={e => setCompForm(f => ({ ...f, instagramUrl: e.target.value }))} /></div>
                <div><Label>Google Maps (URL)</Label><Input className="mt-1" placeholder="https://maps.google.com/..." value={compForm.googleUrl} onChange={e => setCompForm(f => ({ ...f, googleUrl: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Avaliações no Google</Label><Input className="mt-1" type="number" min={0} placeholder="Ex: 128" value={compForm.googleReviews} onChange={e => setCompForm(f => ({ ...f, googleReviews: e.target.value }))} /></div>
                <div><Label>Média de Estrelas</Label><Input className="mt-1" type="number" min={0} max={5} step={0.1} placeholder="Ex: 4.7" value={compForm.googleRating} onChange={e => setCompForm(f => ({ ...f, googleRating: e.target.value }))} /></div>
              </div>
              <div><Label>Observações</Label><Textarea className="mt-1" placeholder="Pontos fortes, fracos..." rows={2} value={compForm.notes} onChange={e => setCompForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCompForm(false); setEditingCompId(null); setCompForm(emptyComp); }}>Cancelar</Button>
              <Button onClick={submitComp} disabled={createComp.isPending || updateComp.isPending}>{createComp.isPending || updateComp.isPending ? "Salvando..." : editingCompId ? "Salvar" : "Adicionar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal: Critério ───────────────────────────────────────────────── */}
        <Dialog open={showCritForm} onOpenChange={open => { if (!open) { setShowCritForm(false); setEditingCritId(null); setCritForm(emptyCrit); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingCritId ? "Editar Critério" : "Novo Critério"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Nome do Critério *</Label><Input className="mt-1" placeholder="Ex: Tempo de Resposta" value={critForm.name} onChange={e => setCritForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Descrição</Label><Textarea className="mt-1" placeholder="O que esse critério avalia..." rows={2} value={critForm.description} onChange={e => setCritForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Valor</Label>
                  <Select value={critForm.type} onValueChange={v => setCritForm(f => ({ ...f, type: v as Criteria["type"] }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="rating">Nota (0-10)</SelectItem>
                      <SelectItem value="boolean">Sim/Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Unidade</Label><Input className="mt-1" placeholder="Ex: minutos, horas" value={critForm.unit} onChange={e => setCritForm(f => ({ ...f, unit: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCritForm(false); setEditingCritId(null); setCritForm(emptyCrit); }}>Cancelar</Button>
              <Button onClick={submitCrit} disabled={createCrit.isPending || updateCrit.isPending}>{createCrit.isPending || updateCrit.isPending ? "Salvando..." : editingCritId ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal: Tabela de Preços ───────────────────────────────────────── */}
        {pricesComp && <PricesModal competitor={pricesComp} onClose={() => setPricesComp(null)} />}

        {/* ── Confirm Delete: Empresa ───────────────────────────────────────── */}
        <AlertDialog open={deletingCompId !== null} onOpenChange={open => { if (!open) setDeletingCompId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Remover empresa?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Todos os dados desta empresa serão excluídos permanentemente.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deletingCompId !== null && deleteComp.mutate({ id: deletingCompId })}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Confirm Delete: Critério ──────────────────────────────────────── */}
        <AlertDialog open={deletingCritId !== null} onOpenChange={open => { if (!open) setDeletingCritId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Remover critério?</AlertDialogTitle><AlertDialogDescription>Todos os valores preenchidos para este critério nas empresas também serão removidos.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deletingCritId !== null && deleteCrit.mutate({ id: deletingCritId })}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
    </FeatureGate>
  );
}
