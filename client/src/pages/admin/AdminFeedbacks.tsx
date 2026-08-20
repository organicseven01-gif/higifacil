import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquarePlus,
  Star,
  ThumbsUp,
  AlertCircle,
  Lightbulb,
  Heart,
  Clock,
} from "lucide-react";

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  geral: { label: "Geral", icon: MessageSquarePlus, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  bug: { label: "Bug", icon: AlertCircle, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  sugestao: { label: "Sugestão", icon: Lightbulb, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  elogio: { label: "Elogio", icon: Heart, color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
};

function StarRating({ nota }: { nota?: number | null }) {
  if (!nota) return <span className="text-slate-500 text-xs">Sem nota</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < nota ? "text-amber-400 fill-amber-400" : "text-slate-600"}`}
        />
      ))}
      <span className="text-xs text-slate-400 ml-1">{nota}/5</span>
    </div>
  );
}

export default function AdminFeedbacks() {
  const { data: feedbacks = [], isLoading } = trpc.admin.listFeedbacks.useQuery();

  const formatDate = (date: any) => {
    if (!date) return "—";
    return new Date(typeof date === "number" ? date : date).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const avgNota = feedbacks.length > 0
    ? (feedbacks.reduce((sum: number, f: any) => sum + (f.nota ?? 0), 0) / feedbacks.filter((f: any) => f.nota).length).toFixed(1)
    : "—";

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Feedbacks dos Usuários</h1>
            <p className="text-slate-400 text-sm mt-1">{feedbacks.length} feedback{feedbacks.length !== 1 ? "s" : ""} recebido{feedbacks.length !== 1 ? "s" : ""}</p>
          </div>
          {feedbacks.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <span className="text-white font-semibold">{avgNota}</span>
              <span className="text-slate-400 text-sm">média</span>
            </div>
          )}
        </div>

        {/* Feedbacks list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="h-20 bg-slate-700 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : feedbacks.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <MessageSquarePlus className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum feedback recebido ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {[...feedbacks].reverse().map((fb: any, i: number) => {
              const cat = categoryConfig[fb.categoria] ?? categoryConfig.geral;
              const Icon = cat.icon;
              return (
                <Card key={i} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className={`text-xs ${cat.color}`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cat.label}
                        </Badge>
                        <StarRating nota={fb.nota} />
                        <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
                          <Clock className="h-3 w-3" />
                          {formatDate(fb.createdAt)}
                        </span>
                      </div>
                      {fb.companyName && (
                        <p className="text-xs text-slate-400 font-medium">{fb.companyName}</p>
                      )}
                      {/* Content */}
                      <div className="space-y-2">
                        {fb.oQueFuncionou && (
                          <div className="flex gap-2">
                            <ThumbsUp className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-300">{fb.oQueFuncionou}</p>
                          </div>
                        )}
                        {fb.oQueTravou && (
                          <div className="flex gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-300">{fb.oQueTravou}</p>
                          </div>
                        )}
                        {fb.oQueFalta && (
                          <div className="flex gap-2">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-300">{fb.oQueFalta}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
