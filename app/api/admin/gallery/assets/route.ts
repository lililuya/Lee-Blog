import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteLocalSiteAsset, SiteAssetUploadError, storeSiteImageUpload } from "@/lib/site-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return buildErrorResponse("Only admins can upload gallery images.", 403);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.error("[api/admin/gallery/assets] formData", error);
    return buildErrorResponse("The uploaded form data could not be read.", 400);
  }

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return buildErrorResponse("Please select at least one image to upload.", 400);
  }

  const uploadedAssets: Array<{ url: string; originalName: string }> = [];

  try {
    for (const file of files) {
      const uploaded = await storeSiteImageUpload(file, "gallery");
      uploadedAssets.push({
        url: uploaded.url,
        originalName: file.name,
      });
    }
  } catch (error) {
    await Promise.all(uploadedAssets.map((asset) => deleteLocalSiteAsset(asset.url)));

    if (error instanceof SiteAssetUploadError) {
      return buildErrorResponse(error.message, 400);
    }

    console.error("[api/admin/gallery/assets] upload", error);
    return buildErrorResponse("The gallery images could not be uploaded.", 500);
  }

  return NextResponse.json({
    ok: true,
    assets: uploadedAssets,
  });
}
