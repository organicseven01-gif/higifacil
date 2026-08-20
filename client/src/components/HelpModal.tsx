import { X } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl?: string; // YouTube URL ou vazio para placeholder
}

export default function HelpModal({ isOpen, onClose, title, videoUrl }: HelpModalProps) {
  if (!isOpen) return null;

  // Converter URL do YouTube para embed
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    const videoId = url.includes("youtu.be/")
      ? url.split("youtu.be/")[1]
      : url.includes("youtube.com/watch?v=")
      ? url.split("v=")[1]
      : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ background: "linear-gradient(135deg, #0A1628 0%, #1A9FE3 100%)" }}>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Container */}
        <div className="p-6">
          {embedUrl ? (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={embedUrl}
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                style={{ border: "none" }}
              />
            </div>
          ) : (
            <div
              className="w-full rounded-lg flex items-center justify-center text-center p-12"
              style={{ background: "#f3f4f6", aspectRatio: "16/9" }}
            >
              <div>
                <div className="text-4xl mb-3">🎥</div>
                <p className="text-gray-600 font-medium">Vídeo em breve</p>
                <p className="text-gray-400 text-sm mt-1">Este vídeo de ajuda será disponibilizado em breve</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ background: "#1A9FE3", color: "white" }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
