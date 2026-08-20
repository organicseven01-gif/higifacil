import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Switch,
} from "@/components/ui/switch";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Lock,
  RefreshCw,
  CalendarDays,
  CalendarCheck2,
  Sparkles,
} from "lucide-react";

type PlanFeature = {
  id: number;
  featureKey: string;
  featureLabel: string;
  featureDescription: string | null;
  soloEnabled: boolean;
  duplaEnabled: boolean;
  equipeEnabled: boolean;
  sortOrder: number;
};

// soloEnabled  → Mensal  (R$ 49,90/mês)
// equipeEnabled → Anual   (R$ 490/ano)
// duplaEnabled  → não usado visualmente, mantido no banco

const PLAN_COLORS = {
  mensal: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  anual:  { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
};

export default function AdminPlanos() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFeature, setEditingFeature] = useState<PlanFeature | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [form, setForm] = useState({
    featureKey: "",
    featureLabel: "",
    featureDescription: "",
    soloEnabled: true,   // mensal
    duplaEnabled: true,  // sempre true (não usado)
    equipeEnabled: true, // anual
    sortOrder: 0,
  });

  const { data: features = [], refetch, isLoading } = trpc.planFeatures.list.useQuery();

  const createMutation = trpc.planFeatures.create.useMutation({
    onSuccess: () => {
      toast.success("Funcionalidade criada com sucesso!");
      setShowCreateDialog(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.planFeatures.update.useMutation({
    onSuccess: () => {
      toast.success("Funcionalidade atualizada!");
      setEditingFeature(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.planFeatures.delete.useMutation({
    onSuccess: () => {
      toast.success("Funcionalidade removida!");
      setDeleteConfirm(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const seedMutation = trpc.planFeatures.seed.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} funcionalidades padrão carregadas!`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.planFeatures.update.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setForm({
      featureKey: "",
      featureLabel: "",
      featureDescription: "",
      soloEnabled: true,
      duplaEnabled: true,
      equipeEnabled: true,
      sortOrder: 0,
    });
  }

  function openEdit(feat: PlanFeature) {
    setEditingFeature(feat);
    setForm({
      featureKey: feat.featureKey,
      featureLabel: feat.featureLabel,
      featureDescription: feat.featureDescription ?? "",
      soloEnabled: feat.soloEnabled,
      duplaEnabled: feat.duplaEnabled,
      equipeEnabled: feat.equipeEnabled,
      sortOrder: feat.sortOrder,
    });
  }

  function handleToggle(feat: PlanFeature, plan: "soloEnabled" | "equipeEnabled") {
    toggleMutation.mutate({ id: feat.id, [plan]: !feat[plan] });
  }

  function handleSave() {
    if (editingFeature) {
      updateMutation.mutate({ id: editingFeature.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const mensalCount = features.filter((f) => f.soloEnabled).length;
  const anualCount  = features.filter((f) => f.equipeEnabled).length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Layers className="h-6 w-6 text-blue-400" />
              Gerenciar Planos
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure quais funcionalidades estão disponíveis em cada plano.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${seedMutation.isPending ? "animate-spin" : ""}`} />
              Carregar padrões
            </Button>
            <Button
              size="sm"
              onClick={() => { resetForm(); setShowCreateDialog(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova funcionalidade
            </Button>
          </div>
        </div>

        {/* Resumo por plano — apenas Mensal e Anual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          {[
            { icon: CalendarDays, label: "Mensal", count: mensalCount, price: "R$ 49,90/mês", ...PLAN_COLORS.mensal },
            { icon: CalendarCheck2, label: "Anual",  count: anualCount,  price: "R$ 490,00/ano", ...PLAN_COLORS.anual },
          ].map((plan) => (
            <Card key={plan.label} className="bg-slate-900 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.bg}`}>
                    <plan.icon className={`h-5 w-5 ${plan.text}`} />
                  </div>
                  <div>
                    <p className="font-bold text-white">{plan.label}</p>
                    <p className="text-xs text-slate-400">{plan.price}</p>
                  </div>
                </div>
                <p className="text-3xl font-black text-white">{plan.count}</p>
                <p className="text-xs text-slate-400">funcionalidades ativas</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabela de funcionalidades */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              Funcionalidades por Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Carregando...</div>
            ) : features.length === 0 ? (
              <div className="p-8 text-center">
                <Layers className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">Nenhuma funcionalidade cadastrada.</p>
                <Button
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Carregar funcionalidades padrão
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Funcionalidade</th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center justify-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-blue-400" /> Mensal
                        </span>
                      </th>
                      <th className="text-center p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center justify-center gap-1.5">
                          <CalendarCheck2 className="h-3.5 w-3.5 text-amber-400" /> Anual
                        </span>
                      </th>
                      <th className="text-right p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feat, i) => (
                      <tr key={feat.id} className={`border-b border-slate-800 ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50"}`}>
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-white text-sm">{feat.featureLabel}</p>
                            {feat.featureDescription && (
                              <p className="text-xs text-slate-400 mt-0.5">{feat.featureDescription}</p>
                            )}
                            <code className="text-xs text-slate-500 mt-1 block">{feat.featureKey}</code>
                          </div>
                        </td>
                        {/* Mensal = soloEnabled */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={feat.soloEnabled}
                              onCheckedChange={() => handleToggle(feat, "soloEnabled")}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                        </td>
                        {/* Anual = equipeEnabled */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={feat.equipeEnabled}
                              onCheckedChange={() => handleToggle(feat, "equipeEnabled")}
                              className="data-[state=checked]:bg-amber-500"
                            />
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(feat)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(feat.id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legenda */}
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Ativo no plano
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-600" /> Bloqueado no plano
          </span>
          <span>Use os toggles para ativar/desativar funcionalidades por plano.</span>
        </div>
      </div>

      {/* Dialog de criação/edição */}
      <Dialog open={showCreateDialog || !!editingFeature} onOpenChange={(open) => {
        if (!open) { setShowCreateDialog(false); setEditingFeature(null); }
      }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingFeature ? "Editar Funcionalidade" : "Nova Funcionalidade"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Chave (featureKey)</Label>
                <Input
                  value={form.featureKey}
                  onChange={(e) => setForm({ ...form, featureKey: e.target.value })}
                  placeholder="ex: financeiro"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Ordem</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Nome da Funcionalidade</Label>
              <Input
                value={form.featureLabel}
                onChange={(e) => setForm({ ...form, featureLabel: e.target.value })}
                placeholder="ex: Módulo Financeiro"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Descrição (opcional)</Label>
              <Input
                value={form.featureDescription}
                onChange={(e) => setForm({ ...form, featureDescription: e.target.value })}
                placeholder="Breve descrição da funcionalidade"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-3 pt-2">
              <Label className="text-slate-300 text-xs">Disponível nos planos</Label>
              <div className="space-y-3">
                {[
                  { key: "soloEnabled" as const, label: "Mensal", icon: CalendarDays, price: "R$ 49,90/mês", color: "text-blue-400" },
                  { key: "equipeEnabled" as const, label: "Anual",  icon: CalendarCheck2, price: "R$ 490,00/ano", color: "text-amber-400" },
                ].map((plan) => (
                  <div key={plan.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
                    <div className="flex items-center gap-3">
                      <plan.icon className={`h-4 w-4 ${plan.color}`} />
                      <div>
                        <p className="text-sm font-medium text-white">{plan.label}</p>
                        <p className="text-xs text-slate-400">{plan.price}</p>
                      </div>
                    </div>
                    <Switch
                      checked={form[plan.key]}
                      onCheckedChange={(checked) => setForm({ ...form, [plan.key]: checked })}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowCreateDialog(false); setEditingFeature(null); }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingFeature ? "Salvar alterações" : "Criar funcionalidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Remover funcionalidade?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm })}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
