import { useEffect, useRef, useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks: Array<() => void> = [];

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    if (mapsLoaded || (window as any).google?.maps?.places) {
      mapsLoaded = true;
      resolve();
      return;
    }
    mapsCallbacks.push(resolve);
    if (mapsLoading) return;
    mapsLoading = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      mapsLoaded = true;
      mapsLoading = false;
      mapsCallbacks.forEach((cb) => cb());
      mapsCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

interface AddressResult {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

interface Props {
  onAddressSelected: (address: AddressResult) => void;
  disabled?: boolean;
}

export default function GoogleAddressSearch({ onAddressSelected, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadGoogleMaps().then(() => {
      if (!mounted || !inputRef.current) return;
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["address"],
        componentRestrictions: { country: "br" },
        fields: ["address_components", "formatted_address"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.address_components) return;

        const get = (type: string) =>
          place.address_components!.find((c) => c.types.includes(type))?.long_name || "";
        const getShort = (type: string) =>
          place.address_components!.find((c) => c.types.includes(type))?.short_name || "";

        const streetNumber = get("street_number");
        const route = get("route");
        const neighborhood =
          get("sublocality_level_1") || get("sublocality") || get("neighborhood") || get("political");
        const city = get("administrative_area_level_2") || get("locality");
        const state = getShort("administrative_area_level_1");
        const postalCode = get("postal_code").replace(/\D/g, "");

        onAddressSelected({
          street: route,
          number: streetNumber,
          complement: "",
          neighborhood,
          city,
          state,
          cep: postalCode,
        });

        // Clear the input after selection
        if (inputRef.current) inputRef.current.value = "";
      });
      autocompleteRef.current = autocomplete;
      setReady(true);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="h-3.5 w-3.5 text-blue-500" />
        <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
          Buscar endereço pelo Google
        </label>
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={ready ? "Digite o endereço para buscar e preencher automaticamente..." : "Carregando Google Maps..."}
          disabled={disabled || !ready}
          className="w-full px-3 py-2 pr-9 rounded-lg border border-blue-200 bg-blue-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-blue-400 disabled:opacity-60"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-400" />
        ) : (
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
        )}
      </div>
      <p className="text-xs text-blue-500 mt-1">
        Selecione um endereço na lista para preencher os campos abaixo automaticamente.
      </p>
    </div>
  );
}
