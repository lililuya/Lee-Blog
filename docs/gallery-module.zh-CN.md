# 图集模块说明

这份文档从三个层面完整说明当前版本的 Gallery 图集模块：

- 产品定位
- 技术设计
- 实际使用方式

当前版本的图集模块已经是一个可以投入实际使用的轻量视觉发布能力。它的目标不是做成社交相册，而是做成和博客、笔记、周报并列存在的“独立视觉内容单元”。

## 1. 图集模块是用来做什么的

图集模块适合那些“更应该按图片序列阅读，而不是塞进文章里当配图”的内容。

典型使用场景包括：

- 田野记录
- 旅行影像
- 视觉档案
- 界面作品集
- 设计过程快照
- 展览或活动纪实

在当前产品里，一个图集更接近一篇经过整理的内容条目，而不是照片流：

- 一个图集对应一个独立页面
- 一个图集包含一组有顺序的图片
- 每张图片都可以带自己的说明文字和可选拍摄时间
- 整个图集可以由管理员进行草稿、定时发布、正式发布、精选、归档、编辑和删除

## 2. 当前版本已经支持什么

当前实现已经支持：

- 前台图集列表页 `/gallery`
- 前台图集详情页 `/gallery/[slug]`
- 后台图集管理页 `/admin/gallery`
- 后台图集新建页 `/admin/gallery/new`
- 后台图集编辑页 `/admin/gallery/[id]`
- 后台直接多图上传
- 使用外部图片 URL 或站内根路径图片
- 单图元数据管理
- 图片顺序调整
- 通过 `publishedAt` 实现定时发布
- 图集精选标记
- 图集更新和删除时自动清理本地图片资产

当前版本暂时还不包含：

- 图集评论
- 灯箱浏览
- 拖拽排序
- EXIF 自动提取
- OSS、S3、R2 等对象存储适配
- ZIP 批量导入
- 图集修订历史
- 单张图片的历史版本

## 3. 前台显示逻辑

### 3.1 公开访问行为

普通用户可以访问：

- 图集首页 `/gallery`
- 单个图集页面 `/gallery/[slug]`

前台图集列表页会展示：

- 已发布图集数量
- 精选图集数量
- 已发布图片总数
- 图集卡片，包括封面、摘要、标签、作者和图片数量

前台图集详情页会展示：

- Hero 封面图
- 图集标题
- 摘要
- 详细描述
- 作者
- 发布时间
- 标签
- 按后台顺序渲染的图片序列
- 每张图片的 caption 或回退说明文字
- 每张图片可选的拍摄时间

### 3.2 发布可见性规则

一个图集只有在同时满足下面条件时，才会出现在前台：

- `status = PUBLISHED`
- `publishedAt` 不晚于当前可见时间
- 数据库已配置
- 当前 Prisma Client 已支持 Gallery 相关 schema

草稿和归档状态不会出现在前台。

如果图集状态是 `PUBLISHED`，但没有填写 `publishedAt`，保存时后端会自动用当前时间作为发布时间。

### 3.3 封面图回退规则

封面图的解析顺序如下：

1. 如果填写了 `coverImageUrl`，优先使用它
2. 否则使用图片序列中的第一张图
3. 如果两者都没有，则视为无封面

这意味着你可以：

- 单独指定一张封面图
- 直接让第一张图片兼任封面图

## 4. 后台使用方式

### 4.1 新建图集

打开 `/admin/gallery/new`。

推荐操作流程如下：

1. 填写图集标题和可选的 slug。
2. 按需填写标签、摘要和详细描述。
3. 直接上传图片，或者手动粘贴图片 URL。
4. 按需为每张图片填写 alt、caption、拍摄时间、宽高。
5. 使用 `Up` 和 `Down` 调整图片顺序。
6. 如有需要，单独指定封面图片 URL。
7. 选择 `DRAFT`、`PUBLISHED` 或 `ARCHIVED`。
8. 如需预约发布，可填写 `Published At`。
9. 如需突出展示，可勾选精选。
10. 点击保存。

### 4.2 编辑已有图集

打开 `/admin/gallery/[id]`。

编辑页面可以完成：

- 修改图集元数据
- 重新选择封面
- 新增图片行
- 继续上传更多图片
- 调整整组图片顺序
- 删除图片
- 修改状态或发布时间
- 删除整个图集

一个很重要的实现细节：

- 当前图集编辑不是“单张图片局部 patch”
- 而是按照当前表单里的整组图片顺序，整体替换数据库中的图片列表

### 4.3 删除图集

删除图集时会同时移除：

- 图集主记录
- 所有关联的 `GalleryImage` 记录
- 该图集曾引用过的本地图片文件（路径位于 `/uploads/site/...`）

如果图片是外部 URL，则不会删除，因为系统并不拥有这些资源。

## 5. 表单规则与校验

### 5.1 哪些字段必须有

