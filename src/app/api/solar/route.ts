// Dados da geração.
// POST { region, user, systemCode, station? }: usa a conta enviada pelo app ou pelo widget.
// GET: usa a conta cadastrada nas variáveis da Vercel (se houver) ou devolve a demonstração.
// As credenciais não são guardadas no servidor; só servem de chave para o cache da consulta.

import { connection } from "next/server";
import { demo, envCreds, getSolar, type Creds } from "@/lib/fusionsolar";

export async function POST(req: Request) {
  await connection();
  let body: Partial<Creds>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (!body.region || !body.user || !body.systemCode) {
    return Response.json(demo(), { headers: { "cache-control": "no-store" } });
  }
  const data = await getSolar({
    region: String(body.region).slice(0, 30),
    user: String(body.user).slice(0, 80),
    systemCode: String(body.systemCode).slice(0, 120),
    station: body.station ? String(body.station).slice(0, 80) : undefined,
  });
  return Response.json(data, { headers: { "cache-control": "no-store" } });
}

export async function GET() {
  await connection();
  const c = envCreds();
  const data = c ? await getSolar(c) : demo();
  return Response.json(data, { headers: { "cache-control": "no-store" } });
}
