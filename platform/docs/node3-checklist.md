# Node 3: Token 账本 - 开发检查清单

## 📋 PRD 交付物对照

根据 PRD 要求，Node 3 需要实现以下功能：

| PRD 条目 | 功能描述 | 状态 | 实现位置 |
|----------|----------|------|----------|
| **核心交付物** ||||
| 1 | token_accounts / token_transactions 模型 | ✅ | `prisma/schema.prisma` |
| 2 | 管理员审核流程 | ✅ | `token.service.ts:adminReviewTransfer` |
| 3 | 收款人确认流程 | ✅ | `token.service.ts:receiverConfirm` |
| 4 | 管理员赠与/扣除 | ✅ | `token.service.ts:adminGrant/adminDeduct` |
| 5 | 项目分红 | ✅ | `token.service.ts:distributeDividend` |
| **PRD 6.2.7 管理员总览** ||||
| 6 | 所有用户余额列表 | ✅ | `token.service.ts:listAllAccounts` |
| 7 | 全局 Token 统计（按时间/项目） | ✅ | `token.service.ts:getGlobalTokenStats` |
| 8 | 按项目 Token 统计 | ✅ | `token.service.ts:getProjectTokenStats` |
| 9 | 查看指定用户交易记录 | ✅ | `token.service.ts:adminListUserTransactions` |

## ✅ PRD 验收标准

| 验收标准 | 实现说明 | 状态 |
|----------|----------|------|
| 初始额度 | 用户注册时根据角色自动创建 TokenAccount（Founder: 100,000, Core: 30,000, Partner: 10,000） | ✅ |
| 不可透支 | 转账和扣除前检查余额 `balance >= amount` | ✅ |
| 交易状态流转 | PENDING_ADMIN_APPROVAL → PENDING_RECEIVER_CONFIRM → COMPLETED/REJECTED | ✅ |
| 管理员赠与/扣除直接完成 | 不需要收款人确认，直接 COMPLETED | ✅ |
| 账本严肃：交易不可物理删除 | 只有状态变更，无 DELETE 操作 | ✅ |
| 幂等控制 | 状态检查防止重复操作，事务保证原子性 | ✅ |
| 余额不为负约束 | 所有扣款操作前检查余额 | ✅ |
| 待审核项目禁止 Token 交易 | 转账时检查 `reviewStatus !== 'PENDING_REVIEW'` | ✅ |
| 废弃项目禁止 Token 操作 | 转账/分红/确认使用时检查 `businessStatus !== 'ABANDONED'` | ✅ |

## 🔌 后端 API 端点

### 用户功能

| 方法 | 端点 | 功能 | 状态 |
|------|------|------|------|
| GET | `/api/v1/tokens/account` | 获取我的 Token 账户 | ✅ |
| GET | `/api/v1/tokens/transactions` | 获取我的交易列表 | ✅ |
| GET | `/api/v1/tokens/transactions/:id` | 获取交易详情 | ✅ |
| GET | `/api/v1/tokens/stats` | 获取我的 Token 统计 | ✅ |
| GET | `/api/v1/tokens/pending-confirm` | 获取待我确认的交易 | ✅ |
| POST | `/api/v1/tokens/transfer` | 发起转账 | ✅ |
| POST | `/api/v1/tokens/transactions/:id/confirm` | 收款人确认 | ✅ |
| POST | `/api/v1/tokens/transactions/:id/cancel` | 取消转账 | ✅ |

### 管理员功能

| 方法 | 端点 | 功能 | 状态 |
|------|------|------|------|
| GET | `/api/v1/tokens/admin/pending` | 获取待审核交易列表 | ✅ |
| POST | `/api/v1/tokens/admin/transactions/:id/review` | 审核转账 | ✅ |
| POST | `/api/v1/tokens/admin/grant` | 管理员赠与 | ✅ |
| POST | `/api/v1/tokens/admin/deduct` | 管理员扣除 | ✅ |
| POST | `/api/v1/tokens/admin/dividend` | 项目分红 | ✅ |

### 管理员 Token 总览 (PRD 6.2.7)

