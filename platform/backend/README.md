# 元征 · 合伙人赋能平台 - 后端服务

## 项目概述

元征平台后端服务，基于 Node.js + Express + Prisma + PostgreSQL 构建。

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **认证**: JWT
- **校验**: Zod
- **日志**: Pino
- **测试**: Vitest

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp env.template .env
# 编辑 .env 文件，填写数据库连接等配置
```

### 3. 初始化数据库

```bash
pnpm prisma migrate dev
pnpm prisma db seed
```

### 4. 启动开发服务器

```bash
pnpm dev
```

服务默认运行在 `http://localhost:3000`

## 项目结构

```
src/
├── app.ts                 # 应用入口
├── config/                # 配置
├── middleware/            # 中间件
│   ├── auth.ts           # 认证中间件
│   ├── errorHandler.ts   # 错误处理
│   ├── requestLogger.ts  # 请求日志
│   └── traceId.ts        # 链路追踪
├── modules/               # 业务模块
│   ├── auth/             # 认证
│   ├── users/            # 用户
│   ├── projects/         # 项目
│   ├── demands/          # 需求
│   ├── responses/        # 响应
│   ├── tokens/           # Token
│   ├── meetings/         # 会议
│   ├── bookings/         # 预约
│   ├── venues/           # 场地
│   ├── calendar/         # 日历
│   ├── network-resources/# 人脉资源
│   ├── news/             # 新闻
│   ├── community/        # 社群（动态/投票）
│   ├── messages/         # 消息（私聊/信箱）
│   ├── notifications/    # 通知
│   ├── announcements/    # 公告
│   ├── feedbacks/        # 反馈
│   ├── dashboard/        # 用户仪表盘
│   ├── admin/            # 管理后台
│   └── ...
├── services/              # 共享服务
│   └── ai.service.ts     # AI 服务
├── jobs/                  # 后台任务
│   ├── email-processor.ts    # 邮件发送
│   ├── vote-processor.ts     # 投票自动关闭
│   └── news-processor.ts     # 新闻自动爬取
├── utils/                 # 工具函数
│   ├── audit.ts          # 审计日志
│   ├── db.ts             # 数据库连接
│   ├── errors.ts         # 错误类
│   ├── jwt.ts            # JWT 工具
│   ├── pagination.ts     # 分页
│   ├── visibility.ts     # 可见性过滤
│   └── ...
└── types/                 # 类型定义
```

## 模块说明

### Node 0-2: 基础设施
- 认证、用户管理、权限层级

### Node 3-4: 核心业务
- 项目、需求、响应、Token

### Node 5-6: 会议与预约
- 座谈会、嘉宾管理、Token 发放
- 场地预约、冲突检测

### Node 7: 人脉资源
- 人脉资源管理、引荐

### Node 8: 通知系统
- 站内信箱、邮件发送
- 事件驱动通知

### Node 9: 管理后台
- 仪表盘、审计日志
- 项目审核、预约管理
- 系统配置

### Node 10: 补全模块
- 新闻资讯、AI 摘要
- 社群动态、投票
- 私聊、用户仪表盘

## API 文档

详见 [API 接口文档](../docs/api-reference.md)

## 测试

### 单元测试

```bash
pnpm test
```

### 端到端测试

```bash
bash scripts/e2e-test.sh
```

### Gate Checklist 自检

```bash
bash scripts/gate-checklist.sh
```

## 关键规则

### 1. 可见性控制

所有读接口都走统一可见性过滤：

```typescript
import { applyVisibilityFilter } from '../utils/visibility';

const where = applyVisibilityFilter(userId, roleLevel, baseWhere);
```

### 2. 审计日志

敏感操作必须记录审计日志：

```typescript
import { createAuditLog } from '../utils/audit';

await createAuditLog({
  userId,
  action: 'DELETE_POST',
  targetType: 'POST',
  targetId: postId,
  details: { reason },
});
```

### 3. 软删除

使用 `isDeleted` 标记而非物理删除：

```typescript
import { notDeleted } from '../utils/softDelete';

const items = await prisma.post.findMany({
  where: { ...notDeleted, ...otherConditions },
});
```

### 4. 事务

涉及多表更新必须使用事务：

```typescript
await prisma.$transaction(async (tx) => {
  await tx.tokenTransaction.create({ ... });
  await tx.user.update({ ... });
});
```

### 5. 幂等性

状态变更接口支持幂等：

```typescript
if (task.status === 'APPROVED') {
  return res.json({ data: task }); // 已处理，直接返回
}
```

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | 数据库连接 | `postgresql://...` |
| `JWT_SECRET` | JWT 密钥 | `your-secret-key` |
| `SMTP_HOST` | SMTP 服务器 | `smtp.example.com` |
| `SMTP_PORT` | SMTP 端口 | `587` |
| `SMTP_USER` | SMTP 用户名 | `noreply@example.com` |
| `SMTP_PASS` | SMTP 密码 | `password` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-...` |
| `OPENAI_BASE_URL` | OpenAI API URL | `https://api.openai.com/v1` |

## 部署

### Docker

```bash
docker build -t yuanzheng-backend .
docker run -p 3000:3000 --env-file .env yuanzheng-backend
```

### 数据库迁移

```bash
pnpm prisma migrate deploy
```

## 开发检查清单

运行 Gate Checklist 确保代码质量：

```bash
bash scripts/gate-checklist.sh
```

20 条检查项：
1. ✅ 权限：所有接口都有服务端鉴权
2. ✅ 可见性：统一 visibility 过滤
3. ✅ 高层用户合并
4. ✅ 审计日志
5. ✅ 软删一致性
6. ✅ 幂等性
7. ✅ 事务
8. ✅ 统一错误码
9. ✅ 输入校验
10. ✅ 分页
11. ✅ 排序稳定
12. ✅ 并发安全
13. ✅ 时间处理
14. ✅ 结构化日志
15. ✅ 回归脚本
16. ✅ 通知不漏
17. ✅ 数据一致性
18. ✅ 性能监控
19. ✅ 可观测性
20. ✅ 工程文档

## License

Proprietary - 元征科技






