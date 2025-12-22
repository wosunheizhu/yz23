# 元征平台 API 接口文档

## 概述

- **基础 URL**: `/api`
- **认证方式**: Bearer Token (JWT)
- **响应格式**: JSON

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

## 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  },
  "traceId": "uuid"
}
```

---

## 1. 认证模块 `/api/auth`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/register` | 用户注册 | ❌ |
| POST | `/login` | 用户登录 | ❌ |
| GET | `/me` | 获取当前用户信息 | ✅ |
| POST | `/refresh` | 刷新 Token | ✅ |
| POST | `/logout` | 退出登录 | ✅ |
| POST | `/forgot-password` | 忘记密码 | ❌ |
| POST | `/reset-password` | 重置密码 | ❌ |

---

## 2. 用户模块 `/api/users`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 用户列表（合伙人名录） | ✅ |
| GET | `/:id` | 用户详情 | ✅ |
| PUT | `/:id` | 更新用户资料 | ✅ |
| GET | `/:id/notes` | 获取用户私人备注 | ✅ |
| PUT | `/:id/notes` | 更新用户私人备注 | ✅ |

---

## 3. 项目模块 `/api/projects`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 项目列表 | ✅ |
| POST | `/` | 创建项目 | ✅ |
| GET | `/:id` | 项目详情 | ✅ |
| PUT | `/:id` | 更新项目 | ✅ |
| DELETE | `/:id` | 删除项目（软删） | ✅ |
| GET | `/:id/timeline` | 项目时间线 | ✅ |
| GET | `/:id/members` | 项目成员列表 | ✅ |
| POST | `/:id/members` | 添加项目成员 | ✅ |
| POST | `/:id/join` | 申请加入项目 | ✅ |
| POST | `/:id/join-requests/:requestId/approve` | 批准加入申请 | ✅ |
| POST | `/:id/join-requests/:requestId/reject` | 拒绝加入申请 | ✅ |

---

## 4. 需求模块 `/api/demands`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 需求列表 | ✅ |
| POST | `/` | 发布需求 | ✅ |
| GET | `/:id` | 需求详情 | ✅ |
| PUT | `/:id` | 更新需求 | ✅ |
| DELETE | `/:id` | 删除需求 | ✅ |
| POST | `/:id/close` | 关闭需求 | ✅ |

---

## 5. 响应模块 `/api/responses`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 响应列表 | ✅ |
| POST | `/` | 提交响应 | ✅ |
| GET | `/:id` | 响应详情 | ✅ |
| PUT | `/:id` | 更新响应 | ✅ |
| POST | `/:id/accept` | 接受响应 | ✅ |
| POST | `/:id/reject` | 拒绝响应 | ✅ |
| POST | `/:id/abandon` | 废弃响应 | ✅ |

---

## 6. Token 模块 `/api/tokens`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/balance` | 获取余额 | ✅ |
| GET | `/transactions` | 交易记录列表 | ✅ |
| POST | `/transfer` | 转账 | ✅ |
| GET | `/transactions/:id` | 交易详情 | ✅ |

---

## 7. 会议模块 `/api/meetings`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 会议列表 | ✅ |
| POST | `/` | 创建会议 | ✅ |
| GET | `/:id` | 会议详情 | ✅ |
| PUT | `/:id` | 更新会议 | ✅ |
| DELETE | `/:id` | 删除会议 | ✅ |
| POST | `/:id/finish` | 完成会议 | ✅ |
| POST | `/:id/cancel` | 取消会议 | ✅ |
| GET | `/:id/guests` | 嘉宾列表 | ✅ |
| POST | `/:id/guests` | 添加嘉宾 | ✅ |
| PUT | `/:id/guests/:guestId` | 更新嘉宾 | ✅ |
| DELETE | `/:id/guests/:guestId` | 删除嘉宾 | ✅ |
| POST | `/:id/minutes` | 添加会议纪要 | ✅ |

---

