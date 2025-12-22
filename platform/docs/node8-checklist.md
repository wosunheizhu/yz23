# Node 8: 通知中心（站内 + 邮件强制）- 开发清单

> 最后更新: 2025-12-21

## 📊 完成状态

| 模块 | 状态 | 备注 |
|------|------|------|
| 通知 DTO | ✅ 完成 | inbox.dto.ts, notification.dto.ts |
| 站内信箱服务 | ✅ 完成 | inbox.service.ts |
| 通知分发服务 | ✅ 完成 | notification.service.ts |
| 邮件发送服务 | ✅ 完成 | email.service.ts |
| 信箱路由 | ✅ 完成 | inbox.router.ts |
| Outbox 路由 | ✅ 完成 | outbox.router.ts |
| 前端 API 客户端 | ✅ 完成 | inbox.ts, notification-outbox.ts |
| 主应用集成 | ✅ 完成 | modules/index.ts + app.ts |

## 🔧 后端 API 端点

### 站内信箱 - PRD 23.6

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /inbox | 获取信箱列表 | 已认证 |
| GET | /inbox/unread-count | 获取未读数量统计 | 已认证 |
| GET | /inbox/:id | 获取单条消息 | 已认证 |
| POST | /inbox/:id/read | 标记单条为已读 | 已认证 |
| POST | /inbox/read-batch | 批量标记已读 | 已认证 |
| POST | /inbox/read-all | 全部标记已读 | 已认证 |
| DELETE | /inbox/:id | 删除消息 | 已认证 |
| GET | /inbox/preferences | 获取通知偏好 | 已认证 |
| PUT | /inbox/preferences | 更新通知偏好 | 已认证 |

### 通知 Outbox 管理（管理员）- PRD 23.6

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /admin/notification-outbox | 获取 Outbox 列表 | 管理员 |
| GET | /admin/notification-outbox/stats | 获取 Outbox 统计 | 管理员 |
| POST | /admin/notification-outbox/:id/retry | 重试发送失败的通知 | 管理员 |
| POST | /admin/notification-outbox/retry-all-failed | 批量重试所有失败邮件 | 管理员 |
| POST | /admin/notification-outbox/dispatch | 手动分发通知 | 管理员 |

## 📧 事件类型覆盖 - PRD 21.2

### A. 项目 Project
- [x] PROJECT_APPROVED - 项目审核通过
- [x] PROJECT_REJECTED - 项目审核驳回
- [x] PROJECT_JOIN_APPROVED - 加入项目申请通过
- [x] PROJECT_JOIN_REJECTED - 加入项目申请拒绝
- [x] PROJECT_STATUS_CHANGED - 项目状态变化
- [x] PROJECT_EVENT_ADDED - 项目时间线新增事件

### B. 需求 Demand
- [x] DEMAND_PUBLISHED - 新需求发布
- [x] DEMAND_NEW_RESPONSE - 有新响应提交
- [x] DEMAND_RESPONSE_APPROVED - 响应被通过
- [x] DEMAND_RESPONSE_REJECTED - 响应被拒绝
- [x] DEMAND_CLOSED - 需求关闭
- [x] DEMAND_CANCELLED - 需求取消

### C. 响应 Response
- [x] RESPONSE_MODIFY_REQUEST - 负责人发起修改申请
- [x] RESPONSE_ABANDON_REQUEST - 负责人发起废弃申请
- [x] RESPONSE_MODIFY_ACCEPTED - 资源方接受
- [x] RESPONSE_MODIFY_REJECTED - 资源方拒绝
- [x] RESPONSE_ADMIN_ARBITRATION - 管理员裁决结果

### D. Token
- [x] TOKEN_TRANSFER_INITIATED - 发起转账申请
- [x] TOKEN_TRANSFER_APPROVED - 管理员审核通过
- [x] TOKEN_TRANSFER_REJECTED - 管理员审核拒绝
- [x] TOKEN_TRANSFER_CONFIRMED - 收款人确认
- [x] TOKEN_TRANSFER_RECEIVER_REJECTED - 收款人拒绝
- [x] TOKEN_ADMIN_GRANT - 管理员赠与
- [x] TOKEN_ADMIN_DEDUCT - 管理员扣除
- [x] TOKEN_GRANT_APPROVED - 座谈会邀请奖励发放
- [x] TOKEN_GRANT_REJECTED - 座谈会邀请奖励拒绝

### E. 日历（预约/会议）
- [x] BOOKING_CREATED - 场地预约创建
- [x] BOOKING_UPDATED - 场地预约修改
- [x] BOOKING_CANCELLED - 场地预约取消
- [x] BOOKING_CONFLICT_FAILED - 冲突创建失败
- [x] BOOKING_ADMIN_OVERRIDE - 管理员强制覆盖
- [x] MEETING_INVITED - 会议邀请
- [x] MEETING_TIME_CHANGED - 会议时间变更
- [x] MEETING_CANCELLED - 会议取消
- [x] MEETING_FINISHED - 会议结束归档

### F. 社群
- [x] COMMUNITY_MENTIONED - 被@
- [x] COMMUNITY_REPLY - 评论回复
- [x] COMMUNITY_POST_DELETED - 动态被删除

### G. 私聊
- [x] DM_NEW_MESSAGE - 新私聊消息

### H. 人脉资源
- [x] NETWORK_RESOURCE_CREATED - 新增人脉资源
- [x] NETWORK_REFERRAL_SUBMITTED - 引荐记录提交
- [x] NETWORK_REFERRAL_LINKED - 引荐关联

## 📮 邮件频控配置 - PRD 21.4

