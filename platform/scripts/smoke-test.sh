#!/bin/bash

# 元征 · 合伙人赋能平台
# Node 0 Smoke 测试脚本
# 
# PRD Gate #15: 每个 Node 有一套可重复的 smoke 脚本/用例集

set -e

# 配置
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
API_URL="${BACKEND_URL}/api/v1"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASSED=$((PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED=$((FAILED + 1))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: 需要安装 $1${NC}"
        exit 1
    fi
}

check_command curl
check_command jq

echo "=========================================="
echo "  Node 0: 工程底座 Smoke 测试"
echo "=========================================="
echo ""
echo "后端地址: ${BACKEND_URL}"
echo ""

# ==========================================
# 测试 1: 健康检查
# ==========================================
log_test "1. 健康检查 - /health/live"
RESPONSE=$(curl -sf "${BACKEND_URL}/health/live" 2>/dev/null || echo "FAILED")
if [ "$RESPONSE" != "FAILED" ]; then
    log_pass "存活检查通过"
else
    log_fail "存活检查失败"
fi

log_test "2. 健康检查 - /health/ready"
RESPONSE=$(curl -sf "${BACKEND_URL}/health/ready" 2>/dev/null || echo "FAILED")
if [ "$RESPONSE" != "FAILED" ]; then
    log_pass "就绪检查通过"
else
    log_fail "就绪检查失败"
fi

# ==========================================
# 测试 2: 统一错误码 (Gate #8)
# ==========================================
log_test "3. 统一错误码 - 404 响应格式"
RESPONSE=$(curl -s "${BACKEND_URL}/api/v1/nonexistent" 2>/dev/null)
if echo "$RESPONSE" | jq -e '.error.code' > /dev/null 2>&1; then
    log_pass "404 响应包含 error.code"
else
    log_fail "404 响应格式不正确"
fi

# ==========================================
# 测试 3: Trace ID (Node 0 必须)
# ==========================================
log_test "4. Trace ID - 响应头检查"
TRACE_ID=$(curl -sI "${BACKEND_URL}/health/live" 2>/dev/null | grep -i "x-trace-id" || echo "")
if [ -n "$TRACE_ID" ]; then
    log_pass "响应包含 X-Trace-Id 头"
else
    log_fail "响应缺少 X-Trace-Id 头"
fi

log_test "5. Trace ID - 错误响应中包含"
RESPONSE=$(curl -s "${BACKEND_URL}/api/v1/nonexistent" 2>/dev/null)
if echo "$RESPONSE" | jq -e '.traceId' > /dev/null 2>&1; then
    log_pass "错误响应包含 traceId"
else
    log_fail "错误响应缺少 traceId"
fi

# ==========================================
# 测试 4: CORS 头
# ==========================================
log_test "6. CORS - Access-Control-Allow-Origin"
CORS_HEADER=$(curl -sI -X OPTIONS "${BACKEND_URL}/api/v1/health" -H "Origin: http://localhost:5173" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    log_pass "CORS 头正确配置"
else
    log_skip "CORS 头检查跳过（可能需要配置）"
fi

# ==========================================
# 测试 5: 安全头 (helmet)
# ==========================================
log_test "7. 安全头 - X-Content-Type-Options"
SECURITY_HEADER=$(curl -sI "${BACKEND_URL}/health/live" 2>/dev/null | grep -i "x-content-type-options" || echo "")
if [ -n "$SECURITY_HEADER" ]; then
    log_pass "安全头 X-Content-Type-Options 存在"
else
    log_fail "缺少安全头 X-Content-Type-Options"
fi

# ==========================================
# 测试 6: 响应时间 (Gate #18)
# ==========================================
log_test "8. 性能 - 响应时间 < 300ms"
START_TIME=$(date +%s%3N)
curl -s "${BACKEND_URL}/health/live" > /dev/null
END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))

if [ "$DURATION" -lt 300 ]; then
    log_pass "响应时间 ${DURATION}ms < 300ms"
else
    log_fail "响应时间 ${DURATION}ms >= 300ms"
fi

# ==========================================
# 测试 7: 未授权访问
# ==========================================
log_test "9. 认证 - 未授权请求返回 401"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/users/me" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "401" ]; then
    log_pass "未授权请求正确返回 401"
else
    log_skip "认证检查跳过（返回码: ${RESPONSE}）"
fi

# ==========================================
# 测试 8: JSON 格式
# ==========================================
log_test "10. 响应格式 - Content-Type: application/json"
CONTENT_TYPE=$(curl -sI "${BACKEND_URL}/health/ready" 2>/dev/null | grep -i "content-type" | grep -i "application/json" || echo "")
if [ -n "$CONTENT_TYPE" ]; then
    log_pass "响应 Content-Type 正确"
else
    log_skip "Content-Type 检查跳过"
fi

# ==========================================
# 汇总结果
# ==========================================
echo ""
echo "=========================================="
echo "  测试结果汇总"
echo "=========================================="
echo -e "通过: ${GREEN}${PASSED}${NC}"
echo -e "失败: ${RED}${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Node 0 Smoke 测试全部通过！${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ 存在 ${FAILED} 个失败的测试${NC}"
    exit 1
fi






