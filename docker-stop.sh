#!/usr/bin/env bash
# ============================================
# QDmgt Docker容器停止脚本
# ============================================
set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 QDmgt Docker容器环境停止${NC}"
echo "========================================"

# 检查Docker Compose并设置命令
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ 错误：未安装Docker Compose${NC}"
    exit 1
fi

# 检查.env.docker文件
if [ ! -f .env.docker ]; then
    echo -e "${YELLOW}⚠ 警告：找不到.env.docker文件${NC}"
    echo "尝试使用默认配置停止容器..."
    ENV_FILE=""
else
    ENV_FILE="--env-file .env.docker"
    echo -e "${GREEN}✓${NC} 找到配置文件: .env.docker"
fi

# 检查是否有运行的容器
if $DOCKER_COMPOSE_CMD $ENV_FILE ps -q | grep -q .; then
    echo ""
    echo "当前运行的容器："
    $DOCKER_COMPOSE_CMD $ENV_FILE ps

    echo ""
    read -p "确认停止所有容器？ (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}已取消${NC}"
        exit 0
    fi

    echo ""
    echo "========================================"
    echo -e "${YELLOW}🔄 停止容器服务...${NC}"
    echo "========================================"

    # 停止容器
    if $DOCKER_COMPOSE_CMD $ENV_FILE down; then
        echo -e "${GREEN}✓${NC} 容器已停止"
    else
        echo -e "${RED}❌ 容器停止失败${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ 没有运行中的容器${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ 服务已停止${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}💡 提示：${NC}"
echo "  重新启动:      ./docker-start.sh"
echo "  删除所有数据:  $DOCKER_COMPOSE_CMD $ENV_FILE down -v  ${RED}(警告：会删除数据库数据！)${NC}"
echo "  清理镜像:      $DOCKER_COMPOSE_CMD $ENV_FILE down --rmi all"
echo "  查看volume:    docker volume ls"
echo ""
echo -e "${YELLOW}📦 数据卷状态：${NC}"
if docker volume ls | grep -q qdmgt_postgres_data; then
    echo -e "  ${GREEN}✓${NC} 数据库数据卷保留: qdmgt_postgres_data"
    echo "    (数据已保存，下次启动会自动恢复)"
else
    echo -e "  ${YELLOW}⚠${NC} 未找到数据库数据卷"
fi
echo ""
