"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_AUDIT_ACTIONS, buildAdminAuditLogData } from "@/lib/audit";
import { snapshotPostRevision } from "@/lib/content-revisions";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, normalizeTaxonomyValue } from "@/lib/utils";
import { postCategoryRenameSchema } from "@/lib/validators";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

function redirectToAdminCategories(state: string): never {
  redirect(`/admin/categories?state=${encodeURIComponent(state)}`);
}

function dedupeTaxonomyValues(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const normalized = normalizeTaxonomyValue(trimmed);

    if (!trimmed || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
}

function revalidatePostCategorySurfaces(input: {
  previousCategory?: string | null;
  nextCategory?: string | null;
  postSlugs?: string[];
}) {
  revalidatePath("/");
  revalidatePath("/archive");
  revalidatePath("/blog");
  revalidatePath("/categories");
  revalidatePath("/search");
  revalidatePath("/subscribe");
  revalidatePath("/feed.xml");
  revalidatePath("/feed.json");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/posts");
  revalidatePath("/admin/subscriptions");

  if (input.previousCategory) {
    revalidatePath(`/categories/${encodeURIComponent(input.previousCategory)}`);
  }

  if (input.nextCategory) {
    revalidatePath(`/categories/${encodeURIComponent(input.nextCategory)}`);
  }

  for (const slug of input.postSlugs ?? []) {
    revalidatePath(`/blog/${slug}`);
  }
}

export async function renamePostCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const parsed = postCategoryRenameSchema.parse({
    previousCategory: getString(formData, "previousCategory"),
    nextCategory: getString(formData, "nextCategory"),
  });

  const previousCategory = parsed.previousCategory.trim();
  const nextCategory = parsed.nextCategory.trim();
  const previousNormalized = normalizeTaxonomyValue(previousCategory);
  const nextNormalized = normalizeTaxonomyValue(nextCategory);

  if (!previousNormalized || !nextNormalized) {
    redirectToAdminCategories("invalid");
  }

  if (previousCategory === nextCategory) {
    redirectToAdminCategories("unchanged");
  }

  const [matchedPosts, targetCategoryCount, subscribers] = await Promise.all([
    prisma.post.findMany({
      where: {
        category: {
          equals: previousCategory,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        authorId: true,
        category: true,
      },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    }),
    previousNormalized === nextNormalized
      ? Promise.resolve(0)
      : prisma.post.count({
          where: {
            category: {
              equals: nextCategory,
              mode: "insensitive",
            },
          },
        }),
    prisma.emailSubscriber.findMany({
      select: {
        id: true,
        categories: true,
      },
    }),
  ]);

  if (matchedPosts.length === 0) {
    redirectToAdminCategories("missing");
  }

  const mergeIntoExistingCategory = previousNormalized !== nextNormalized && targetCategoryCount > 0;
  const postSlugs = matchedPosts.map((post) => post.slug);

  const result = await prisma.$transaction(async (tx) => {
    for (const post of matchedPosts) {
      await tx.post.update({
        where: { id: post.id },
        data: {
          category: nextCategory,
        },
      });

      await snapshotPostRevision(tx, {
        postId: post.id,
        actorId: admin.id,
      });
    }

    let updatedSubscriberCount = 0;

    for (const subscriber of subscribers) {
      const currentCategories = dedupeTaxonomyValues(subscriber.categories);
      const nextCategories = dedupeTaxonomyValues(
        currentCategories.map((category) =>
          normalizeTaxonomyValue(category) === previousNormalized ? nextCategory : category,
        ),
      );

      const changed =
        currentCategories.length !== nextCategories.length ||
        currentCategories.some((category, index) => category !== nextCategories[index]);

      if (!changed) {
        continue;
      }

      await tx.emailSubscriber.update({
        where: { id: subscriber.id },
        data: {
          categories: nextCategories,
        },
      });

      updatedSubscriberCount += 1;
    }

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.POST_CATEGORY_RENAMED,
        summary: mergeIntoExistingCategory
          ? `已将文章分类“${matchedPosts[0]?.category ?? previousCategory}”合并到“${nextCategory}”。`
          : `已将文章分类“${matchedPosts[0]?.category ?? previousCategory}”重命名为“${nextCategory}”。`,
        actorId: admin.id,
        metadata: {
          previousCategory: matchedPosts[0]?.category ?? previousCategory,
          nextCategory,
          normalizedPreviousCategory: previousNormalized,
          normalizedNextCategory: nextNormalized,
          updatedPostCount: matchedPosts.length,
          updatedSubscriberCount,
          mergeIntoExistingCategory,
        },
      }),
    });

    return {
      updatedSubscriberCount,
    };
  });

  revalidatePostCategorySurfaces({
    previousCategory: matchedPosts[0]?.category ?? previousCategory,
    nextCategory,
    postSlugs,
  });

  redirectToAdminCategories(
    mergeIntoExistingCategory
      ? "merged"
      : result.updatedSubscriberCount > 0
        ? "updated-subscribers"
        : "updated",
  );
}
