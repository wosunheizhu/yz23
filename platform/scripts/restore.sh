#!/bin/bash

# 元征 · 合伙人赋能平台
# 数据库恢复脚本
# 
# PRD 4.5: RTO ≈ 4 小时（灾难后恢复上线）

set -e

# 配置
BACKUP_DIR="${BACKUP_DIR:-/var/backups/yuanzheng}"
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
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 检查参数
if [ -z "$1" ]; then
    log_info "用法: $0 <备份文件路径>"
    log_info ""
    log_info "可用的备份文件:"
    ls -lh "${BACKUP_DIR}"/yuanzheng_*.sql.gz 2>/dev/null | tail -10 || log_warn "无备份文件"
    exit 1
fi

BACKUP_FILE="$1"

# 检查文件是否存在
if [ ! -f "${BACKUP_FILE}" ]; then
    log_error "备份文件不存在: ${BACKUP_FILE}"
    exit 1
fi

log_warn "=========================================="
log_warn "⚠️  警告: 此操作将覆盖现有数据库！"
log_warn "=========================================="
log_info "备份文件: ${BACKUP_FILE}"
log_info "目标数据库: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
log_info ""

read -p "确认要恢复数据库吗？(yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    log_info "操作已取消"
    exit 0
fi

log_info "开始恢复数据库..."

# 恢复数据库
if gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${PGPASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --quiet; then
    
    log_info "数据库恢复完成！"
else
    log_error "数据库恢复失败！"
    exit 1
fi

log_info "验证数据库连接..."
if PGPASSWORD="${PGPASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    log_info "数据库连接验证成功！"
else
    log_warn "数据库验证失败，请手动检查"
fi

log_info "恢复任务完成！"






