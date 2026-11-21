// Leitura da geração solar pela API oficial (Northbound / OpenAPI) do Huawei FusionSolar.
// A Huawei limita muito as chamadas (cerca de 24 por dia por endpoint) e permite só uma
// sessão por vez, então cada conta tem o resultado em cache, renovado a cada 90 minutos.

import { cacheLife } from "next/cache";

export type Solar = {
  demo: boolean;
  plantName: string;
  todayKwh: number;
  monthKwh: number;
  totalKwh: number;
  incomeToday: number | null;
  health: "ok" | "falha" | "desconectado" | "desconhecido";
  updatedAt: string; // ISO
  error?: string;
};

export type Creds = { region: string; user: string; systemCode: string; station?: string };

// Só aceita endereços do próprio FusionSolar (evita usar o servidor para acessar outros sites)
export function baseUrl(region: string) {
  const r = region.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,30}$/.test(r)) throw new Error("Região inválida");
  return `https://${r}.fusionsolar.huawei.com`;
}

export function envCreds(): Creds | null {
  const u = process.env.FUSIONSOLAR_USER, c = process.env.FUSIONSOLAR_SYSTEMCODE, url = process.env.FUSIONSOLAR_URL;
  if (!u || !c || !url) return null;
  const region = new URL(url).hostname.split(".")[0];
  return { region, user: u, systemCode: c, station: process.env.FUSIONSOLAR_STATION };
}

export function demo(): Solar {
  return {
    demo: true, plantName: "Demonstração", todayKwh: 18.4, monthKwh: 362.7, totalKwh: 4512.3,
    incomeToday: 15.3, health: "ok", updatedAt: new Date().toISOString(),
  };
}

async function call(base: string, path: string, token: string, body: unknown) {
  const r = await fetch(`${base}/thirdData/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "xsrf-token": token },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await r.json();
  if (!json.success) throw new Error(`${path}: ${json.message ?? json.failCode ?? "erro"}`);
  return json.data;
}

const HEALTH: Record<string, Solar["health"]> = { "1": "desconectado", "2": "falha", "3": "ok" };

export async function getSolar(c: Creds): Promise<Solar> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 5400, expire: 86400 });

  try {
    const base = baseUrl(c.region);
    const lr = await fetch(`${base}/thirdData/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userName: c.user, systemCode: c.systemCode }),
      cache: "no-store",
    });
    const lj = await lr.json();
    const token = lr.headers.get("xsrf-token");
    if (!lj.success || !token) throw new Error(`login recusado (${lj.message ?? lj.failCode ?? "confira usuário e system code"})`);

    let code = c.station, name = "Minha usina";
    if (!code) {
      try {
        const d = await call(base, "stations", token, { pageNo: 1 });
        code = d.list[0].plantCode; name = d.list[0].plantName;
      } catch {
        const d = await call(base, "getStationList", token, {});
        code = d[0].stationCode; name = d[0].stationName;
      }
    }
    const kpi = await call(base, "getStationRealKpi", token, { stationCodes: code });
    const m = kpi[0].dataItemMap;
    const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
    return {
      demo: false,
      plantName: name,
      todayKwh: num(m.day_power),
      monthKwh: num(m.month_power),
      totalKwh: num(m.total_power),
      incomeToday: m.day_income == null ? null : num(m.day_income),
      health: HEALTH[String(m.real_health_state)] ?? "desconhecido",
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      demo: false, plantName: "Sem dados", todayKwh: 0, monthKwh: 0, totalKwh: 0, incomeToday: null,
      health: "desconhecido", updatedAt: new Date().toISOString(), error: (e as Error).message,
    };
  }
}
