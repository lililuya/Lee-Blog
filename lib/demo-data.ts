import { ProviderAdapter } from "@prisma/client";

export const demoProfile = {
  id: "main",
  fullName: "Lee",
  headline: "大家好，我是Lee",
  tagline:
    "A calm, academic-style personal site for essays, evergreen notes, lab journals, and future AI tools.",
  shortBio:
    "I work across research, engineering, and product strategy for applied AI systems. This website is designed as both a public notebook and a durable publishing platform.",
  longBio:
    "The goal of this template is to treat a personal blog like a real product: clear information architecture, sustainable content workflows, comment moderation, and a clean path to future tool modules. The visual language borrows from academic homepages, while the engineering favors modern full-stack maintainability.",
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
  updatedAt: new Date("2026-03-10T10:00:00.000Z"),
};

export const demoPosts = [
  {
    id: "demo-post-1",
    title: "From Notes to Production: Designing AI Workflows That People Trust",
    slug: "from-notes-to-production-ai-workflows",
    excerpt:
      "A practical blueprint for turning exploratory prompting experiments into workflows that teams actually adopt.",
    content: `## Why trust matters\n\nThe most useful AI systems are inspectable systems. People adopt them when they can see the intermediate state, understand the handoff, and intervene before something expensive happens.\n\n## A helpful default loop\n\n1. Start with a narrow workflow.\n2. Make every intermediate step visible.\n3. Keep a human checkpoint before costly actions.\n4. Measure where the failures cluster before scaling usage.\n\n## Why this blog is built this way\n\nThis starter project treats publishing, moderation, deployment, and future tool-building as one product surface. That makes it a better foundation than a static homepage.`,
    category: "AI Engineering",
    tags: ["AI", "Workflow", "Reliability"],
    status: "PUBLISHED",
    featured: true,
    coverImageUrl: "",
    readTimeMinutes: 6,
    publishedAt: new Date("2026-03-01T08:30:00.000Z"),
    createdAt: new Date("2026-03-01T08:30:00.000Z"),
    updatedAt: new Date("2026-03-01T08:30:00.000Z"),
    authorId: "demo-admin",
    author: {
      id: "demo-admin",
      name: "Mark Lee",
      email: "admin@example.com",
      role: "ADMIN",
    },
  },
  {
    id: "demo-post-2",
    title: "Building a Personal Academic Blog as a Product, Not a Portfolio",
    slug: "building-a-personal-academic-blog-as-a-product",
    excerpt:
      "Treating a personal site like a product leads to better information architecture, safer deployment, and more reusable tooling.",
    content: `## Reframing the site\n\nA serious personal site should not just display information. It should support writing, editing, moderation, deployment, and future experiments.\n\n## What matters most\n\n- Clear information architecture\n- Admin workflows you can maintain yourself\n- CI/CD that guards quality\n- Room for future AI tools`,
    category: "Engineering Practice",
    tags: ["Blog", "Architecture", "Product"],
    status: "PUBLISHED",
    featured: false,
    coverImageUrl: "",
    readTimeMinutes: 5,
    publishedAt: new Date("2026-03-07T09:00:00.000Z"),
    createdAt: new Date("2026-03-07T09:00:00.000Z"),
    updatedAt: new Date("2026-03-07T09:00:00.000Z"),
    authorId: "demo-admin",
    author: {
      id: "demo-admin",
      name: "Mark Lee",
      email: "admin@example.com",
      role: "ADMIN",
    },
  },
];

