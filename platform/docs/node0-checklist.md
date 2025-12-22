# Node 0：工程底座 完整验收清单

> 根据 PRD v3 第28节和第31节要求
> 
> **关键要求**: 为 PRD 20 条工程验收 Gate Checklist 提供基础设施

---

## 📋 PRD Node 0 核心交付物

### ✅ 1. 单体/前后端工程结构
```
platform/
├── backend/           # Express + TypeScript + Prisma
├── frontend/          # React + Vite + TypeScript + TailwindCSS
├── scripts/           # 运维脚本
├── pnpm-workspace.yaml
├── docker-compose.yml
└── package.json
```

### ✅ 2. 数据库迁移框架（Prisma）
- 完整 v3 模型（40+ 表，1200+ 行）
- 迁移命令 `pnpm db:migrate` / `pnpm db:generate`
- 种子数据 `prisma/seed.ts`（4个测试账号 + 2个场地）

### ✅ 3. CI/CD 流水线
- GitHub Actions `.github/workflows/ci.yml`
- Lint、单元测试、迁移检查、Docker 构建

### ✅ 4. 基础日志 + trace_id
- Pino 结构化日志
- `X-Trace-Id` 请求追踪
- 请求/响应自动记录

---

## 📋 后端工具清单（23个文件）

```
backend/src/utils/
├── index.ts           # 统一导出
├── db.ts              # 数据库连接
├── logger.ts          # 日志 (Gate #14)
├── errors.ts          # 错误码 (Gate #8)
├── errors.test.ts     # 单元测试 (Gate #15)
├── jwt.ts             # JWT (Gate #1)
├── visibility.ts      # 可见性 (Gate #2, #3)
├── audit.ts           # 审计 (Gate #4)
├── softDelete.ts      # 软删除 (Gate #5)
├── idempotency.ts     # 幂等性 (Gate #6)
├── transaction.ts     # 事务 (Gate #7)
├── validation.ts      # 校验 (Gate #9)
├── pagination.ts      # 分页 (Gate #10)
├── sorting.ts         # 排序 (Gate #11)
├── datetime.ts        # 时间 (Gate #13)
├── notification.ts    # 通知 (Gate #16)
├── password.ts        # 密码加密 (PRD 1665)
├── rateLimit.ts       # 频控 (PRD 8.2)
├── email.ts           # 邮件 (PRD D)
├── conflict.ts        # 冲突检测 (PRD 4.4)
├── performance.ts     # 性能监控 (PRD 4.5, Gate #18) NEW
├── systemConfig.ts    # 系统配置 (PRD 可配置项) NEW
└── security.ts        # 安全工具 (PRD 4.5) NEW
```

---

## 📋 运维脚本

```
scripts/
├── backup.sh          # 数据库备份 (PRD 4.5: 每日全量备份)
├── restore.sh         # 数据库恢复 (PRD 4.5: RTO ≈ 4小时)
├── healthcheck.sh     # 健康检查
└── smoke-test.sh      # Node 0 Smoke 测试 (PRD Gate #15)
```

---

## 📋 单元测试 (Gate #15)

```
backend/src/utils/
├── errors.test.ts     # 错误处理测试
├── jwt.test.ts        # JWT 工具测试 (Gate #1)
├── password.test.ts   # 密码工具测试 (PRD 4.5)
├── datetime.test.ts   # 时间处理测试 (Gate #13)
├── visibility.test.ts # 可见性测试 (Gate #2, #3)
└── rateLimit.test.ts  # 频控测试 (PRD 8.2)
```

**测试覆盖关键场景：**
- JWT 生成、验证、解码、提取
- 密码哈希、验证、强度校验
- 时间范围重叠检测（场地冲突核心）
- 用餐时间在预约范围内校验（PRD 19.5.2）
- 可见性规则（ALL/ROLE_MIN_LEVEL/CUSTOM）
- 低层不屏蔽高层验证（Gate #3）
- 验证码60秒频控（PRD 8.2）
- 登录5分钟5次限制（PRD 8.2）

---

## 📋 前端基础架构

### ✅ 配置文件
| 文件 | 说明 |
|------|------|
| `src/config/index.ts` | 全局配置（API、断点、动效、布局） |
| `tailwind.config.js` | PRD v3 色彩体系 + 动画 |
| `vite.config.ts` | Vite 配置 + 代理 |
| `vitest.config.ts` | 测试配置 |
| `nginx.prod.conf` | 生产环境 HTTPS 配置 (PRD 4.5) NEW |

