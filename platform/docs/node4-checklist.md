# Node 4: 人脉资源体系 - 开发检查清单

## 📋 PRD 交付物对照

根据 PRD 要求，Node 4 需要实现以下功能：

| PRD 条目 | 功能描述 | 状态 | 实现位置 |
|----------|----------|------|----------|
| **核心交付物** ||||
| 1 | network_resources 模型 | ✅ | `prisma/schema.prisma` |
| 2 | network_referrals 模型 | ✅ | `prisma/schema.prisma` |
| 3 | 统一人脉资源表单组件后端能力 | ✅ | `network-resource.service.ts` |
| 4 | 新建+选择+去重提示 | ✅ | `checkDuplicate`, `createNetworkResource` |
| 5 | 项目/需求/响应可关联人脉资源 | ✅ | `linkToObject`, `unlinkFromObject` |

## ✅ PRD 验收标准

| 验收标准 | 实现说明 | 状态 |
|----------|----------|------|
| 去重提示测试（模糊：姓名+组织+职位） | `checkDuplicate` 返回相似度 ≥50% 的潜在重复 | ✅ |
| 可见性测试（敏感联系方式字段） | contact 字段仅创建者或管理员可见 | ✅ |
| 3 步内完成"+ 引荐" | `createReferral` 支持同时新建资源 | ✅ |
| 关联后可在"我的贡献"统计口径正确聚合 | `getMyContributionStats` 返回完整统计 | ✅ |
| 联系进展状态（PRD 10.3） | 支持标记"已联系/待联系/已引荐成功" | ✅ |
| 可见范围筛选 | 列表支持按可见范围筛选 | ✅ |
| Gate #3: 低层不能屏蔽高层 | 创建/更新时验证 `validateVisibilityConfig` | ✅ |
| PRD 27.1 API 筛选参数 | 支持 keyword/industry/region/strength_min/visible 筛选 | ✅ |
| PRD 27.2 管理员引荐筛选 | 支持 referrer_id/type/related_object 筛选 | ✅ |

## 🔌 后端 API 端点

### 人脉资源

| 方法 | 端点 | 功能 | 状态 |
|------|------|------|------|
| POST | `/api/v1/network-resources` | 创建人脉资源 | ✅ |
| GET | `/api/v1/network-resources` | 获取人脉资源列表 | ✅ |
| GET | `/api/v1/network-resources/:id` | 获取人脉资源详情 | ✅ |
| PUT | `/api/v1/network-resources/:id` | 更新人脉资源 | ✅ |
| DELETE | `/api/v1/network-resources/:id` | 删除人脉资源（软删除） | ✅ |
| PATCH | `/api/v1/network-resources/:id/contact-status` | 更新联系进展状态 | ✅ |
| POST | `/api/v1/network-resources/check-duplicate` | 检查重复 | ✅ |
| POST | `/api/v1/network-resources/link` | 关联到业务对象 | ✅ |
| POST | `/api/v1/network-resources/unlink` | 取消关联 | ✅ |
| GET | `/api/v1/network-resources/:id/links` | 获取关联对象 | ✅ |
| GET | `/api/v1/network-resources/my-contribution` | 我的贡献统计 | ✅ |
| GET | `/api/v1/network-resources/admin/stats` | 管理员平台统计 | ✅ |

### 引荐记录

| 方法 | 端点 | 功能 | 状态 |
|------|------|------|------|
| POST | `/api/v1/network-resources/referrals` | 创建引荐记录 | ✅ |
| GET | `/api/v1/network-resources/referrals` | 获取引荐记录列表（支持按引荐人/类型/关联对象筛选） | ✅ |
| GET | `/api/v1/network-resources/referrals/:id` | 获取引荐记录详情 | ✅ |

## 📁 文件结构

```
platform/backend/src/modules/network-resources/
├── network-resource.dto.ts       # 数据传输对象定义
├── network-resource.service.ts   # 业务逻辑实现
├── network-resource.router.ts    # API 路由定义
└── index.ts                      # 模块导出

platform/frontend/src/api/
└── network-resources.ts          # 前端 API 客户端
```

## 🗂️ 数据模型