export const demoNotes = [
  {
    id: "demo-note-1",
    title: "RAG Evaluation Checklist for Small Research Teams",
    slug: "rag-evaluation-checklist",
    summary:
      "A compact note for checking retrieval quality, answer grounding, and review loops before shipping a RAG feature.",
    content: `## Why this note exists\n\nRAG systems often fail quietly. A short checklist helps catch brittle retrieval, unsupported claims, and evaluation gaps before they reach users.\n\n## Core checks\n\n1. Verify top-k retrieval quality with representative queries.\n2. Inspect whether answers cite or clearly rely on retrieved evidence.\n3. Separate retrieval failure from generation failure in evaluation logs.\n4. Keep a small human review set for recurring edge cases.\n\n## A practical default\n\n- Track queries that retrieved nothing useful.\n- Save examples of unsupported answers.\n- Review retrieval and answer quality together, not in isolation.`,
    noteType: "Checklist",
    tags: ["RAG", "Evaluation", "Checklist"],
    status: "PUBLISHED",
    featured: true,
    publishedAt: new Date("2026-03-05T09:30:00.000Z"),
    createdAt: new Date("2026-03-05T09:30:00.000Z"),
    updatedAt: new Date("2026-03-05T09:30:00.000Z"),
    authorId: "demo-admin",
    author: {
      id: "demo-admin",
      name: "Mark Lee",
      email: "admin@example.com",
      role: "ADMIN",
    },
  },
  {
    id: "demo-note-2",
    title: "Prompt Scaffolding Pattern: Show Intermediate State",
    slug: "prompt-scaffolding-show-intermediate-state",
    summary:
      "A reusable prompt pattern for making multi-step LLM workflows more inspectable and easier to debug.",
    content: `## Pattern\n\nAsk the model to expose task understanding, intermediate assumptions, and the final answer in clearly separated sections.\n\n## Why it helps\n\n- Makes handoff points visible.\n- Helps users correct course earlier.\n- Reduces the feeling of opaque, magical behavior.\n\n## When to use it\n\nUse this in research assistants, drafting tools, and any workflow where a human may want to verify reasoning inputs before acting.`,
    noteType: "Method Note",
    tags: ["Prompting", "Workflow", "LLM"],
    status: "PUBLISHED",
    featured: false,
    publishedAt: new Date("2026-03-09T11:00:00.000Z"),
    createdAt: new Date("2026-03-09T11:00:00.000Z"),
    updatedAt: new Date("2026-03-09T11:00:00.000Z"),
    authorId: "demo-admin",
    author: {
      id: "demo-admin",
      name: "Mark Lee",
      email: "admin@example.com",
      role: "ADMIN",
    },
  },
];

export const demoJournalEntries = [
  {
    id: "demo-journal-1",
    title: "Launch Week: System Setup and Writing Pipeline",
    slug: "launch-week-system-setup",
    summary:
      "The first week focused on deployment conventions, editor ergonomics, and a sustainable publishing loop.",
    content:
      "The core objective was to create a publishing system that feels more like a working lab notebook than a portfolio page.",
    mood: "focused",
    status: "PUBLISHED",
    publishedAt: new Date("2026-03-08T12:00:00.000Z"),
    createdAt: new Date("2026-03-08T12:00:00.000Z"),
    updatedAt: new Date("2026-03-08T12:00:00.000Z"),
  },
  {
    id: "demo-journal-2",
    title: "Thinking About the Future Tool Module",
    slug: "thinking-about-tool-modules",
    summary:
      "The tool area stays intentionally sparse at first so every future AI service has a clear job and owner.",
    content:
      "The future tools section will expand gradually into a set of dependable utilities rather than a grab bag of disconnected demos.",
    mood: "curious",
    status: "PUBLISHED",
    publishedAt: new Date("2026-03-10T10:30:00.000Z"),
    createdAt: new Date("2026-03-10T10:30:00.000Z"),
    updatedAt: new Date("2026-03-10T10:30:00.000Z"),
  },
];

export const demoComments = [
  {
    id: "demo-comment-1",
    content:
      "The point about visible intermediate states really resonates. It makes an AI workflow feel inspectable instead of magical.",
    status: "APPROVED",
    createdAt: new Date("2026-03-09T09:30:00.000Z"),
    updatedAt: new Date("2026-03-09T09:30:00.000Z"),
    postId: "demo-post-1",
    authorId: "demo-reader",
    author: {
      id: "demo-reader",
      name: "Reader Demo",
      email: "reader@example.com",
      role: "READER",
    },
  },
];

export const demoProviders = [
  {
    id: "demo-provider-1",
    name: "OpenAI GPT",
    slug: "openai-gpt",
    adapter: ProviderAdapter.OPENAI_COMPATIBLE,
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiKeyEnv: "OPENAI_API_KEY",
    systemPrompt: "You are a concise and thoughtful site assistant.",
    enabled: false,
    createdAt: new Date("2026-03-09T10:00:00.000Z"),
    updatedAt: new Date("2026-03-09T10:00:00.000Z"),
  },
];

