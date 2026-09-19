import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the public pages are for search engines; the cabinets need a login anyway.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/ru", "/login"],
      disallow: ["/admin", "/student", "/parent", "/api", "/files", "/results", "/logout"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
