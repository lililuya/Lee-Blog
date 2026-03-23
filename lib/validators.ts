import {
  CommentStatus,
  JournalStatus,
  PaperReadingStatus,
  PostStatus,
  ProviderAdapter,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { z } from "zod";

const urlField = z.union([z.string().url(), z.literal(""), z.null()]).optional();
const urlOrRootRelativeField = z
  .union([z.string().url(), z.string().regex(/^\/[^\s]*$/), z.literal(""), z.null()])
  .optional();
const requiredUrlOrRootRelativeField = z.union([
  z.string().url(),
  z.string().regex(/^\/[^\s]*$/),
]);
const passwordField = z.string().min(8).max(100);
const contentLanguageField = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, "Use a valid language code, such as en-US or zh-CN.");
const commentModerationRuleModeSchema = z.enum(["ALLOW", "BLOCK"]);
const commentModerationRuleSeveritySchema = z.enum(["REVIEW", "REJECT"]);

export const loginSchema = z.object({
  email: z.email(),
  password: passwordField,
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email(),
  password: passwordField,
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    password: passwordField,
    confirmPassword: passwordField,
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: passwordField,
    newPassword: passwordField,
    confirmPassword: passwordField,
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const twoFactorTokenSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6)
    .max(32)
    .regex(/^[A-Za-z0-9\s-]+$/, "Invalid authentication code."),
});

export const disableTwoFactorSchema = z.object({
  currentPassword: passwordField,
});

export const postSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().min(3).max(180),
  excerpt: z.string().trim().min(12).max(280),
  content: z.string().trim().min(32),
  category: z.string().trim().min(2).max(60),
  language: contentLanguageField,
  tags: z.array(z.string()).max(12),
  status: z.nativeEnum(PostStatus),
  pinned: z.boolean(),
  featured: z.boolean(),
  coverImageUrl: urlField,
  seriesId: z.union([z.string().trim().min(1), z.literal(""), z.null()]).optional(),
  seriesOrder: z.union([z.coerce.number().int().min(1).max(999), z.null()]).optional(),
  translationOfId: z.union([z.string().trim().min(1), z.literal(""), z.null()]).optional(),
  publishedAt: z.union([z.coerce.date(), z.null()]),
});

export const noteSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().min(3).max(180),
  summary: z.string().trim().min(12).max(280),
  content: z.string().trim().min(24),
  noteType: z.string().trim().min(2).max(60),
  tags: z.array(z.string()).max(12),
  status: z.nativeEnum(PostStatus),
  featured: z.boolean(),
  seriesId: z.union([z.string().trim().min(1), z.literal(""), z.null()]).optional(),
  seriesOrder: z.union([z.coerce.number().int().min(1).max(999), z.null()]).optional(),
  publishedAt: z.union([z.coerce.date(), z.null()]),
});

export const galleryImageSchema = z.object({
  imageUrl: requiredUrlOrRootRelativeField,
  thumbUrl: urlOrRootRelativeField,
  alt: z.string().trim(),
  caption: z.string().trim().optional(),
  width: z.union([z.coerce.number().int().min(1).max(12000), z.null()]).optional(),
  height: z.union([z.coerce.number().int().min(1).max(12000), z.null()]).optional(),
  shotAt: z.union([z.coerce.date(), z.null()]).optional(),
});

export const gallerySchema = z.object({
  title: z.string().trim(),
  slug: z.string().trim(),
  summary: z.string().trim(),
  description: z.string().trim(),
  coverImageUrl: urlOrRootRelativeField,
  tags: z.array(z.string()),
  status: z.nativeEnum(PostStatus),
  featured: z.boolean(),
  publishedAt: z.union([z.coerce.date(), z.null()]),
  images: z.array(galleryImageSchema).min(1, "At least one image is required."),
});

export const contentSeriesSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(12).max(320),
  description: z.string().trim().min(24),
  coverImageUrl: urlOrRootRelativeField,
  featured: z.boolean(),
});

export const journalSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().min(3).max(180),
  summary: z.string().trim().min(12).max(280),
  content: z.string().trim().min(24),
  mood: z.string().trim().max(60).optional(),
  status: z.nativeEnum(JournalStatus),
  publishedAt: z.coerce.date(),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(8).max(160),
  tagline: z.string().trim().min(12).max(220),
  shortBio: z.string().trim().min(24),
  longBio: z.string().trim().max(12000),
  institution: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  websiteUrl: urlField,
  githubUrl: urlField,
  linkedinUrl: urlField,
  scholarUrl: urlField,
  cvUrl: urlField,
  heroImageUrl: urlOrRootRelativeField,
  backgroundImageUrl: urlOrRootRelativeField,
  backgroundVideoUrl: urlOrRootRelativeField,
  backgroundMediaMode: z.enum(["IMAGE", "VIDEO"]),
  backgroundOverlayOpacity: z.coerce.number().int().min(0).max(100),
  assistantAvatarUrl: urlOrRootRelativeField,
  chatEnabledForReaders: z.boolean(),
  researchAreas: z.array(z.string()).max(12),
  educationMarkdown: z.string().trim().min(8),
  experienceMarkdown: z.string().trim().min(8),
  awardsMarkdown: z.string().trim().min(8),
  speakingMarkdown: z.string().trim().min(8),
});

