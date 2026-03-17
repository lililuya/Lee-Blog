# RAG v2

This document describes the current hybrid RAG design used by the project.

## 1. What changed from v1

RAG v1 was reliable, but heavily keyword-driven.

RAG v2 keeps the lexical path and adds:

- embedding-based semantic retrieval
- explicit knowledge chunk snapshots
- score fusion between lexical and semantic candidates
- the existing current-page grounding behavior

So the live system is not pure vector search. It is a hybrid retrieval stack.

## 2. Knowledge model

The core persisted unit is the RAG knowledge chunk, which stores:

- source type and source id
- visibility
- owner user id for private items
- title and href for citations
- snippet and full content
- embedding vector

This supports both:

- public site knowledge
- user-private research knowledge

## 3. Sync path

The sync path primarily involves:

- `scripts/sync-rag-knowledge.ts`
- `lib/chat/knowledge.ts`
- `lib/chat/embeddings.ts`

When you run:

```bash
npm run rag:sync
```

the system:

1. collects content sources
2. chunks them
3. generates embeddings
4. writes a fresh knowledge snapshot

## 4. Online retrieval path

At query time, the system combines:

- current-page context
- semantic candidates
- public lexical candidates
- private lexical candidates

It then deduplicates, fuses scores, trims results, and sends grounded context to the model.

## 5. Admin console

The admin RAG console is available at:

- `/admin/rag`

It is intended to show:

- source coverage
- chunk readiness
- embedding status
- preview retrieval examples
- manual sync entry points

## 6. Configuration

Current text embedding slot:

- `RAG_TEXT_EMBEDDING_BASE_URL`
- `RAG_TEXT_EMBEDDING_API_KEY_ENV`
- `RAG_TEXT_EMBEDDING_PROVIDER_SLUG`
- `RAG_TEXT_EMBEDDING_MODEL`

Reserved multimodal slot:

- `RAG_MULTIMODAL_EMBEDDING_BASE_URL`
- `RAG_MULTIMODAL_EMBEDDING_API_KEY_ENV`
- `RAG_MULTIMODAL_EMBEDDING_PROVIDER_SLUG`
- `RAG_MULTIMODAL_EMBEDDING_MODEL`

The multimodal slot is reserved for future expansion and is not the mainline production path yet.

## 7. Current limitations

The current implementation is intentionally practical:

- sync is still manual-first
- ingestion is focused on site and personal research content
- multimodal ingestion is not complete yet
- the system prioritizes maintainability over maximal complexity

## 8. Related docs

- [rag-v1.md](./rag-v1.md)
- [rag-v2.zh-CN.md](./rag-v2.zh-CN.md)
- [feature-overview.md](./feature-overview.md)
