import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Search } from "lucide-react";

export interface AddressData {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
}

interface AddressSearchProps {
  value: AddressData;
  onChange: (data: Partial<AddressData>) => void;
  disabled?: boolean;
  required?: boolean;
}

interface ViaCEPResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

async function fetchByCEP(cep: string): Promise<ViaCEPResult | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

async function searchByStreet(street: string, city = "", state = "SP"): Promise<ViaCEPResult[]> {
  // ViaCEP endpoint: /ws/{UF}/{Municipio}/{Logradouro}/json/
  // Requires at least 3 chars for street and a valid UF
  if (street.length < 3) return [];
  const uf = (state || "SP").toUpperCase().slice(0, 2);
  // Use a generic city name if none provided to broaden search
  const cityName = city && city.length >= 2 ? city : "";
  try {
    const streetEncoded = encodeURIComponent(street);
    let url: string;
    if (cityName) {
      const cityEncoded = encodeURIComponent(cityName);
      url = `https://viacep.com.br/ws/${uf}/${cityEncoded}/${streetEncoded}/json/`;
    } else {
      // Without city, try São Paulo as default
      url = `https://viacep.com.br/ws/${uf}/S%C3%A3o%20Paulo/${streetEncoded}/json/`;
    }
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, 8);
  } catch {
    return [];
  }
}

export default function AddressSearch({ value, onChange, disabled, required }: AddressSearchProps) {
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [streetSuggestions, setStreetSuggestions] = useState<ViaCEPResult[]>([]);
  const [streetLoading, setStreetLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const streetDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCEPChange = useCallback(async (raw: string) => {
    const formatted = raw
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
    onChange({ cep: formatted });
    setCepError("");

    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      setCepLoading(true);
      const result = await fetchByCEP(clean);
      setCepLoading(false);
      if (result) {
        onChange({
          cep: formatted,
          street: result.logradouro || "",
          neighborhood: result.bairro || "",
          city: result.localidade || "",
          state: result.uf || "",
        });
        setCepError("");
      } else {
        setCepError("CEP não encontrado");
      }
    }
  }, [onChange]);

  const handleStreetChange = useCallback((val: string) => {
    onChange({ street: val });
    if (streetDebounce.current) clearTimeout(streetDebounce.current);
    if (val.length >= 4) {
      setStreetLoading(true);
      streetDebounce.current = setTimeout(async () => {
        const results = await searchByStreet(val, value.city, value.state);
        setStreetSuggestions(results);
        setStreetLoading(false);
        setShowSuggestions(results.length > 0);
      }, 600);
    } else {
      setStreetSuggestions([]);
      setShowSuggestions(false);
      setStreetLoading(false);
    }
  }, [onChange, value.city, value.state]);

  const selectSuggestion = useCallback((s: ViaCEPResult) => {
    onChange({
      cep: s.cep.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2"),
      street: s.logradouro || "",
      neighborhood: s.bairro || "",
      city: s.localidade || "",
      state: s.uf || "",
    });
    setShowSuggestions(false);
    setStreetSuggestions([]);
  }, [onChange]);

  return (
    <div className="space-y-3">
      {/* CEP */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1 block">
            CEP {required && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative">
            <Input
              value={value.cep}
              onChange={(e) => handleCEPChange(e.target.value)}
              placeholder="00000-000"
              disabled={disabled}
              className={`pr-8 ${cepError ? "border-red-400" : ""}`}
            />
            {cepLoading && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
            )}
          </div>
          {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1 block">Estado</Label>
          <Input
            value={value.state}
            onChange={(e) => onChange({ state: e.target.value })}
            placeholder="SP"
            disabled={disabled}
            maxLength={2}
          />
        </div>
      </div>

      {/* Rua com autocomplete */}
      <div className="relative">
        <Label className="text-xs font-medium text-gray-700 mb-1 block">
          Rua / Logradouro {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            value={value.street}
            onChange={(e) => handleStreetChange(e.target.value)}
            placeholder="Digite o nome da rua ou busque pelo CEP"
            disabled={disabled}
            className="pr-8"
            onFocus={() => streetSuggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {streetLoading ? (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          )}
        </div>

        {/* Dropdown de sugestões */}
        {showSuggestions && streetSuggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {streetSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={() => selectSuggestion(s)}
                className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0"
              >
                <MapPin className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.logradouro}</p>
                  <p className="text-xs text-gray-500">{s.bairro} · {s.localidade}/{s.uf} · CEP: {s.cep}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Número e Complemento */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1 block">
            Número {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            value={value.number}
            onChange={(e) => onChange({ number: e.target.value })}
            placeholder="123"
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1 block">Complemento</Label>
          <Input
            value={value.complement}
            onChange={(e) => onChange({ complement: e.target.value })}
            placeholder="Apto, bloco..."
            disabled={disabled}
          />
        </div>
      </div>

      {/* Bairro e Cidade */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1 block">
            Bairro {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            value={value.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value })}
            placeholder="Centro"
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1 block">Cidade</Label>
          <Input
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="São Paulo"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
