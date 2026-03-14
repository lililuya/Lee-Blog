import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ProviderAdapter, UserRole, UserStatus } from "@prisma/client";
import { Pool } from "pg";
import { hash } from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for seeding.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.ADMIN_NAME ?? "Site Admin";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      mutedUntil: null,
      muteReason: null,
      statusReason: null,
      deletedAt: null,
      passwordHash: await hash(adminPassword, 12),
    },
    create: {
      name: adminName,
      email: adminEmail,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: await hash(adminPassword, 12),
    },
  });

  const reader = await prisma.user.upsert({
    where: { email: "2643233154@qq.com" },
    update: {
      name: "读者评论",
      status: UserStatus.ACTIVE,
      mutedUntil: null,
      muteReason: null,
      statusReason: null,
      deletedAt: null,
      passwordHash: await hash("ReaderDemo123!", 12),
    },
    create: {
      name: "读者评论",
      email: "2643233154@qq.com",
      role: UserRole.READER,
      status: UserStatus.ACTIVE,
      passwordHash: await hash("ReaderDemo123!", 12),
    },
  });

  await prisma.siteProfile.upsert({
    where: { id: "main" },
    update: {
      fullName: "Mark Lee",
      headline: "大家好，我是Lee",
      tagline:
        "不积跬步无以至千里，不积小流无以成江河",
      shortBio:
        "大家好，我是Lee，一名对技术充满热情的探索者。我的研究方向主要集中在计算机视觉和大模型部署，喜欢深入挖掘算法的潜力，并探索如何将前沿的AI模型高效地落地到实际应用中。除了工作，我也是个游戏爱好者，喜欢在虚拟世界中体验不同的冒险；同时音乐也是我生活中不可或缺的部分，无论是放松还是激发灵感，耳机里总少不了旋律的陪伴。期待与志同道合的朋友交流分享！",
      longBio:
        "",
      institution: "Independent Research Lab",
      department: "Applied AI Systems",
      location: "Shanghai / Remote",
      email: "2643233154@qq.com",
      websiteUrl: "https://example.com",
      githubUrl: "https://github.com/lililuya",
      linkedinUrl: "https://linkedin.com/in/LiHua",
      scholarUrl: "https://scholar.google.com",
      cvUrl: "https://example.com/cv.pdf",
      heroImageUrl: "",
      researchAreas: [
        "LLM applications",
        "Knowledge workflows",
        "Human-in-the-loop systems",
        "Digital Human",
        "Computer Vision",
        "Face Recognition"
      ],
      educationMarkdown:
        "- Ph.D. candidate in Computer Science\n- M.Eng. in Software Engineering\n- B.Eng. in Information Engineering",
      experienceMarkdown:
        "- Research engineer building internal AI assistants\n- Product-minded platform engineer for content and publishing systems\n- Mentor for junior engineers on practical software delivery",
      awardsMarkdown:
        "- Open-source maintainer for workflow tooling\n- Internal innovation recognition for AI infrastructure delivery\n- Regular speaker on applied LLM systems",
      speakingMarkdown:
        "- Talks on applied LLM products\n- Workshops on evaluation loops\n- Sessions on building reliable internal AI tooling",
    },
    create: {
      id: "main",
      fullName: "Mark Lee",
      headline: "大家好，我是Lee",
      tagline:
        "A personal academic-style blog that blends essays, evergreen notes, journals, weekly digests, and future AI tools.",
      shortBio:
        "大家好，我是Lee，一名对技术充满热情的探索者。我的研究方向主要集中在计算机视觉和大模型部署，喜欢深入挖掘算法的潜力，并探索如何将前沿的AI模型高效地落地到实际应用中。除了工作，我也是个游戏爱好者，喜欢在虚拟世界中体验不同的冒险；同时音乐也是我生活中不可或缺的部分，无论是放松还是激发灵感，耳机里总少不了旋律的陪伴。期待与志同道合的朋友交流分享！",
      longBio:
        "The project is intentionally built like a product rather than a simple homepage: content publishing, moderation, CI/CD, deployment, search, weekly digests, and extensibility are all first-class concerns. It is a strong base for long-form writing, journals, paper tracking, evergreen notes, and later AI service modules.",
      institution: "Independent Research Lab",
      department: "Applied AI Systems",
      location: "Shanghai / Remote",
      email: "hello@example.com",
      websiteUrl: "https://example.com",
      githubUrl: "https://github.com/example",
      linkedinUrl: "https://linkedin.com/in/example",
      scholarUrl: "https://scholar.google.com",
      cvUrl: "https://example.com/cv.pdf",
      heroImageUrl: "",
      researchAreas: [
        "LLM applications",
        "Knowledge workflows",
        "Human-in-the-loop systems",
        "Evaluation and reliability",
      ],
      educationMarkdown:
        "- Ph.D. candidate in Computer Science\n- M.Eng. in Software Engineering\n- B.Eng. in Information Engineering",
      experienceMarkdown:
        "- Research engineer building internal AI assistants\n- Product-minded platform engineer for content and publishing systems\n- Mentor for junior engineers on practical software delivery",
      awardsMarkdown:
        "- Open-source maintainer for workflow tooling\n- Internal innovation recognition for AI infrastructure delivery\n- Regular speaker on applied LLM systems",
      speakingMarkdown:
        "- Talks on applied LLM products\n- Workshops on evaluation loops\n- Sessions on building reliable internal AI tooling",
    },
  });

  const firstPost = await prisma.post.upsert({
    where: { slug: "from-notes-to-production-ai-workflows" },
    update: {
      title: "From Notes to Production: Designing AI Workflows That People Trust",
      excerpt:
        "A practical blueprint for turning exploratory prompting experiments into workflows that teams actually adopt.",
      content:
        "## Why trust matters\n\nThe most useful AI systems are inspectable systems. People adopt them when they can see the intermediate state, understand the handoff, and intervene before something expensive happens.\n\n## A helpful default loop\n\n1. Start with a narrow workflow.\n2. Make every intermediate step visible.\n3. Keep a human checkpoint before costly actions.\n4. Measure where failures cluster before scaling usage.\n\n## Why this blog is built this way\n\nThis project treats publishing, moderation, deployment, and future tool-building as one product surface.",
      category: "AI Engineering",
      tags: ["AI", "Workflow", "Reliability"],
      status: "PUBLISHED",
      featured: true,
      readTimeMinutes: 6,
      publishedAt: new Date("2026-03-01T08:30:00.000Z"),
      authorId: admin.id,
    },
    create: {
      title: "From Notes to Production: Designing AI Workflows That People Trust",
      slug: "from-notes-to-production-ai-workflows",
      excerpt:
        "A practical blueprint for turning exploratory prompting experiments into workflows that teams actually adopt.",
      content:
        "## Why trust matters\n\nThe most useful AI systems are inspectable systems. People adopt them when they can see the intermediate state, understand the handoff, and intervene before something expensive happens.\n\n## A helpful default loop\n\n1. Start with a narrow workflow.\n2. Make every intermediate step visible.\n3. Keep a human checkpoint before costly actions.\n4. Measure where failures cluster before scaling usage.\n\n## Why this blog is built this way\n\nThis project treats publishing, moderation, deployment, and future tool-building as one product surface.",
      category: "AI Engineering",
      tags: ["AI", "Workflow", "Reliability"],
      status: "PUBLISHED",
      featured: true,
      readTimeMinutes: 6,
      publishedAt: new Date("2026-03-01T08:30:00.000Z"),
      authorId: admin.id,
    },
  });

  await prisma.post.upsert({
    where: { slug: "building-a-personal-academic-blog-as-a-product" },
    update: {
      title: "Building a Personal Academic Blog as a Product, Not a Portfolio",
      excerpt:
        "Treating a personal site like a product leads to better information architecture, safer deployment, and reusable tooling.",
      content:
        "## Reframing the site\n\nA serious personal site should support writing, editing, moderation, deployment, and future experiments.\n\n## What matters most\n\n- Clear information architecture\n- Admin workflows you can maintain yourself\n- CI/CD that guards quality\n- Room for future AI tools\n- A weekly digest and search layer that make the site easier to use over time",
      category: "Engineering Practice",
      tags: ["Blog", "Architecture", "Product"],
      status: "PUBLISHED",
      featured: false,
      readTimeMinutes: 5,
      publishedAt: new Date("2026-03-07T09:00:00.000Z"),
      authorId: admin.id,
    },
    create: {
      title: "Building a Personal Academic Blog as a Product, Not a Portfolio",
      slug: "building-a-personal-academic-blog-as-a-product",
      excerpt:
        "Treating a personal site like a product leads to better information architecture, safer deployment, and reusable tooling.",
      content:
        "## Reframing the site\n\nA serious personal site should support writing, editing, moderation, deployment, and future experiments.\n\n## What matters most\n\n- Clear information architecture\n- Admin workflows you can maintain yourself\n- CI/CD that guards quality\n- Room for future AI tools\n- A weekly digest and search layer that make the site easier to use over time",
      category: "Engineering Practice",
      tags: ["Blog", "Architecture", "Product"],
      status: "PUBLISHED",
      featured: false,
      readTimeMinutes: 5,
      publishedAt: new Date("2026-03-07T09:00:00.000Z"),
      authorId: admin.id,
    },
  });

  await prisma.note.upsert({
    where: { slug: "rag-evaluation-checklist" },
    update: {
      title: "RAG Evaluation Checklist for Small Research Teams",
      summary:
        "A compact note for checking retrieval quality, answer grounding, and review loops before shipping a RAG feature.",
      content:
        "## Why this note exists\n\nRAG systems often fail quietly. A short checklist helps catch brittle retrieval, unsupported claims, and evaluation gaps before they reach users.\n\n## Core checks\n\n1. Verify top-k retrieval quality with representative queries.\n2. Inspect whether answers cite or clearly rely on retrieved evidence.\n3. Separate retrieval failure from generation failure in evaluation logs.\n4. Keep a small human review set for recurring edge cases.\n\n## A practical default\n\n- Track queries that retrieved nothing useful.\n- Save examples of unsupported answers.\n- Review retrieval and answer quality together, not in isolation.",
      noteType: "Checklist",
      tags: ["RAG", "Evaluation", "Checklist"],
      status: "PUBLISHED",
      featured: true,
      publishedAt: new Date("2026-03-05T09:30:00.000Z"),
      authorId: admin.id,
    },
    create: {
      title: "RAG Evaluation Checklist for Small Research Teams",
      slug: "rag-evaluation-checklist",
      summary:
        "A compact note for checking retrieval quality, answer grounding, and review loops before shipping a RAG feature.",
      content:
        "## Why this note exists\n\nRAG systems often fail quietly. A short checklist helps catch brittle retrieval, unsupported claims, and evaluation gaps before they reach users.\n\n## Core checks\n\n1. Verify top-k retrieval quality with representative queries.\n2. Inspect whether answers cite or clearly rely on retrieved evidence.\n3. Separate retrieval failure from generation failure in evaluation logs.\n4. Keep a small human review set for recurring edge cases.\n\n## A practical default\n\n- Track queries that retrieved nothing useful.\n- Save examples of unsupported answers.\n- Review retrieval and answer quality together, not in isolation.",
      noteType: "Checklist",
      tags: ["RAG", "Evaluation", "Checklist"],
      status: "PUBLISHED",
      featured: true,
      publishedAt: new Date("2026-03-05T09:30:00.000Z"),
      authorId: admin.id,
    },
  });

  await prisma.note.upsert({
    where: { slug: "prompt-scaffolding-show-intermediate-state" },
    update: {
      title: "Prompt Scaffolding Pattern: Show Intermediate State",
      summary:
        "A reusable prompt pattern for making multi-step LLM workflows more inspectable and easier to debug.",
      content:
        "## Pattern\n\nAsk the model to expose task understanding, intermediate assumptions, and the final answer in clearly separated sections.\n\n## Why it helps\n\n- Makes handoff points visible.\n- Helps users correct course earlier.\n- Reduces the feeling of opaque, magical behavior.\n\n## When to use it\n\nUse this in research assistants, drafting tools, and any workflow where a human may want to verify reasoning inputs before acting.",
      noteType: "Method Note",
      tags: ["Prompting", "Workflow", "LLM"],
      status: "PUBLISHED",
      featured: false,
      publishedAt: new Date("2026-03-09T11:00:00.000Z"),
      authorId: admin.id,
    },
    create: {
      title: "Prompt Scaffolding Pattern: Show Intermediate State",
      slug: "prompt-scaffolding-show-intermediate-state",
      summary:
        "A reusable prompt pattern for making multi-step LLM workflows more inspectable and easier to debug.",
      content:
        "## Pattern\n\nAsk the model to expose task understanding, intermediate assumptions, and the final answer in clearly separated sections.\n\n## Why it helps\n\n- Makes handoff points visible.\n- Helps users correct course earlier.\n- Reduces the feeling of opaque, magical behavior.\n\n## When to use it\n\nUse this in research assistants, drafting tools, and any workflow where a human may want to verify reasoning inputs before acting.",
      noteType: "Method Note",
      tags: ["Prompting", "Workflow", "LLM"],
      status: "PUBLISHED",
      featured: false,
      publishedAt: new Date("2026-03-09T11:00:00.000Z"),
      authorId: admin.id,
    },
  });

  await prisma.journalEntry.upsert({
    where: { slug: "launch-week-system-setup" },
    update: {
      title: "Launch Week: System Setup and Writing Pipeline",
      summary:
        "The first week focused on deployment conventions, editor ergonomics, and a sustainable publishing loop.",
      content:
        "The core objective was to create a publishing system that feels more like a working lab notebook than a portfolio page.",
      mood: "focused",
      status: "PUBLISHED",
      publishedAt: new Date("2026-03-08T12:00:00.000Z"),
    },
    create: {
      title: "Launch Week: System Setup and Writing Pipeline",
      slug: "launch-week-system-setup",
      summary:
        "The first week focused on deployment conventions, editor ergonomics, and a sustainable publishing loop.",
      content:
        "The core objective was to create a publishing system that feels more like a working lab notebook than a portfolio page.",
      mood: "focused",
      status: "PUBLISHED",
      publishedAt: new Date("2026-03-08T12:00:00.000Z"),
    },
  });

  await prisma.journalEntry.upsert({
    where: { slug: "thinking-about-tool-modules" },
    update: {
      title: "Thinking About the Future Tool Module",
      summary:
        "The tool area stays intentionally sparse at first so every future AI service has a clear job and owner.",
      content:
        "The future tools section will expand gradually into dependable utilities rather than a grab bag of disconnected demos.",
      mood: "curious",
      status: "PUBLISHED",
      publishedAt: new Date("2026-03-10T10:30:00.000Z"),
    },
    create: {
      title: "Thinking About the Future Tool Module",
      slug: "thinking-about-tool-modules",
      summary:
        "The tool area stays intentionally sparse at first so every future AI service has a clear job and owner.",
      content:
        "The future tools section will expand gradually into dependable utilities rather than a grab bag of disconnected demos.",
      mood: "curious",
      status: "PUBLISHED",
      publishedAt: new Date("2026-03-10T10:30:00.000Z"),
    },
  });

  await prisma.comment.deleteMany({ where: { postId: firstPost.id } });

  await prisma.comment.createMany({
    data: [
      {
        postId: firstPost.id,
        authorId: reader.id,
        status: "APPROVED",
        content:
          "AI运行过程中的中间状态特别有用，它使得AI的工作流程变得可观察、可检查，而不像是一个神秘的“黑箱”",
      },
      {
        postId: firstPost.id,
        authorId: admin.id,
        status: "APPROVED",
        content:
          "这正是我们的目标。未来的每一个工具都应该提供充分的上下文信息，让读者能够核查整个过程。",
      },
    ],
  });

  await prisma.llmProvider.upsert({
    where: { slug: "openai-gpt" },
    update: {
      name: "OpenAI GPT",
      adapter: ProviderAdapter.OPENAI_COMPATIBLE,
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      apiKeyEnv: "OPENAI_API_KEY",
      systemPrompt: "You are a concise and thoughtful site assistant.",
    },
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
    update: {
      name: "DeepSeek Chat",
      adapter: ProviderAdapter.OPENAI_COMPATIBLE,
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      systemPrompt: "You are a calm, thoughtful assistant embedded in a technical personal website.",
    },
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

  await prisma.paperTopic.upsert({
    where: { slug: "llm-agents" },
    update: {
      name: "LLM Agents",
      description: "Track new agent systems and tool-using LLM workflows from arXiv.",
      query: 'all:"llm agent" OR all:"language agent"',
      maxResults: 5,
      enabled: true,
    },
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
    update: {
      name: "RAG Systems",
      description: "Monitor retrieval-augmented generation and knowledge-intensive LLM papers.",
      query: 'all:"retrieval augmented generation" OR all:RAG',
      maxResults: 5,
      enabled: true,
    },
    create: {
      name: "RAG Systems",
      slug: "rag-systems",
      description: "Monitor retrieval-augmented generation and knowledge-intensive LLM papers.",
      query: 'all:"retrieval augmented generation" OR all:RAG',
      maxResults: 5,
      enabled: true,
    },
  });

  await prisma.weeklyDigest.upsert({
    where: { slug: "weekly-digest-2026-03-03-to-2026-03-09" },
    update: {
      title: "Weekly Research Digest | 2026/03/03 - 2026/03/09",
      summary:
        "一份关于网站最新论文同步、日志笔记、常青笔记以及活动首个完整周内已发布写作的简洁摘要。",
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
    create: {
      title: "Weekly Research Digest | 2026/03/03 - 2026/03/09",
      slug: "weekly-digest-2026-03-03-to-2026-03-09",
      summary:
        "一份关于网站最新论文同步、日志笔记、常青笔记以及活动首个完整周内已发布写作的简洁摘要。",
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
