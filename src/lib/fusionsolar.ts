// Leitura da geração solar pela API oficial (Northbound / OpenAPI) do Huawei FusionSolar.
// A Huawei limita muito as chamadas (cerca de 24 por dia por endpoint) e permite só uma
// sessão por vez, então o resultado fica em cache e é renovado a cada 90 minutos.

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

const BASE = process.env.FUSIONSOLAR_URL?.replace(/\/$/, ""); // ex.: https://la5.fusionsolar.huawei.com
const USER = process.env.FUSIONSOLAR_USER;
const CODE = process.env.FUSIONSOLAR_SYSTEMCODE;

export const configured = Boolean(BASE && USER && CODE);

const DEMO: Solar = {
  demo: true,
  plantName: "Demonstração",
  todayKwh: 18.4,
  monthKwh: 362.7,
  totalKwh: 4512.3,
  incomeToday: 15.3,
  health: "ok",
  updatedAt: new Date().toISOString(),
};

async function call(path: string, token: string, body: unknown) {
  const r = await fetch(`${BASE}/thirdData/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "xsrf-token": token },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await r.json();
  if (!json.success) throw new Error(`${path}: ${json.message ?? json.failCode ?? "erro"}`);
  return json.data;
}

async function login(): Promise<string> {
  const r = await fetch(`${BASE}/thirdData/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userName: USER, systemCode: CODE }),
    cache: "no-store",
  });
  const json = await r.json();
  const token = r.headers.get("xsrf-token");
  if (!json.success || !token) throw new Error(`login: ${json.message ?? json.failCode ?? "falhou"}`);
  return token;
}

async function stationCode(token: string): Promise<{ code: string; name: string }> {
  if (process.env.FUSIONSOLAR_STATION) return { code: process.env.FUSIONSOLAR_STATION, name: "Minha usina" };
  try {
    const data = await call("stations", token, { pageNo: 1 });
    const p = data.list[0];
    return { code: p.plantCode, name: p.plantName };
  } catch {
    const data = await call("getStationList", token, {}); // API antiga
    return { code: data[0].stationCode, name: data[0].stationName };
  }
}

const HEALTH: Record<string, Solar["health"]> = { "1": "desconectado", "2": "falha", "3": "ok" };

export async function getSolar(): Promise<Solar> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 5400, expire: 86400 });

  if (!configured) return { ...DEMO, updatedAt: new Date().toISOString() };

  try {
    const token = await login();
    const station = await stationCode(token);
    const kpi = await call("getStationRealKpi", token, { stationCodes: station.code });
    const m = kpi[0].dataItemMap;
    const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));
    return {
      demo: false,
      plantName: station.name,
      todayKwh: num(m.day_power),
      monthKwh: num(m.month_power),
      totalKwh: num(m.total_power),
      incomeToday: m.day_income == null ? null : num(m.day_income),
      health: HEALTH[String(m.real_health_state)] ?? "desconhecido",
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    return { ...DEMO, demo: false, plantName: "Sem dados", todayKwh: 0, monthKwh: 0, totalKwh: 0, incomeToday: null,
      health: "desconhecido", updatedAt: new Date().toISOString(), error: (e as Error).message };
  }
}
