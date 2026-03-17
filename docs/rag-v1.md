# RAG v1

This document describes the first usable RAG layer in the project: the lexical-retrieval-first baseline.

## 1. Goal

RAG v1 was designed to solve the most practical problem first:

- chat replies should not rely only on general model knowledge
- answers should be grounded in real site content
- citations should be visible in the UI

So v1 deliberately used a simple and maintainable strategy: lexical retrieval.

## 2. Request flow

1. A visitor sends a message from the chat widget.
2. The frontend posts the message history, provider, and current pathname to `/api/chat`.
3. `app/api/chat/route.ts` validates the request and any relevant admin session state.
4. `lib/chat/orchestrator.ts` coordinates retrieval and model calling.
5. `lib/chat/retrieval.ts` gathers candidate site sources.
6. `lib/llm.ts` sends the final prompt to the chosen model.
7. The response returns content plus citations.

## 3. Data sources

Public sources:

- posts
- notes
- journal entries
- daily papers
- weekly digests

Admin-private sources:

- paper library items
- paper annotations

Private sources are filtered to the signed-in admin account only.

## 4. Current-page bias

v1 already supported strong current-page grounding for:

- `/blog/[slug]`
- `/notes/[slug]`
- `/digest/[slug]`

This made the chat experience much better for page-specific questions while someone was actively reading a document.

## 5. Why v1 still matters

Even after the hybrid upgrade, v1 is still important because:

- it explains the foundational chat layering
- parts of the lexical retrieval path are still active
- debugging RAG behavior is much easier if you understand the baseline

## 6. Related docs

- [rag-v2.md](./rag-v2.md)
- [rag-v1.zh-CN.md](./rag-v1.zh-CN.md)
