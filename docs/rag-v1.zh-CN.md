# RAG v1 说明

这份文档描述的是项目里最早那版可用的 RAG 设计，也就是“词法检索优先”的基础版本。

## 1. v1 的目标

RAG v1 的目标不是一步到位做成复杂 Agent，而是先解决最核心的问题：

- 聊天回答不能只依赖模型通用知识
- 回答要尽量基于站内真实内容
- 前端要能显示引用来源

因此，v1 选择的是最稳定、最好维护的一条路线：`lexical retrieval`。

## 2. 核心调用链

基础流程如下：

1. 用户在聊天组件输入问题
2. 前端把消息、当前页面路径、所选 provider 一起发给 `/api/chat`
3. `app/api/chat/route.ts` 做鉴权和参数校验
4. `lib/chat/orchestrator.ts` 组织检索与模型调用
5. `lib/chat/retrieval.ts` 从站内内容里取候选上下文
6. orchestrator 组合 prompt 后调用 `lib/llm.ts`
7. 后端返回回答、引用和检索元信息
8. 前端聊天组件展示文本与 citation

## 3. 数据来源

v1 主要从以下内容中检索：

- `Post`
- `Note`
- `JournalEntry`
- `DailyPaperEntry`
- `WeeklyDigest`

如果用户已登录，还会额外检索自己的私有研究数据：

- `PaperLibraryItem`
- `PaperAnnotation`

私有数据始终按当前用户过滤，不会混入别人的内容。

## 4. 当前页优先

v1 一个很重要的能力是“当前页优先”。

如果用户正在阅读：

- `/blog/[slug]`
- `/notes/[slug]`
- `/digest/[slug]`

系统会优先把当前页面当作高优先级上下文注入给模型。这样用户在当前文章里提问时，模型会更倾向于围绕当前页回答。

## 5. 检索方式

v1 主要依赖以下字段做词法匹配：

- 标题
- 摘要
- 正文
- 标签 / 分类
- 论文作者 / topic / 主分类等辅助字段

它的优点是：

- 稳定
- 可解释
- 便于调试
- 不依赖额外向量库

它的局限是：

- 对同义改写不够强
- 对抽象总结类问题召回有限
- 内容量变大后，纯词法检索上限明显

## 6. 为什么保留 v1 文档

即使现在已经有 v2，这份文档仍然有价值，因为：

- 它解释了当前聊天系统的基础分层
- v2 仍然保留了部分词法召回链路
- 排查 RAG 问题时，理解 v1 的 retrieval 逻辑很重要

## 7. 推荐联动阅读

- [rag-v1.md](./rag-v1.md)
- [rag-v2.zh-CN.md](./rag-v2.zh-CN.md)
- [routes-and-apis.zh-CN.md](./routes-and-apis.zh-CN.md)
