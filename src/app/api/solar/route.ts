// JSON usado pelo widget do iPhone (Scriptable). Se SOLAR_TOKEN estiver definido,
// exige ?t=<token> para que só você leia os seus dados.

import { connection } from "next/server";
import { getSolar } from "@/lib/fusionsolar";

export async function GET(req: Request) {
  await connection(); // responde por requisição (o token é conferido a cada chamada)
  const need = process.env.SOLAR_TOKEN;
  if (need && new URL(req.url).searchParams.get("t") !== need) {
    return Response.json({ error: "Token inválido." }, { status: 401 });
  }
  const data = await getSolar();
  return Response.json(data, { headers: { "cache-control": "no-store" } });
}
