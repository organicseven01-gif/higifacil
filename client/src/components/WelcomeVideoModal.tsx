import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, X } from "lucide-react";

/**
 * WelcomeVideoModal — aparece ANTES do OnboardingModal no primeiro acesso.
 * Exibe um vídeo de boas-vindas do fundador explicando o sistema.
 * Quando o cliente fechar/continuar, o OnboardingModal de configuração é exibido.
 *
 * Para ativar o vídeo real: substitua YOUTUBE_VIDEO_ID pelo ID do vídeo do YouTube.
 */

const YOUTUBE_VIDEO_ID = ""; // Ex: "dQw4w9WgXcQ" — deixe vazio para mostrar placeholder

const LOGO_URL =
  "/logo-higifacil.png";

interface WelcomeVideoModalProps {
  onContinue: () => void;
}

export default function WelcomeVideoModal({ onContinue }: WelcomeVideoModalProps) {
  const [videoPlaying, setVideoPlaying] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div
          className="px-6 pt-7 pb-5 text-center"
          style={{ background: "linear-gradient(135deg, #0A1628 0%, #0d2040 100%)" }}
        >
          <img src={LOGO_URL} alt="Higifácil" className="h-8 object-contain mx-auto mb-4" />
          <h1 className="text-xl font-black text-white mb-1">
            Bem-vindo ao Higifácil! 🎉
          </h1>
          <p className="text-white/60 text-sm">
            Antes de começar, assista à mensagem de boas-vindas
          </p>
        </div>

        {/* Área do vídeo */}
        <div className="px-6 pt-5">
          <div
            className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200"
            style={{ aspectRatio: "16/9" }}
          >
            {YOUTUBE_VIDEO_ID && videoPlaying ? (
              /* Vídeo do YouTube incorporado */
              <iframe
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Boas-vindas ao Higifácil"
              />
            ) : (
              /* Placeholder / Thumbnail com botão play */
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                {/* Fundo gradiente */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #0A1628 0%, #0d2040 60%, #1A9FE3 100%)",
                  }}
                />
                {/* Conteúdo */}
                <div className="relative z-10 text-center px-6">
                  {YOUTUBE_VIDEO_ID ? (
                    /* Tem vídeo — mostrar botão play */
                    <>
                      <button
                        onClick={() => setVideoPlaying(true)}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-transform hover:scale-110 shadow-2xl"
                        style={{ background: "#1A9FE3" }}
                      >
                        <Play className="h-7 w-7 text-white ml-1" />
                      </button>
                      <p className="text-white/70 text-sm">Clique para assistir</p>
                    </>
                  ) : (
                    /* Sem vídeo — placeholder */
                    <>
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 opacity-50"
                        style={{ background: "#1A9FE3" }}
                      >
                        <Play className="h-7 w-7 text-white ml-1" />
                      </div>
                      <p className="text-white/50 text-sm font-medium">
                        Vídeo de boas-vindas em breve
                      </p>
                      <p className="text-white/30 text-xs mt-1">
                        Em breve você verá uma mensagem personalizada aqui
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mensagem de texto */}
        <div className="px-6 pt-4 pb-2">
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-gray-700 leading-relaxed">
              Você está a poucos passos de ter sua empresa organizada e profissional.{" "}
              <strong className="text-blue-700">Vamos configurar tudo juntos!</strong>
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="px-6 pb-6 pt-4 space-y-2">
          <Button
            onClick={onContinue}
            className="w-full font-bold text-white text-base h-12 rounded-xl"
            style={{ background: "#1A9FE3" }}
          >
            Configurar minha conta agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <button
            type="button"
            onClick={onContinue}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1"
          >
            Pular vídeo e continuar
          </button>
        </div>
      </div>
    </div>
  );
}
