# RAG v1 实现说明

本文档描述当前 `codex/rag` 分支中 `lexical RAG v1` 的实现方式、代码分层、调用链路、数据来源、边界与后续演进方向。

这份实现的目标不是一次性做成完整的工业级智能体，而是先把站内聊天从“直接调用模型”升级成“带站内知识检索和引用来源的助手”。

## 1. 目标与定位

当前版本的 RAG 是一个面向站内内容的 `v1`：

- 它已经具备 `检索 -> 组装上下文 -> 调用模型 -> 返回回答与来源` 的完整闭环
- 它优先解决“回答要尽量基于站内已有内容，而不是模型自由发挥”这个问题
- 它属于 `lexical RAG`，也就是基于关键词和字段匹配的检索增强，而不是基于 embedding / 向量数据库的语义检索

因此，这版更适合作为稳定、轻量、可维护的第一步，而不是最终形态。

## 2. 为什么叫 lexical RAG v1

`RAG` 是 `Retrieval-Augmented Generation`，即“检索增强生成”。

当前版本叫 `lexical`，是因为检索主要依赖：

- 标题匹配
- 摘要匹配
- 正文匹配
- 标签、分类、主题、作者等字段匹配

而不是使用：

- 文本 embedding
- 向量数据库
- 语义召回
- rerank 模型

之所以先做这版，是因为它有几个明显优势：

- 实现成本低，容易快速上线
- 调试难度小，检索逻辑比较可解释
- 非常适合当前这个以 Markdown 内容和 Prisma 数据为核心的站点
- 便于后续平滑升级到 hybrid RAG 或 vector RAG

## 3. 当前架构分层

RAG v1 不是直接写在 `/api/chat` 里的，而是拆成了几层。

### 3.1 API 入口层

文件：

- `app/api/chat/route.ts`

职责：

- 校验请求参数
- 检查用户是否登录
- 接收前端传来的 `providerSlug`、`messages`、`pathname`
- 调用聊天编排层
- 返回结构化结果给前端

这一层保持尽量薄，不负责检索细节，也不负责模型协议细节。

### 3.2 Chat Orchestrator

文件：

- `lib/chat/orchestrator.ts`

职责：

- 从历史消息里提取本次检索查询
- 调用检索层获取候选上下文
- 构造 RAG 专用 system prompt
- 调用 LLM transport 层生成最终回复
- 整理输出格式，返回 `content + citations + retrieval metadata`

这一层是整个 RAG v1 的核心协调者。

### 3.3 Retrieval Layer

文件：

- `lib/chat/retrieval.ts`

职责：

- 识别当前页面是否为支持注入上下文的阅读页
- 从站内公开内容中检索候选内容
- 从当前登录用户的私有论文库和批注中检索候选内容
- 做简单打分、去重、截断和 snippet 生成
- 返回最终可用于 prompt 的来源列表

这是当前版本最重要的“知识 grounding”实现位置。

### 3.4 Type Layer

文件：

- `lib/chat/types.ts`

职责：

- 统一定义 citation、chat reply、orchestrator input 等结构
- 降低 API、前端和后端内部层之间的耦合

### 3.5 LLM Transport

文件：

- `lib/llm.ts`

职责：

- 根据 provider 配置调用不同模型供应商
- 处理 `OPENAI_COMPATIBLE` / `ANTHROPIC` 的 HTTP 协议差异
- 合并 provider 自带的 system prompt 和 RAG 动态生成的 system prompt

这一层不关心“该检索什么”，只关心“如何把消息发给模型”。

### 3.6 前端 Chat Widget

文件：

- `components/site/chat-widget.tsx`

职责：

- 收集用户输入
- 把当前 `pathname` 一起发给后端
- 展示回答内容
- 展示引用来源卡片

前端本身不做 RAG 检索逻辑，只负责承载结果。

## 4. 整体调用链路

当前对话请求的大致流程如下：

1. 用户在右下角聊天框输入问题
2. 前端把 `providerSlug + messages + pathname` 发到 `/api/chat`
3. 后端 API 鉴权并调用 `generateChatReply`
4. Orchestrator 从最近两条用户消息中提取检索查询
5. Retrieval Layer：
   - 识别当前页面上下文
   - 检索公开内容
   - 检索当前用户私有内容
   - 计算分数并排序
6. Orchestrator 将来源组装进 RAG system prompt
7. `lib/llm.ts` 调用实际模型
8. 返回：
   - `content`
   - `citations`
   - `retrievalQuery`
   - `usedPageContext`
9. 前端渲染回答和来源卡片

## 5. 检索的数据来源

### 5.1 公开内容

当前 RAG v1 会从以下公开内容中检索：

- `Post`
- `Note`
- `JournalEntry`
- `DailyPaperEntry`
- `WeeklyDigest`

这些数据来自：

- 数据库模式定义见 `prisma/schema.prisma`
- 查询与 demo fallback 分布在 `lib/queries.ts`、`lib/demo-data.ts`

### 5.2 私有内容

当前 RAG v1 还会检索当前登录用户自己的私有研究资产：

- `PaperLibraryItem`
- `PaperAnnotation`

这些数据的检索是按 `currentUser.id` 做过滤的，因此不会把其他用户的数据混进当前会话。

这部分是 RAG v1 中一个很重要的工业化设计点：`公开知识` 和 `私有知识` 被明确区分，并且私有知识有访问控制。

## 6. 当前页面上下文是怎么实现的

RAG v1 并不是只能靠关键词搜全站，它还支持“当前阅读页优先”。

在 `lib/chat/retrieval.ts` 中，`resolveCurrentPageSource()` 会判断 `pathname` 是否匹配以下路由：

