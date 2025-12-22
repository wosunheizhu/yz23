# Node 10：补全模块（新闻爬虫+AI、社群、投票、私聊）

## 📋 PRD 交付物

根据 PRD 1356-1365：

- ✅ v2 模块照单补齐（保持原规则）
- ✅ 全局一致性：可见性/审计/通知不漏

---

## 🗂️ 已实现模块

### 1. 新闻资讯模块 (PRD 16/6.6)

**后端 API**

| 端点 | 方法 | 描述 | PRD 引用 |
|------|------|------|----------|
| `/news` | GET | 新闻列表（筛选：项目/行业/地区/时间/关键词） | 6.6.2 |
| `/news/:id` | GET | 新闻详情 | 6.6.2 |
| `/news/project/:projectId` | GET | 项目相关新闻 | 6.6.2.2 |
| `/news` | POST | 添加新闻 | 6.6.4 |
| `/news/:id` | PATCH | 更新新闻（管理员） | 6.6.6 |
| `/news/:id` | DELETE | 删除新闻（管理员） | 6.6.6 |
| `/news/:id/link-project` | POST | 关联新闻到项目 | 6.6.4 |
| `/news/:id/link-project/:projectId` | DELETE | 取消关联 | 6.6.4 |
| `/news/stats` | GET | 新闻统计（管理员） | 6.6.6 |
| `/news/sources` | GET | 新闻源列表（管理员） | 6.6.5 |
| `/news/sources` | POST | 创建新闻源（管理员） | 6.6.5 |
| `/news/sources/:id` | PATCH | 更新新闻源（管理员） | 6.6.5 |
| `/news/sources/:id` | DELETE | 删除新闻源（管理员） | 6.6.5 |

**新闻 AI API (第一轮查漏补缺新增)**

| 端点 | 方法 | 描述 | PRD 引用 |
|------|------|------|----------|
| `/news/ai/chat` | POST | 与新闻数字人对话 | 6.6.3 |
| `/news/ai/summary` | POST | AI 生成新闻摘要 | 6.6.4 |
| `/news/ai/keywords` | POST | AI 生成项目检索关键词 | 6.6.2.2 |
| `/news/ai/search` | POST | 项目驱动的 AI 新闻推荐 | 6.6.2.2 |

**文件清单**
- `backend/src/modules/news/news.dto.ts`
- `backend/src/modules/news/news.service.ts`
- `backend/src/modules/news/news.router.ts`
- `backend/src/modules/news/ai.router.ts` ✨新增
- `backend/src/modules/news/index.ts`
- `frontend/src/api/news.ts`

---

### 2. 社群动态模块 (PRD 17.1)

**后端 API**

| 端点 | 方法 | 描述 | PRD 引用 |
|------|------|------|----------|
| `/posts` | GET | 动态列表 | 17.1 |
| `/posts/:id` | GET | 动态详情（含评论） | 17.1 |
| `/posts` | POST | 发布动态 | 17.1 |
| `/posts/:id` | PATCH | 更新动态 | 17.1 |
| `/posts/:id` | DELETE | 删除动态 | 17.1 |
| `/posts/:id/like` | POST | 点赞 | 17.1 |
| `/posts/:id/like` | DELETE | 取消点赞 | 17.1 |
| `/posts/:id/comments` | GET | 评论列表 | 17.1 |
| `/posts/:id/comments` | POST | 发表评论 | 17.1 |
| `/posts/:postId/comments/:commentId` | DELETE | 删除评论 | 17.1 |
| `/posts/admin/:id` | DELETE | 管理员删除动态 | 17.1 |

**文件清单**
- `backend/src/modules/community/post.dto.ts`
- `backend/src/modules/community/post.service.ts`
- `backend/src/modules/community/post.router.ts`
- `frontend/src/api/community.ts`

---

### 3. 投票模块 (PRD 17.3)

**后端 API**

| 端点 | 方法 | 描述 | PRD 引用 |
|------|------|------|----------|
| `/votes` | GET | 投票列表 | 17.3 |
| `/votes/:id` | GET | 投票详情（含结果） | 17.3 |
| `/votes` | POST | 发起投票（管理员/联合创始人） | 17.3 |
| `/votes/:id` | PATCH | 更新投票 | 17.3 |
| `/votes/:id/cast` | POST | 投票 | 17.3 |
| `/votes/:id/close` | POST | 关闭投票 | 17.3 |
| `/votes/:id/cancel` | POST | 取消投票 | 17.3 |
| `/votes/admin/:id` | DELETE | 管理员删除投票 | 17.3 |