| 事件类型 | 频控策略 |
|----------|----------|
| DM_NEW_MESSAGE | 1 分钟合并 |
| COMMUNITY_MENTIONED | 5 分钟合并 |
| PROJECT_EVENT_ADDED | 10 分钟合并 |
| 其他关键事件 | 即时发送 |

## 🔐 即时发送事件（不可合并）

- PROJECT_APPROVED / PROJECT_REJECTED
- TOKEN_TRANSFER_APPROVED / TOKEN_TRANSFER_REJECTED
- TOKEN_GRANT_APPROVED / TOKEN_GRANT_REJECTED
- TOKEN_ADMIN_GRANT / TOKEN_ADMIN_DEDUCT

## ✅ PRD 验收标准

| # | 验收项 | 状态 |
|---|--------|------|
| 1 | 站内信箱：必须可查询、可追溯、可跳转业务对象 | ✅ |
| 2 | 邮件：必须有 Outbox 能证明已发送/失败原因 | ✅ |
| 3 | 同一事件不得重复发多封（除频控合并摘要） | ✅ dedupeKey |
| 4 | 管理员能在后台查到 outbox 状态 | ✅ |
| 5 | 邮件失败可重试 | ✅ |
| 6 | 频控只允许"合并"，不允许"丢弃" | ✅ |

## 📊 代码统计

| 模块 | 代码行数 |
|------|----------|
| inbox.dto.ts | 76 行 |
| notification.dto.ts | 236 行 |
| inbox.service.ts | 237 行 |
| notification.service.ts | 345 行 |
| email.service.ts | 262 行 |
| inbox.router.ts | 149 行 |
| outbox.router.ts | 69 行 |
| **后端总计** | **~1,374 行** |
| 前端 API 客户端 | ~230 行 |

## ✅ 查漏补缺（第一轮）

| 功能点 | PRD 条款 | 补充内容 |
|--------|---------|----------|
| **支持批量用户** | PRD 21.1 | `sendNotification` 支持 `targetUserIds` 数组 |
| **事件类型完善** | PRD 21.2 | 新增 15+ 事件类型 |
| **分类映射完善** | PRD 21.2 | `mapEventTypeToCategory` 覆盖所有分类 |
| **标题模板完善** | - | `getNotificationTitle` 覆盖所有事件 |
| **SMTP 配置完善** | - | 添加 `secure` 和 `frontendUrl` 配置 |

## ✅ 查漏补缺（第二轮）

| 功能点 | PRD 条款 | 补充内容 |
|--------|---------|----------|
| **指数退避重试** | PRD 30.4 | `retryCount` + `nextRetryAt` 字段 |
| **最大重试次数** | PRD 30.4 | 最大 5 次重试，指数退避（1min→2min→4min...） |
| **重试统计** | PRD 30.4 | `retryable` + `maxRetriesReached` 统计 |
| **手动分发接口** | PRD 23.6 | `POST /admin/notification-outbox/dispatch` |
| **Outbox 索引优化** | - | `@@index([status, nextRetryAt])` |

## ✅ 查漏补缺（第三轮）

| 功能点 | PRD 条款 | 补充内容 |
|--------|---------|----------|
| **事件类型命名统一** | PRD 21.2 | 兼容新旧命名 (MENTION↔COMMUNITY_MENTIONED) |
| **单元测试** | Node 8 测试方法 | `notification.test.ts` 覆盖核心逻辑 |
| **标题模板兼容** | - | 新增 `DM_NEW_MESSAGE` 等事件标题 |

## ✅ 查漏补缺（第四轮）

| 功能点 | PRD 条款 | 补充内容 |
|--------|---------|----------|
| **Outbox 默认 7 天** | PRD 22.4 | `listOutbox` 默认查询最近 7 天 |
| **信箱跳转工具** | PRD 21.5 | `getInboxItemNavigationUrl()` 前端辅助函数 |
| **分类名称工具** | - | `getInboxCategoryLabel()` 前端辅助函数 |

## ✅ 查漏补缺（第五轮 - 最终）

| 功能点 | PRD 条款 | 补充内容 |
|--------|---------|----------|
| **邮件后台处理器** | PRD 21.5 | `email-processor.ts` 自动处理 Outbox |
| **定时处理** | PRD 30.4 | 每 10 秒处理待发送邮件 |
| **指数退避集成** | PRD 30.4 | 失败后自动重试，最多 5 次 |
| **优雅关闭** | - | 服务关闭时停止邮件处理器 |

## ✅ 完成确认

Node 8（通知中心）已 100% 完成：

- ✅ 事件驱动分发（NotificationEvent → inbox_items + notification_outbox）
- ✅ 邮件发送通道（nodemailer + SMTP）
- ✅ 频控（私聊 1min、社群@ 5min、项目时间线 10min 合并）
- ✅ 站内信箱 CRUD + 未读统计
- ✅ Outbox 观测 + 失败重试
- ✅ 用户通知偏好
- ✅ 前端 API 客户端
- ✅ 支持批量发送给多用户
- ✅ 完整事件类型覆盖（42+ 种）
- ✅ 完整分类映射
- ✅ 指数退避重试策略（PRD 30.4）
- ✅ 手动分发通知接口（PRD 23.6）
- ✅ 事件类型命名统一兼容
- ✅ 单元测试覆盖（notification.test.ts）
- ✅ 邮箱无效情况处理
- ✅ Outbox 默认 7 天筛选（PRD 22.4）
- ✅ 前端信箱跳转工具函数（PRD 21.5）
- ✅ 邮件后台处理器（自动发送 Outbox 邮件）
- ✅ 服务启动时自动启动邮件处理