当前规则刻意保持“文字信息尽量灵活”，但“图片必须存在”。

必填规则：

- 至少要有 1 张图片
- 每一个非空图片行都必须填写 `imageUrl`

允许为空：

- 标题
- 摘要
- 详细描述
- 标签
- alt
- caption
- 缩略图 URL
- 拍摄时间
- 宽度
- 高度

如果标题和 slug 都为空，后端会自动生成一个类似 `gallery-xxxxxxxx` 的兜底 slug。

### 5.2 图片 URL 支持格式

`imageUrl` 当前支持：

- 完整绝对地址，例如 `https://example.com/a.jpg`
- 站内根路径地址，例如 `/uploads/site/gallery-123.jpg`

不支持的例子：

- 类似 `images/a.jpg` 这样的相对路径
- 一行里填了其他信息，但 `imageUrl` 留空

### 5.3 上传限制

当前允许直接上传的图片格式：

- PNG
- JPG / JPEG
- WEBP

当前上传大小限制：

- 单张图片限制由 `SITE_IMAGE_MAX_UPLOAD_MB` 控制

后台表单会直接把当前限制显示在界面里。

### 5.4 单图元数据限制

当前校验规则包括：

- `width` 和 `height` 如果填写，必须是正整数
- 最大宽高都是 `12000`
- `shotAt` 如果填写，必须是合法日期

## 6. 数据模型设计

图集模块主要由两个 Prisma 模型组成，并且复用了现有的 `User` 作者关系。

### 6.1 `GalleryAlbum`

定义位置见 [prisma/schema.prisma](./../prisma/schema.prisma)。

核心字段：

- `id`
- `title`
- `slug`
- `summary`
- `description`
- `coverImageUrl`
- `tags`
- `status`
- `featured`
- `publishedAt`
- `createdAt`
- `updatedAt`
- `authorId`

关系字段：

- `author -> User`
- `images -> GalleryImage[]`

### 6.2 `GalleryImage`

核心字段：

- `id`
- `imageUrl`
- `thumbUrl`
- `alt`
- `caption`
- `sortOrder`
- `width`
- `height`
- `shotAt`
- `createdAt`
- `albumId`

图片的实际渲染顺序主要由下面两层保证：

1. `sortOrder`
2. `createdAt` 作为稳定的次级排序兜底

## 7. 技术架构

### 7.1 关键源码位置

图集模块核心文件如下：

- schema: [prisma/schema.prisma](./../prisma/schema.prisma)
- 查询层: [lib/gallery-queries.ts](./../lib/gallery-queries.ts)
- 写入动作: [lib/actions/gallery-actions.ts](./../lib/actions/gallery-actions.ts)
- 校验规则: [lib/validators.ts](./../lib/validators.ts)
- 后台表单: [components/forms/gallery-form.tsx](./../components/forms/gallery-form.tsx)
- 上传接口: [app/api/admin/gallery/assets/route.ts](./../app/api/admin/gallery/assets/route.ts)
- 前台列表页: [app/gallery/page.tsx](./../app/gallery/page.tsx)
- 前台详情页: [app/gallery/[slug]/page.tsx](./../app/gallery/[slug]/page.tsx)
- 后台管理页: [app/admin/gallery/page.tsx](./../app/admin/gallery/page.tsx)
- 后台新建页: [app/admin/gallery/new/page.tsx](./../app/admin/gallery/new/page.tsx)
- 后台编辑页: [app/admin/gallery/[id]/page.tsx](./../app/admin/gallery/[id]/page.tsx)

### 7.2 查询层

`lib/gallery-queries.ts` 负责：

- 前台图集列表查询
- 前台图集详情查询
- 后台图集列表查询
- 后台图集详情查询
- 图集概览统计

前台查询会自动加发布条件：

- 仅取 `PUBLISHED`
- 仅取 `publishedAt <= cutoff`

后台查询则返回所有状态。

### 7.3 写入层

`lib/actions/gallery-actions.ts` 提供了三个核心动作：

- `createGalleryAlbumAction`
- `updateGalleryAlbumAction`
- `deleteGalleryAlbumAction`

写入流程大致是：

1. 解析 `FormData`
2. 规范化图片数组
3. 使用 Zod 校验
4. 通过 Prisma 写入图集和图片
5. revalidate 图集相关页面
6. 重定向回后台页面

### 7.4 表单序列化方式

后台图集表单是一个客户端组件。

一个关键实现点是：

- 图片行状态保存在前端内存里
- 提交前会把整组图片序列化进隐藏字段 `imagesJson`
- 服务端 action 再解析 `imagesJson` 并统一校验、统一入库

这也是为什么当前图集编辑属于“整组替换”，而不是“逐行局部更新”。

## 8. 直接上传链路

图集上传使用的是独立 HTTP 路由：

- `POST /api/admin/gallery/assets`

### 8.1 请求格式

请求类型：

- `multipart/form-data`

请求字段：