**特性**
- ✅ 可见范围与匿名/弃权配置
- ✅ 投票结果统计
- ✅ 投票截止时间检查
- ✅ 创建/关闭投票通知

**文件清单**
- `backend/src/modules/community/vote.dto.ts`
- `backend/src/modules/community/vote.service.ts`
- `backend/src/modules/community/vote.router.ts`
- `backend/src/modules/community/index.ts`
- `frontend/src/api/votes.ts`

---

### 4. 私聊模块 (PRD 18.2)

**后端 API**

| 端点 | 方法 | 描述 | PRD 引用 |
|------|------|------|----------|
| `/dm/conversations` | GET | 会话列表 | 18.2 |
| `/dm/unread` | GET | 未读消息统计 | 18.2 |
| `/dm/:partnerId` | GET | 与特定用户的消息历史 | 18.2 |
| `/dm` | POST | 发送私信 | 18.2 |
| `/dm/:partnerId/read` | POST | 标记已读 | 18.2 |
| `/dm/:messageId` | DELETE | 删除消息 | 18.2 |

**特性**
- ✅ 会话列表（按最后消息时间排序）
- ✅ 未读消息计数（按会话）
- ✅ 游标分页消息历史
- ✅ 新私信通知

**文件清单**
- `backend/src/modules/messages/dm.dto.ts`
- `backend/src/modules/messages/dm.service.ts`
- `backend/src/modules/messages/dm.router.ts`
- `frontend/src/api/messages.ts`

---

### 5. 站内信箱模块 (PRD 18.1)

**后端 API**

| 端点 | 方法 | 描述 | PRD 引用 |
|------|------|------|----------|
| `/inbox` | GET | 信箱列表（分类筛选） | 18.1 |
| `/inbox/stats` | GET | 信箱统计 | 18.1 |
| `/inbox/:id` | GET | 信箱项详情 | 18.1 |
| `/inbox/:id/read` | POST | 标记已读 | 18.1 |
| `/inbox/read-all` | POST | 全部标记已读 | 18.1 |
| `/inbox/:id` | DELETE | 删除信箱项 | 18.1 |
| `/inbox/clear-read` | DELETE | 清空已读消息 | 18.1 |

**分类 Tab**
- ✅ 公告 (ANNOUNCEMENT)
- ✅ 系统通知 (SYSTEM)
- ✅ 投票 (VOTE)
- ✅ 私信 (DM)
- ✅ @ 提醒 (MENTION)

**文件清单**
- `backend/src/modules/messages/inbox.dto.ts`
- `backend/src/modules/messages/inbox.service.ts`
- `backend/src/modules/messages/inbox.router.ts`
- `backend/src/modules/messages/index.ts`
- `frontend/src/api/messages.ts`

---

### 6. AI 服务模块 (第一轮查漏补缺新增)

**后端 API**

| 端点 | 方法 | 描述 | PRD 引用 |
|------|------|------|----------|
| `/news/ai/chat` | POST | 新闻数字人对话 | 6.6.3 |
| `/news/ai/summary` | POST | AI 生成新闻摘要 | 6.6.4 |
| `/news/ai/keywords` | POST | AI 生成项目检索关键词 | 6.6.2.2 |
| `/news/ai/search` | POST | 项目驱动的 AI 新闻推荐 | 6.6.2.2 |
| `/network-resources/ai/chat` | POST | 资源探索 AI 对话 | 6.5.5 |
| `/network-resources/ai/recommend` | POST | AI 资源推荐 | 6.5.5 |

**文件清单**
- `backend/src/services/ai.service.ts` ✨新增
- `backend/src/modules/news/ai.router.ts` ✨新增
- `backend/src/modules/network-resources/ai.router.ts` ✨新增
- `frontend/src/api/ai.ts` ✨新增

---

### 7. 投票自动关闭定时任务 (第一轮查漏补缺新增)

**后端任务**

| 任务 | 描述 | PRD 引用 |
|------|------|----------|
| `vote-processor` | 自动关闭过期投票并发送通知 | 6.10.4 |

**文件清单**
- `backend/src/jobs/vote-processor.ts` ✨新增

---

## 📊 代码统计

