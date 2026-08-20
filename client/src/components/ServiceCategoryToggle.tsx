import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Droplets, Shield, Sparkles, Zap, BookOpen, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const GROUPS = [
  {
    key: "Higienização",
    label: "Higienização",
    description: "Limpeza profunda de estofados, colchões e tapetes",
    icon: Droplets,
    color: "#3b82f6",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    cascadedBy: null,
  },
  {
    key: "Impermeabilização",
    label: "Impermeabilização",
    description: "Proteção contra manchas e umidade",
    icon: Shield,
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    borderColor: "#ddd6fe",
    cascadedBy: null,
  },
  {
    key: "Higienização + Impermeabilização",
    label: "Higienização + Impermeabilização",
    description: "Pacote completo de limpeza e proteção",
    icon: Sparkles,
    color: "#22c55e",
    bgColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    cascadedBy: "Impermeabilização",
  },
  {
    key: "Extras",
    label: "Extras",
    description: "Deslocamento, pedágio e custos avulsos",
    icon: Zap,
    color: "#f59e0b",
    bgColor: "#fffbeb",
    borderColor: "#fde68a",
    cascadedBy: null,
  },
];

export default function ServiceCategoryToggle() {
  const utils = trpc.useUtils();
  const { data: allServices = [], isLoading } = trpc.services.list.useQuery();
  const toggleCategoryMutation = trpc.services.toggleCategory.useMutation({
    onSuccess: () => { utils.services.list.invalidate(); },
    onError: () => toast.error("Erro ao alterar categoria"),
  });
  const initFromCatalogMutation = trpc.services.initFromCatalog.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        utils.services.list.invalidate();
        toast.success("Catálogo padrão carregado com sucesso!");
      } else {
        toast.info(res.message ?? "Empresa já possui serviços cadastrados");
      }
    },
    onError: () => toast.error("Erro ao carregar catálogo"),
  });

  const servicesByGroup = GROUPS.reduce((acc, g) => {
    acc[g.key] = allServices.filter(s => s.category === g.key);
    return acc;
  }, {} as Record<string, typeof allServices>);

  const isGroupActive = (key: string) => {
    const svcs = servicesByGroup[key];
    return svcs.length > 0 && svcs.some(s => s.active);
  };

  const impermActive = isGroupActive("Impermeabilização");

  const handleToggle = (group: typeof GROUPS[0], newActive: boolean) => {
    toggleCategoryMutation.mutate({ category: group.key, active: newActive });
    if (!newActive && group.key === "Impermeabilização") {
      toast.info("Higienização + Impermeabilização também foi desativada automaticamente");
    }
  };

  return (
    <div id="sec-servicos" className="bg-white rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-foreground text-sm">Tipos de Serviço</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Ative os tipos de serviço que sua empresa oferece. Desativar <strong>Impermeabilização</strong> desativa automaticamente os pacotes combinados.
      </p>
      {allServices.length === 0 && (
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-start gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-800">Catálogo padrão disponível</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Carregue <strong>39 serviços pré-configurados</strong> com preços sugeridos (Higienização, Impermeabilização, Pacotes e Extras).
                Após carregar, você pode <strong>editar ou remover</strong> qualquer serviço livremente.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => initFromCatalogMutation.mutate()}
            disabled={initFromCatalogMutation.isPending}
            className="w-full gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {initFromCatalogMutation.isPending ? "Carregando 39 serviços..." : "Carregar Catálogo Padrão"}
          </Button>
        </div>
      )}
      {allServices.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-md bg-green-50 border border-green-200">
          <Info className="h-3 w-3 text-green-600 shrink-0" />
          <p className="text-xs text-green-700">
            {allServices.length} serviços cadastrados — edite ou remova na lista abaixo dos tipos.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 rounded-lg bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {GROUPS.map(group => {
            const svcs = servicesByGroup[group.key];
            const active = isGroupActive(group.key);
            const isCascaded = group.cascadedBy === "Impermeabilização" && !impermActive;
            const activeCount = svcs.filter(s => s.active).length;
            const Icon = group.icon;

            return (
              <div
                key={group.key}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all"
                style={{
                  borderColor: active && !isCascaded ? group.borderColor : "#e5e7eb",
                  background: active && !isCascaded ? group.bgColor : "#f9fafb",
                  opacity: isCascaded ? 0.5 : 1,
                }}
              >
                {/* Ícone compacto */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: active && !isCascaded ? group.color : "#d1d5db" }}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-foreground leading-none">{group.label}</p>
                    {isCascaded && (
                      <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">
                        desativado
                      </span>
                    )}
                    {svcs.length > 0 && (
                      <span className="text-xs" style={{ color: active && !isCascaded ? group.color : "#9ca3af" }}>
                        ({activeCount}/{svcs.length})
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggle compacto */}
                <button
                  onClick={() => !isCascaded && handleToggle(group, !active)}
                  disabled={toggleCategoryMutation.isPending || isCascaded}
                  title={isCascaded ? "Ative Impermeabilização primeiro" : active ? "Clique para desativar" : "Clique para ativar"}
                  className="shrink-0 relative w-10 h-5 rounded-full transition-all focus:outline-none disabled:cursor-not-allowed"
                  style={{ background: active && !isCascaded ? group.color : "#d1d5db" }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: active && !isCascaded ? "calc(100% - 1.125rem)" : "0.125rem" }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
