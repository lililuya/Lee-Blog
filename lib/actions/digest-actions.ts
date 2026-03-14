"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { generateWeeklyDigest } from "@/lib/digests";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

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