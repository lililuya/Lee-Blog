# RAG v2 说明

这份文档描述的是当前版本正在使用的 `hybrid RAG` 方案，也就是“词法检索 + 向量检索 + 当前页上下文”的组合。

## 1. v2 相比 v1 的核心提升

v1 主要依赖词法匹配，稳定但对语义改写不够敏感。

v2 引入的核心增强是：

- 保留词法检索
- 增加 embedding 语义检索
- 保留当前页面优先注入
- 在最终结果里做融合、去重和排序

所以 v2 不是“纯向量检索”，而是真正意义上的 `hybrid retrieval`。

## 2. 核心模块

### 2.1 知识块模型

当前 RAG 主要依赖 `RagKnowledgeChunk` 这类数据：

- 来源类型
- 来源 ID
- 来源标题 / 链接
- 可见性（公开 / 私有）
- ownerUserId（私有内容归属）
- chunk 摘要与正文
- embedding 向量

这让系统既能处理公共知识，也能处理用户自己的私有研究数据。

### 2.2 同步链路

当前同步能力主要落在：

- `scripts/sync-rag-knowledge.ts`
- `lib/chat/knowledge.ts`
- `lib/chat/embeddings.ts`

执行 `npm run rag:sync` 时，系统会：

1. 收集公开内容和私有研究内容
2. 切块
3. 生成 embedding
4. 重建知识块快照

## 3. 在线检索流程

聊天请求进入时，系统会综合四类来源：

- 当前页面上下文
- semantic candidates
- public lexical candidates
- private lexical candidates

最后统一做：

- 去重
- 分数融合
- snippet 整理
- 限制最终来源数量

## 4. 当前页面优先策略

如果用户当前在：

- `/blog/[slug]`
- `/notes/[slug]`
- `/digest/[slug]`

系统会优先把当前页面内容注入为高优先级来源。这样可以减少“明明正在看这篇文章，模型却说看不到页面内容”的体验问题。

## 5. 管理台能力

当前版本已经提供 RAG 管理台：

- `/admin/rag`

主要用于查看：

- 已入库内容覆盖情况
- embedding 就绪状态
- chunk 数量
- 预览检索结果
- 手动触发同步

## 6. 配置说明

当前文本 embedding 使用的是这一组变量：

- `RAG_TEXT_EMBEDDING_BASE_URL`
- `RAG_TEXT_EMBEDDING_API_KEY_ENV`
- `RAG_TEXT_EMBEDDING_PROVIDER_SLUG`
- `RAG_TEXT_EMBEDDING_MODEL`

此外还预留了多模态 embedding 槽位：

- `RAG_MULTIMODAL_EMBEDDING_BASE_URL`
- `RAG_MULTIMODAL_EMBEDDING_API_KEY_ENV`
- `RAG_MULTIMODAL_EMBEDDING_PROVIDER_SLUG`
- `RAG_MULTIMODAL_EMBEDDING_MODEL`

当前线上检索仍以文本 RAG 为主，多模态槽位是给后续扩展准备的。

## 7. 当前边界

当前 RAG 仍然是“实用优先”的实现：

- 同步偏手动触发
- 以站内内容和私有研究内容为主
- 还没有完整的自动化 ingestion worker
- 还没有多模态入库闭环

但对于当前博客 / 研究工作台形态来说，这已经足够支撑高质量的页内问答与站内检索增强。

## 8. 推荐联动阅读

- [rag-v2.md](./rag-v2.md)
- [rag-v1.zh-CN.md](./rag-v1.zh-CN.md)
- [feature-overview.zh-CN.md](./feature-overview.zh-CN.md)
