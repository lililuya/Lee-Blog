import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "@prisma/client";
import {
  CommentStatus,
  JournalStatus,
  PostStatus,
  PrismaClient,
  ProviderAdapter,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { Pool } from "pg";
import { hash } from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for seeding.");
}

const DEMO_MODE = process.argv.includes("--demo");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

type SeedAdmin = {
  id: string;
  name: string;
  email: string;
};

function buildDefaultSiteProfile(adminName: string, adminEmail: string): Prisma.SiteProfileCreateInput {
  const ownerName = adminName === "Site Admin" ? "Site Owner" : adminName;

  return {
    id: "main",
    fullName: ownerName,
    headline: `${ownerName} research notes and writing space`,
    tagline: "A personal publishing system for essays, notes, research logs, and AI-assisted workflows.",
    shortBio:
      "This site has been bootstrapped and is ready for your profile, writing, and research workflow.",
    longBio:
      "Update this profile from the admin workspace when you are ready. The bootstrap step intentionally creates a minimal safe default and leaves existing profile data untouched.",
    email: adminEmail,
    chatEnabledForReaders: false,
    researchAreas: ["Applied AI", "Research workflows"],
    educationMarkdown: "",
    experienceMarkdown: "",
    awardsMarkdown: "",
    speakingMarkdown: "",
  };
}