| 模块 | 后端文件数 | 前端文件数 |
|------|------------|------------|
| 新闻资讯 | 5 | 1 |
| 社群动态 | 4 | 1 |
| 投票 | 4 | 1 |
| 私聊 | 4 | 1 (共用) |
| 信箱 | 4 | 1 (共用) |
| AI 服务 | 3 | 1 |
| 定时任务 | 1 | - |
| **合计** | **25** | **5** |

---

## ✅ PRD 验收标准 (1360-1364)

| 验收项 | 状态 | 说明 |
|--------|------|------|
| v2 模块照单补齐 | ✅ | 新闻/社群/投票/私聊/信箱全部实现 |
| 可见性全局一致 | ✅ | 动态/投票支持 ALL/ROLE_LEVEL/CUSTOM |
| 审计不漏 | ✅ | 关键操作均记录审计日志 |
| 通知不漏 | ✅ | @ 提醒/私信/投票均触发通知 |
| 新闻 AI 辅助 | ✅ | 数字人对话/摘要生成/关键词推荐 |
| 资源 AI 辅助 | ✅ | 资源探索对话/AI 推荐 |
| 投票自动关闭 | ✅ | 定时任务自动关闭过期投票 |

---

## 🔗 集成点

### 模块导出
- `backend/src/modules/index.ts` - 已添加 newsRouter, newsAIRouter, postRouter, voteRouter, dmRouter, inboxRouter, resourceAIRouter
- `frontend/src/api/index.ts` - 已添加对应 API 客户端导出

### 路由挂载 (app.ts)
```typescript
// Node 4: 人脉资源
app.use(`${config.apiPrefix}/network-resources`, networkResourceRouter);
app.use(`${config.apiPrefix}/network-resources`, resourceAIRouter);

// Node 10: 补全模块（新闻、社群、投票、私聊、信箱、AI）
app.use(`${config.apiPrefix}/news`, newsRouter);
app.use(`${config.apiPrefix}/news`, newsAIRouter);
app.use(`${config.apiPrefix}/posts`, postRouter);
app.use(`${config.apiPrefix}/votes`, voteRouter);
app.use(`${config.apiPrefix}/dm`, dmRouter);
app.use(`${config.apiPrefix}/inbox`, inboxRouter);
```

### 后台任务 (app.ts)
```typescript
// 启动投票处理器（Node 10: 投票自动关闭）
startVoteProcessor();
```

---

## 📝 待 Node 10 前端页面（后续迭代）

1. 新闻资讯列表与详情页
2. 项目相关新闻展示
3. 新闻数字人对话界面
4. 新闻源管理页面（管理员）
5. 社群动态 Feed
6. 动态详情与评论
7. 投票列表与投票页
8. 投票结果展示
9. 私聊会话列表
10. 私聊消息界面
11. 站内信箱页面
12. 资源探索 AI 对话界面

---

## 🔍 第一轮查漏补缺总结

| 遗漏项 | PRD 引用 | 修复内容 |
|--------|----------|----------|
| 新闻数字人对话 | 6.6.3 | 添加 `/news/ai/chat` |
| AI 生成新闻摘要 | 6.6.4 | 添加 `/news/ai/summary` |
| 项目驱动关键词推荐 | 6.6.2.2 | 添加 `/news/ai/keywords` |
| 项目驱动新闻检索 | 6.6.2.2 | 添加 `/news/ai/search` |
| 资源探索 AI 对话 | 6.5.5 | 添加 `/network-resources/ai/chat` |
| 资源 AI 推荐 | 6.5.5 | 添加 `/network-resources/ai/recommend` |
| 投票自动关闭 | 6.10.4 | 添加 `vote-processor` 定时任务 |

---

## 🔍 第二轮查漏补缺总结

| 遗漏项 | PRD 引用 | 修复内容 |
|--------|----------|----------|
| 用户仪表盘 | 6.8 | 添加 `/dashboard` 模块 |
| 我的项目摘要 | 6.8.2 | 添加 `/dashboard/projects` |
| 我的代办事项 | 6.8.2 D3 | 添加 `/dashboard/todos` |
| Token 摘要 | 6.8.3 | 添加 `/dashboard/token` |
| 我的贡献统计 | 6.8.4 | 添加 `/dashboard/contributions` |
| 平台价值曲线 | 6.8.5 | 添加 `/dashboard/platform-value` |
| 信箱未读统计 | 6.8.6 | 添加 `/dashboard/inbox-badge` |

