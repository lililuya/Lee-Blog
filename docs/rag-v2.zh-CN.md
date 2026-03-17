# RAG v2 说明

这份文档描述的是当前版本正在使用的 `hybrid RAG` 方案，也就是“词法检索 + 向量检索 + 当前页上下文”的组合。

## 1. v2 相比 v1 的核心提升

v1 主要依赖词法匹配，稳定但对语义改写不够敏感。

v2 在保留词法检索的同时，增加了：

- 基于 embedding 的语义检索
- 显式持久化的知识块快照
- 词法结果与语义结果的分数融合
- 继续保留当前页优先注入

所以 v2 不是“纯向量检索”，而是真正意义上的混合检索。

## 2. 核心知识模型

当前 RAG 主要依赖 `RagKnowledgeChunk` 这类数据，字段核心包括：

- 来源类型
- 来源 ID
- 可见性
- 私有内容的 owner user id
- 标题与引用链接
- snippet 与完整文本
- embedding 向量

这让系统既能处理公开站点知识，也能处理管理员自己的私有研究资料。

## 3. 同步链路

当前同步能力主要落在：

- `scripts/sync-rag-knowledge.ts`
- `lib/chat/knowledge.ts`
- `lib/chat/embeddings.ts`

执行下面这个命令时：

```bash
npm run rag:sync
```

系统会：

1. 收集内容来源
2. 对内容切块
3. 生成 embedding
4. 写入新的知识快照

## 4. 在线检索流程

聊天请求进入时，系统会组合四类来源：

- 当前页面上下文
- semantic candidates
- public lexical candidates
- admin-private lexical candidates

最后统一做：

- 去重
- 分数融合
- snippet 整理
- 控制最终来源数量

## 5. 管理台能力

当前版本已经提供 RAG 管理台：

- `/admin/rag`

主要用于查看：

- 已入库内容覆盖情况
- chunk 就绪状态
- embedding 状态
- 检索结果预览
- 手动触发同步

## 6. 配置说明

当前文本 embedding 使用这组变量：

- `RAG_TEXT_EMBEDDING_BASE_URL`
- `RAG_TEXT_EMBEDDING_API_KEY_ENV`
- `RAG_TEXT_EMBEDDING_PROVIDER_SLUG`
- `RAG_TEXT_EMBEDDING_MODEL`

此外还预留了多模态 embedding 槽位：

- `RAG_MULTIMODAL_EMBEDDING_BASE_URL`
- `RAG_MULTIMODAL_EMBEDDING_API_KEY_ENV`
- `RAG_MULTIMODAL_EMBEDDING_PROVIDER_SLUG`
- `RAG_MULTIMODAL_EMBEDDING_MODEL`

当前线上仍以文本 RAG 为主，多模态配置主要是给后续扩展预留。

## 7. 当前边界

当前 RAG 仍然是“实用优先”的实现：

- 同步仍偏手动触发
- 入库内容主要是站内内容与管理员私有研究资料
- 还没有完整的自动 ingestion worker
- 多模态入库还未形成完整闭环

但对当前博客 + 研究工作台形态来说，这已经足够支撑高质量的页内问答和站内检索增强。

## 8. 推荐联动阅读

- [rag-v1.zh-CN.md](./rag-v1.zh-CN.md)
- [rag-v2.md](./rag-v2.md)
- [feature-overview.zh-CN.md](./feature-overview.zh-CN.md)