async function ensureAdmin(): Promise<SeedAdmin> {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.ADMIN_NAME ?? "Site Admin";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      emailVerificationRequired: true,
      deletedAt: true,
    },
  });

  if (existingAdmin) {
    const needsAccessRepair =
      existingAdmin.role !== UserRole.ADMIN ||
      existingAdmin.status !== UserStatus.ACTIVE ||
      existingAdmin.emailVerificationRequired ||
      existingAdmin.deletedAt !== null ||
      !existingAdmin.emailVerifiedAt;

    if (!needsAccessRepair) {
      console.log(`[seed] Admin ${adminEmail} already exists. Leaving profile and password unchanged.`);
      return existingAdmin;
    }

    console.log(`[seed] Repairing access flags for existing admin ${adminEmail}.`);
    return prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: existingAdmin.emailVerifiedAt ?? new Date(),
        emailVerificationRequired: false,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  console.log(`[seed] Creating missing admin ${adminEmail}.`);
  return prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      emailVerificationRequired: false,
      emailPostNotifications: false,
      emailCommentNotifications: true,
      inAppCommentNotifications: true,
      passwordHash: await hash(adminPassword, 12),
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

async function ensureSiteProfile(admin: SeedAdmin) {
  const existingProfile = await prisma.siteProfile.findUnique({
    where: { id: "main" },
    select: { id: true },
  });

  if (existingProfile) {
    console.log("[seed] Site profile already exists. Leaving it unchanged.");
    return;
  }

  console.log("[seed] Creating minimal site profile.");
  await prisma.siteProfile.create({
    data: buildDefaultSiteProfile(admin.name, admin.email),
  });
}

async function seedDemoPosts(admin: SeedAdmin) {
  const firstPost = await prisma.post.upsert({
    where: { slug: "from-notes-to-production-ai-workflows" },
    update: {},
    create: {
      title: "From Notes to Production: Designing AI Workflows That People Trust",
      slug: "from-notes-to-production-ai-workflows",
      excerpt:
        "A practical blueprint for turning exploratory prompting experiments into workflows that teams actually adopt.",
      content:
        "## Why trust matters\n\nThe most useful AI systems are inspectable systems. People adopt them when they can see the intermediate state, understand the handoff, and intervene before something expensive happens.\n\n## A helpful default loop\n\n1. Start with a narrow workflow.\n2. Make every intermediate step visible.\n3. Keep a human checkpoint before costly actions.\n4. Measure where failures cluster before scaling usage.\n\n## Why this blog is built this way\n\nThis project treats publishing, moderation, deployment, and future tool-building as one product surface.",
      category: "AI Engineering",
      tags: ["AI", "Workflow", "Reliability"],
      status: PostStatus.PUBLISHED,
      pinned: false,
      featured: true,
      readTimeMinutes: 6,
      publishedAt: new Date("2026-03-01T08:30:00.000Z"),
      authorId: admin.id,
    },
  });

  await prisma.post.upsert({
    where: { slug: "building-a-personal-academic-blog-as-a-product" },
    update: {},
    create: {
      title: "Building a Personal Academic Blog as a Product, Not a Portfolio",
      slug: "building-a-personal-academic-blog-as-a-product",
      excerpt:
        "Treating a personal site like a product leads to better information architecture, safer deployment, and reusable tooling.",
      content:
        "## Reframing the site\n\nA serious personal site should support writing, editing, moderation, deployment, and future experiments.\n\n## What matters most\n\n- Clear information architecture\n- Admin workflows you can maintain yourself\n- CI/CD that guards quality\n- Room for future AI tools\n- A weekly digest and search layer that make the site easier to use over time",
      category: "Engineering Practice",
      tags: ["Blog", "Architecture", "Product"],
      status: PostStatus.PUBLISHED,
      pinned: true,
      featured: false,
      readTimeMinutes: 5,
      publishedAt: new Date("2026-03-07T09:00:00.000Z"),
      authorId: admin.id,
    },
  });

  await prisma.post.upsert({
    where: { slug: "making-internal-ai-tools-legible" },
    update: {},
    create: {
      title: "Making Internal AI Tools Legible to the Teams Who Use Them",
      slug: "making-internal-ai-tools-legible",
      excerpt:
        "Transparent states, sensible checkpoints, and audit-friendly outputs help internal AI tools earn real trust from the people using them every day.",
      content:
        "## Legibility matters\n\nInternal AI tools fail when only their builders understand how they work. Teams trust systems that expose enough state to inspect decisions, validate source material, and recover from drift.\n\n## Practical ways to make systems legible\n\n- Show the retrieved evidence before a final answer.\n- Keep explicit handoff checkpoints in high-cost workflows.\n- Record enough operational detail for debugging and review.\n\n## Why this improves adoption\n\nTrust grows when systems can be questioned. That makes transparency a product feature, not just an engineering nicety.",
      category: "AI Engineering",
      tags: ["AI", "Reliability", "Operations"],
      status: PostStatus.PUBLISHED,
      pinned: false,
      featured: false,
      readTimeMinutes: 4,
      publishedAt: new Date("2026-03-12T07:45:00.000Z"),
      authorId: admin.id,
    },
  });

  const existingCommentCount = await prisma.comment.count({
    where: { postId: firstPost.id },
  });

  if (existingCommentCount === 0) {
    const seededTopLevelComment = await prisma.comment.create({
      data: {
        postId: firstPost.id,
        guestName: "Li Wen",
        guestEmail: "2643233154@qq.com",
        status: CommentStatus.APPROVED,
        content:
          "Seeing the intermediate state makes AI workflows easier to inspect, debug, and trust instead of feeling like a black box.",
      },
    });

    await prisma.comment.create({
      data: {
        postId: firstPost.id,
        authorId: admin.id,
        parentId: seededTopLevelComment.id,
        status: CommentStatus.APPROVED,
        content:
          "Exactly. Every future tool on the site should expose enough context for readers to verify the workflow end to end.",
      },
    });
  } else {
    console.log("[seed] Demo post already has comments. Skipping sample comment insertion.");
  }
}

async function seedDemoNotes(admin: SeedAdmin) {
  await prisma.note.upsert({
    where: { slug: "rag-evaluation-checklist" },
    update: {},
    create: {
      title: "RAG Evaluation Checklist for Small Research Teams",
      slug: "rag-evaluation-checklist",
      summary:
        "A compact note for checking retrieval quality, answer grounding, and review loops before shipping a RAG feature.",
      content:
        "## Why this note exists\n\nRAG systems often fail quietly. A short checklist helps catch brittle retrieval, unsupported claims, and evaluation gaps before they reach users.\n\n## Core checks\n\n1. Verify top-k retrieval quality with representative queries.\n2. Inspect whether answers cite or clearly rely on retrieved evidence.\n3. Separate retrieval failure from generation failure in evaluation logs.\n4. Keep a small human review set for recurring edge cases.\n\n## A practical default\n\n- Track queries that retrieved nothing useful.\n- Save examples of unsupported answers.\n- Review retrieval and answer quality together, not in isolation.",
      noteType: "Checklist",
      tags: ["RAG", "Evaluation", "Checklist"],
      status: PostStatus.PUBLISHED,
      featured: true,
      publishedAt: new Date("2026-03-05T09:30:00.000Z"),
      authorId: admin.id,
    },
  });

  await prisma.note.upsert({
    where: { slug: "prompt-scaffolding-show-intermediate-state" },
    update: {},
    create: {
      title: "Prompt Scaffolding Pattern: Show Intermediate State",
      slug: "prompt-scaffolding-show-intermediate-state",
      summary:
        "A reusable prompt pattern for making multi-step LLM workflows more inspectable and easier to debug.",
      content:
        "## Pattern\n\nAsk the model to expose task understanding, intermediate assumptions, and the final answer in clearly separated sections.\n\n## Why it helps\n\n- Makes handoff points visible.\n- Helps users correct course earlier.\n- Reduces the feeling of opaque, magical behavior.\n\n## When to use it\n\nUse this in research assistants, drafting tools, and any workflow where a human may want to verify reasoning inputs before acting.",
      noteType: "Method Note",
      tags: ["Prompting", "Workflow", "LLM"],
      status: PostStatus.PUBLISHED,
      featured: false,
      publishedAt: new Date("2026-03-09T11:00:00.000Z"),
      authorId: admin.id,
    },
  });
}

async function seedDemoJournal() {
  await prisma.journalEntry.upsert({
    where: { slug: "launch-week-system-setup" },
    update: {},
    create: {
      title: "Launch Week: System Setup and Writing Pipeline",
      slug: "launch-week-system-setup",
      summary:
        "The first week focused on deployment conventions, editor ergonomics, and a sustainable publishing loop.",
      content:
        "The core objective was to create a publishing system that feels more like a working lab notebook than a portfolio page.",
      mood: "focused",
      status: JournalStatus.PUBLISHED,
      publishedAt: new Date("2026-03-08T12:00:00.000Z"),
    },
  });

  await prisma.journalEntry.upsert({
    where: { slug: "thinking-about-tool-modules" },
    update: {},
    create: {
      title: "Thinking About the Future Tool Module",
      slug: "thinking-about-tool-modules",
      summary:
        "The tool area stays intentionally sparse at first so every future AI service has a clear job and owner.",
      content:
        "The future tools section will expand gradually into dependable utilities rather than a grab bag of disconnected demos.",
      mood: "curious",
      status: JournalStatus.PUBLISHED,
      publishedAt: new Date("2026-03-10T10:30:00.000Z"),
    },
  });
}

async function seedDemoProviders() {
  await prisma.llmProvider.upsert({
    where: { slug: "openai-gpt" },
    update: {},
    create: {
      name: "OpenAI GPT",
      slug: "openai-gpt",
      adapter: ProviderAdapter.OPENAI_COMPATIBLE,
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKeyEnv: "OPENAI_API_KEY",
      systemPrompt: "You are a concise and thoughtful site assistant.",
      enabled: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
  });

  await prisma.llmProvider.upsert({
    where: { slug: "deepseek-chat" },
    update: {},
    create: {
      name: "DeepSeek Chat",
      slug: "deepseek-chat",
      adapter: ProviderAdapter.OPENAI_COMPATIBLE,
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      systemPrompt: "You are a calm, thoughtful assistant embedded in a technical personal website.",
      enabled: Boolean(process.env.DEEPSEEK_API_KEY?.trim()),
    },
  });
}

async function seedDemoPaperTopics() {
  await prisma.paperTopic.upsert({
    where: { slug: "llm-agents" },
    update: {},
    create: {
      name: "LLM Agents",
      slug: "llm-agents",
      description: "Track new agent systems and tool-using LLM workflows from arXiv.",
      query: 'all:"llm agent" OR all:"language agent"',
      maxResults: 5,
      enabled: true,
    },
  });

  await prisma.paperTopic.upsert({
    where: { slug: "rag-systems" },
    update: {},
    create: {
      name: "RAG Systems",
      slug: "rag-systems",
      description: "Monitor retrieval-augmented generation and knowledge-intensive LLM papers.",
      query: 'all:"retrieval augmented generation" OR all:RAG',
      maxResults: 5,
      enabled: true,
    },
  });
}

async function seedDemoWeeklyDigest() {
  await prisma.weeklyDigest.upsert({
    where: { slug: "weekly-digest-2026-03-03-to-2026-03-09" },
    update: {},
    create: {
      title: "Weekly Research Digest | 2026/03/03 - 2026/03/09",
      slug: "weekly-digest-2026-03-03-to-2026-03-09",
      summary:
        "A concise review of the first complete week of papers, journal entries, evergreen notes, and published writing on the site.",
      content:
        "## Week in review\n\n- Finished the site's core publishing and moderation architecture.\n- Captured two journal updates about deployment setup and workflow structure.\n- Published a long-form post about treating a personal academic blog like a product.\n- Added an evergreen note workflow so shorter insights can accumulate instead of getting lost.\n\n## Output\n\n- [Building a Personal Academic Blog as a Product, Not a Portfolio](/blog/building-a-personal-academic-blog-as-a-product)\n- [RAG Evaluation Checklist for Small Research Teams](/notes/rag-evaluation-checklist)\n\n## Suggested next steps\n\n- Keep linking papers, notes, and long-form writing more intentionally.\n- Let journal observations graduate into evergreen notes or essays when they become stable.",
      highlights: [
        "Recorded two journal updates to preserve the building process.",
        "Published one long-form article that anchors the site's product philosophy.",
        "Added reusable notes so smaller insights can become long-term knowledge assets.",
      ],
      featuredTopics: ["Blog Architecture", "Knowledge Workflow"],
      paperCount: 0,
      journalCount: 2,
      postCount: 1,
      periodStart: new Date("2026-03-02T16:00:00.000Z"),
      periodEnd: new Date("2026-03-09T15:59:59.999Z"),
      publishedAt: new Date("2026-03-10T00:30:00.000Z"),
    },
  });
}

async function seedDemoContent(admin: SeedAdmin) {
  console.log("[seed] Demo mode enabled. Adding demo content without overwriting existing records.");

  await seedDemoPosts(admin);
  await seedDemoNotes(admin);
  await seedDemoJournal();
  await seedDemoProviders();
  await seedDemoPaperTopics();
  await seedDemoWeeklyDigest();
}

async function main() {
  console.log(`[seed] Starting ${DEMO_MODE ? "demo seed" : "safe bootstrap"} run.`);

  const admin = await ensureAdmin();
  await ensureSiteProfile(admin);

  if (DEMO_MODE) {
    await seedDemoContent(admin);
  } else {
    console.log("[seed] Safe bootstrap complete. Demo content was not inserted.");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
