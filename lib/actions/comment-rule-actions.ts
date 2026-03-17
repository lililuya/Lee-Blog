"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_AUDIT_ACTIONS, buildAdminAuditLogData } from "@/lib/audit";
import { normalizeCommentModerationTerm } from "@/lib/comment-moderation";
import { prisma } from "@/lib/prisma";
import {
  commentModerationRuleDeleteSchema,
  commentModerationRuleSchema,
} from "@/lib/validators";
import { isDatabaseConfigured } from "@/lib/utils";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

function redirectToCommentRules(code: string): never {
  redirect(`/admin/comments/rules?state=${encodeURIComponent(code)}`);
}

export async function saveCommentModerationRuleAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const parsed = commentModerationRuleSchema.parse({
    ruleId: getString(formData, "ruleId") || undefined,
    term: getString(formData, "term"),
    mode: getString(formData, "mode"),
    severity: getString(formData, "severity"),
    enabled: getBoolean(formData, "enabled"),
    notes: getString(formData, "notes") || undefined,
  });

  const normalizedTerm = normalizeCommentModerationTerm(parsed.term);

  if (!normalizedTerm) {
    redirectToCommentRules("invalid");
  }

  try {
    const rule = parsed.ruleId
      ? await prisma.commentModerationRule.update({
          where: { id: parsed.ruleId },
          data: {
            term: parsed.term,
            normalizedTerm,
            mode: parsed.mode,
            severity: parsed.severity,
            enabled: parsed.enabled,
            notes: parsed.notes?.trim() || null,
          },
        })
      : await prisma.commentModerationRule.create({
          data: {
            term: parsed.term,
            normalizedTerm,
            mode: parsed.mode,
            severity: parsed.severity,
            enabled: parsed.enabled,
            notes: parsed.notes?.trim() || null,
            createdById: admin.id,
          },
        });

    await prisma.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.COMMENT_RULE_SAVED,
        summary: `${parsed.ruleId ? "Updated" : "Created"} comment moderation rule "${rule.term}".`,
        actorId: admin.id,
        metadata: {
          ruleId: rule.id,
          term: rule.term,
          normalizedTerm: rule.normalizedTerm,
          mode: rule.mode,
          severity: rule.severity,
          enabled: rule.enabled,
        },
      }),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectToCommentRules("duplicate");
    }

    throw error;
  }

  revalidatePath("/admin/comments");
  revalidatePath("/admin/comments/rules");
  revalidatePath("/admin/audit");
  redirectToCommentRules(parsed.ruleId ? "updated" : "created");
}

export async function deleteCommentModerationRuleAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const parsed = commentModerationRuleDeleteSchema.parse({
    ruleId: getString(formData, "ruleId"),
  });

  const existingRule = await prisma.commentModerationRule.findUnique({
    where: { id: parsed.ruleId },
  });

  if (!existingRule) {
    redirectToCommentRules("missing");
  }

  await prisma.$transaction(async (tx) => {
    await tx.commentModerationRule.delete({
      where: { id: parsed.ruleId },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.COMMENT_RULE_DELETED,
        summary: `Deleted comment moderation rule "${existingRule.term}".`,
        actorId: admin.id,
        metadata: {
          ruleId: existingRule.id,
          term: existingRule.term,
          normalizedTerm: existingRule.normalizedTerm,
          mode: existingRule.mode,
          severity: existingRule.severity,
        },
      }),
    });
  });

  revalidatePath("/admin/comments");
  revalidatePath("/admin/comments/rules");
  revalidatePath("/admin/audit");
  redirectToCommentRules("deleted");
}