**新增文件**
- `backend/src/modules/dashboard/dashboard.dto.ts`
- `backend/src/modules/dashboard/dashboard.service.ts`
- `backend/src/modules/dashboard/dashboard.router.ts`
- `backend/src/modules/dashboard/index.ts`
- `frontend/src/api/dashboard.ts`

---

## 🔍 第三轮查漏补缺总结

| 遗漏项 | PRD 引用 | 修复内容 |
|--------|----------|----------|
| 新闻源自动爬取定时任务 | 6.6.5 | 添加 `news-processor.ts` |
| RSS/Atom 解析器 | 6.6.5 | 实现 `parseRSSFeed` / `parseAtomFeed` |
| 手动触发新闻抓取 API | 6.6.5 | 添加 `POST /news/sources/:id/fetch` |
| 批量触发新闻抓取 API | 6.6.5 | 添加 `POST /news/sources/fetch-all` |

**新增文件**
- `backend/src/jobs/news-processor.ts`

**修改文件**
- `backend/src/jobs/index.ts` - 导出新闻处理器
- `backend/src/app.ts` - 集成新闻处理器启动/停止
- `backend/src/modules/news/news.router.ts` - 添加手动触发 API
- `frontend/src/api/news.ts` - 添加触发抓取 API

---

## 🔍 第四轮查漏补缺总结

| 遗漏项 | PRD 引用 | 修复内容 |
|--------|----------|----------|
| 投票即将截止提醒 | 6.11.3 | 添加 `sendDeadlineReminders` 函数 |
| 动态/评论作者角色显示 | 6.9.1.3 | 添加 `authorRoleLevel` 字段 |

**修改文件**
- `backend/src/jobs/vote-processor.ts` - 添加截止前提醒逻辑
- `backend/src/modules/community/post.dto.ts` - 添加作者角色字段
- `backend/src/modules/community/post.service.ts` - 查询时包含作者角色
- `frontend/src/api/community.ts` - 更新类型定义

---

## 🔍 第五轮查漏补缺总结

| 遗漏项 | PRD 引用 | 修复内容 |
|--------|----------|----------|
| "换一批推荐"功能 | 6.6.2.2 | 添加 `refresh` 和 `skip` 参数 |
| "只看强相关"开关 | 6.6.2.2 | 添加 `onlyStronglyRelated` 参数 |
| 返回匹配总数 | 6.6.2.2 | 添加 `hasMore` 和 `total` 字段 |

**修改文件**
- `backend/src/modules/news/ai.router.ts` - 添加分页和强相关筛选
- `frontend/src/api/ai.ts` - 添加 `refreshRecommendations` 方法和参数

---

## 🔍 第六轮查漏补缺总结

| 遗漏项 | PRD 引用 | 修复内容 |
|--------|----------|----------|
| 私聊邮件提醒 | 29.5 | 添加 EMAIL 渠道到私信通知 |
| 评论回复通知 | 6.9.1 | 添加 COMMENT_REPLIED 通知给原评论作者 |

**修改文件**
- `backend/src/modules/messages/dm.service.ts` - 私信通知添加邮件渠道
- `backend/src/modules/community/post.service.ts` - 添加评论回复通知

---

## 🔍 第七轮查漏补缺总结

**✅ 已通过 Gate Checklist 检查项：**

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 1. 权限鉴权 | ✅ | 所有接口使用 `authenticate` 中间件 |
| 2. 可见性过滤 | ✅ | 动态/投票实现 ALL/ROLE_LEVEL/CUSTOM 过滤 |
| 3. 高层用户合并 | ✅ | 在 visibility util 中实现 |
| 4. 审计日志 | ✅ | 投票/新闻/动态删除均有审计 |
| 5. 软删一致性 | ✅ | 使用 `notDeleted` 过滤 |
| 6. 幂等性 | ✅ | 状态变更接口支持幂等 |
| 7. 事务 | ✅ | Token 相关操作在事务中 |
| 8. 统一错误码 | ✅ | 使用工程统一错误处理 |
| 9. 输入校验 | ✅ | 使用 Zod Schema 校验 |
| 10. 分页 | ✅ | 所有列表接口支持分页 |
| 11. 排序稳定 | ✅ | 按 createdAt desc 排序 |
| 14. 结构化日志 | ✅ | 使用 Pino logger |
| 16. 通知不漏 | ✅ | 投票/私聊/@ 均发通知 |

**本轮无新增遗漏项。**

---

## 🎉 Node 10 后端开发完成！

Node 10（补全模块）后端 API 与前端 API 客户端已 100% 完成，可进行前端页面开发。

