// Configuração do Sunny, salva no próprio aparelho (localStorage).
// As credenciais só saem do aparelho para o nosso servidor, por HTTPS, na hora de buscar os dados.

export type SunnyConfig = {
  region: string;        // prefixo do FusionSolar: la5, intl, eu5, region01eu5...
  user: string;          // usuário Northbound/OpenAPI
  systemCode: string;    // senha (system code) da conta de API
  station: string;       // código da usina (opcional)
  lat: number;
  lon: number;
  placeName: string;
  tariff: number | null; // R$/kWh
  capacityKwp: number | null;
};

export const DEFAULT_CONFIG: SunnyConfig = {
  region: "la5",
  user: "",
  systemCode: "",
  station: "",
  lat: -8.28,
  lon: -35.97,
  placeName: "Caruaru, PE",
  tariff: null,
  capacityKwp: null,
};

const KEY = "sunny-config";

export function loadConfig(): SunnyConfig {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(c: SunnyConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* modo privado do Safari: segue sem salvar */
  }
}

export const hasCredentials = (c: SunnyConfig) => Boolean(c.user && c.systemCode && c.region);

// Código para colar no widget do Scriptable (só o que o widget precisa)
export function widgetCode(c: SunnyConfig) {
  const json = JSON.stringify({ region: c.region, user: c.user, systemCode: c.systemCode, station: c.station, tariff: c.tariff });
  return btoa(unescape(encodeURIComponent(json)));
}