export const commentSchema = z.object({
  postId: z.string().trim().min(1),
  parentId: z.string().trim().min(1).optional().nullable(),
  guestName: z.string().trim().max(60).optional(),
  guestEmail: z.union([z.email(), z.literal(""), z.null()]).optional(),
  content: z.string().trim().min(6).max(1200),
});

export const emailSubscriptionSchema = z.object({
  email: z.email(),
  name: z.string().trim().max(80).optional(),
  postNotificationsEnabled: z.boolean(),
  digestNotificationsEnabled: z.boolean(),
  categories: z.array(z.string().trim().min(1).max(60)).max(12),
  tags: z.array(z.string().trim().min(1).max(60)).max(20),
}).refine(
  (value) => value.postNotificationsEnabled || value.digestNotificationsEnabled,
  {
    path: ["postNotificationsEnabled"],
    message: "Select at least one email delivery type.",
  },
);

export const providerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80),
  adapter: z.nativeEnum(ProviderAdapter),
  baseUrl: z.string().url(),
  model: z.string().trim().min(2).max(120),
  apiKeyEnv: z.string().trim().min(3).max(80),
  systemPrompt: z.string().trim().max(4000).optional(),
  enabled: z.boolean(),
});

export const paperTopicSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional(),
  query: z.string().trim().min(3).max(500),
  maxResults: z.coerce.number().int().min(1).max(20),
  enabled: z.boolean(),
});

export const paperLibrarySaveSchema = z.object({
  arxivId: z.string().trim().min(3).max(80),
  title: z.string().trim().min(3).max(400),
  summary: z.string().trim().min(10).max(10000),
  authors: z.array(z.string().trim().min(1).max(120)).min(1).max(40),
  paperUrl: z.string().url(),
  pdfUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  primaryCategory: z.string().trim().max(80).optional(),
  topicName: z.string().trim().max(120).optional(),
  digestDate: z.union([z.coerce.date(), z.null()]).optional(),
  publishedAt: z.union([z.coerce.date(), z.null()]).optional(),
});

export const paperLibraryStatusSchema = z.object({
  libraryItemId: z.string().trim().min(1),
  status: z.nativeEnum(PaperReadingStatus),
});

export const paperLibraryProgressSchema = z.object({
  libraryItemId: z.string().trim().min(1),
  progressPercent: z.coerce.number().int().min(0).max(100),
});

export const paperAnnotationSchema = z.object({
  libraryItemId: z.string().trim().min(1),
  content: z.string().trim().min(2).max(3000),
  quote: z.string().trim().max(1200).optional(),
});

export const paperAnnotationDeleteSchema = z.object({
  annotationId: z.string().trim().min(1),
});

export const paperLibraryLifecycleSchema = z.object({
  libraryItemId: z.string().trim().min(1),
});

export const commentDecisionSchema = z.object({
  commentId: z.string().trim().min(1),
  status: z.nativeEnum(CommentStatus),
});

export const commentDeleteSchema = z.object({
  commentId: z.string().trim().min(1),
});

export const galleryDeleteSchema = z.object({
  galleryId: z.string().trim().min(1),
});

export const notificationActionSchema = z.object({
  notificationId: z.string().trim().min(1),
});

export const commentNotificationSettingsSchema = z.object({
  emailCommentNotifications: z.boolean(),
  inAppCommentNotifications: z.boolean(),
});

export const commentModerationRuleSchema = z.object({
  ruleId: z.string().trim().min(1).optional(),
  term: z.string().trim().min(1).max(120),
  mode: commentModerationRuleModeSchema,
  severity: commentModerationRuleSeveritySchema,
  enabled: z.boolean(),
  notes: z.string().trim().max(500).optional(),
});

export const commentModerationRuleDeleteSchema = z.object({
  ruleId: z.string().trim().min(1),
});

export const postRevisionRestoreSchema = z.object({
  postId: z.string().trim().min(1),
  revisionId: z.string().trim().min(1),
});

export const postCategoryRenameSchema = z.object({
  previousCategory: z.string().trim().min(2).max(60),
  nextCategory: z.string().trim().min(2).max(60),
});

export const noteRevisionRestoreSchema = z.object({
  noteId: z.string().trim().min(1),
  revisionId: z.string().trim().min(1),
});

export const digestSeriesAssignmentSchema = z.object({
  digestId: z.string().trim().min(1),
  seriesId: z.union([z.string().trim().min(1), z.literal(""), z.null()]).optional(),
  seriesOrder: z.union([z.coerce.number().int().min(1).max(999), z.null()]).optional(),
});

export const userMuteSchema = z.object({
  userId: z.string().trim().min(1),
  days: z.coerce.number().int().min(1).max(365),
  reason: z.string().trim().max(240).optional(),
});

export const userRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.nativeEnum(UserRole),
});

export const userStatusSchema = z.object({
  userId: z.string().trim().min(1),
  status: z.nativeEnum(UserStatus),
  reason: z.string().trim().max(240).optional(),
});

export const userLifecycleSchema = z.object({
  userId: z.string().trim().min(1),
  reason: z.string().trim().max(240).optional(),
});
