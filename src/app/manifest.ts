import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sunny",
    short_name: "Sunny",
    description: "Geração do sistema solar Huawei",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
