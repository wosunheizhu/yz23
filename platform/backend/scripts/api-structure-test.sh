#!/bin/bash

# ============================================================
# API 结构验证测试
# 验证所有模块的 API 结构完整性（无需数据库）
# ============================================================

set -e

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_check() { echo -e "${BLUE}[CHECK]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }

PASSED=0
FAILED=0

check_module() {
  local module_name="$1"
  local module_path="$2"
  
  log_check "模块: $module_name"
  
  # 检查 router 文件是否存在
  if [ -f "$BACKEND_DIR/src/modules/$module_path"/*.router.ts ] 2>/dev/null || \
     ls "$BACKEND_DIR/src/modules/$module_path"/*.router.ts 1>/dev/null 2>&1; then
    log_pass "$module_name - 路由文件存在"
    ((PASSED++))
  else
    log_fail "$module_name - 路由文件缺失"
    ((FAILED++))
    return
  fi
  
  # 检查 service 文件是否存在
  if [ -f "$BACKEND_DIR/src/modules/$module_path"/*.service.ts ] 2>/dev/null || \
     ls "$BACKEND_DIR/src/modules/$module_path"/*.service.ts 1>/dev/null 2>&1; then
    log_pass "$module_name - 服务文件存在"
    ((PASSED++))
  else
    log_fail "$module_name - 服务文件缺失"
    ((FAILED++))
  fi
  
  # 检查 dto 文件是否存在
  if [ -f "$BACKEND_DIR/src/modules/$module_path"/*.dto.ts ] 2>/dev/null || \
     ls "$BACKEND_DIR/src/modules/$module_path"/*.dto.ts 1>/dev/null 2>&1; then
    log_pass "$module_name - DTO文件存在"
    ((PASSED++))
  else
    log_fail "$module_name - DTO文件缺失"
    ((FAILED++))
  fi
}

echo ""
echo "============================================================"
echo "         API 结构验证测试 - 模块完整性检查"
echo "============================================================"
echo ""

# 核心模块检查
check_module "认证" "auth"
check_module "用户" "users"
check_module "项目" "projects"
check_module "需求" "demands"
check_module "响应" "responses"
check_module "Token" "tokens"
check_module "会议" "meetings"
check_module "预约" "bookings"
check_module "场地" "venues"
check_module "日历" "calendar"
check_module "人脉资源" "network-resources"
check_module "新闻" "news"
check_module "社群" "community"
check_module "消息" "messages"
check_module "通知" "notifications"
check_module "公告" "announcements"
check_module "反馈" "feedbacks"
check_module "仪表盘" "dashboard"
check_module "管理后台" "admin"
check_module "价值记录" "value-records"
check_module "发放任务" "token-grant-tasks"

echo ""
echo "============================================================"
echo "                  前端 API Client 检查"
echo "============================================================"
echo ""

FRONTEND_API_DIR="$BACKEND_DIR/../frontend/src/api"

check_frontend_api() {
  local name="$1"
  local file="$2"
  
  if [ -f "$FRONTEND_API_DIR/$file" ]; then
    log_pass "$name - 前端 API Client 存在"
    ((PASSED++))
  else
    log_fail "$name - 前端 API Client 缺失: $file"
    ((FAILED++))
  fi
}

check_frontend_api "认证" "auth.ts"
check_frontend_api "用户" "users.ts"
check_frontend_api "项目" "projects.ts"
check_frontend_api "需求" "demands.ts"
check_frontend_api "响应" "responses.ts"
check_frontend_api "Token" "tokens.ts"
check_frontend_api "会议" "meetings.ts"
check_frontend_api "预约" "bookings.ts"
check_frontend_api "场地" "venues.ts"
check_frontend_api "日历" "calendar.ts"
check_frontend_api "人脉资源" "network-resources.ts"
check_frontend_api "新闻" "news.ts"
check_frontend_api "社群" "community.ts"
check_frontend_api "投票" "votes.ts"
check_frontend_api "消息" "messages.ts"
check_frontend_api "信箱" "inbox.ts"
check_frontend_api "公告" "announcements.ts"
check_frontend_api "反馈" "feedbacks.ts"
check_frontend_api "仪表盘" "dashboard.ts"
check_frontend_api "管理后台" "admin.ts"
check_frontend_api "AI" "ai.ts"

echo ""
echo "============================================================"
echo "                      检查结果"
echo "============================================================"
echo -e "  通过: ${GREEN}$PASSED${NC}"
echo -e "  失败: ${RED}$FAILED${NC}"
echo "============================================================"

if [ $FAILED -gt 0 ]; then
  exit 1
else
  echo -e "${GREEN}所有 API 结构检查通过！${NC}"
  exit 0
fi






