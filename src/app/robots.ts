import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the public pages are for search engines; the cabinets need a login anyway.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/ru", "/login", "/register", "/maxfiylik"],
      disallow: ["/admin", "/student", "/parent", "/api", "/files", "/results", "/logout", "/sovga"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
