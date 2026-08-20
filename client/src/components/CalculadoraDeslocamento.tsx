import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, RotateCcw, Calculator, AlertCircle, Car } from "lucide-react";
import { toast } from "sonner";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let mapsLoadPromise: Promise<void> | null = null;
function ensureMapsLoaded(): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-maps-proxy]');
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) { clearInterval(check); resolve(); }
      }, 200);
      return;
    }
    const script = document.createElement("script");
    script.setAttribute('data-maps-proxy', 'true');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
}

export interface DeslocamentoResult {
  distanciaKm: number;
  pedagio: number;
  valorKm: number;
  tipoViagem: "ida" | "volta" | "ida_volta";
  custoTotal: number;
  enderecoPartida: string;
  enderecoDestino: string;
  highways?: string[];
  pedagioEstimado?: boolean;
}

interface Props {
  onResult: (result: DeslocamentoResult | null) => void;
  initialResult?: DeslocamentoResult | null;
}

const TIPO_LABELS = {
  ida: "Somente Ida",
  volta: "Somente Volta",
  ida_volta: "Ida e Volta",
};

export default function CalculadoraDeslocamento({ onResult, initialResult }: Props) {
  const [enderecoPartida, setEnderecoPartida] = useState(initialResult?.enderecoPartida ?? "");
  const [enderecoDestino, setEnderecoDestino] = useState(initialResult?.enderecoDestino ?? "");
  const [tipoViagem, setTipoViagem] = useState<"ida" | "volta" | "ida_volta">(
    initialResult?.tipoViagem ?? "ida_volta"
  );
  const [valorKm, setValorKm] = useState(
    initialResult ? String(initialResult.valorKm.toFixed(2)) : ""
  );
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<DeslocamentoResult | null>(initialResult ?? null);

  const partidaRef = useRef<HTMLInputElement>(null);
  const destinoRef = useRef<HTMLInputElement>(null);
  const autocompletePartidaRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteDestinoRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Initialize Google Places Autocomplete — load Maps script if needed
  useEffect(() => {
    const initAutocomplete = () => {
      if (!window.google?.maps?.places) return;
      if (partidaRef.current && !autocompletePartidaRef.current) {
        autocompletePartidaRef.current = new google.maps.places.Autocomplete(partidaRef.current, {
          componentRestrictions: { country: "br" },
          fields: ["formatted_address", "geometry"],
        });
        autocompletePartidaRef.current.addListener("place_changed", () => {
          const place = autocompletePartidaRef.current!.getPlace();
          if (place.formatted_address) setEnderecoPartida(place.formatted_address);
        });
      }
      if (destinoRef.current && !autocompleteDestinoRef.current) {
        autocompleteDestinoRef.current = new google.maps.places.Autocomplete(destinoRef.current, {
          componentRestrictions: { country: "br" },
          fields: ["formatted_address", "geometry"],
        });
        autocompleteDestinoRef.current.addListener("place_changed", () => {
          const place = autocompleteDestinoRef.current!.getPlace();
          if (place.formatted_address) setEnderecoDestino(place.formatted_address);
        });
      }
    };

    ensureMapsLoaded().then(initAutocomplete).catch(() => {
      console.warn("Google Maps failed to load for autocomplete");
    });
  }, []);

  const calcular = useCallback(async () => {
    if (!enderecoPartida.trim() || !enderecoDestino.trim()) {
      toast.error("Preencha os endereços de partida e destino");
      return;
    }
    const kmVal = parseFloat(valorKm.replace(",", "."));
    if (!valorKm || isNaN(kmVal) || kmVal <= 0) {
      toast.error("Informe o valor por KM rodado");
      return;
    }
    setCalculando(true);
    try {
      await ensureMapsLoaded();
      if (!window.google?.maps) {
        toast.error("Google Maps não carregado. Tente novamente.");
        setCalculando(false);
        return;
      }
      const service = new google.maps.DistanceMatrixService();
      const result = await service.getDistanceMatrix({
        origins: [enderecoPartida],
        destinations: [enderecoDestino],
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
        },
      });

      const element = result.rows[0]?.elements[0];
      if (!element || element.status !== "OK") {
        toast.error("Não foi possível calcular a rota. Verifique os endereços.");
        setCalculando(false);
        return;
      }

      const distanciaMetros = element.distance.value;
      const distanciaKm = distanciaMetros / 1000;

      // Calcular pedágio via servidor (estima com base nas rodovias da rota)
      let pedagio = 0;
      let highways: string[] = [];
      let pedagioEstimado = false;
      try {
        const routeResp = await fetch(
          `/api/maps/routes?origin=${encodeURIComponent(enderecoPartida)}&destination=${encodeURIComponent(enderecoDestino)}`
        );
        if (routeResp.ok) {
          const routeData = await routeResp.json();
          pedagio = routeData.tollCost ?? 0;
          highways = routeData.highways ?? [];
          pedagioEstimado = routeData.estimated ?? false;
        }
      } catch {
        // Pedágio não disponível — continua sem
      }

      // Multiplicar por 2 se ida e volta
      const fatorViagem = tipoViagem === "ida_volta" ? 2 : 1;
      const distanciaTotal = distanciaKm * fatorViagem;
      const custoPedagio = pedagio * fatorViagem;
      const custoKm = distanciaTotal * kmVal;
      const custoTotal = custoKm + custoPedagio;

      const res: DeslocamentoResult = {
        distanciaKm: distanciaTotal,
        pedagio: custoPedagio,
        valorKm: kmVal,
        tipoViagem,
        custoTotal,
        enderecoPartida,
        enderecoDestino,
        highways,
        pedagioEstimado,
      };

      setResultado(res);
      onResult(res);
      toast.success("Deslocamento calculado com sucesso!");
    } catch (err) {
      toast.error("Erro ao calcular rota. Tente novamente.");
    } finally {
      setCalculando(false);
    }
  }, [enderecoPartida, enderecoDestino, tipoViagem, valorKm, onResult]);

  const limpar = () => {
    setResultado(null);
    onResult(null);
    setEnderecoPartida("");
    setEnderecoDestino("");
    setValorKm("");
    setTipoViagem("ida_volta");
  };

  return (
    <div className="space-y-4">
      {/* Endereços */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-green-500" />
            Endereço de Partida
          </Label>
          <Input
            ref={partidaRef}
            value={enderecoPartida}
            onChange={(e) => setEnderecoPartida(e.target.value)}
            placeholder="Ex: Rua das Flores, 100, São Paulo - SP"
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-red-500" />
            Endereço de Destino
          </Label>
          <Input
            ref={destinoRef}
            value={enderecoDestino}
            onChange={(e) => setEnderecoDestino(e.target.value)}
            placeholder="Ex: Av. Paulista, 1000, São Paulo - SP"
            className="text-sm"
          />
        </div>
      </div>

      {/* Tipo de viagem — destacado */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Car className="h-3.5 w-3.5 text-blue-500" />
          Tipo de Viagem
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(["ida", "volta", "ida_volta"] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoViagem(tipo)}
              className={`
                relative py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all
                ${tipoViagem === tipo
                  ? tipo === "ida_volta"
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                }
              `}
            >
              {tipo === "ida_volta" && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                  padrão
                </span>
              )}
              {TIPO_LABELS[tipo]}
            </button>
          ))}
        </div>
        {tipoViagem !== "ida_volta" && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Atenção:</strong> Você selecionou "{TIPO_LABELS[tipoViagem]}". Certifique-se de que é isso mesmo — normalmente cobra-se Ida e Volta.
            </p>
          </div>
        )}
      </div>

      {/* Valor por KM */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Valor por KM (R$)</Label>
        <div className="relative max-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
          <Input
            value={valorKm}
            onChange={(e) => setValorKm(e.target.value)}
            placeholder="1,50"
            className="pl-9 text-sm"
            type="number"
            min="0"
            step="0.10"
          />
        </div>
        <p className="text-xs text-muted-foreground">Defina o valor por KM para este orçamento</p>
      </div>

      {/* Botões */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={calcular}
          disabled={calculando}
          className="flex-1"
          size="sm"
        >
          <Calculator className="h-4 w-4 mr-1.5" />
          {calculando ? "Calculando..." : "Calcular Deslocamento"}
        </Button>
        {resultado && (
          <Button type="button" variant="outline" onClick={limpar} size="sm">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="rounded-lg border-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-3">
          <h4 className="font-semibold text-sm text-green-800 dark:text-green-300 flex items-center gap-1.5">
            <Car className="h-4 w-4" />
            Resumo do Deslocamento
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Distância total:</span>
              <p className="font-medium">{resultado.distanciaKm.toFixed(1)} km ({TIPO_LABELS[resultado.tipoViagem]})</p>
            </div>
            <div>
              <span className="text-muted-foreground">Valor por KM:</span>
              <p className="font-medium">R$ {resultado.valorKm.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Custo KM:</span>
              <p className="font-medium">R$ {(resultado.distanciaKm * resultado.valorKm).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Pedágio estimado:</span>
              <p className="font-medium">
                {resultado.pedagio > 0
                  ? `R$ ${resultado.pedagio.toFixed(2)}`
                  : <span className="text-muted-foreground text-xs">Não identificado</span>
                }
              </p>
            </div>
          </div>

          {/* Rodovias detectadas */}
          {resultado.highways && resultado.highways.length > 0 && (
            <div className="text-xs text-green-700 dark:text-green-400">
              <span className="font-medium">Rodovias detectadas: </span>
              {resultado.highways.join(", ")}
            </div>
          )}

          <div className="border-t border-green-200 dark:border-green-800 pt-2 flex items-center justify-between">
            <span className="font-semibold text-green-800 dark:text-green-300">Total Deslocamento:</span>
            <span className="text-xl font-bold text-green-700 dark:text-green-400">
              R$ {resultado.custoTotal.toFixed(2)}
            </span>
          </div>

          {/* Aviso de estimativa */}
          {resultado.pedagioEstimado && (
            <div className="flex items-start gap-1.5 p-2 rounded bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                <strong>Pedágio estimado.</strong> O valor pode variar conforme a categoria do veículo, sentido da viagem e reajustes das concessionárias. Confirme o valor real antes de incluir no orçamento.
              </p>
            </div>
          )}
          {!resultado.pedagioEstimado && resultado.pedagio === 0 && (
            <div className="flex items-start gap-1.5 p-2 rounded bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
              <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-snug">
                Nenhuma rodovia pedagiada identificada na rota. Se houver pedágio, adicione manualmente ao total.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