### ✅ 组件
| 文件 | 说明 | PRD 依据 |
|------|------|----------|
| `components/common/ProtectedRoute.tsx` | 路由守卫 | PRD 8.2 登录跳转 |
| `components/layout/AppLayout.tsx` | 主布局 | PRD 6.4 布局 |
| `components/layout/BottomNav.tsx` | 底部导航 | PRD 5.1 五栏+加号 |

### ✅ 状态管理
| 文件 | 说明 |
|------|------|
| `stores/authStore.ts` | 认证状态（Zustand） |
| `stores/uiStore.ts` | UI 状态 |

### ✅ API 层
| 文件 | 说明 |
|------|------|
| `api/client.ts` | Axios 封装 + 拦截器 |
| `hooks/useApi.ts` | TanStack Query 封装 |
| `hooks/useMediaQuery.ts` | 响应式 Hook |

---

## 📋 PRD 第31节：20条 Gate Checklist 基础设施

| Gate | 要求 | 工具/实现 | 状态 |
|------|------|----------|------|
| #1 | 权限：服务端鉴权 | `middleware/auth.ts` | ✅ |
| #2 | 可见性过滤 | `utils/visibility.ts` | ✅ |
| #3 | 低层不屏蔽高层 | `enforceHigherRoleVisibility()` | ✅ |
| #4 | 审计日志 | `utils/audit.ts` | ✅ |
| #5 | 软删一致性 | `utils/softDelete.ts` | ✅ |
| #6 | 幂等性 | `utils/idempotency.ts` | ✅ |
| #7 | 事务 | `utils/transaction.ts` | ✅ |
| #8 | 统一错误码 | `utils/errors.ts` | ✅ |
| #9 | 输入校验 | `utils/validation.ts` (Zod) | ✅ |
| #10 | 分页 | `utils/pagination.ts` | ✅ |
| #11 | 排序稳定 | `utils/sorting.ts` | ✅ |
| #12 | 并发安全 | Prisma 乐观锁 + 事务 | ✅ |
| #13 | 时间处理 | `utils/datetime.ts` | ✅ |
| #14 | 结构化日志 | `utils/logger.ts` (Pino) | ✅ |
| #15 | 回归脚本 | Vitest 测试框架 | ✅ |
| #16 | 通知不漏 | `utils/notification.ts` | ✅ |
| #17 | 数据一致性 | Prisma 外键 + 错误处理 | ✅ |
| #18 | 性能冒烟 | `utils/performance.ts` | ✅ |
| #19 | 可观测 | traceId + Outbox 状态 | ✅ |
| #20 | 文档 | README + 本清单 | ✅ |

---

## 📋 PRD 非功能需求实现 (4.5)

| PRD 条目 | 要求 | 实现 | 状态 |
|----------|------|------|------|
| **性能** | P95 ≤ 300ms | `performance.ts` 监控 | ✅ |
| **备份** | 每日全量，保留30天 | `scripts/backup.sh` | ✅ |
| **容灾** | RPO ≈ 24h, RTO ≈ 4h | `scripts/restore.sh` | ✅ |
| **安全** | 全站 HTTPS | `nginx.prod.conf` | ✅ |
| **安全** | 密码加密存储 | `password.ts` bcrypt | ✅ |
| **安全** | 服务端权限校验 | `middleware/auth.ts` | ✅ |

---

## 📋 PRD 可配置项管理

| 配置项 | PRD 依据 | 实现位置 | 默认值 |
|--------|----------|----------|--------|
| Token 初始额度 | PRD 1671 | `config.token.initialAmounts` | 100k/30k/10k |
| 嘉宾奖励默认值 | PRD 4.2, C | `config.guestReward` | 500/500/1000/2000 |
| 验证码有效期 | PRD 8.2 | `config.verification.codeTTL` | 600秒 |
| 验证码频控间隔 | PRD 8.2 | `config.verification.codeInterval` | 60秒 |
| 登录尝试限制 | PRD 8.2 | `config.login.maxAttempts` | 5次/5分钟 |
| 用餐时间缓冲 | PRD 19.5.2 | `config.mealTimeBufferMinutes` | 30分钟 |
| 允许创始人创建会议 | PRD 3.3 | `config.features.allowFounderCreateMeeting` | false |
| 允许自助注册 | PRD A3 | `config.features.allowSelfRegistration` | false |

---

## 📋 安全工具函数

