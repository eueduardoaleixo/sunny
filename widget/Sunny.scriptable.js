// Widget "Sunny" para o app Scriptable (iPhone)
// 1. Instale o Scriptable (App Store, grátis).
// 2. Crie um script novo, cole este código e troque a URL abaixo.
// 3. Na tela inicial: segure > + > Scriptable > escolha o tamanho > toque no widget > Script: este.

const APP_URL = "https://sunny-gamma-two.vercel.app";   // endereço do app Sunny
// A configuração vem do app: Ajustes > "Copiar código para o widget".
// Na primeira vez, rode este script dentro do Scriptable para colar o código.

const SUN = new Color("#f5a524");
const MUTED = new Color("#8a8d91");
const BG = new Color("#0b0b0b");

async function configuracao() {
  if (Keychain.contains("sunny-config")) return JSON.parse(Keychain.get("sunny-config"));
  if (config.runsInWidget) return {};
  const a = new Alert();
  a.title = "Código do Sunny";
  a.message = "No app Sunny: Ajustes > Copiar código para o widget. Cole aqui.";
  a.addTextField("código");
  a.addAction("Salvar");
  a.addCancelAction("Pular");
  if ((await a.present()) === -1) return {};
  try {
    const json = Data.fromBase64String(a.textFieldValue(0).trim()).toRawString(); // API do Scriptable
    Keychain.set("sunny-config", json);
    return JSON.parse(json);
  } catch {
    return {};
  }
}

async function carregar() {
  const cfg = await configuracao();
  try {
    const r = new Request(`${APP_URL}/api/solar`);
    r.method = "POST";
    r.headers = { "content-type": "application/json" };
    r.body = JSON.stringify(cfg);
    r.timeoutInterval = 20;
    const d = await r.loadJSON();
    if (cfg.tariff != null) d.incomeToday = d.todayKwh * cfg.tariff;
    Keychain.set("sunny-ultimo", JSON.stringify(d));   // guarda para quando estiver sem internet
    return d;
  } catch {
    return Keychain.contains("sunny-ultimo") ? JSON.parse(Keychain.get("sunny-ultimo")) : null;
  }
}

const fmt = (n, d = 1) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function texto(stack, str, size, color, bold = false) {
  const t = stack.addText(str);
  t.font = bold ? Font.boldRoundedSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.minimumScaleFactor = 0.6;
  return t;
}

async function montar() {
  const d = await carregar();
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.url = APP_URL;
  w.setPadding(14, 16, 14, 16);
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000); // pede atualização em 30 min

  const topo = w.addStack();
  topo.centerAlignContent();
  const sol = topo.addImage(SFSymbol.named("sun.max.fill").image);
  sol.tintColor = SUN;
  sol.imageSize = new Size(16, 16);
  topo.addSpacer(6);
  texto(topo, "Sunny · hoje", 13, MUTED);

  w.addSpacer();

  if (!d) {
    texto(w, "Sem dados", 20, Color.white(), true);
    texto(w, "Confira a URL do app", 11, MUTED);
    return w;
  }

  const linha = w.addStack();
  linha.bottomAlignContent();
  texto(linha, fmt(d.todayKwh), config.widgetFamily === "small" ? 36 : 44, Color.white(), true);
  linha.addSpacer(4);
  texto(linha, "kWh", 15, SUN, true);

  w.addSpacer(4);
  if (config.widgetFamily !== "small") {
    const baixo = w.addStack();
    texto(baixo, `Mês ${fmt(d.monthKwh, 0)} kWh`, 13, Color.white());
    baixo.addSpacer();
    texto(baixo, `Total ${fmt(d.totalKwh, 0)} kWh`, 13, MUTED);
    w.addSpacer(4);
  } else {
    texto(w, `Mês ${fmt(d.monthKwh, 0)} kWh`, 12, Color.white());
  }

  const hora = new Date(d.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  texto(w, d.demo ? "demonstração" : `atualizado ${hora}`, 10, MUTED);
  return w;
}

const widget = await montar();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
