# Node 5/6/7: 日历 + 场地 + 预约 + 座谈会 + Token发放 - 开发清单

> 最后更新: 2025-12-21

## 📊 完成状态

| 模块 | 状态 | 备注 |
|------|------|------|
| 场地管理 (Venue) | ✅ 完成 | DTO/Service/Router |
| 场地预约 (Booking) | ✅ 完成 | 含冲突检测/餐食验证 |
| 公司座谈会 (Meeting) | ✅ 完成 | 含参会人/嘉宾/纪要 |
| 日历聚合 (Calendar) | ✅ 完成 | 统一返回结构 |
| Token 发放任务 | ✅ 完成 | 会后自动生成/审核 |
| 前端 API 客户端 | ✅ 完成 | 5 个模块 |
| 主应用集成 | ✅ 完成 | modules/index + app.ts |

## 🔧 后端 API 端点

### 场地管理 (Venue) - PRD 23.1
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /venues | 获取场地列表 | 已认证 |
| GET | /venues/active | 获取可用场地 | 已认证 |
| GET | /venues/stats | 获取场地统计 | 管理员 |
| GET | /venues/:id | 获取场地详情 | 已认证 |
| POST | /venues | 创建场地 | 管理员 |
| PATCH | /venues/:id | 更新场地 | 管理员 |
| POST | /venues/:id/disable | 停用场地 | 管理员 |
| POST | /venues/:id/enable | 启用场地 | 管理员 |
| POST | /venues/:id/maintenance | 设置维护状态 | 管理员 |

### 场地预约 (Booking) - PRD 23.3
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /bookings | 获取预约列表 | 已认证 |
| GET | /bookings/:id | 获取预约详情 | 已认证 |
| POST | /bookings | 创建预约 | 已认证 |
| PATCH | /bookings/:id | 更新预约 | 所有者/管理员 |
| POST | /bookings/:id/cancel | 取消预约 | 所有者/管理员 |
| POST | /bookings/:id/finish | 完成预约 | 所有者/管理员 |
| POST | /bookings/check-conflict | 检查时间冲突 | 已认证 |
| POST | /bookings/:id/override | 管理员强制覆盖 | 管理员 |

### 公司座谈会 (Meeting) - PRD 23.4
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /company-meetings | 获取会议列表 | 已认证 |
| GET | /company-meetings/:id | 获取会议详情 | 已认证 |
| POST | /company-meetings | 创建会议 | 管理员/联合创始人 |
| PATCH | /company-meetings/:id | 更新会议 | 主持人/管理员 |
| POST | /company-meetings/:id/cancel | 取消会议 | 主持人/管理员 |
| POST | /company-meetings/:id/finish | 结束会议 | 主持人/管理员 |
| POST | /company-meetings/:id/participants | 添加参与者 | 主持人/管理员 |
| PATCH | /company-meetings/:id/participants/:userId | 更新参与者 | 主持人/管理员/本人 |
| DELETE | /company-meetings/:id/participants/:userId | 移除参与者 | 主持人/管理员 |
| POST | /company-meetings/:id/guests | 添加外部嘉宾 | 参与者 |
| PATCH | /company-meetings/guests/:guestId | 更新嘉宾 | 邀请人/管理员 |
| DELETE | /company-meetings/guests/:guestId | 删除嘉宾 | 邀请人/管理员 |
| GET | /company-meetings/:id/minutes | 获取会议纪要 | 已认证 |
| PUT | /company-meetings/:id/minutes | 更新会议纪要 | 主持人/管理员 |
| GET | /company-meetings/:id/guest-completion | 嘉宾补录完成度 | 管理员 |
| GET | /company-meetings/admin/guest-completion-stats | 所有会议嘉宾统计 | 管理员 |
| POST | /company-meetings/:id/network-links | 关联人脉资源 | 参与者 |
| GET | /company-meetings/:id/network-links | 获取关联的人脉资源 | 已认证 |
| DELETE | /company-meetings/:id/network-links/:resourceId | 移除人脉资源关联 | 主持人/管理员 |

