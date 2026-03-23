"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_AUDIT_ACTIONS, buildAdminAuditLogData } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, slugify } from "@/lib/utils";
import { contentSeriesSchema } from "@/lib/validators";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

function revalidateSeriesSurfaces(slug?: string | null) {
  revalidatePath("/series");
  revalidatePath("/blog");
  revalidatePath("/notes");
  revalidatePath("/digest");
  revalidatePath("/admin/series");

  if (slug) {
    revalidatePath(`/series/${slug}`);
  }
}

export async function createContentSeriesAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const parsed = contentSeriesSchema.parse({
    title: getString(formData, "title"),
    slug: slugify(getString(formData, "slug") || getString(formData, "title")),
    summary: getString(formData, "summary"),
    description: getString(formData, "description"),
    coverImageUrl: getOptionalString(formData, "coverImageUrl"),
    featured: getBoolean(formData, "featured"),
  });

  const series = await prisma.$transaction(async (tx) => {
    const createdSeries = await tx.contentSeries.create({
      data: {
        ...parsed,
        coverImageUrl: parsed.coverImageUrl || null,
      },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.SERIES_SAVED,
        summary: `已创建内容系列“${createdSeries.title}”。`,
        actorId: admin.id,
        metadata: {
          seriesId: createdSeries.id,
          slug: createdSeries.slug,
        },
      }),
    });

    return createdSeries;
  });

  revalidateSeriesSurfaces(series.slug);
  redirect(`/admin/series/${series.id}?saved=1`);
}

export async function updateContentSeriesAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const seriesId = getString(formData, "seriesId");
  const existingSeries = await prisma.contentSeries.findUnique({
    where: { id: seriesId },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  const parsed = contentSeriesSchema.parse({
    title: getString(formData, "title"),
    slug: slugify(getString(formData, "slug") || getString(formData, "title")),
    summary: getString(formData, "summary"),
    description: getString(formData, "description"),
    coverImageUrl: getOptionalString(formData, "coverImageUrl"),
    featured: getBoolean(formData, "featured"),
  });

  const series = await prisma.$transaction(async (tx) => {
    const updatedSeries = await tx.contentSeries.update({
      where: { id: seriesId },
      data: {
        ...parsed,
        coverImageUrl: parsed.coverImageUrl || null,
      },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.SERIES_SAVED,
        summary: `已更新内容系列“${updatedSeries.title}”。`,
        actorId: admin.id,
        metadata: {
          seriesId: updatedSeries.id,
          previousSlug: existingSeries?.slug ?? null,
          slug: updatedSeries.slug,
        },
      }),
    });

    return updatedSeries;
  });

  revalidateSeriesSurfaces(existingSeries?.slug);
  revalidateSeriesSurfaces(series.slug);
  redirect(`/admin/series/${series.id}?saved=1`);
}

export async function deleteContentSeriesAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const seriesId = getString(formData, "seriesId");
  const series = await prisma.$transaction(async (tx) => {
    const deletedSeries = await tx.contentSeries.delete({
      where: { id: seriesId },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.SERIES_DELETED,
        summary: `已删除内容系列“${deletedSeries.title}”。`,
        actorId: admin.id,
        metadata: {
          seriesId: deletedSeries.id,
          slug: deletedSeries.slug,
        },
      }),
    });

    return deletedSeries;
  });

  revalidateSeriesSurfaces(series.slug);
  redirect("/admin/series?deleted=1");
}
