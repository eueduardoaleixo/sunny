import { Suspense } from "react";
import SunBlob from "@/components/SunBlob";
import { getSolar, type Solar } from "@/lib/fusionsolar";

const kwh = (n: number, d = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const HEALTH: Record<Solar["health"], { label: string; cls: string }> = {
  ok: { label: "Funcionando", cls: "text-good" },
  falha: { label: "Com falha", cls: "text-bad" },
  desconectado: { label: "Desconectado", cls: "text-bad" },
  desconhecido: { label: "Sem status", cls: "text-muted" },
};

async function Painel() {
  const s = await getSolar();
  const h = HEALTH[s.health];
  const hora = new Date(s.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Recife" });

  return (
    <>
      <div className="flex items-center justify-between text-[15px]">
        <span className="font-semibold">{s.plantName}</span>
        <span className={h.cls}>● {h.label}</span>
      </div>

      <section className="mt-6">
        <SunBlob
          todayKwh={kwh(s.todayKwh)}
          subtitle={s.incomeToday != null ? `R$ ${kwh(s.incomeToday, 2)} de economia` : `${kwh(s.monthKwh, 0)} kWh no mês`}
        />
      </section>

      <section className="mt-12 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-[14px] text-muted">Este mês</p>
          <p className="mt-1 text-[28px] font-bold tabular-nums">{kwh(s.monthKwh, 0)}</p>
          <p className="text-[13px] text-muted">kWh</p>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className="text-[14px] text-muted">Desde a instalação</p>
          <p className="mt-1 text-[28px] font-bold tabular-nums">{kwh(s.totalKwh, 0)}</p>
          <p className="text-[13px] text-muted">kWh</p>
        </div>
      </section>

      <p className="mt-10 text-[13px] text-muted">
        Atualizado às {hora}. A Huawei libera poucos acessos por dia, então os números renovam a cada 1 h 30.
      </p>
      {s.demo && (
        <p className="mt-4 rounded-xl bg-sun/15 px-4 py-3 text-[14px] text-sun">
          Números de demonstração. Assim que a conta de API do FusionSolar for cadastrada, aparecem os seus.
        </p>
      )}
      {s.error && (
        <p className="mt-4 rounded-xl bg-bad/15 px-4 py-3 text-[14px] text-bad">Não deu para ler a Huawei agora: {s.error}</p>
      )}
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-6 pb-10 pt-8">
      <Suspense fallback={<p className="pt-20 text-muted">Buscando a geração…</p>}>
        <Painel />
      </Suspense>
    </main>
  );
}
