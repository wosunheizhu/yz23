#!/bin/bash

# Node 1 Smoke Test Script
# 元征 · 合伙人赋能平台
# 
# Gate #15: 每个 Node 有一套可重复的 smoke 脚本/用例集
# 
# 使用方式: ./scripts/smoke-test-node1.sh [API_URL]

set -e

API_URL="${1:-http://localhost:3000/api/v1}"
ADMIN_TOKEN=""
USER_TOKEN=""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Node 1: 身份、角色、可见性 - Smoke Test"
echo "API URL: $API_URL"
echo "=================================================="
echo ""

# 测试计数
PASSED=0
FAILED=0
TOTAL=0

# 测试函数
test_case() {
  local name="$1"
  local expected_code="$2"
  local method="$3"
  local endpoint="$4"
  local data="$5"
  local token="$6"
  
  TOTAL=$((TOTAL + 1))
  
  local headers="-H 'Content-Type: application/json'"
  if [ -n "$token" ]; then
    headers="$headers -H 'Authorization: Bearer $token'"
  fi
  
  local response
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" $headers "$API_URL$endpoint" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" $headers -d "$data" "$API_URL$endpoint" 2>/dev/null)
  fi
  
  local http_code=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✓${NC} $name (HTTP $http_code)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $name (Expected $expected_code, got $http_code)"
    echo "  Response: $body"
    FAILED=$((FAILED + 1))
  fi
}

# ====================================
# 1. 健康检查
# ====================================
echo "--- 1. 健康检查 ---"
test_case "健康检查接口正常" "200" "GET" "/health" "" ""

# ====================================
# 2. 认证模块测试
# ====================================
echo ""
echo "--- 2. 认证模块 ---"

# 未登录访问受保护接口
test_case "未登录访问用户列表返回 401" "401" "GET" "/users" "" ""

# 验证码频控检查
test_case "发送验证码（首次）" "200" "POST" "/auth/send-code" '{"target":"test@example.com","purpose":"login"}' ""

# 密码登录 - 错误密码
test_case "错误密码登录返回 401" "401" "POST" "/auth/login/password" '{"identifier":"wrong@test.com","password":"WrongPass123!"}' ""

# 注册状态检查
test_case "检查注册状态" "200" "GET" "/auth/registration-status" "" ""

# ====================================
# 3. 用户管理测试（需要 Token）
# ====================================
echo ""
echo "--- 3. 用户管理 ---"

# 获取当前用户（需要 Token，这里会失败）
test_case "无 Token 获取当前用户返回 401" "401" "GET" "/auth/me" "" ""

# ====================================
# 4. 输入校验测试
# ====================================
echo ""
echo "--- 4. 输入校验 ---"

# 空密码登录
test_case "空密码登录返回 400" "400" "POST" "/auth/login/password" '{"identifier":"test@test.com","password":""}' ""

# 无效邮箱格式
test_case "无效验证码目标返回 400" "400" "POST" "/auth/send-code" '{"target":"","purpose":"login"}' ""

# ====================================
# 5. 错误码检查
# ====================================
echo ""
echo "--- 5. 错误码格式 ---"

# 检查错误响应格式
response=$(curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"identifier":"","password":"test"}' \
  "$API_URL/auth/login/password")

if echo "$response" | grep -q '"error"' && echo "$response" | grep -q '"traceId"'; then
  echo -e "${GREEN}✓${NC} 错误响应包含 error 和 traceId"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗${NC} 错误响应格式不正确"
  FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# ====================================
# 结果统计
# ====================================
echo ""
echo "=================================================="
echo "Smoke Test 结果"
echo "=================================================="
echo -e "通过: ${GREEN}$PASSED${NC} / $TOTAL"
echo -e "失败: ${RED}$FAILED${NC} / $TOTAL"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ 所有测试通过！${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}✗ 存在失败的测试${NC}"
  exit 1
fi






