import { HelpCircle } from "lucide-react";

interface HelpButtonProps {
  onClick: () => void;
  label?: string;
}

export default function HelpButton({ onClick, label = "Ajuda" }: HelpButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-all hover:opacity-80"
      style={{ background: "#1A9FE3", color: "white" }}
      title="Clique para ver vídeo de ajuda"
    >
      <HelpCircle className="h-4 w-4" />
      {label}
    </button>
  );
}
