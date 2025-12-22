#!/bin/bash

# 元征 · 合伙人赋能平台
# 健康检查脚本

set -e

# 配置
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-yuanzheng_db}"
DB_USER="${DB_USER:-yuanzheng}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo "=========================================="
echo "  元征 · 合伙人赋能平台 健康检查"
echo "=========================================="
echo ""

FAILED=0

# 检查后端服务
echo "检查后端服务..."
if curl -sf "${BACKEND_URL}/health/live" > /dev/null 2>&1; then
    log_info "后端服务存活检查通过"
else
    log_error "后端服务存活检查失败"
    FAILED=$((FAILED + 1))
fi

if curl -sf "${BACKEND_URL}/health/ready" > /dev/null 2>&1; then
    log_info "后端服务就绪检查通过"
else
    log_error "后端服务就绪检查失败"
    FAILED=$((FAILED + 1))
fi

# 检查前端服务
echo ""
echo "检查前端服务..."
if curl -sf "${FRONTEND_URL}" > /dev/null 2>&1; then
    log_info "前端服务检查通过"
else
    log_warn "前端服务检查失败（可能是开发模式未启动）"
fi

# 检查数据库连接
echo ""
echo "检查数据库连接..."
if PGPASSWORD="${PGPASSWORD}" pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
    log_info "数据库连接检查通过"
else
    log_error "数据库连接检查失败"
    FAILED=$((FAILED + 1))
fi

# 检查磁盘空间
echo ""
echo "检查磁盘空间..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "${DISK_USAGE}" -lt 90 ]; then
    log_info "磁盘使用率正常 (${DISK_USAGE}%)"
else
    log_warn "磁盘使用率过高 (${DISK_USAGE}%)"
fi

# 检查内存使用
echo ""
echo "检查内存使用..."
if command -v free > /dev/null 2>&1; then
    MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
    if [ "${MEM_USAGE}" -lt 90 ]; then
        log_info "内存使用率正常 (${MEM_USAGE}%)"
    else
        log_warn "内存使用率过高 (${MEM_USAGE}%)"
    fi
else
    log_warn "无法检查内存使用（free 命令不可用）"
fi

echo ""
echo "=========================================="
if [ ${FAILED} -eq 0 ]; then
    echo -e "${GREEN}所有关键检查通过！${NC}"
    exit 0
else
    echo -e "${RED}${FAILED} 个关键检查失败！${NC}"
    exit 1
fi






