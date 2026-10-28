import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";
import { canEditCatalogs, canEditFabrics, isAdmin } from "@/lib/roles";
import type { Role } from "@/types";

export const runtime = "nodejs";

const TEMPLATE_PATH = /^templates\/[0-9a-f-]{36}\/[a-zA-Z0-9._-]+$/;
const DESIGN_PATH = /^private\/designs\/[0-9a-f-]{36}\/[a-zA-Z0-9._-]+$/;
const MOCKUP_PATH = /^mockups\/[0-9a-f-]{36}\/[a-zA-Z0-9._-]+$/;
const CATALOG_COVER_PATH = /^catalogs\/[a-z0-9-]+\/cover\.(webp|jpe?g|png)$/i;

function mayUploadPathname(pathname: string, role: Role): boolean {
  if (TEMPLATE_PATH.test(pathname)) return isAdmin(role);
  if (DESIGN_PATH.test(pathname)) return isAdmin(role) || canEditFabrics(role);
  if (MOCKUP_PATH.test(pathname)) return isAdmin(role) || canEditFabrics(role);
  if (CATALOG_COVER_PATH.test(pathname)) return canEditCatalogs(role);
  return false;
}

function maxBytesForPath(pathname: string): number {
  if (pathname.startsWith("private/designs/")) return 50 * 1024 * 1024;
  if (pathname.startsWith("mockups/")) return 25 * 1024 * 1024;
  if (pathname.startsWith("catalogs/")) return 20 * 1024 * 1024;
  return 60 * 1024 * 1024;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!mayUploadPathname(pathname, session.role)) {
          throw new Error("forbidden path");
        }
        return {
          allowedContentTypes: ["image/png", "image/jpeg", "image/webp", "application/json"],
          maximumSizeInBytes: maxBytesForPath(pathname),
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
    });
    return Response.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/forbidden path/i.test(message)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("blob/upload", error);
    return Response.json({ error: "upload" }, { status: 500 });
  }
}
