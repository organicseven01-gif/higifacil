import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#0A1628" }}>
      <Card className="w-full max-w-lg mx-4 shadow-2xl border-0" style={{ background: "#0d2040" }}>
        <CardContent className="pt-10 pb-10 text-center">
          <p className="text-8xl font-black mb-4" style={{ color: "#1A9FE3" }}>404</p>
          <h2 className="text-xl font-bold text-white mb-3">Página não encontrada</h2>
          <p className="text-white/50 mb-8 leading-relaxed text-sm">
            A página que você está procurando não existe ou foi movida.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setLocation("/")}
              className="text-white font-semibold px-6"
              style={{ background: "#1A9FE3" }}
            >
              <Home className="w-4 h-4 mr-2" />
              Ir para o início
            </Button>
            <Button
              onClick={() => setLocation("/entrar")}
              variant="outline"
              className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
            >
              Entrar na plataforma
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
