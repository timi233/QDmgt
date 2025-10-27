#!/usr/bin/env bash
# ============================================
# SQLite to PostgreSQL数据迁移工具
# ============================================
set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 SQLite → PostgreSQL 数据迁移工具${NC}"
echo "========================================"

# 检查SQLite文件
SQLITE_DB="${1:-test.db}"
if [ ! -f "$SQLITE_DB" ]; then
    echo -e "${RED}❌ 错误：找不到SQLite数据库文件: $SQLITE_DB${NC}"
    echo ""
    echo "用法："
    echo "  $0 [sqlite文件路径]"
    echo ""
    echo "示例："
    echo "  $0 test.db"
    echo "  $0 /path/to/database.db"
    exit 1
fi

echo -e "${GREEN}✓${NC} 找到SQLite数据库: $SQLITE_DB"

# 检查SQLite大小
DB_SIZE=$(du -h "$SQLITE_DB" | cut -f1)
echo -e "${BLUE}ℹ${NC} 数据库大小: $DB_SIZE"

# 检查Docker容器
if ! docker ps | grep -q qdmgt_postgres; then
    echo -e "${RED}❌ 错误：PostgreSQL容器未运行${NC}"
    echo ""
    echo "请先启动容器："
    echo "  ./docker-start.sh"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL容器运行中"

# 加载环境变量
if [ -f .env.docker ]; then
    source .env.docker
else
    echo -e "${RED}❌ 错误：找不到.env.docker文件${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${YELLOW}📋 迁移方案选择${NC}"
echo "========================================"
echo ""
echo "1) 使用pgloader（推荐）"
echo "   - 自动处理类型转换"
echo "   - 支持大型数据库"
echo "   - 需要Docker"
echo ""
echo "2) 手动SQL导出/导入"
echo "   - 简单直接"
echo "   - 需要手动清理SQL语法"
echo "   - 适合小型数据库"
echo ""
echo "3) 跳过迁移（空数据库）"
echo "   - 使用Alembic创建空表结构"
echo "   - 不保留旧数据"
echo "   - 适合开发/测试环境"
echo ""
read -p "请选择方案 (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "========================================"
        echo -e "${YELLOW}📦 使用pgloader迁移${NC}"
        echo "========================================"

        # 创建临时pgloader配置
        PGLOADER_CONFIG=$(mktemp)
        cat > "$PGLOADER_CONFIG" << EOF
LOAD DATABASE
    FROM sqlite:///data/$SQLITE_DB
    INTO postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

WITH include drop, create tables, create indexes, reset sequences

SET work_mem to '16MB', maintenance_work_mem to '512 MB';
EOF

        echo "生成pgloader配置："
        cat "$PGLOADER_CONFIG"
        echo ""

        # 运行pgloader
        echo "开始迁移..."
        if docker run --rm \
            --network qdmgt_network \
            -v "$(pwd):/data" \
            -v "$PGLOADER_CONFIG:/tmp/config.load" \
            dimitri/pgloader \
            pgloader /tmp/config.load; then

            echo -e "${GREEN}✓${NC} 数据迁移成功！"
            rm -f "$PGLOADER_CONFIG"
        else
            echo -e "${RED}❌ 迁移失败${NC}"
            rm -f "$PGLOADER_CONFIG"
            exit 1
        fi
        ;;

    2)
        echo ""
        echo "========================================"
        echo -e "${YELLOW}📝 手动SQL导出/导入${NC}"
        echo "========================================"

        # 导出SQLite数据
        DUMP_FILE="sqlite_dump_$(date +%Y%m%d_%H%M%S).sql"
        echo "导出SQLite数据到 $DUMP_FILE ..."

        if sqlite3 "$SQLITE_DB" .dump > "$DUMP_FILE"; then
            echo -e "${GREEN}✓${NC} 导出成功: $DUMP_FILE"
        else
            echo -e "${RED}❌ 导出失败${NC}"
            exit 1
        fi

        # 清理SQL语法（SQLite特定语法）
        echo "清理SQL语法..."
        sed -i 's/PRAGMA foreign_keys=OFF;//g' "$DUMP_FILE"
        sed -i 's/BEGIN TRANSACTION;//g' "$DUMP_FILE"
        sed -i 's/COMMIT;//g' "$DUMP_FILE"
        sed -i 's/AUTOINCREMENT/SERIAL/g' "$DUMP_FILE"

        echo ""
        echo -e "${YELLOW}⚠ 注意：${NC}"
        echo "  SQL文件已生成: $DUMP_FILE"
        echo "  请手动检查并修改不兼容的语法"
        echo ""
        read -p "确认导入到PostgreSQL？ (y/N): " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "导入数据到PostgreSQL..."
            if docker exec -i qdmgt_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$DUMP_FILE"; then
                echo -e "${GREEN}✓${NC} 导入成功！"
            else
                echo -e "${RED}❌ 导入失败${NC}"
                echo "请检查SQL文件并手动修复错误"
                exit 1
            fi
        else
            echo "已取消导入"
            echo "SQL文件保存在: $DUMP_FILE"
            exit 0
        fi
        ;;

    3)
        echo ""
        echo "========================================"
        echo -e "${YELLOW}⏭️  跳过迁移${NC}"
        echo "========================================"
        echo ""
        echo -e "${BLUE}ℹ${NC} 将使用空数据库"
        echo "  - Alembic已在容器启动时自动创建表结构"
        echo "  - 旧的SQLite数据不会迁移"
        echo ""
        read -p "确认跳过迁移？ (y/N): " -n 1 -r
        echo

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "已取消"
            exit 0
        fi

        echo -e "${GREEN}✓${NC} 已跳过迁移，使用空数据库"
        ;;

    *)
        echo -e "${RED}❌ 无效选择${NC}"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo -e "${GREEN}✅ 迁移流程完成${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}🔍 验证数据：${NC}"
echo "  进入数据库: docker exec -it qdmgt_postgres psql -U $POSTGRES_USER -d $POSTGRES_DB"
echo "  查看表:     \\dt"
echo "  查看数据:   SELECT * FROM users LIMIT 5;"
echo ""
echo -e "${BLUE}📊 备份建议：${NC}"
echo "  备份数据库: docker exec qdmgt_postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql"
echo "  恢复数据库: docker exec -i qdmgt_postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < backup.sql"
echo ""
