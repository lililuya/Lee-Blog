import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildAdminProfileRedirectPath, saveAdminProfileFromFormData } from "@/lib/admin-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function expectsJsonResponse(request: Request) {
  const requestedWith = request.headers.get("x-requested-with");
  const accept = request.headers.get("accept") ?? "";
  return requestedWith === "XMLHttpRequest" || accept.includes("application/json");
}

export async function POST(request: Request) {
  const wantsJson = expectsJsonResponse(request);
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    if (wantsJson) {
      return NextResponse.json(
        {
          ok: false,
          redirectTo: "/login",
          error: "forbidden",
        },
        { status: 403 },
      );
    }

    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    console.error("[api/admin/profile] formData", error);

    if (wantsJson) {
      return NextResponse.json(
        {
          ok: false,
          redirectTo: buildAdminProfileRedirectPath("upload"),
          error: "upload",
        },
        { status: 400 },
      );
    }

    return NextResponse.redirect(new URL(buildAdminProfileRedirectPath("upload"), request.url), {
      status: 303,
    });
  }

  const result = await saveAdminProfileFromFormData(formData);

  if (wantsJson) {
    return NextResponse.json(
      {
        ok: result.ok,
        redirectTo: result.redirectPath,
        error: result.errorCode ?? null,
      },
      { status: result.ok ? 200 : 400 },
    );
  }

  return NextResponse.redirect(new URL(result.redirectPath, request.url), { status: 303 });
}
