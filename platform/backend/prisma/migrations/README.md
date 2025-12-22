# 数据库迁移

## 迁移命令

```bash
# 创建新迁移
pnpm db:migrate --name migration_name

# 执行迁移（开发环境）
pnpm db:migrate

# 执行迁移（生产环境）
pnpm db:migrate:prod

# 重置数据库（危险！会删除所有数据）
pnpm prisma migrate reset

# 查看迁移状态
pnpm prisma migrate status
```

## 迁移规范

### 1. 命名规范

迁移名称应该清晰描述变更内容：
- `add_user_avatar` - 添加用户头像字段
- `create_network_resources_table` - 创建人脉资源表
- `update_meeting_add_venue` - 为会议添加场地关联

### 2. 回滚策略

Prisma 不支持自动回滚，但可以通过以下方式处理：

1. **开发环境**：使用 `prisma migrate reset` 重置数据库
2. **生产环境**：手动编写反向迁移 SQL

### 3. 最佳实践

- 每次迁移只做一件事
- 添加字段时考虑默认值
- 删除字段前先标记为废弃
- 重要迁移前备份数据库
- 测试环境先验证迁移

## 验收标准（PRD Node 0）

- ✅ 任意一次迁移可回滚/可重放
- ✅ 新人按 README 10 分钟内跑起来
- ✅ 迁移脚本可在 CI 中 dry-run 验证






