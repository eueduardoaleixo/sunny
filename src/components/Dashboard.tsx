"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SunBlob from "@/components/SunBlob";
import { hasCredentials, loadConfig, type SunnyConfig } from "@/lib/config";
import type { Solar } from "@/lib/fusionsolar";

const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const HEALTH: Record<Solar["health"], { label: string; cls: string }> = {
  ok: { label: "Funcionando", cls: "text-good" },
  falha: { label: "Com falha", cls: "text-bad" },
  desconectado: { label: "Desconectado", cls: "text-bad" },
  desconhecido: { label: "Sem status", cls: "text-muted" },
};

export default function Dashboard() {
  const [cfg, setCfg] = useState<SunnyConfig | null>(null);
  const [s, setS] = useState<Solar | null>(null);

  useEffect(() => {
    const c = loadConfig();
    const t = setTimeout(() => setCfg(c), 0);
    fetch("/api/solar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(hasCredentials(c) ? { region: c.region, user: c.user, systemCode: c.systemCode, station: c.station } : {}),
    })
      .then((r) => r.json())
      .then(setS)
      .catch(() => setS(null));
    return () => clearTimeout(t);
  }, []);

  if (!cfg || !s) return <p className="pt-24 text-center text-muted">Buscando a geração…</p>;

  const h = HEALTH[s.health];
  const economia = cfg.tariff != null ? s.todayKwh * cfg.tariff : s.incomeToday;
  const hora = new Date(s.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const media = cfg.capacityKwp ? s.todayKwh / cfg.capacityKwp : null; // kWh por kWp instalado

  return (
    <>
      <div className="flex items-center justify-between text-[15px]">
        <span className="font-semibold">{s.plantName}</span>
        <div className="flex items-center gap-4">
          <span className={h.cls}>● {h.label}</span>
          <Link href="/config" aria-label="Configurações" className="rounded-full border border-line px-3 py-1 text-[13px] text-muted">
            Ajustes
          </Link>
        </div>
      </div>

      <section className="mt-6">
        <SunBlob
          todayKwh={fmt(s.todayKwh)}
          subtitle={economia != null ? `R$ ${fmt(economia, 2)} de economia` : `${fmt(s.monthKwh, 0)} kWh no mês`}
          lat={cfg.lat}
          lon={cfg.lon}
          placeName={cfg.placeName}
        />
      </section>

      <section className="mt-12 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-[14px] text-muted">Este mês</p>
          <p className="mt-1 text-[28px] font-bold tabular-nums">{fmt(s.monthKwh, 0)}</p>
          <p className="text-[13px] text-muted">kWh{cfg.tariff != null ? ` · R$ ${fmt(s.monthKwh * cfg.tariff, 0)}` : ""}</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-[14px] text-muted">Desde a instalação</p>
          <p className="mt-1 text-[28px] font-bold tabular-nums">{fmt(s.totalKwh, 0)}</p>
          <p className="text-[13px] text-muted">kWh</p>
        </div>
        {media != null && (
          <div className="col-span-2 rounded-2xl border border-line p-4">
            <p className="text-[14px] text-muted">Rendimento hoje</p>
            <p className="mt-1 text-[22px] font-bold tabular-nums">{fmt(media, 2)} kWh por kWp</p>
            <p className="text-[13px] text-muted">Referência aproximada: no Nordeste, um dia de sol rende por volta de 5 kWh por kWp.</p>
          </div>
        )}
      </section>

      <p className="mt-10 text-[13px] text-muted">
        Atualizado às {hora}. A Huawei libera poucos acessos por dia, então os números renovam a cada 1 h 30.
      </p>
      {s.demo && (
        <Link href="/config" className="mt-4 block rounded-xl bg-sun/15 px-4 py-3 text-[14px] text-sun">
          Números de demonstração. Toque aqui para cadastrar a sua conta da Huawei.
        </Link>
      )}
      {s.error && (
        <p className="mt-4 rounded-xl bg-bad/15 px-4 py-3 text-[14px] text-bad">Não deu para ler a Huawei: {s.error}</p>
      )}
    </>
  );
}
