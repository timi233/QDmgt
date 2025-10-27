#!/usr/bin/env bash
# ============================================
# QDmgt Docker容器启动脚本 (带代理支持)
# ============================================
set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 QDmgt Docker容器环境启动 (使用代理)${NC}"
echo "========================================"

# 检查.env.docker文件
if [ ! -f .env.docker ]; then
    echo -e "${RED}❌ 错误：找不到.env.docker文件${NC}"
    echo ""
    echo "请先创建配置文件："
    echo "  1. 复制模板：cp .env.docker.example .env.docker"
    echo "  2. 编辑配置：vim .env.docker"
    echo "  3. 修改以下关键配置："
    echo "     - POSTGRES_PASSWORD（数据库密码）"
    echo "     - JWT_SECRET_KEY（JWT密钥）"
    echo "     - SECRET_KEY（加密密钥）"
    echo "     - SECURITY_ALLOWED_ORIGINS（CORS地址）"
    echo "     - REACT_APP_API_BASE_URL（前端API地址）"
    exit 1
fi

echo -e "${GREEN}✓${NC} 找到配置文件: .env.docker"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误：未安装Docker${NC}"
    echo "请访问 https://docs.docker.com/get-docker/ 安装Docker"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker已安装: $(docker --version)"

# 检查Docker Compose并设置命令
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    echo -e "${GREEN}✓${NC} Docker Compose已安装: $(docker-compose --version)"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
    echo -e "${GREEN}✓${NC} Docker Compose已安装: $(docker compose version)"
else
    echo -e "${RED}❌ 错误：未安装Docker Compose${NC}"
    echo "请访问 https://docs.docker.com/compose/install/ 安装Docker Compose"
    exit 1
fi

# 检查Docker daemon
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ 错误：Docker daemon未运行${NC}"
    echo "请启动Docker服务：sudo systemctl start docker"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker daemon运行中"

echo ""
echo "========================================"
echo -e "${YELLOW}📦 构建Docker镜像...(使用代理)${NC}"
echo "========================================"

# 设置代理环境变量用于构建
export BUILDKIT_PROGRESS=plain
export DOCKER_BUILDKIT=1

# 构建镜像 - 使用代理构建
if $DOCKER_COMPOSE_CMD --env-file .env.docker build --build-arg HTTP_PROXY=http://192.168.101.20:7890 --build-arg HTTPS_PROXY=http://192.168.101.20:7890 --build-arg http_proxy=http://192.168.101.20:7890 --build-arg https_proxy=http://192.168.101.20:7890 --build-arg NO_PROXY=localhost,127.0.0.1 --build-arg no_proxy=localhost,127.0.0.1; then
    echo -e "${GREEN}✓${NC} 镜像构建成功"
else
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${YELLOW}🚀 启动容器服务...${NC}"
echo "========================================"

# 启动服务
if $DOCKER_COMPOSE_CMD --env-file .env.docker up -d; then
    echo -e "${GREEN}✓${NC} 容器启动成功"
else
    echo -e "${RED}❌ 容器启动失败${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${YELLOW}⏳ 等待服务就绪...${NC}"
echo "========================================"

# 等待服务启动
sleep 5

# 等待PostgreSQL就绪
echo -n "等待PostgreSQL..."
for i in {1..30}; do
    if docker exec qdmgt_postgres pg_isready -U qdmgt_user &> /dev/null; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e " ${RED}✗ 超时${NC}"
        echo "PostgreSQL启动失败，查看日志："
        echo "  $DOCKER_COMPOSE_CMD --env-file .env.docker logs postgres"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# 等待后端就绪
echo -n "等待后端API..."
for i in {1..60}; do
    if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e " ${RED}✗ 超时${NC}"
        echo "后端API启动失败，查看日志："
        echo "  $DOCKER_COMPOSE_CMD --env-file .env.docker logs backend"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# 等待前端就绪
echo -n "等待前端Web..."
for i in {1..30}; do
    if curl -sf http://localhost:3002/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e " ${YELLOW}⚠ 前端可能需要更多时间${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "========================================"
echo -e "${YELLOW}🔍 服务状态检查${NC}"
echo "========================================"

# 显示容器状态
$DOCKER_COMPOSE_CMD --env-file .env.docker ps

echo ""
echo "========================================"
echo -e "${GREEN}✅ QDmgt容器环境启动完成！${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}📍 访问地址：${NC}"
echo "  🌐 前端Web:    http://localhost:3002"
echo "  🌐 前端Web:    http://$(hostname -I | awk '{print $1}'):3002"
echo "  🔧 后端API:    http://localhost:8001"
echo "  📚 API文档:    http://localhost:8001/docs"
echo "  🔍 健康检查:   http://localhost:8001/health"
echo ""

echo -e "${BLUE}📊 常用命令：${NC}"
echo "  查看日志:      $DOCKER_COMPOSE_CMD --env-file .env.docker logs -f"
echo "  查看后端日志:  $DOCKER_COMPOSE_CMD --env-file .env.docker logs -f backend"
echo "  查看前端日志:  $DOCKER_COMPOSE_CMD --env-file .env.docker logs -f frontend"
echo "  查看数据库日志: $DOCKER_COMPOSE_CMD --env-file .env.docker logs -f postgres"
echo "  停止服务:      ./docker-stop.sh"
echo "  重启服务:      $DOCKER_COMPOSE_CMD --env-file .env.docker restart"
echo "  进入后端容器:  docker exec -it qdmgt_backend sh"
echo "  进入数据库:    docker exec -it qdmgt_postgres psql -U qdmgt_user -d qdmgt_db"
echo ""

echo -e "${YELLOW}💡 提示：${NC}"
echo "  - 首次启动会自动运行数据库迁移（Alembic）"
echo "  - 如需查看实时日志，使用: $DOCKER_COMPOSE_CMD --env-file .env.docker logs -f"
echo "  - 如需停止服务，使用: ./docker-stop.sh"
echo ""