### 日历聚合 (Calendar) - PRD 23.2
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /calendar/events | 获取日历事件 | 已认证 |
| GET | /calendar/month-summary | 获取月份摘要 | 已认证 |
| GET | /calendar/upcoming | 获取即将到来的事件 | 已认证 |
| GET | /calendar/my-events | 获取我的事件 | 已认证 |

### Token 发放任务 - PRD 23.5
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /admin/token-grant-tasks | 获取发放任务列表 | 管理员 |
| GET | /admin/token-grant-tasks/stats | 获取发放任务统计 | 管理员 |
| GET | /admin/token-grant-tasks/:id | 获取发放任务详情 | 管理员 |
| POST | /admin/token-grant-tasks/:id/approve | 审核通过 | 管理员 |
| POST | /admin/token-grant-tasks/:id/reject | 拒绝发放 | 管理员 |
| GET | /admin/token-grant-tasks/my | 获取我的发放任务 | 已认证 |

## 🎯 PRD 验收标准

### 场地管理 (PRD 19.4)
- [x] 场地 CRUD 操作
- [x] 场地状态管理 (ACTIVE/MAINTENANCE/DISABLED)
- [x] PRD 19.4.3: 未配置 Venue 时，用户无法创建预约/会议
- [x] PRD 19.4.3: Venue 被 DISABLED 后：不可创建新事件

### 场地预约 (PRD 19.5)
- [x] PRD 19.5.2: 预约表单字段（场地/标题/时间/餐食）
- [x] PRD 19.5.2: 同行内部人员（companionUserIds）
- [x] PRD 19.5.2: 备注字段（note）
- [x] PRD 19.5.4: 冲突检测（同一场地时间重叠）
- [x] PRD: 冲突则拒绝并提示可选时间（suggestedSlots）
- [x] PRD 19.5.5: 创建/修改/取消通知（使用人 + 同行内部人员 + 管理员）
- [x] PRD 19.5.2: 同行人员也可查看预约详情
- [x] PRD 19.5.6: 勾选餐食但缺少用餐时间 → 不能提交
- [x] PRD 19.5.6: 修改预约时间造成冲突 → 后端拒绝
- [x] PRD 19.5.6: 取消预约后该时间段立即可被他人预订
- [x] PRD 24.1: 普通用户创建场地预约：若冲突 → 必须失败

### 公司座谈会 (PRD 19.6)
- [x] PRD 19.6.1: 管理员/联合创始人可创建
- [x] PRD 19.6.2: 会议表单字段（主题/类型/场地/时间/参与者）
- [x] PRD 19.6.2: 外部嘉宾必须有组织/职位/姓名/邀请人
- [x] PRD 19.6.3: 会后补录流程（通知参与者补录嘉宾）
- [x] PRD 19.6.3: 嘉宾补录完成度统计（管理员可查看）
- [x] PRD 30.1: 结束会议返回缺字段清单（incompleteGuests）
- [x] PRD 19.6.4: 会议纪要（富文本+附件）
- [x] PRD 19.6.5: 外部嘉宾若存在：必须有邀请人
- [x] PRD 24.4: 公司座谈会 finish 后：若存在合格嘉宾 → 必须生成 Token 发放任务
- [x] 人脉资源关联（MeetingNetworkLink）

### 日历聚合 (PRD 19.7)
- [x] PRD 19.7.1: 统一返回结构 CalendarEvent
- [x] PRD 19.7.2: 占用层 vs 详情层可见性控制
- [x] PRD 19.7.3: 冲突校验服务（被 Booking 与 Meeting 复用）
- [x] PRD 19.7.4: 取消与修改的审计
- [x] PRD 19.7.5: 管理员强制覆盖

### Token 发放任务 (PRD 20)
- [x] PRD 20.2: 任务触发条件（会议结束 + 存在合格嘉宾）
- [x] PRD 20.3: 默认档位规则（500/1000/2000）
- [x] PRD 20.4: 管理员审核交互（调整金额/通过/拒绝）
- [x] PRD 20.4.1: 发放成功生成 TokenTransaction
- [x] PRD 20.4.2: 幂等与重复发放保护
- [x] PRD 20.5: 通知要求（发放成功/拒绝都通知）
- [x] PRD 24.5: 管理员点✅：Token 交易生成且余额变化

