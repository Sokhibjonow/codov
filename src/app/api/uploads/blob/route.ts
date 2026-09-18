import { issueSignedToken } from "@vercel/blob";
import { handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { blobUsesPresignedUploads, checkUpload } from "@/lib/uploads";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Only the teacher uploads, only allowed file types, only to paths made by /api/uploads. */
async function checkRequest(pathname: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("forbidden");
  const checked = checkUpload(pathname, 1, pathname.startsWith("images/"));
  if (!checked || !/^(images|files)\/\d{4}\/\d{2}\/[0-9a-f-]{36}\/[^/]+$/.test(pathname)) throw new Error("unsupported file");
  return checked.maxBytes;
}

/** Gives the teacher's browser a one-time permission to upload one file straight to Vercel Blob. */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody & HandleUploadPresignedBody;
  try {
    if (blobUsesPresignedUploads()) {
      // Newer stores: a short-lived presigned URL, signed with Vercel's built-in credentials
      const result = await handleUploadPresigned({
        request,
        body,
        getSignedToken: async (pathname) => {
          const maximumSizeInBytes = await checkRequest(pathname);
          const token = await issueSignedToken({
            pathname,
            operations: ["put"],
            maximumSizeInBytes,
            validUntil: Date.now() + 15 * 60_000,
          });
          return {
            token,
            urlOptions: { maximumSizeInBytes, addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: YEAR_SECONDS },
          };
        },
      });
      return NextResponse.json(result);
    }

    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => ({
        maximumSizeInBytes: await checkRequest(pathname),
        addRandomSuffix: false,
        allowOverwrite: false,
        cacheControlMaxAge: YEAR_SECONDS,
      }),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "upload failed" }, { status: 400 });
  }
}
