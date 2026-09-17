import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkUpload } from "@/lib/uploads";

/** Gives the teacher's browser a one-time permission to upload one file straight to Vercel Blob. */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        if (!user || user.role !== "ADMIN") throw new Error("forbidden");
        const imagesOnly = pathname.startsWith("images/");
        const checked = checkUpload(pathname, 1, imagesOnly);
        if (!checked || !/^(images|files)\/\d{4}\/\d{2}\/[0-9a-f-]{36}\/[^/]+$/.test(pathname)) throw new Error("unsupported file");
        return {
          maximumSizeInBytes: checked.maxBytes,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "upload failed" }, { status: 400 });
  }
}