| 方法 | 端点 | 功能 | 状态 |
|------|------|------|------|
| GET | `/api/v1/tokens/admin/accounts` | 所有用户余额列表 | ✅ |
| GET | `/api/v1/tokens/admin/accounts/:userId` | 指定用户账户信息 | ✅ |
| GET | `/api/v1/tokens/admin/stats` | 全局 Token 统计 | ✅ |
| GET | `/api/v1/tokens/admin/stats/projects` | 按项目 Token 统计 | ✅ |
| GET | `/api/v1/tokens/admin/users/:userId/transactions` | 指定用户交易记录 | ✅ |

## 📁 文件结构

```
platform/backend/src/modules/tokens/
├── token.dto.ts       # 数据传输对象定义
├── token.service.ts   # 业务逻辑实现
├── token.router.ts    # API 路由定义
└── index.ts           # 模块导出

platform/frontend/src/api/
└── tokens.ts          # 前端 API 客户端
```

## 🔄 交易状态机

```
发起转账
    │
    ▼
PENDING_ADMIN_APPROVAL (待管理员审核)
    │
    ├── 管理员拒绝 ──► REJECTED (已拒绝)
    │
    ├── 发起人取消 ──► CANCELLED (已取消)
    │
    └── 管理员通过 ──► PENDING_RECEIVER_CONFIRM (待收款确认)
                          │
                          ├── 收款人拒绝 ──► REJECTED (已拒绝)
                          │
                          └── 收款人接受 ──► COMPLETED (已完成)
                                              │
                                              └── 实际扣款/入账
```

## 💰 交易类型

| 类型 | 说明 | 需要审核 | 需要确认 |
|------|------|----------|----------|
| TRANSFER | 普通转账 | ✅ 管理员审核 | ✅ 收款人确认 |
| ADMIN_GRANT | 管理员赠与 | ❌ | ❌ 直接完成 |
| ADMIN_DEDUCT | 管理员扣除 | ❌ | ❌ 直接完成 |
| DIVIDEND | 项目分红 | ❌ | ❌ 直接完成 |
| MEETING_INVITE_REWARD | 座谈会邀请奖励 | ✅ 管理员审核 | ❌ 直接完成 |

## 🔔 通知触发

| 场景 | 通知类型 | 接收人 |
|------|----------|--------|
| 发起转账 | TOKEN_PENDING_APPROVAL | 所有管理员 |
| 管理员通过 | TOKEN_PENDING_CONFIRM | 收款人 |
| 管理员拒绝 | TOKEN_REJECTED | 发起人 |
| 收款人接受 | TOKEN_COMPLETED | 发起人 |
| 收款人拒绝 | TOKEN_REJECTED | 发起人 |
| 管理员赠与 | TOKEN_GRANTED | 接收人 |
| 管理员扣除 | TOKEN_DEDUCTED | 被扣除人 |
| 项目分红 | TOKEN_DIVIDEND | 各接收人 |

## 🔐 权限控制

| 操作 | 要求 |
|------|------|
| 查看账户/交易 | 登录用户（自己的） |
| 发起转账 | 登录用户 |
| 收款确认 | 收款人本人 |
| 取消转账 | 发起人本人（待审核状态） |
| 审核转账 | 管理员 |
| 赠与/扣除 | 管理员 |
| 项目分红 | 管理员 |

## 📊 统计数据

TokenStats 返回以下统计：
- `totalReceived`: 收到的转账总额
- `totalSent`: 发出的转账总额
- `totalGranted`: 收到的管理员赠与总额
- `totalDeducted`: 被管理员扣除的总额
- `totalDividend`: 收到的分红总额
- `netChange`: 净变化 (received + granted + dividend - sent - deducted)

## ⚙️ 技术要点

### 幂等控制
- 所有写操作使用状态检查，只有正确状态才能执行
- 使用 Prisma 事务保证原子性
- 收款确认时再次检查发起人余额

### 并发安全
- 使用 `prisma.$transaction` 保证操作原子性
- 扣款前锁定检查余额，防止超支

### 审计追溯
- 所有交易记录永久保存
- 管理员操作记录 adminUserId 和 adminComment
- 项目分红写入 ProjectEvent

---

**✅ Node 3 后端功能 100% 完成！**
**✅ 前端 API 客户端 100% 完成！**

下一步可开发：
- Node 4: 人脉资源体系
- Node 5: 日历 + 场地 + 预约
- Node 6: 公司座谈会
- Node 7: 会后 Token 发放任务（TokenGrantTask）