## 8. 场地预约模块 `/api/bookings`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 预约列表 | ✅ |
| POST | `/` | 创建预约 | ✅ |
| GET | `/:id` | 预约详情 | ✅ |
| PUT | `/:id` | 修改预约 | ✅ |
| DELETE | `/:id` | 取消预约 | ✅ |
| GET | `/suggestions` | 获取推荐时段 | ✅ |
| POST | `/check-conflict` | 冲突检测 | ✅ |

---

## 9. 场地模块 `/api/venues`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 场地列表 | ✅ |
| POST | `/` | 创建场地（管理员） | ✅ Admin |
| GET | `/:id` | 场地详情 | ✅ |
| PUT | `/:id` | 更新场地（管理员） | ✅ Admin |
| DELETE | `/:id` | 删除场地（管理员） | ✅ Admin |

---

## 10. 日历模块 `/api/calendar`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/events` | 日历事件列表 | ✅ |
| GET | `/export` | 导出 ICS 文件 | ✅ |

---

## 11. 人脉资源模块 `/api/network-resources`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 人脉资源列表 | ✅ |
| POST | `/` | 创建人脉资源 | ✅ |
| GET | `/:id` | 人脉资源详情 | ✅ |
| PUT | `/:id` | 更新人脉资源 | ✅ |
| DELETE | `/:id` | 删除人脉资源 | ✅ |
| POST | `/:id/referral` | 提交人脉引荐 | ✅ |

---

## 12. 资源 AI 模块 `/api/network-resources/ai`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/chat` | AI 资源探索对话 | ✅ |
| POST | `/recommend` | AI 资源推荐 | ✅ |

---

## 13. 新闻模块 `/api/news`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 新闻列表 | ✅ |
| POST | `/` | 创建新闻（管理员） | ✅ Admin |
| GET | `/:id` | 新闻详情 | ✅ |
| PUT | `/:id` | 更新新闻（管理员） | ✅ Admin |
| DELETE | `/:id` | 删除新闻（管理员） | ✅ Admin |
| POST | `/:id/link-project` | 关联项目 | ✅ |
| GET | `/sources` | 新闻源列表（管理员） | ✅ Admin |
| POST | `/sources` | 创建新闻源（管理员） | ✅ Admin |
| PUT | `/sources/:id` | 更新新闻源（管理员） | ✅ Admin |
| DELETE | `/sources/:id` | 删除新闻源（管理员） | ✅ Admin |

---

## 14. 新闻 AI 模块 `/api/news/ai`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/chat` | AI 新闻对话 | ✅ |
| POST | `/summary` | AI 新闻摘要 | ✅ |
| POST | `/keywords` | AI 关键词提取 | ✅ |
| POST | `/search` | AI 智能搜索 | ✅ |

---

## 15. 社群动态模块 `/api/posts`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 动态列表 | ✅ |
| POST | `/` | 发布动态 | ✅ |
| GET | `/:id` | 动态详情 | ✅ |
| PUT | `/:id` | 更新动态 | ✅ |
| DELETE | `/:id` | 删除动态 | ✅ |
| POST | `/:id/like` | 点赞 | ✅ |
| DELETE | `/:id/like` | 取消点赞 | ✅ |
| GET | `/:id/comments` | 评论列表 | ✅ |
| POST | `/:id/comments` | 发表评论 | ✅ |
| DELETE | `/comments/:commentId` | 删除评论 | ✅ |

---

## 16. 投票模块 `/api/votes`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 投票列表 | ✅ |
| POST | `/` | 创建投票 | ✅ |
| GET | `/:id` | 投票详情 | ✅ |
| PUT | `/:id` | 更新投票 | ✅ |
| DELETE | `/:id` | 删除投票 | ✅ |
| POST | `/:id/cast` | 投票 | ✅ |
| POST | `/:id/close` | 关闭投票 | ✅ |
| GET | `/:id/results` | 投票结果 | ✅ |

---

## 17. 私聊模块 `/api/dm`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/conversations` | 会话列表 | ✅ |
| GET | `/conversations/:id/messages` | 消息列表 | ✅ |
| POST | `/` | 发送私信 | ✅ |
| POST | `/conversations/:id/read` | 标记已读 | ✅ |

---