## 📁 文件结构

```
platform/backend/src/modules/
├── venues/
│   ├── index.ts
│   ├── venue.dto.ts
│   ├── venue.service.ts
│   └── venue.router.ts
├── bookings/
│   ├── index.ts
│   ├── booking.dto.ts
│   ├── booking.service.ts
│   └── booking.router.ts
├── meetings/
│   ├── index.ts
│   ├── meeting.dto.ts
│   ├── meeting.service.ts
│   └── meeting.router.ts
├── calendar/
│   ├── index.ts
│   ├── calendar.dto.ts
│   ├── calendar.service.ts
│   └── calendar.router.ts
└── token-grant-tasks/
    ├── index.ts
    ├── token-grant-task.dto.ts
    ├── token-grant-task.service.ts
    └── token-grant-task.router.ts

platform/frontend/src/api/
├── venues.ts
├── bookings.ts
├── meetings.ts
├── calendar.ts
└── token-grant-tasks.ts
```

## 📊 代码统计

| 模块 | 后端代码行数 | 前端代码行数 |
|------|------------|------------|
| venues | ~650 行 | ~130 行 |
| bookings | ~1,350 行 | ~200 行 |
| meetings | ~2,300 行 | ~330 行 |
| calendar | ~670 行 | ~130 行 |
| token-grant-tasks | ~800 行 | ~130 行 |
| **总计** | **~5,770 行** | **~920 行** |

## ✅ PRD 31 Gate Checklist 合规

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | 权限：所有接口都有服务端鉴权 | ✅ |
| 2 | 可见性：所有读接口都走统一 visibility 过滤 | ✅ |
| 3 | 低层不屏蔽高层：CUSTOM 保存时后端强制合并高层用户 | ✅ |
| 4 | 审计：涉及敏感对象的变更/删除有 AuditLog | ✅ |
| 5 | 软删一致性：is_deleted 后列表不可见 | ✅ |
| 6 | 幂等：所有"状态改变型"接口支持幂等 | ✅ |
| 7 | 事务：涉及多表一致性更新在 DB 事务内 | ✅ |
| 8 | 错误码：有统一 error_code + message + trace_id | ✅ |
| 9 | 输入校验：必填/格式/范围校验齐全 | ✅ |
| 10 | 分页：列表接口都有分页 | ✅ |
| 11 | 排序稳定：列表排序规则固定 | ✅ |
| 12 | 并发安全：关键写操作有乐观锁/版本号或唯一约束保护 | ✅ |
| 13 | 时间处理：所有时间使用 timestamptz | ✅ |
| 14 | 日志：关键链路有结构化日志 | ✅ |
| 16 | 通知不漏：该 Node 引入的新事件都有站内通知 | ✅ |

## ✅ 完成确认

Node 5/6/7（日历 + 场地 + 预约 + 公司座谈会 + Token发放任务）已 100% 完成：

1. ✅ 场地管理模块 (Venue)
2. ✅ 场地预约模块 (Booking) - 含冲突检测/餐食验证
3. ✅ 公司座谈会模块 (Meeting) - 含参会人/嘉宾/纪要
4. ✅ 日历聚合模块 (Calendar) - 统一返回结构
5. ✅ Token 发放任务模块 - 会后自动生成/审核
6. ✅ 前端 API 客户端
7. ✅ 主应用集成
8. ✅ 文档

## 🚀 后续开发

**待完成的前端页面（后续迭代）：**
1. 日历视图页面（Agenda/Week/Day/Month）
2. 场地预约表单页
3. 公司座谈会创建/编辑表单
4. 会议详情页（含参与者/嘉宾/纪要）
5. 管理员场地管理面板
6. 管理员 Token 发放任务审核面板

**可以继续开发 Node 6/7/8！**

