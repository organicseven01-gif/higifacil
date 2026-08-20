import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  ClipboardList,
  User,
  UserPlus,
  UsersRound,
  TrendingUp,
  MessageSquare,
  Calendar,
  RefreshCw,
} from "lucide-react";

// ─── Mapeamentos de labels ────────────────────────────────────────────────────
const Q1_LABELS: Record<string, string> = {
  solo: "Trabalho sozinho",
  dupla: "Eu + 1 parceiro",
  equipe: "Tenho equipe",
};
const Q2_LABELS: Record<string, string> = {
  whatsapp: "Mando no WhatsApp",
  papel: "Anoto no papel",
  fala_preco: "Falo o preço na hora",
};
const Q3_LABELS: Record<string, string> = {
  agenda: "Agenda no celular",
  planilha: "Planilha / caderno",
  memoria: "Só na memória",
};
const PLAN_LABELS: Record<string, string> = {
  solo: "Solo",
  dupla: "Dupla",
  equipe: "Equipe",
};
const PLAN_COLORS: Record<string, string> = {
  solo: "#64748b",
  dupla: "#3b82f6",
  equipe: "#10b981",
};
const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function toChartData(obj: Record<string, number>, labelMap: Record<string, string>) {
  return Object.entries(obj).map(([key, value]) => ({
    name: labelMap[key] ?? key,
    value,
    key,
  }));
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm text-slate-400 font-medium">{label}</p>
        </div>
        <p className="text-3xl font-black text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function BarChartCard({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number; key: string }[];
}) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#f1f5f9" }}
                itemStyle={{ color: "#94a3b8" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminQuiz() {
  const { data: stats, isLoading: statsLoading, refetch } = trpc.quizResponses.stats.useQuery();
  const { data: responses = [], isLoading: listLoading } = trpc.quizResponses.list.useQuery({ limit: 50 });

  const planData = stats?.byPlan ? toChartData(stats.byPlan, PLAN_LABELS) : [];
  const q1Data = stats?.byQ1 ? toChartData(stats.byQ1, Q1_LABELS) : [];
  const q2Data = stats?.byQ2 ? toChartData(stats.byQ2, Q2_LABELS) : [];
  const q3Data = stats?.byQ3 ? toChartData(stats.byQ3, Q3_LABELS) : [];
  const lineData = stats?.byDay ?? [];

  // Plano mais popular
  const topPlan = planData.sort((a, b) => b.value - a.value)[0];
  // Média por dia (últimos 7 dias)
  const last7 = lineData.slice(-7);
  const avgPerDay = last7.length > 0 ? Math.round(last7.reduce((s, d) => s + d.count, 0) / last7.length) : 0;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-blue-400" />
              Análise do Quiz
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Dados de perfil dos visitantes que responderam o quiz da landing page.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>

        {statsLoading ? (
          <div className="text-center py-16 text-slate-400">Carregando dados...</div>
        ) : !stats || stats.total === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg font-semibold mb-2">Nenhuma resposta ainda</p>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Quando os visitantes responderem o quiz na landing page, os dados aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={ClipboardList}
                label="Total de respostas"
                value={stats.total}
                sub="desde o início"
                color="bg-blue-600"
              />
              <StatCard
                icon={TrendingUp}
                label="Média últimos 7 dias"
                value={avgPerDay}
                sub="respostas/dia"
                color="bg-emerald-600"
              />
              <StatCard
                icon={topPlan?.key === "equipe" ? UsersRound : topPlan?.key === "dupla" ? UserPlus : User}
                label="Plano mais sugerido"
                value={topPlan ? PLAN_LABELS[topPlan.key] ?? topPlan.key : "—"}
                sub={topPlan ? `${topPlan.value} respostas (${Math.round((topPlan.value / stats.total) * 100)}%)` : ""}
                color={topPlan ? `bg-[${PLAN_COLORS[topPlan.key] ?? "#3b82f6"}]` : "bg-slate-600"}
              />
              <StatCard
                icon={Calendar}
                label="Dias com dados"
                value={lineData.length}
                sub="dias registrados"
                color="bg-purple-600"
              />
            </div>

            {/* Gráfico de linha - evolução temporal */}
            {lineData.length > 1 && (
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                    Respostas por dia (últimos 30 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#94a3b8", fontSize: 10 }}
                          tickFormatter={(v) => v.slice(5)} // MM-DD
                        />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                          labelStyle={{ color: "#f1f5f9" }}
                          itemStyle={{ color: "#94a3b8" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", r: 3 }}
                          name="Respostas"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Distribuição por plano + gráfico de pizza */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400" />
                    Distribuição por plano sugerido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div style={{ height: 160, width: 160, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={planData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            paddingAngle={3}
                          >
                            {planData.map((entry) => (
                              <Cell key={entry.key} fill={PLAN_COLORS[entry.key] ?? "#64748b"} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
                            formatter={(v: number) => [`${v} respostas`, ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {planData.map((p) => (
                        <div key={p.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-300 font-medium">{p.name}</span>
                            <span className="text-sm font-bold text-white">
                              {p.value} ({Math.round((p.value / stats.total) * 100)}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((p.value / stats.total) * 100)}%`,
                                background: PLAN_COLORS[p.key] ?? "#64748b",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Q1 - Estilo de trabalho */}
              <BarChartCard title="P1 — Como você trabalha hoje?" data={q1Data} />
            </div>

            {/* Q2 e Q3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BarChartCard title="P2 — Como você passa o orçamento?" data={q2Data} />
              <BarChartCard title="P3 — Após fechar, como organiza?" data={q3Data} />
            </div>

            {/* Tabela de respostas recentes */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  Respostas recentes (últimas 50)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {listLoading ? (
                  <div className="p-6 text-center text-slate-400 text-sm">Carregando...</div>
                ) : responses.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">Nenhuma resposta ainda.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Data</th>
                          <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">P1 — Trabalho</th>
                          <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">P2 — Orçamento</th>
                          <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">P3 — Organização</th>
                          <th className="text-left p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plano sugerido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responses.map((r, i) => (
                          <tr key={r.id} className={`border-b border-slate-800 ${i % 2 === 0 ? "" : "bg-slate-900/40"}`}>
                            <td className="p-3 text-slate-400 whitespace-nowrap">
                              {new Date(r.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="p-3 text-slate-300">{Q1_LABELS[r.q1WorkStyle ?? ""] ?? r.q1WorkStyle ?? "—"}</td>
                            <td className="p-3 text-slate-300">{Q2_LABELS[r.q2QuoteMethod ?? ""] ?? r.q2QuoteMethod ?? "—"}</td>
                            <td className="p-3 text-slate-300">{Q3_LABELS[r.q3AfterClose ?? ""] ?? r.q3AfterClose ?? "—"}</td>
                            <td className="p-3">
                              {r.suggestedPlan ? (
                                <Badge
                                  className="text-xs font-semibold border"
                                  style={{
                                    background: `${PLAN_COLORS[r.suggestedPlan]}20`,
                                    color: PLAN_COLORS[r.suggestedPlan],
                                    borderColor: `${PLAN_COLORS[r.suggestedPlan]}40`,
                                  }}
                                >
                                  {PLAN_LABELS[r.suggestedPlan] ?? r.suggestedPlan}
                                </Badge>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