| 函数 | 说明 |
|------|------|
| `generateVerificationCode()` | 生成6位数字验证码 |
| `generateSecureToken()` | 生成安全随机字符串 |
| `generateUUID()` | 生成 UUID v4 |
| `sha256()` / `hmacSha256()` | 哈希计算 |
| `secureCompare()` | 时序安全比较 |
| `maskSensitiveData.*` | 手机/邮箱/身份证/银行卡脱敏 |
| `getClientIP()` | 获取客户端真实IP |
| `detectSuspiciousRequest()` | 检测可疑请求 |
| `escapeHtml()` | XSS 转义 |
| `sanitizeInput()` | 清理用户输入 |

---

## 📊 验收标准检查

| 标准 | 状态 | 验证方法 |
|------|------|----------|
| 新人 10 分钟跑起来 | ✅ | `docker-compose up -d` |
| 迁移可回滚/可重放 | ✅ | `prisma migrate reset` |
| API 统一错误码 + trace_id | ✅ | 测试任意接口 |
| 验证码频控 60 秒 | ✅ | `checkVerificationCodeRateLimit()` |
| 密码加密存储 | ✅ | `hashPassword()` bcrypt |
| 场地冲突检测 | ✅ | `checkVenueConflict()` |
| 邮件 Outbox 追踪 | ✅ | `NotificationOutbox` 模型 |
| 移动端 viewport-fit | ✅ | index.html meta 标签 |
| 底部导航56px | ✅ | `config.layout.bottomNavHeight` |
| 底部"+"快捷动作 | ✅ | `BottomNav.tsx` Action Sheet |
| 路由守卫跳转登录 | ✅ | `ProtectedRoute.tsx` |
| 性能监控 P95 | ✅ | `performanceMiddleware()` |
| 数据库备份脚本 | ✅ | `scripts/backup.sh` |
| HTTPS 配置 | ✅ | `nginx.prod.conf` |
| 敏感数据脱敏 | ✅ | `maskSensitiveData.*` |

---

## 📁 完整文件结构

```
platform/
├── backend/
│   ├── src/
│   │   ├── app.ts                    # Express 入口
│   │   ├── config/index.ts           # 完整配置（含验证）
│   │   ├── middleware/               # 中间件
│   │   │   ├── auth.ts               # 认证
│   │   │   ├── errorHandler.ts       # 错误处理
│   │   │   ├── requestLogger.ts      # 请求日志
│   │   │   └── traceId.ts            # 追踪ID
│   │   ├── modules/
│   │   │   └── health/               # 健康检查
│   │   ├── utils/                    # 23个工具文件
│   │   ├── types/                    # 类型定义
│   │   └── test/                     # 测试配置
│   ├── prisma/
│   │   ├── schema.prisma             # 完整模型
│   │   └── seed.ts                   # 种子数据
│   ├── env.template                  # 环境变量模板（完整）
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx                   # 主应用
│   │   ├── main.tsx                  # 入口
│   │   ├── config/index.ts           # 前端配置
│   │   ├── api/client.ts             # API 客户端
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   └── layout/
│   │   │       ├── AppLayout.tsx
│   │   │       └── BottomNav.tsx
│   │   ├── hooks/                    # 自定义 Hooks
│   │   ├── stores/                   # Zustand 状态
│   │   ├── pages/                    # 页面组件
│   │   ├── styles/                   # 样式
│   │   └── types/                    # 类型
│   ├── tailwind.config.js            # PRD 色彩体系
│   ├── nginx.conf                    # 开发环境
│   ├── nginx.prod.conf               # 生产环境 HTTPS
│   ├── Dockerfile
│   └── package.json
├── scripts/
│   ├── backup.sh                     # 数据库备份
│   ├── restore.sh                    # 数据库恢复
│   └── healthcheck.sh                # 健康检查
├── docker-compose.yml
├── .github/workflows/ci.yml
├── README.md
└── docs/
    └── node0-checklist.md            # 本文档
```

---

## 🎯 测试账号

```
管理员:     admin@yuanzheng.com     / admin123
联合创始人: founder@yuanzheng.com   / founder123
核心合伙人: core@yuanzheng.com      / core123
普通合伙人: partner@yuanzheng.com   / partner123
```

---

## ✅ Node 0 验收结论

**所有 PRD 要求的 Node 0 交付物均已完成：**

1. ✅ 20 条工程验收 Gate Checklist 基础设施
2. ✅ 后端 23 个工具文件
3. ✅ 前端基础架构（配置/组件/状态/API/路由）
4. ✅ Docker Compose 一键启动
5. ✅ CI/CD 流水线
6. ✅ 完整种子数据
7. ✅ 非功能需求（性能监控、备份恢复、HTTPS、安全）
8. ✅ 可配置项管理

**可以开始 Node 1：身份、角色、可见性 的开发。**
