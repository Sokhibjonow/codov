import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";
import { blobStorageEnabled, resolveBlobUpload, resolveUpload } from "@/lib/uploads";

/** Content-Disposition with the original (possibly Cyrillic) file name */
function disposition(inline: boolean, name: string | null) {
  const type = inline ? "inline" : "attachment";
  if (!name) return type;
  const clean = name.replace(/[\r\n"\\/]/g, "_").slice(0, 200);
  const ascii = clean.replace(/[^\x20-\x7e]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

// Serves uploaded files to signed-in users only.
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const segments = (await params).path;

  if (blobStorageEnabled()) {
    // On Vercel the file sits in Blob storage under an unguessable path: send the signed-in user there
    const blob = resolveBlobUpload(segments);
    if (!blob) return new Response("Not found", { status: 404 });
    return new Response(null, {
      status: 307,
      headers: {
        Location: blob.inline ? blob.url : `${blob.url}?download=1`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const file = resolveUpload(segments);
  if (!file) return new Response("Not found", { status: 404 });

  try {
    const info = await stat(file.absolute);
    const body = Readable.toWeb(createReadStream(file.absolute)) as ReadableStream;
    const isPdf = file.contentType === "application/pdf";

    return new Response(body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(info.size),
        "Content-Disposition": disposition(file.inline, request.nextUrl.searchParams.get("name")),
        // File names are random UUIDs and never change
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        // Uploaded content never runs as part of the site (the PDF viewer doesn't work in a sandbox)
        ...(isPdf ? {} : { "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'" }),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
