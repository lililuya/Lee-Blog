"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { generateWeeklyDigest } from "@/lib/digests";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";
import { digestSeriesAssignmentSchema } from "@/lib/validators";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

export async function generateWeeklyDigestAction() {
  await requireAdmin();
  ensureDatabase();

  const { digest } = await generateWeeklyDigest();
  revalidatePath("/");
  revalidatePath("/digest");
  revalidatePath(`/digest/${digest.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/digests");
  redirect(`/admin/digests?generated=${digest.slug}`);
}

export async function deleteWeeklyDigestAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const digestId = getString(formData, "digestId");
  const digest = await prisma.weeklyDigest.delete({ where: { id: digestId } });

  revalidatePath("/");
  revalidatePath("/digest");
  revalidatePath(`/digest/${digest.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/digests");
  redirect("/admin/digests?deleted=1");
}

export async function updateWeeklyDigestSeriesAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const parsed = digestSeriesAssignmentSchema.parse({
    digestId: getString(formData, "digestId"),
    seriesId: getString(formData, "seriesId") || null,
    seriesOrder: getString(formData, "seriesOrder") || null,
  });

  const digest = await prisma.weeklyDigest.update({
    where: { id: parsed.digestId },
    data: {
      seriesId: parsed.seriesId || null,
      seriesOrder: parsed.seriesId ? parsed.seriesOrder ?? null : null,
    },
  });

  revalidatePath("/digest");
  revalidatePath(`/digest/${digest.slug}`);
  revalidatePath("/series");
  if (digest.seriesId) {
    const series = await prisma.contentSeries.findUnique({
      where: { id: digest.seriesId },
      select: { slug: true },
    });

    if (series?.slug) {
      revalidatePath(`/series/${series.slug}`);
    }
  }
  revalidatePath("/admin/digests");
  redirect("/admin/digests?updated=1");
}