export const demoPaperTopics = [
  {
    id: "demo-topic-1",
    name: "LLM Agents",
    slug: "llm-agents",
    description: "Track new agent systems and tool-using LLM workflows from arXiv.",
    query: 'all:"llm agent" OR all:"language agent"',
    maxResults: 4,
    enabled: true,
    createdAt: new Date("2026-03-09T10:00:00.000Z"),
    updatedAt: new Date("2026-03-09T10:00:00.000Z"),
  },
  {
    id: "demo-topic-2",
    name: "RAG Systems",
    slug: "rag-systems",
    description: "Monitor retrieval-augmented generation and knowledge-intensive LLM papers.",
    query: 'all:"retrieval augmented generation" OR all:RAG',
    maxResults: 4,
    enabled: true,
    createdAt: new Date("2026-03-09T10:00:00.000Z"),
    updatedAt: new Date("2026-03-09T10:00:00.000Z"),
  },
];

export const demoPaperEntries = [
  {
    id: "demo-paper-1",
    digestDate: new Date("2026-03-10T16:00:00.000Z"),
    arxivId: "2503.12345v1",
    title: "Coordinating LLM Agents with Transparent Tool Use",
    summary:
      "This paper studies how multi-step agent systems can expose intermediate tool calls and state transitions so that users can understand, audit, and improve the workflow.",
    authors: ["A. Example", "B. Researcher"],
    paperUrl: "https://arxiv.org/abs/2503.12345",
    pdfUrl: "https://arxiv.org/pdf/2503.12345.pdf",
    primaryCategory: "cs.AI",
    publishedAt: new Date("2026-03-11T02:00:00.000Z"),
    updatedAt: new Date("2026-03-11T02:00:00.000Z"),
    createdAt: new Date("2026-03-11T02:00:00.000Z"),
    topicId: "demo-topic-1",
    topic: demoPaperTopics[0],
  },
  {
    id: "demo-paper-2",
    digestDate: new Date("2026-03-10T16:00:00.000Z"),
    arxivId: "2503.23456v1",
    title: "Practical Evaluation Loops for Retrieval-Augmented Generation",
    summary:
      "The work proposes an evaluation framework for RAG systems that combines retrieval metrics, answer quality scoring, and human review checkpoints for production settings.",
    authors: ["C. Scientist", "D. Engineer"],
    paperUrl: "https://arxiv.org/abs/2503.23456",
    pdfUrl: "https://arxiv.org/pdf/2503.23456.pdf",
    primaryCategory: "cs.IR",
    publishedAt: new Date("2026-03-11T03:00:00.000Z"),
    updatedAt: new Date("2026-03-11T03:00:00.000Z"),
    createdAt: new Date("2026-03-11T03:00:00.000Z"),
    topicId: "demo-topic-2",
    topic: demoPaperTopics[1],
  },
];

export const demoWeeklyDigests = [
  {
    id: "demo-digest-1",
    title: "Weekly Research Digest | 2026/03/03 - 2026/03/09",
    slug: "weekly-digest-2026-03-03-to-2026-03-09",
    summary:
      "A compact summary of the site's latest paper syncs, journal notes, and published writing from the first full week of activity.",
    content: `## Week in review\n\n- Synced a new batch of daily paper summaries centered on LLM agents and RAG systems.\n- Recorded journal entries about deployment setup and content workflow decisions.\n- Published a long-form post on treating a personal academic site like a product.\n\n## Featured topics\n\n### LLM Agents\n\n- [Coordinating LLM Agents with Transparent Tool Use](https://arxiv.org/abs/2503.12345): a paper emphasizing visible intermediate state and tool-call transparency.\n\n### RAG Systems\n\n- [Practical Evaluation Loops for Retrieval-Augmented Generation](https://arxiv.org/abs/2503.23456): a production-focused evaluation framing for retrieval and answer quality.\n\n## Output and next steps\n\n- Continue expanding evergreen notes so short insights can mature into reusable knowledge assets.\n- Link weekly inputs and polished outputs more deliberately across the site.`,
    highlights: [
      "Synced 8 papers across two actively tracked research topics.",
      "Captured two journal updates to document system setup and workflow choices.",
      "Published one long-form article that anchors the site's product philosophy.",
      "Set up a durable base for evergreen notes and future AI tool modules.",
    ],
    featuredTopics: ["LLM Agents", "RAG Systems"],
    paperCount: 8,
    journalCount: 2,
    postCount: 1,
    periodStart: new Date("2026-03-02T16:00:00.000Z"),
    periodEnd: new Date("2026-03-09T15:59:59.999Z"),
    publishedAt: new Date("2026-03-10T00:30:00.000Z"),
    createdAt: new Date("2026-03-10T00:30:00.000Z"),
    updatedAt: new Date("2026-03-10T00:30:00.000Z"),
  },
];
