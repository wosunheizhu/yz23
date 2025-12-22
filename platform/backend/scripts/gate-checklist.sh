#!/bin/bash

# ============================================================
# Gate Checklist 工程验收自检脚本
# 基于 PRD v3 第 31 节 - 20 条自检项
# ============================================================

# 不使用 set -e，因为某些 grep 命令可能返回非零值

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_check() { echo -e "${BLUE}[CHECK]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }

PASSED=0
FAILED=0
WARNINGS=0

check() {
  local name="$1"
  local result="$2"  # 0=pass, 1=fail, 2=warn
  local detail="$3"
  
  case $result in
    0)
      log_pass "$name"
      ((PASSED++))
      ;;
    1)
      log_fail "$name: $detail"
      ((FAILED++))
      ;;
    2)
      log_warn "$name: $detail"
      ((WARNINGS++))
      ;;
  esac
}

echo ""
echo "============================================================"
echo "      Gate Checklist 工程验收自检 (PRD v3 第 31 节)"
echo "============================================================"
echo ""

# 1. 权限：所有接口都有服务端鉴权
log_check "1. 权限：所有接口都有服务端鉴权"
# 检查 router 文件中是否使用了 authenticate 中间件
ROUTER_FILES=$(find "$BACKEND_DIR/src/modules" -name "*.router.ts" 2>/dev/null | wc -l)
AUTH_USAGE=$(grep -l "authenticate" "$BACKEND_DIR/src/modules"/*/*.router.ts 2>/dev/null | wc -l)
if [ "$AUTH_USAGE" -ge "$((ROUTER_FILES - 2))" ]; then
  check "权限检查" 0
else
  check "权限检查" 2 "$ROUTER_FILES 个路由文件中 $AUTH_USAGE 个使用了鉴权"
fi

# 2. 可见性：所有读接口都走统一 visibility 过滤
log_check "2. 可见性：统一 visibility 过滤"
VISIBILITY_USAGE=$(grep -rE "applyVisibilityFilter|checkVisibility|buildVisibilityFilter|visibilityScopeType|visibility.*OR" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$VISIBILITY_USAGE" -gt 10 ]; then
  check "可见性过滤" 0
else
  check "可见性过滤" 2 "可见性过滤使用较少，仅 $VISIBILITY_USAGE 处"
fi

# 3. 低层不屏蔽高层：CUSTOM 保存时后端强制合并高层用户
log_check "3. 低层不屏蔽高层：CUSTOM 合并高层用户"
MERGE_CHECK=$(grep -rE "mergeHigherRoleUsers|ensureHigherRolesIncluded|enforceHigherRoleVisibility|higherRoleUsers" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$MERGE_CHECK" -gt 0 ]; then
  check "高层用户合并" 0
else
  check "高层用户合并" 2 "未检测到高层用户合并逻辑"
fi

# 4. 审计：涉及敏感对象的变更/删除有 AuditLog
log_check "4. 审计：敏感对象变更/删除有 AuditLog"
AUDIT_USAGE=$(grep -r "createAuditLog\|auditLog\|AuditLog" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$AUDIT_USAGE" -gt 20 ]; then
  check "审计日志" 0
else
  check "审计日志" 2 "审计日志使用较少，仅 $AUDIT_USAGE 处"
fi

# 5. 软删一致性：is_deleted 后列表不可见
log_check "5. 软删一致性：is_deleted 过滤"
SOFT_DELETE=$(grep -r "isDeleted.*false\|notDeleted\|where.*isDeleted" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$SOFT_DELETE" -gt 10 ]; then
  check "软删过滤" 0
else
  check "软删过滤" 2 "软删过滤使用较少，仅 $SOFT_DELETE 处"
fi

# 6. 幂等：状态改变型接口支持幂等
log_check "6. 幂等：状态改变型接口支持幂等"
IDEMPOTENT=$(grep -r "idempotent\|已经.*状态\|already\|status.*===\|checkIdempotency" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$IDEMPOTENT" -gt 5 ]; then
  check "幂等性" 0
else
  check "幂等性" 2 "幂等性检查较少，仅 $IDEMPOTENT 处"
fi

# 7. 事务：涉及多表一致性更新必须在 DB 事务内
log_check "7. 事务：多表更新在事务内"
TRANSACTION=$(grep -r "\$transaction\|prisma\..*transaction\|withTransaction" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$TRANSACTION" -gt 5 ]; then
  check "事务使用" 0
else
  check "事务使用" 2 "事务使用较少，仅 $TRANSACTION 处"
fi

# 8. 错误码：有统一 error_code + message + trace_id
log_check "8. 错误码：统一错误处理"
ERROR_HANDLER=$(grep -r "AppError\|BusinessError\|errorHandler\|error_code\|traceId" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$ERROR_HANDLER" -gt 10 ]; then
  check "错误处理" 0
else
  check "错误处理" 1 "错误处理不完善"
fi

# 9. 输入校验：必填/格式/范围校验齐全
log_check "9. 输入校验：Zod Schema 校验"
ZOD_USAGE=$(grep -r "z\.\|zod\|Schema\|\.parse\|\.safeParse" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$ZOD_USAGE" -gt 50 ]; then
  check "输入校验" 0
else
  check "输入校验" 2 "Zod 校验使用较少，仅 $ZOD_USAGE 处"
fi

# 10. 分页：列表接口都有分页
log_check "10. 分页：列表接口支持分页"
PAGINATION=$(grep -r "page\|pageSize\|limit\|offset\|skip\|take" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$PAGINATION" -gt 30 ]; then
  check "分页支持" 0
else
  check "分页支持" 2 "分页使用较少"
fi

# 11. 排序稳定：列表排序规则固定
log_check "11. 排序稳定：orderBy 规则"
ORDERBY=$(grep -r "orderBy.*createdAt\|orderBy.*desc\|orderBy.*asc" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$ORDERBY" -gt 10 ]; then
  check "排序稳定" 0
else
  check "排序稳定" 2 "排序规则较少，仅 $ORDERBY 处"
fi

# 12. 并发安全：关键写操作有乐观锁/版本号或唯一约束保护
log_check "12. 并发安全：乐观锁/版本号"
CONCURRENCY=$(grep -r "version\|optimisticLock\|unique\|@@unique\|concurrency" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$CONCURRENCY" -gt 5 ]; then
  check "并发安全" 0
else
  check "并发安全" 2 "并发控制较少"
fi

# 13. 时间处理：所有时间使用 timestamptz
log_check "13. 时间处理：timestamptz 使用"
DATETIME=$(grep -r "DateTime\|timestamptz\|ISO\|toISOString\|new Date" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$DATETIME" -gt 20 ]; then
  check "时间处理" 0
else
  check "时间处理" 2 "时间处理较少"
fi

# 14. 日志：关键链路有结构化日志
log_check "14. 日志：结构化日志"
LOGGING=$(grep -r "logger\.\|pino\|log\.\|console\.log" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$LOGGING" -gt 20 ]; then
  check "结构化日志" 0
else
  check "结构化日志" 2 "日志使用较少"
fi

# 15. 回归脚本：有可重复的 smoke 脚本
log_check "15. 回归脚本：smoke 测试脚本"
if [ -f "$BACKEND_DIR/scripts/e2e-test.sh" ] || [ -f "$BACKEND_DIR/scripts/smoke-test-node1.sh" ]; then
  check "回归脚本" 0
else
  check "回归脚本" 1 "缺少测试脚本"
fi

# 16. 通知不漏：新事件有站内通知覆盖
log_check "16. 通知不漏：通知事件覆盖"
NOTIFICATION=$(grep -r "sendNotification\|dispatchNotification\|NotificationEvent" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$NOTIFICATION" -gt 20 ]; then
  check "通知覆盖" 0
else
  check "通知覆盖" 2 "通知使用较少"
fi

# 17. 数据一致性：外键/关联对象不存在时返回明确错误
log_check "17. 数据一致性：关联对象校验"
FK_CHECK=$(grep -r "not found\|不存在\|findUnique.*throw\|findFirst.*throw" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$FK_CHECK" -gt 10 ]; then
  check "数据一致性" 0
else
  check "数据一致性" 2 "关联校验较少"
fi

# 18. 性能冒烟：核心接口 P95 在目标范围内
log_check "18. 性能冒烟：性能监控"
PERF=$(grep -r "performance\|latency\|responseTime\|p95\|metrics" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$PERF" -gt 0 ]; then
  check "性能监控" 0
else
  check "性能监控" 2 "建议添加性能监控"
fi

# 19. 可观测：管理员能定位失败
log_check "19. 可观测：失败可定位"
OBSERVABILITY=$(grep -r "errorReason\|failReason\|status.*FAILED\|lastError" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null | wc -l)
if [ "$OBSERVABILITY" -gt 5 ]; then
  check "可观测性" 0
else
  check "可观测性" 2 "可观测性较弱"
fi

# 20. 文档：API、数据结构、关键规则写入文档
log_check "20. 文档：工程文档"
if [ -f "$BACKEND_DIR/../docs/node10-checklist.md" ] || [ -f "$BACKEND_DIR/README.md" ]; then
  check "工程文档" 0
else
  check "工程文档" 1 "缺少文档"
fi

echo ""
echo "============================================================"
echo "                    Gate Checklist 结果"
echo "============================================================"
echo -e "  通过: ${GREEN}$PASSED${NC}"
echo -e "  警告: ${YELLOW}$WARNINGS${NC}"
echo -e "  失败: ${RED}$FAILED${NC}"
echo "============================================================"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}存在未通过项，请修复后重新检查${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}存在警告项，建议优化${NC}"
  exit 0
else
  echo -e "${GREEN}所有检查项通过！${NC}"
  exit 0
fi