- `/blog/[slug]`
- `/notes/[slug]`
- `/digest/[slug]`

如果匹配成功，就会直接读取该页面的内容，并构造一个高优先级来源：

- `Current blog post`
- `Current note`
- `Current weekly digest`

这类来源会带上很高的分数 `score: 10_000`，确保在排序里优先出现。

这也是为什么当前版本在阅读页中聊天时，应当把“当前页面内容”作为最重要的 grounding 来源。

## 7. 检索打分逻辑

当前版本没有使用 embedding，因此打分逻辑是基于“词面命中 + 字段权重”的简单评分。

核心思路：

- 标题命中权重更高
- 摘要命中次之
- 正文命中也会记分，但权重略低
- 标签、分类、主题、作者等辅助字段也会加分
- 当前页面直接上下文有极高优先级

例如一条博客文章的评分会综合：

- `title`
- `excerpt`
- `content`
- `category`
- `tags`

而论文条目会综合：

- `title`
- `summary`
- `primaryCategory`
- `topic.name`
- `authors`

这种评分方式简单但够用，尤其适合第一版。

## 8. 为什么检索查询只取最近两条用户消息

当前 `buildRetrievalQuery()` 会从消息列表里提取最近两条 `user` 消息作为检索查询。

这样做的原因是：

- 保留最近上下文，避免只看最后一句导致问题过短
- 防止把整段长会话都拿去做检索，造成噪声过大
- 保持 v1 的实现简单且稳定

这是一个典型的“先做小而稳的版本”的策略。

## 9. Prompt 是如何构造的

RAG v1 的 prompt 不采用复杂 agent 结构，而是通过一个动态 `systemPrompt` 实现 grounding。

在 `lib/chat/orchestrator.ts` 中，`buildRagSystemPrompt()` 会：

- 告诉模型：你是站内内容助手
- 要优先基于站内检索内容回答
- 如果证据不够，应该明确说明不足
- 不要编造引用、事实或个人信息
- 如果用户在阅读页，要优先参考当前页面内容

然后把检索结果按统一格式拼进去，例如：

- 来源标题
- 来源类型
- 是否为当前页面
- 来源路径
- snippet
- 截断后的正文 context

最后，这个动态 system prompt 会与 provider 配置中的固定 system prompt 合并后，一起发给模型。

## 10. 前端如何展示 RAG 结果

`components/site/chat-widget.tsx` 做了两件和 RAG 直接相关的事：

- 发送请求时带上当前 `pathname`
- 接收回复后渲染 `citations`

来源展示目前采用卡片形式，包含：

- 来源类型
- 是否为 `Current page`
- 是否为 `Private`
- 标题
- snippet

这使得回答不再是“纯文本黑盒”，用户可以直接点回来源验证。

## 11. Demo 模式的兼容处理

当前项目支持无数据库时使用 demo data。

因此在 `lib/chat/retrieval.ts` 中，检索层做了两套兼容：

- 有数据库：使用 Prisma 查真实内容
- 无数据库：从 `lib/demo-data.ts` 中检索 demo 内容

这样做的意义是：

- 本地 demo 环境也能体验 RAG
- 没配好数据库时不会直接失效
- 更方便开发与演示

## 12. 当前版本的边界

这个 RAG v1 是“可用版”，但还不是最终版。

当前没有做的事情包括：

- embedding 向量检索
- 向量数据库
- reranker
- 会话持久化
- token usage / latency / retrieval trace 落库
- streaming 响应
- 工具调用链
- MCP 协议整合

因此，它更适合：

- 站内问答
- 当前阅读页总结
- 基于已有内容生成摘要
- 基于用户自己论文库的轻量辅助

但还不适合：

- 复杂多步 agent 工作流
- 跨外部系统协作
- 高精度语义召回
- 长期会话记忆

## 13. 为什么这版仍然值得保留

虽然它还不具备 vector RAG 的语义能力，但它有很强的工程价值：

- 架构已经分层，后面升级不会推倒重来
- 当前页面上下文已经打通
- 私有知识 ACL 已经打通
- 前端引用展示已经打通
- 模型 transport 与 retrieval 已经解耦

这意味着后续升级时，只需要重点替换或增强 `retrieval`，而不是重写整个聊天系统。

## 14. 未来演进建议

从当前版本往后升级，建议顺序如下：

### 14.1 RAG v2：Hybrid Retrieval

增加：

- embedding 生成
- 向量召回
- 与当前 lexical 检索做 hybrid merge

这样可以提升语义相似问题的召回率。

### 14.2 RAG v3：Persistence + Observability

增加：

- conversation 表
- message 表
- retrieval trace
- citation trace
- token / latency / provider usage

这样系统会更像真正可维护的生产能力。

### 14.3 Agent / MCP 层

在 RAG 稳定后，再考虑新增：

- 内部 tools
- 服务端 tool registry
- MCP client / server 接入

这一步应建立在已有的 orchestrator 分层基础之上，而不是直接把 MCP 硬塞进前端 chat widget。

## 15. 总结

当前 `lexical RAG v1` 的本质是：

> 先基于站内公开内容、当前页面内容以及当前用户自己的研究资产进行关键词检索，再将检索结果作为上下文注入模型，使聊天回答尽量 grounded，并在前端展示引用来源。

它已经具备了一个现代 RAG 系统最重要的基础骨架：

- 分层清晰
- 检索与模型调用解耦
- 支持当前页面优先上下文
- 支持私有知识访问控制
- 支持来源展示

从项目演进角度看，这是一版非常适合作为后续 `vector RAG`、`conversation memory`、`MCP tools` 起点的实现。
