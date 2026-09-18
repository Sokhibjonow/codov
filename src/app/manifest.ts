import type { MetadataRoute } from "next";

// Lets students add codov to the phone's home screen like an app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "codov",
    short_name: "codov",
    description: "Veb-dasturlashni o‘rganish platformasi",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F3EC",
    theme_color: "#141B2D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
