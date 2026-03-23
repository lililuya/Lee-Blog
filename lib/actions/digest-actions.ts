"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { notifySubscribersOfPublishedDigest } from "@/lib/digest-notifications";
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

function buildGenerateDigestRedirectPath(input: {
  slug: string;
  emailed: number;
  skipped: number;
  failed: number;
}) {
  const params = new URLSearchParams({
    generated: input.slug,
    emailed: String(input.emailed),
    skipped: String(input.skipped),
    failed: String(input.failed),
  });

  return `/admin/digests?${params.toString()}`;
}

async function safeRunDigestNotification(
  task: () => Promise<{ attempted: boolean; sent: number; failed: number; skipped: number }>,
) {
  try {
    return await task();
  } catch (error) {
    console.error("[digest notification]", error);
    return {
      attempted: false,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }
}

export async function generateWeeklyDigestAction() {
  await requireAdmin();
  ensureDatabase();

  const { digest } = await generateWeeklyDigest();
  const notificationResult = await safeRunDigestNotification(() =>
    notifySubscribersOfPublishedDigest({
      id: digest.id,
      title: digest.title,
      slug: digest.slug,
      summary: digest.summary,
      highlights: digest.highlights,
      featuredTopics: digest.featuredTopics,
      paperCount: digest.paperCount,
      journalCount: digest.journalCount,
      postCount: digest.postCount,
      periodStart: digest.periodStart,
      periodEnd: digest.periodEnd,
    }),
  );
  revalidatePath("/");
  revalidatePath("/digest");
  revalidatePath(`/digest/${digest.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/digests");
  redirect(
    buildGenerateDigestRedirectPath({
      slug: digest.slug,
      emailed: notificationResult.sent,
      skipped: notificationResult.skipped,
      failed: notificationResult.failed,
    }),
  );
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
