#!/bin/bash

# 元征 · 合伙人赋能平台
# 数据库备份脚本
# 
# PRD 4.5: 每日全量备份，保留至少 30 天
# RPO ≈ 24 小时（最多丢失一天数据）

set -e

# 配置
BACKUP_DIR="${BACKUP_DIR:-/var/backups/yuanzheng}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-yuanzheng_db}"
DB_USER="${DB_USER:-yuanzheng}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/yuanzheng_${TIMESTAMP}.sql.gz"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

log_info "开始数据库备份..."
log_info "数据库: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
log_info "备份文件: ${BACKUP_FILE}"

# 执行备份
if PGPASSWORD="${PGPASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists | gzip > "${BACKUP_FILE}"; then
    
    BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
    log_info "备份完成！文件大小: ${BACKUP_SIZE}"
else
    log_error "备份失败！"
    exit 1
fi

# 清理过期备份
log_info "清理 ${RETENTION_DAYS} 天前的备份..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "yuanzheng_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
log_info "已删除 ${DELETED_COUNT} 个过期备份"

# 显示当前备份列表
log_info "当前备份列表:"
ls -lh "${BACKUP_DIR}"/yuanzheng_*.sql.gz 2>/dev/null | tail -10 || log_warn "无备份文件"

log_info "备份任务完成！"






