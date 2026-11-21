import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solar",
  description: "Quanto o seu sistema solar Huawei gerou hoje, no mês e no total.",
  appleWebApp: { capable: true, title: "Solar", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0b0b0b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
