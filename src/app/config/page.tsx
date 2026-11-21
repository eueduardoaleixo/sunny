"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_CONFIG, hasCredentials, loadConfig, saveConfig, widgetCode, type SunnyConfig } from "@/lib/config";

const REGIONS = [
  { v: "la5", label: "América Latina (la5)" },
  { v: "intl", label: "Internacional (intl)" },
  { v: "eu5", label: "Europa (eu5)" },
  { v: "region01eu5", label: "Europa 2 (region01eu5)" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[15px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

const input = "rounded-xl border border-line bg-white/5 px-4 py-3 text-[16px] text-white placeholder:text-white/30";

export default function Config() {
  const [c, setC] = useState<SunnyConfig>(DEFAULT_CONFIG);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setC(loadConfig()), 0);
    return () => clearTimeout(t);
  }, []);

  const set = <K extends keyof SunnyConfig>(k: K, v: SunnyConfig[K]) => {
    setC((p) => ({ ...p, [k]: v }));
    setMsg(null);
  };

  function salvar() {
    saveConfig(c);
    setMsg({ ok: true, text: "Ajustes salvos neste aparelho." });
  }

  async function testar() {
    if (!hasCredentials(c)) {
      setMsg({ ok: false, text: "Preencha a região, o usuário e o system code." });
      return;
    }
    setTesting(true);
    try {
      const r = await fetch("/api/solar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ region: c.region, user: c.user, systemCode: c.systemCode, station: c.station }),
      });
      const d = await r.json();
      setMsg(d.error ? { ok: false, text: `A Huawei respondeu: ${d.error}` } : { ok: true, text: `Conectado: ${d.plantName}, ${d.todayKwh} kWh hoje.` });
    } catch {
      setMsg({ ok: false, text: "Sem conexão com o servidor. Tente de novo." });
    } finally {
      setTesting(false);
    }
  }

  function localizar() {
    if (!navigator.geolocation) return setMsg({ ok: false, text: "Este aparelho não informa a localização." });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setC((x) => ({ ...x, lat: Number(p.coords.latitude.toFixed(3)), lon: Number(p.coords.longitude.toFixed(3)), placeName: "Minha localização" }));
        setMsg({ ok: true, text: "Localização preenchida. Toque em Salvar." });
      },
      () => setMsg({ ok: false, text: "Permissão de localização negada. Preencha latitude e longitude à mão." }),
    );
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(widgetCode(c));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMsg({ ok: false, text: "Não deu para copiar. Tente pelo Safari." });
    }
  }

  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  return (
    <main className="mx-auto max-w-md px-6 pb-16 pt-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-[15px] text-muted">Voltar</Link>
        <h1 className="text-[17px] font-semibold">Ajustes</h1>
        <button type="button" onClick={salvar} className="text-[15px] font-semibold text-sun">Salvar</button>
      </div>

      <section className="mt-8 grid gap-5">
        <h2 className="text-[13px] text-muted">Conta da Huawei (FusionSolar)</h2>
        <Field label="Região" hint="É o começo do endereço do seu FusionSolar no navegador.">
          <select value={c.region} onChange={(e) => set("region", e.target.value)} className={input}>
            {REGIONS.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Usuário da API" hint="Conta Northbound criada pelo instalador. Não é o login do app.">
          <input value={c.user} onChange={(e) => set("user", e.target.value.trim())} autoCapitalize="none" autoCorrect="off" className={input} placeholder="usuario_api" />
        </Field>
        <Field label="System code">
          <input type="password" value={c.systemCode} onChange={(e) => set("systemCode", e.target.value)} className={input} placeholder="••••••••" />
        </Field>
        <Field label="Código da usina" hint="Opcional. Deixe vazio para usar a primeira usina da conta.">
          <input value={c.station} onChange={(e) => set("station", e.target.value.trim())} autoCapitalize="none" className={input} placeholder="NE=12345678" />
        </Field>
        <button type="button" onClick={testar} disabled={testing} className="rounded-xl border border-line px-4 py-3 text-[16px] font-semibold disabled:opacity-60">
          {testing ? "Testando…" : "Testar conexão"}
        </button>
      </section>

      <section className="mt-10 grid gap-5">
        <h2 className="text-[13px] text-muted">Local (para calcular o sol)</h2>
        <button type="button" onClick={localizar} className="rounded-xl border border-line px-4 py-3 text-[16px] font-semibold">Usar minha localização</button>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <input inputMode="decimal" value={c.lat} onChange={(e) => set("lat", Number(e.target.value.replace(",", ".")) || 0)} className={input} />
          </Field>
          <Field label="Longitude">
            <input inputMode="decimal" value={c.lon} onChange={(e) => set("lon", Number(e.target.value.replace(",", ".")) || 0)} className={input} />
          </Field>
        </div>
        <Field label="Nome do local">
          <input value={c.placeName} onChange={(e) => set("placeName", e.target.value)} className={input} />
        </Field>
      </section>

      <section className="mt-10 grid gap-5">
        <h2 className="text-[13px] text-muted">Sistema e conta de luz</h2>
        <Field label="Tarifa de energia (R$/kWh)" hint="Está na sua conta de luz. Usada para calcular a economia.">
          <input inputMode="decimal" value={c.tariff ?? ""} onChange={(e) => set("tariff", num(e.target.value))} className={input} placeholder="0,92" />
        </Field>
        <Field label="Potência do sistema (kWp)" hint="Opcional. Mostra o rendimento por kWp instalado.">
          <input inputMode="decimal" value={c.capacityKwp ?? ""} onChange={(e) => set("capacityKwp", num(e.target.value))} className={input} placeholder="5,5" />
        </Field>
      </section>

      <section className="mt-10 grid gap-3">
        <h2 className="text-[13px] text-muted">Widget do iPhone</h2>
        <p className="text-[14px] text-muted">
          Copie o código e cole no widget do Scriptable quando ele pedir. Ele leva a sua conta da Huawei, então não compartilhe.
        </p>
        <button type="button" onClick={copiarCodigo} disabled={!hasCredentials(c)} className="rounded-xl bg-sun px-4 py-3 text-[16px] font-semibold text-black disabled:opacity-40">
          {copied ? "Código copiado" : "Copiar código para o widget"}
        </button>
      </section>

      {msg && (
        <p role="status" className={`mt-8 rounded-xl px-4 py-3 text-[14px] ${msg.ok ? "bg-good/15 text-good" : "bg-bad/15 text-bad"}`}>{msg.text}</p>
      )}
      <button type="button" onClick={salvar} className="mt-8 w-full rounded-xl bg-white px-4 py-3 text-[16px] font-semibold text-black">Salvar ajustes</button>
    </main>
  );
}