### NetworkResource（人脉资源）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| resourceType | PERSON/ORG | 资源类型 |
| name | String? | 姓名（PERSON必填） |
| organization | String? | 所属组织 |
| title | String? | 职位 |
| industryTags | String[] | 行业标签 |
| region | String? | 地区 |
| relationshipStrength | Int | 关系强度 1-5 |
| relationshipDesc | String? | 关系描述 |
| contact | String? | 联系方式（敏感） |
| note | String? | 备注 |
| contactStatus | PENDING/CONTACTED/SUCCEEDED/FAILED | 联系进展状态 |
| contactStatusNote | String? | 进展备注 |
| createdByUserId | String | 创建者 |
| visibilityScopeType | ALL/ROLE_MIN_LEVEL/CUSTOM | 可见性类型 |

### NetworkReferral（引荐记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| networkResourceId | String | 关联的人脉资源 |
| referrerUserId | String | 引荐人 |
| referralType | MEETING/PROJECT/DEMAND/OTHER | 引荐类型 |
| relatedObjectType | String? | 关联对象类型 |
| relatedObjectId | String? | 关联对象ID |
| description | String | 引荐说明 |
| visibilityScopeType | ALL/ROLE_MIN_LEVEL/CUSTOM | 可见性类型 |

## 🔗 关联关系

人脉资源可以关联到以下业务对象：

| 对象类型 | 关联表 | 说明 |
|----------|--------|------|
| 项目 | ProjectNetworkLink | 项目关键人脉 |
| 需求 | DemandNetworkLink | 需求相关人脉 |
| 响应 | ResponseNetworkLink | 响应涉及人脉 |
| 会议 | MeetingNetworkLink | 会议相关人脉 |

## 🔐 权限控制

| 操作 | 要求 |
|------|------|
| 创建资源 | 登录用户 |
| 查看资源 | 根据可见性规则判断 |
| 编辑资源 | 创建者或管理员 |
| 删除资源 | 创建者或管理员 |
| 查看联系方式 | 创建者或管理员（敏感字段保护） |
| 创建引荐 | 登录用户 |
| 关联到对象 | 登录用户 |

## 📊 我的贡献统计

`getMyContributionStats` 返回以下统计数据（用于 Dashboard）：

| 指标 | 说明 |
|------|------|
| networkResourcesCreated | 我新增的人脉资源数 |
| referralsCreated | 我发起的人脉引荐数 |
| projectLinksCount | 我的资源被项目关联次数 |
| demandLinksCount | 我的资源被需求关联次数 |

## ⚙️ 技术要点

### 去重检查
- 按姓名+组织+职位模糊匹配
- 相似度 ≥50% 才返回提示
- 不强制阻止创建，仅提供建议

### 可见性过滤
- ALL: 所有人可见
- ROLE_MIN_LEVEL: 指定最低角色级别
- CUSTOM: 自定义用户列表
- 管理员可见全部

### 敏感字段保护
- `contact` 字段为敏感信息
- 仅创建者或管理员可查看
- 其他用户查询时返回 null

### 一键引荐
- 支持选择已有资源
- 支持同时新建资源
- 自动建立资源与对象的关联

## 🔔 通知触发 (PRD 21.2.H)

| 场景 | 通知类型 | 接收人 |
|------|----------|--------|
| 创建人脉资源 | NETWORK_RESOURCE_CREATED | 创建者 |
| 创建引荐记录 | REFERRAL_CREATED | 引荐人 |
| 人脉资源被关联到业务对象 | NETWORK_RESOURCE_LINKED | 资源创建者 |

## 📊 联系进展状态 (PRD 10.3)

支持标记人脉资源的联系进展：

| 状态 | 说明 |
|------|------|
| PENDING | 待联系 |
| CONTACTED | 已联系 |
| SUCCEEDED | 已引荐成功 |
| FAILED | 未成功 |

## 📈 管理员平台统计

`getPlatformStats` 返回以下全局统计数据：

| 指标 | 说明 |
|------|------|
| totalResources | 人脉资源总数 |
| totalReferrals | 引荐记录总数 |
| totalProjectLinks | 项目关联总数 |
| totalDemandLinks | 需求关联总数 |
| totalMeetingLinks | 会议关联总数 |
| resourcesByStatus | 按联系进展状态统计 |
| resourcesByType | 按资源类型统计 |
| topContributors | 顶级贡献者排行榜 |

---

**✅ Node 4 后端功能 100% 完成！**
**✅ 前端 API 客户端 100% 完成！**

### 后端 API 统计
- 人脉资源 API: 12 个
- 引荐记录 API: 3 个
- 管理员 API: 1 个
- 总计: 16 个

下一步可开发：
- Node 5: 日历 + 场地 + 预约
- Node 6: 公司座谈会
- Node 7: 会后 Token 发放任务
- Node 8: 通知中心

