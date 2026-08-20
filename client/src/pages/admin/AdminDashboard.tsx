import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  TrendingUp,
  ShieldOff,
  DollarSign,
  FileText,
  UserCheck,
  Clock,
} from "lucide-react";

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: metrics, isLoading } = trpc.admin.systemMetrics.useQuery();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Visão Geral do Sistema</h1>
          <p className="text-slate-400 text-sm mt-1">Métricas consolidadas de todas as empresas cadastradas</p>
        </div>

        {/* Metrics Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700">
                <CardContent className="p-5">
                  <div className="h-16 bg-slate-700 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total de Empresas"
              value={metrics?.totalCompanies ?? 0}
              icon={Building2}
              color="bg-blue-600"
            />
            <MetricCard
              title="Empresas Ativas"
              value={metrics?.activeCompanies ?? 0}
              icon={UserCheck}
              color="bg-green-600"
            />
            <MetricCard
              title="Em Trial"
              value={metrics?.trialCompanies ?? 0}
              icon={Clock}
              color="bg-amber-600"
            />
            <MetricCard
              title="Bloqueadas"
              value={metrics?.blockedCompanies ?? 0}
              icon={ShieldOff}
              color="bg-red-600"
            />
            <MetricCard
              title="Total de Clientes"
              value={metrics?.totalClients ?? 0}
              icon={Users}
              color="bg-purple-600"
            />
            <MetricCard
              title="Orçamentos Gerados"
              value={metrics?.totalBudgets ?? 0}
              icon={FileText}
              color="bg-indigo-600"
            />
            <MetricCard
              title="Vendas Realizadas"
              value={metrics?.totalSales ?? 0}
              icon={TrendingUp}
              color="bg-teal-600"
            />
            <MetricCard
              title="Volume Total de Vendas"
              value={formatCurrency(metrics?.totalSalesValue ?? 0)}
              icon={DollarSign}
              color="bg-emerald-600"
            />
          </div>
        )}

        {/* Info card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm">
              Use o menu lateral para gerenciar empresas, aprovar solicitações de acesso e visualizar feedbacks dos usuários.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
