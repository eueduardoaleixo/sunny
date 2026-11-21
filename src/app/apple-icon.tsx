import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícone da tela inicial: um sol simples sobre fundo preto
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0b0b0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 84, height: 84, borderRadius: 999, background: "#f5a524", boxShadow: "0 0 0 14px #0b0b0b, 0 0 0 22px #f5a524" }} />
      </div>
    ),
    size,
  );
}
