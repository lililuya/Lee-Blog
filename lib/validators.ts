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

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email(),
  password: z.string().min(8).max(100),
});

export const postSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().min(3).max(180),
  excerpt: z.string().trim().min(12).max(280),
  content: z.string().trim().min(32),
  category: z.string().trim().min(2).max(60),
  tags: z.array(z.string()).max(12),
  status: z.nativeEnum(PostStatus),
  featured: z.boolean(),
  coverImageUrl: urlField,
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
  publishedAt: z.union([z.coerce.date(), z.null()]),
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
  longBio: z.string().trim().min(60),
  institution: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  websiteUrl: urlField,
  githubUrl: urlField,
  linkedinUrl: urlField,
  scholarUrl: urlField,
  cvUrl: urlField,
  heroImageUrl: urlField,
  researchAreas: z.array(z.string()).max(12),
  educationMarkdown: z.string().trim().min(8),
  experienceMarkdown: z.string().trim().min(8),
  awardsMarkdown: z.string().trim().min(8),
  speakingMarkdown: z.string().trim().min(8),
});

export const commentSchema = z.object({
  postId: z.string().trim().min(1),
  content: z.string().trim().min(6).max(1200),
});

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
});

export const paperLibraryStatusSchema = z.object({
  libraryItemId: z.string().trim().min(1),
  status: z.nativeEnum(PaperReadingStatus),
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