- 可重复的 `files`

### 8.2 返回格式

成功返回：

```json
{
  "ok": true,
  "assets": [
    {
      "url": "/uploads/site/gallery-123.jpg",
      "originalName": "my-photo.jpg"
    }
  ]
}
```

失败返回：

```json
{
  "ok": false,
  "error": "The uploaded file is too large. Please keep it under 8 MB."
}
```

### 8.3 上传执行流程

上传链路是这样工作的：

1. 管理员在表单里选择一个或多个文件
2. 前端通过 `XMLHttpRequest` 发起上传
3. 界面展示上传进度
4. 接口先校验管理员身份
5. 每个文件经过格式和大小校验后，存入 `public/uploads/site`
6. 接口返回 URL，前端把这些 URL 追加到当前图集草稿列表
7. 只有管理员最终点击保存图集后，数据库里的图集和图片记录才会真正写入

### 8.4 当前一个很重要的限制

因为“上传图片”和“保存图集”是两步：

- 图片文件可能已经写到磁盘
- 但图集本身还没有正式保存

这意味着：

- 如果管理员上传完图片后直接关掉页面，可能会留下未被任何图集引用的孤儿文件

当前已经具备的清理能力包括：

- 图集更新时清理被移除的本地文件
- 图集删除时清理整组本地文件

当前还没有覆盖的情况：

- 上传成功但图集未保存的草稿放弃场景

## 9. 资产生命周期与清理策略

图集模块已经实现了本地图片资产的更新清理和删除清理。

当图集被更新时：

- 系统会比较旧图集引用的本地 URL 和新图集引用的本地 URL
- 被移除的本地文件会从磁盘删除

当图集被删除时：

- 当前图集关联的本地图片文件会一起从磁盘删除

清理范围仅限于站内本地资产，也就是以 `/uploads/site/` 开头的路径。

## 10. 守卫与异常处理

### 10.1 数据库守卫

如果没有配置 `DATABASE_URL`：

- 前台查询会直接返回空结果
- 后台写入流程会抛出数据库配置错误

### 10.2 Prisma schema 兼容性守卫

项目里增加了 `hasGalleryAlbumSupport()` 这个运行时检查，用来处理 Prisma Client 过旧的问题。

如果你已经改了 schema，但是 Next.js 进程里跑的还是旧 Prisma Client：

- `/admin/gallery` 会通过 `?error=client` 给出提示
- 后台页面会提醒你重启开发服务器，而不是直接崩掉

这是因为 Prisma 新增的 delegate 在 dev 模式下有时需要重启进程才能生效。

### 10.3 前端提交守卫

当前图集表单在下面这些情况下会禁用保存按钮：

- 没有任何合法图片
- 某一行填了别的信息，但缺少 `imageUrl`
- `imageUrl` 格式不合法

这样可以尽量把错误提前拦在前端，而不是让用户提交后才失败。

## 11. 路由与接口总览

前台路由：

- `/gallery`
- `/gallery/[slug]`

后台路由：

- `/admin/gallery`
- `/admin/gallery/new`
- `/admin/gallery/[id]`

上传接口：

- `POST /api/admin/gallery/assets`

## 12. 界面与交互设计说明

图集模块被设计为和博客、笔记并列的独立内容类型，而不是某个文章附件区域。

当前交互决策包括：

- 优先强调“顺序阅读”而不是瀑布流混乱堆叠
- 详情页优先使用封面区块建立视觉进入感
- 单图 caption 是一等信息
- 后台直接提供图片顺序控制
- 上传过程提供进度反馈
- “至少一张图片”的规则直接展示在表单里

## 13. 实际运营建议

虽然当前有些字段允许为空，但日常使用时仍然建议：

- 尽量写一个明确的图集标题
- 始终补全 alt，保证可访问性
- 如果图片组本身在讲故事，就认真写 caption
- 如果准备预约上线，明确填写 `Published At`
- 想完全掌控资源时优先使用站内上传
- 只有在确认外部链接长期可用时，再使用外部 URL

## 14. 下一步最值得增强的方向

如果后面继续迭代图集模块，最实用的下一批增强点包括：

- 拖拽排序
- 灯箱浏览
- 对象存储支持
- 放弃草稿上传的定时清理任务
- 图集修订历史
- EXIF 自动读取拍摄时间和尺寸
- 图片焦点 / 裁剪预设
- 图集维度访问分析
- 可选的图集评论

## 15. 总结

当前的图集模块已经具备真实编辑使用价值：

- 有独立数据模型
- 有前台和后台完整页面
- 支持直接上传和元数据编辑
- 支持定时发布和精选
- 正常维护流程下会清理本地图片资产

它当前最核心的架构取舍是“尽量简单”：

- 表单提交的是整组有序图片列表
- 图片上传和图集最终保存是解耦的

这个取舍让整个模块非常容易理解，也更适合你当前这个项目阶段继续快速扩展。
