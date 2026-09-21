import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Both language versions of the public page, linked to each other
const languages = { uz: `${SITE_URL}/`, ru: `${SITE_URL}/ru` };

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1, alternates: { languages } },
    { url: `${SITE_URL}/ru`, changeFrequency: "weekly", priority: 1, alternates: { languages } },
  ];
}
