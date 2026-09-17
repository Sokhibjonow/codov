import type { MetadataRoute } from "next";

// Lets students add CubickEdu to the phone's home screen like an app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CubickEdu",
    short_name: "CubickEdu",
    description: "HTML, CSS, JavaScript",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#5046e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
