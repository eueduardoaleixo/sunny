"use client";

import { useEffect, useRef, useState } from "react";

// Caruaru, PE
const LAT = -8.28;
const LON = -35.97;
const rad = (d: number) => (d * Math.PI) / 180;

// Elevação do sol em graus (fórmula astronômica simplificada, erro de ~1°)
export function sunElevation(date: Date, lat = LAT, lon = LON) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const n = Math.floor((date.getTime() - start) / 864e5);
  const b = rad((360 / 365) * (n - 81));
  const decl = rad(23.44) * Math.sin(b);
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // minutos
  const utcH = date.getUTCHours() + date.getUTCMinutes() / 60;
  const solarTime = utcH + lon / 15 + eot / 60;
  const h = rad(15 * (solarTime - 12));
  const phi = rad(lat);
  const sinEl = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(h);
  return (Math.asin(sinEl) * 180) / Math.PI;
}

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const NIGHT: RGB = [70, 86, 160];
const DAWN: RGB = [255, 106, 0];
const NOON: RGB = [255, 216, 77];

function colorFor(intensity: number, elevation: number): RGB {
  if (elevation <= 0) return NIGHT;
  return mix(DAWN, NOON, Math.min(1, intensity * 1.15));
}

type Props = { todayKwh: string; subtitle: string };

// Permite simular outra hora com ?hora=12 (ex.: para ver o efeito de noite)
function now() {
  const d = new Date();
  if (typeof window === "undefined") return d;
  const h = new URLSearchParams(window.location.search).get("hora");
  if (h == null) return d;
  const [hh, mm = "0"] = h.split(":");
  const sim = new Date(d);
  sim.setUTCHours(Number(hh) + 3, Number(mm), 0, 0); // hora de Recife (UTC-3)
  return sim;
}

export default function SunBlob({ todayKwh, subtitle }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Calculado só no navegador: a página é gerada antes, no servidor, e a hora muda
  const [state, setState] = useState<{ el: number; intensity: number } | null>(null);

  // Posição do sol agora e a cada minuto
  useEffect(() => {
    const update = () => {
      const el = sunElevation(now());
      setState({ el, intensity: Math.max(0, Math.sin(rad(el))) });
    };
    const first = setTimeout(update, 0);
    const id = setInterval(update, 60000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !state) return;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const S = c.clientWidth;
    c.width = S * dpr;
    c.height = S * dpr;
    ctx.scale(dpr, dpr);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { el, intensity } = state;
    const [r, g, b] = colorFor(intensity, el);
    const night = el <= 0;
    const energy = night ? 0.15 : 0.25 + intensity * 0.75;   // 0..1: quanto a bolha "vive"
    const cx = S / 2, cy = S / 2;
    const R = S * (0.3 + energy * 0.08);

    // Partículas presas no anel
    const count = Math.round(30 + energy * 90);
    const parts = Array.from({ length: count }, (_, i) => ({
      a: (i / count) * Math.PI * 2 + Math.random() * 0.4,
      d: 0.72 + Math.random() * 0.3,
      s: 0.6 + Math.random() * 2.2,
      v: (Math.random() - 0.5) * 0.004 * (0.4 + energy),
    }));

    const radius = (a: number, t: number) =>
      R * (1 + energy * 0.09 * Math.sin(3 * a + t * 0.9) + energy * 0.06 * Math.sin(5 * a - t * 1.3) + 0.03 * Math.sin(2 * a + t * 0.5));

    let raf = 0;
    const draw = (ms: number) => {
      const t = (ms / 1000) * (0.6 + energy);
      ctx.clearRect(0, 0, S, S);

      // brilho externo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.6);
      halo.addColorStop(0, `rgba(${r},${g},${b},${0.18 * energy + 0.04})`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, S, S);

      // forma orgânica
      ctx.beginPath();
      const N = 96;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const rr = radius(a, t);
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const fill = ctx.createRadialGradient(cx, cy, R * 0.25, cx, cy, R * 1.1);
      fill.addColorStop(0, "rgba(11,11,11,1)");
      fill.addColorStop(0.55, "rgba(11,11,11,0.92)");
      fill.addColorStop(1, `rgba(${r},${g},${b},0.95)`);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)},0.9)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // partículas
      for (const p of parts) {
        if (!reduce) p.a += p.v;
        const rr = radius(p.a, t) * p.d;
        const x = cx + Math.cos(p.a) * rr, y = cy + Math.sin(p.a) * rr;
        const tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * 2 + p.a * 7);
        ctx.fillStyle = `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)},${tw})`;
        ctx.beginPath();
        ctx.arc(x, y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  const pct = state ? Math.round(state.intensity * 100) : 0;
  const sub = !state ? "Calculando…" : state.el <= 0 ? "Sol abaixo do horizonte" : `Sol a ${Math.round(state.el)}° no céu`;

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[360px]">
        <canvas ref={canvas} className="h-full w-full" aria-hidden="true" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[64px] font-bold leading-none tracking-[-0.04em] tabular-nums">{todayKwh}</span>
          <span className="mt-2 text-[14px] font-semibold uppercase tracking-[0.08em] text-muted">kWh hoje</span>
          <span className="mt-2 text-[15px] text-sun">{subtitle}</span>
        </div>
      </div>

      {/* Régua de incidência, no estilo "pace of aging" */}
      <div className="mt-8">
        <div className="flex items-end justify-between">
          <p className="text-[15px] font-semibold">Incidência do sol</p>
          <p className="text-[13px] text-muted">{sub}</p>
        </div>
        <div className="relative mt-10">
          <p className="absolute -top-1 -translate-x-1/2 -translate-y-full text-[22px] font-bold tabular-nums" style={{ left: `${Math.min(92, Math.max(8, pct))}%` }}>
            {pct}%
          </p>
          <div className="mt-8 flex h-9 items-end justify-between" aria-hidden="true">
            {Array.from({ length: 41 }, (_, i) => (
              <span key={i} className={`w-[2px] rounded-full ${i % 10 === 0 ? "h-9 bg-white/50" : "h-7 bg-white/20"}`} />
            ))}
          </div>
          <span
            className="absolute bottom-0 h-11 w-[3px] -translate-x-1/2 rounded-full bg-white"
            style={{ left: `${pct}%` }}
            role="img"
            aria-label={`Incidência do sol: ${pct}%`}
          />
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-muted">
          <span>Fraco</span><span>50%</span><span>Forte</span>
        </div>
        <p className="mt-3 text-[12px] text-muted">
          Estimada pela posição do sol em Caruaru agora, com céu limpo. Nuvens não entram nessa conta.
        </p>
      </div>
    </div>
  );
}
