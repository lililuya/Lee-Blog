# RAG v1 说明

这份文档描述的是项目里最早那版可用的 RAG 设计，也就是“词法检索优先”的基础版本。

## 1. v1 的目标

RAG v1 并不是一步做到复杂 Agent，而是先解决最实际的问题：

- 聊天回答不能只依赖模型通用知识
- 回答要尽量基于站内真实内容
- 前端要能展示引用来源

因此，v1 选择的是最稳定、最容易维护的一条路线：`lexical retrieval`。

## 2. 核心调用链

基础流程如下：

1. 访客在聊天组件里输入问题
2. 前端把消息、当前页面路径和所选 provider 一起发给 `/api/chat`
3. `app/api/chat/route.ts` 做参数校验，并在需要时识别管理员会话状态
4. `lib/chat/orchestrator.ts` 组织检索与模型调用
5. `lib/chat/retrieval.ts` 从站内内容里挑选候选上下文
6. orchestrator 组合 prompt 后调用 `lib/llm.ts`
7. 后端返回回答、引用和检索元信息

## 3. 数据来源

v1 主要检索这些公开内容：

- `Post`
- `Note`
- `JournalEntry`
- `DailyPaperEntry`
- `WeeklyDigest`

如果当前是已登录管理员，还会额外检索管理员私有研究数据：

- `PaperLibraryItem`
- `PaperAnnotation`

这些私有数据只会归属于当前管理员，不会混入公开访客上下文。

## 4. 当前页优先

v1 一个很重要的能力是“当前页优先”。

当用户正在阅读这些页面时：

- `/blog/[slug]`
- `/notes/[slug]`
- `/digest/[slug]`

系统会优先把当前页面内容作为高优先级上下文注入给模型，所以页内问答体验会明显更稳定。

## 5. 为什么 v1 仍然重要

即使现在已经有了 v2，这份文档仍然有价值，因为：

- 它解释了当前聊天系统的基础分层
- v2 仍保留了部分词法召回链路
- 排查 RAG 问题时，先理解 v1 的检索逻辑会轻松很多

## 6. 推荐联动阅读

- [rag-v2.zh-CN.md](./rag-v2.zh-CN.md)
- [rag-v1.md](./rag-v1.md)