## 18. 信箱模块 `/api/inbox`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 信箱消息列表 | ✅ |
| GET | `/stats` | 信箱统计（未读数） | ✅ |
| POST | `/:id/read` | 标记已读 | ✅ |
| POST | `/read-all` | 全部标记已读 | ✅ |
| DELETE | `/:id` | 删除消息 | ✅ |

---

## 19. 用户仪表盘模块 `/api/dashboard`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/overview` | 仪表盘概览 | ✅ |
| GET | `/projects` | 我的项目 | ✅ |
| GET | `/todos` | 我的待办 | ✅ |
| GET | `/token` | Token 概览 | ✅ |
| GET | `/contributions` | 贡献统计 | ✅ |
| GET | `/platform-value` | 平台价值 | ✅ |
| GET | `/inbox-badge` | 信箱红点 | ✅ |

---

## 20. 公告模块 `/api/announcements`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 公告列表 | ✅ |
| GET | `/:id` | 公告详情 | ✅ |
| POST | `/` | 发布公告（管理员） | ✅ Admin |
| PUT | `/:id` | 更新公告（管理员） | ✅ Admin |
| DELETE | `/:id` | 删除公告（管理员） | ✅ Admin |

---

## 21. 意见反馈模块 `/api/feedbacks`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 反馈列表 | ✅ |
| POST | `/` | 提交反馈 | ✅ |
| GET | `/:id` | 反馈详情 | ✅ |
| POST | `/:id/reply` | 回复反馈（管理员） | ✅ Admin |
| POST | `/:id/close` | 关闭反馈（管理员） | ✅ Admin |

---

## 22. 管理员模块 `/api/admin`

### 22.1 仪表盘

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/dashboard/stats` | 仪表盘统计 | ✅ Admin |
| GET | `/dashboard/audit-logs` | 审计日志 | ✅ Admin |

### 22.2 项目管理

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/projects/pending` | 待审核项目 | ✅ Admin |
| POST | `/projects/:id/approve` | 批准项目 | ✅ Admin |
| POST | `/projects/:id/reject` | 驳回项目 | ✅ Admin |

### 22.3 预约管理

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/bookings` | 预约列表 | ✅ Admin |
| POST | `/bookings/:id/override` | 覆盖预约 | ✅ Admin |
| GET | `/bookings/export` | 导出预约 CSV | ✅ Admin |
| GET | `/venues/:id/occupancy` | 场地占用率 | ✅ Admin |

### 22.4 响应仲裁

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/responses/disputed` | 争议响应列表 | ✅ Admin |
| POST | `/responses/:id/arbitrate` | 仲裁响应 | ✅ Admin |

### 22.5 Token 发放

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/token-grant-tasks` | 发放任务列表 | ✅ Admin |
| POST | `/token-grant-tasks/:id/approve` | 批准发放 | ✅ Admin |
| POST | `/token-grant-tasks/:id/reject` | 拒绝发放 | ✅ Admin |

### 22.6 系统配置

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/config` | 获取系统配置 | ✅ Admin |
| PUT | `/config` | 更新系统配置 | ✅ Admin |

### 22.7 通知管理

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/notification-outbox` | 邮件发送队列 | ✅ Admin |

### 22.8 人脉引荐

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/network-referrals` | 引荐列表 | ✅ Admin |

---

## 23. 健康检查 `/api/health`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/` | 健康检查 | ❌ |
| GET | `/ready` | 就绪检查 | ❌ |

---

## 分页参数

所有列表接口支持以下分页参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 20 | 每页数量 |

响应格式：

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

---

## 可见性枚举

```typescript
enum Visibility {
  ALL = 'ALL',           // 所有人可见
  ROLE_LEVEL = 'ROLE_LEVEL',  // 角色层级以上可见
  CUSTOM = 'CUSTOM'      // 自定义用户可见
}
```

---

## 角色层级

| 层级 | 角色 |
|------|------|
| 1 | 联合创始人 |
| 2 | 核心合伙人 |
| 3 | 普通合伙人 |

---

*文档版本: v3.0*
*更新日期: 2025-12-22*






