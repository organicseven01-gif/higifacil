/**
 * Google Maps API — chamadas server-to-server (Directions, Geocoding, etc.)
 *
 * Usa a API do Google diretamente (sem proxy). Array de parâmetros usa `|`
 * como separador, igual à API oficial do Google Maps.
 *
 * Nota sobre chaves: se a chave do Google Maps estiver restrita por HTTP
 * referrer (recomendado para a chave usada no navegador, `VITE_GOOGLE_MAPS_API_KEY`),
 * chamadas feitas pelo servidor (sem header Referer de navegador) serão
 * bloqueadas. Para produção, crie uma segunda chave no Google Cloud Console
 * sem restrição de referrer (restrita por IP, ou só pelas APIs necessárias)
 * e configure em `GOOGLE_MAPS_SERVER_API_KEY`. Sem isso, cai de volta para
 * a mesma chave do frontend — funciona, mas só se ela não tiver restrição
 * de referrer.
 */
import { ENV } from "./env";

const GOOGLE_MAPS_BASE_URL = "https://maps.googleapis.com";

function getApiKey(): string {
  const apiKey = ENV.googleMapsServerApiKey || ENV.googleMapsApiKey;
  if (!apiKey) {
    throw new Error(
      "Google Maps API key ausente: defina GOOGLE_MAPS_SERVER_API_KEY (ou VITE_GOOGLE_MAPS_API_KEY) no .env"
    );
  }
  return apiKey;
}

function serializeParam(value: unknown): string {
  if (Array.isArray(value)) return value.join("|");
  return String(value);
}

/**
 * Faz uma requisição autenticada a um endpoint da Google Maps API.
 * @example
 * makeRequest("/maps/api/directions/json", { origin, destination, mode: "driving" })
 */
export async function makeRequest<T>(
  endpoint: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(endpoint, GOOGLE_MAPS_BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, serializeParam(value));
  }
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Maps API error: ${response.status} ${response.statusText} ${text}`);
  }
  return (await response.json()) as T;
}
