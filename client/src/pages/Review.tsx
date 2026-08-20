import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function Review() {
  const [, params] = useRoute("/avaliar/:token");
  const token = params?.token ?? "";

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: review, isLoading, error } = trpc.reviews.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const submitMutation = trpc.reviews.submit.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = () => {
    if (rating === 0) return;
    submitMutation.mutate({ token, rating, comment: comment.trim() || undefined });
  };

  const starLabels = ["", "Ruim", "Regular", "Bom", "Muito Bom", "Excelente"];
  const starColors = ["", "text-red-500", "text-orange-400", "text-yellow-400", "text-lime-500", "text-green-500"];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Link inválido</h2>
          <p className="text-gray-500">Este link de avaliação não existe ou já expirou.</p>
        </div>
      </div>
    );
  }

  // Já avaliado
  if (review.respondedAt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Avaliação já enviada!</h2>
          <p className="text-gray-500 mb-4">Você já avaliou este serviço. Muito obrigado pelo seu feedback!</p>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-8 h-8 ${s <= (review.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Enviado com sucesso
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Obrigado, {review.clientName.split(" ")[0]}!</h2>
          <p className="text-gray-500 mb-6">Sua avaliação foi enviada com sucesso. Seu feedback é muito importante para nós!</p>
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-10 h-10 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
            ))}
          </div>
          <p className="text-sm text-gray-400">Esperamos vê-lo novamente em breve!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Como foi o serviço?</h1>
          <p className="text-gray-500 text-sm">
            Olá, <strong>{review.clientName.split(" ")[0]}</strong>! Sua opinião é muito importante para nós.
          </p>
        </div>

        {/* Serviço realizado */}
        {review.serviceDescription && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Serviço realizado</p>
            <p className="text-gray-700 text-sm">{review.serviceDescription}</p>
          </div>
        )}

        {/* Seletor de estrelas */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-3">Toque nas estrelas para avaliar</p>
          <div className="flex justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-12 h-12 transition-colors ${
                    s <= (hovered || rating)
                      ? `fill-yellow-400 text-yellow-400`
                      : "text-gray-200"
                  }`}
                />
              </button>
            ))}
          </div>
          {(hovered || rating) > 0 && (
            <p className={`text-sm font-semibold ${starColors[hovered || rating]}`}>
              {starLabels[hovered || rating]}
            </p>
          )}
        </div>

        {/* Comentário */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deixe um comentário <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Conte como foi a sua experiência..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Botão de envio */}
        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || submitMutation.isPending}
          className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
        >
          {submitMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
          ) : (
            "Enviar Avaliação"
          )}
        </Button>

        {rating === 0 && (
          <p className="text-center text-xs text-gray-400 mt-2">Selecione uma nota para continuar</p>
        )}

        {submitMutation.error && (
          <p className="text-center text-xs text-red-500 mt-2">{submitMutation.error.message}</p>
        )}

        <p className="text-center text-xs text-gray-300 mt-6">Higifácil · Avaliação de Serviço</p>
      </div>
    </div>
  );
}
