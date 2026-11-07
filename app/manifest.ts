import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SmartApply — Annonces carrière",
    short_name: "SmartApply",
    description:
      "Conseils carrière, actus recrutement, stages et annonces d'entreprise",
    start_url: "/?source=pwa",
    display: "standalone",
    display_override: ["standalone", "browser"],
    background_color: "#eef3fb",
    theme_color: "#2563eb",
    id: "/",
    scope: "/",
    lang: "fr",
    dir: "ltr",
    orientation: "any",
    categories: ["business", "education", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/icons/screenshot-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "/icons/screenshot-narrow.png",
        sizes: "540x720",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
  };
}
