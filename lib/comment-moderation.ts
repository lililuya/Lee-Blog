import "server-only";

import {
  CommentModerationRuleMode,
  CommentModerationRuleSeverity,
  CommentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

type ModerationCategory = "spam" | "adult" | "violence";

type RuntimeModerationRule = {
  term: string;
  normalizedTerm: string;
  compactTerm: string;
  mode: CommentModerationRuleMode;
  severity: CommentModerationRuleSeverity;
  label: string;
  source: "builtin" | "custom";
};

export type CommentModerationResult = {
  status: CommentStatus;
  notes: string | null;
  matches: string[];
};

const CURATED_COMMENT_LEXICON: Record<ModerationCategory, readonly string[]> = {
  spam: [
    "\u8d27\u5230\u4ed8\u6b3e",
    "\u70b9\u51fb\u8fdb\u5165",
    "\u8be6\u60c5\u8bf7\u8fdb\u5165",
    "\u56de\u590d\u53ef\u89c1",
    "\u52a0\u5fae\u4fe1",
    "\u5fae\u4fe1\u53f7",
    "\u52a0\u0071\u0071",
    "\u0071\u0071\u8054\u7cfb",
    "\u9500\u552e\u70ed\u7ebf",
    "\u514d\u8d39\u9886\u53d6",
    "\u514d\u8d39\u7d22\u53d6",
    "\u5e7f\u544a\u4ee3\u7406",
    "\u4ee3\u5f00\u53d1\u7968",
    "\u65e0\u62b5\u62bc\u8d37\u6b3e",
    "\u4fe1\u7528\u5361\u63d0\u73b0",
    "\u52a0\u76df\u8fde\u9501",
    "\u79c1\u4eba\u4fa6\u63a2",
    "\u4ee3\u5b55\u5988\u5988",
  ],
  adult: [
    "\u6210\u4eba\u7535\u5f71",
    "\u6210\u4eba\u7f51\u7ad9",
    "\u8272\u60c5\u7247",
    "\u8272\u60c5\u670d\u52a1",
    "\u8272\u60c5\u7f51\u7ad9",
    "\u53e3\u4ea4",
    "\u809b\u4ea4",
    "\u4e73\u4ea4",
    "\u989c\u5c04",
    "\u8ff7\u5978",
    "\u8f6e\u5978",
    "\u4e71\u4f26",
    "\u5e7c\u4ea4",
    "\u5e7c\u5973",
    "\u63f4\u4ea4",
    "\u63f4\u52a9\u4ea4\u9645",
    "\u81ea\u6170",
    "\u5168\u88f8",
    "\u7206\u4e73",
    "\u53e3\u7206",
    "\u62db\u5993",
    "\u6027\u7231",
    "\u6027\u4ea4",
    "\u7ea6\u70ae",
  ],
  violence: [
    "\u70b8\u5f39\u5236\u4f5c",
    "\u70b8\u836f\u914d\u65b9",
    "\u81ea\u5236\u70b8\u836f",
    "\u71c3\u70e7\u5f39",
    "\u8d77\u7206\u5668",
    "\u96f7\u7ba1\u51fa\u552e",
    "\u51fa\u552e\u96f7\u7ba1",
    "\u539f\u5b50\u5f39\u5236\u4f5c",
    "\u6838\u5f39\u5236\u4f5c",
    "\u51fa\u552e\u624b\u67aa",
    "\u51fa\u552e\u730e\u67aa",
    "\u51fa\u552e\u6c14\u67aa",
    "\u67aa\u652f\u51fa\u552e",
    "\u67aa\u652f\u4e70\u5356",
    "\u5b50\u5f39\u8d27\u5230\u4ed8\u6b3e",
    "\u5f13\u5f29\u4e13\u5356",
    "\u519b\u5200\u4e13\u5356",
    "\u51fa\u552e\u519b\u5200",
    "\u51fa\u552e\u519b\u523a",
    "\u51fa\u552e\u5f39\u7c27\u5200",
    "\u51fa\u552e\u4e09\u68f1\u5200",
    "\u9632\u536b\u7535\u68cd\u51fa\u552e",
  ],
};

const CATEGORY_LABELS: Record<ModerationCategory, string> = {
  spam: "spam or solicitation",
  adult: "sexual content",
  violence: "weapons or explosive content",
};

const MAX_MATCHES = 8;

function normalizeValue(value: string) {
  return value.normalize("NFKC").toLowerCase().trim();
}

function compactValue(value: string) {
  return normalizeValue(value).replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function normalizeCommentModerationTerm(term: string) {
  return normalizeValue(term).replace(/\s+/g, " ");
}

function buildBuiltinRules(): RuntimeModerationRule[] {
  return Object.entries(CURATED_COMMENT_LEXICON).flatMap(([category, terms]) =>
    terms.map((term) => ({
      term,
      normalizedTerm: normalizeCommentModerationTerm(term),
      compactTerm: compactValue(term),
      mode: CommentModerationRuleMode.BLOCK,
      severity: CommentModerationRuleSeverity.REVIEW,
      label: CATEGORY_LABELS[category as ModerationCategory],
      source: "builtin" as const,
    })),
  );
}

async function loadRuntimeRules() {
  const builtinRules = buildBuiltinRules();

  if (!isDatabaseConfigured()) {
    return builtinRules;
  }

  const customRules = await prisma.commentModerationRule.findMany({
    where: { enabled: true },
    select: {
      term: true,
      normalizedTerm: true,
      mode: true,
      severity: true,
    },
    orderBy: [{ mode: "asc" }, { severity: "desc" }, { term: "asc" }],
  });

  return [
    ...builtinRules,
    ...customRules.map((rule) => ({
      term: rule.term,
      normalizedTerm: rule.normalizedTerm,
      compactTerm: compactValue(rule.term),
      mode: rule.mode,
      severity: rule.severity,
      label: "custom moderation rule",
      source: "custom" as const,
    })),
  ];
}

function matchesRule(
  rule: RuntimeModerationRule,
  normalizedContent: string,
  compactContent: string,
) {
  return (
    normalizedContent.includes(rule.normalizedTerm) ||
    compactContent.includes(rule.compactTerm)
  );
}

export async function evaluateCommentModeration(content: string): Promise<CommentModerationResult> {
  const normalizedContent = normalizeValue(content);
  const compactContent = compactValue(content);
  const rules = await loadRuntimeRules();

  const allowMatches = rules.filter(
    (rule) =>
      rule.mode === CommentModerationRuleMode.ALLOW &&
      matchesRule(rule, normalizedContent, compactContent),
  );
  const allowKeys = new Set(
    allowMatches.flatMap((rule) => [rule.normalizedTerm, rule.compactTerm]).filter(Boolean),
  );

  const blockedMatches = rules.filter((rule) => {
    if (rule.mode !== CommentModerationRuleMode.BLOCK) {
      return false;
    }

    if (!matchesRule(rule, normalizedContent, compactContent)) {
      return false;
    }

    if (allowKeys.has(rule.normalizedTerm) || allowKeys.has(rule.compactTerm)) {
      return false;
    }

    return true;
  });

  const dedupedMatches = blockedMatches.filter((rule, index, collection) => {
    return (
      collection.findIndex(
        (candidate) =>
          candidate.mode === rule.mode &&
          candidate.term === rule.term &&
          candidate.source === rule.source,
      ) === index
    );
  });

  if (dedupedMatches.length === 0) {
    return {
      status: CommentStatus.APPROVED,
      notes: allowMatches.length > 0 ? "Matched approved moderation exceptions." : null,
      matches: [],
    };
  }

  const highestSeverity = dedupedMatches.some(
    (rule) => rule.severity === CommentModerationRuleSeverity.REJECT,
  )
    ? CommentStatus.REJECTED
    : CommentStatus.PENDING;
  const categories = Array.from(new Set(dedupedMatches.map((match) => match.label)));
  const matchedTerms = dedupedMatches.slice(0, MAX_MATCHES).map((match) => match.term);
  const actionMessage =
    highestSeverity === CommentStatus.REJECTED
      ? "Auto-rejected"
      : "Auto-held for moderator review";

  return {
    status: highestSeverity,
    notes: `${actionMessage} after matching ${categories.join(", ")} keywords.`,
    matches: matchedTerms,
  };
}
