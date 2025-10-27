FROM python:3.11-slim

LABEL maintainer="QDmgt Team"
LABEL description="Channel Management System - Backend API"

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 安装系统依赖\n# - build-essential: 编译工具链（gcc, g++, make等）\n# - libpq-dev: PostgreSQL客户端开发库\n# - python3-dev: Python开发头文件\n# - curl: 健康检查工具\n# - rustc cargo: Rust编译器（pydantic-core需要）\nENV http_proxy=http://192.168.101.20:7890\nENV https_proxy=http://192.168.101.20:7890\nENV no_proxy=localhost,127.0.0.1\n\nRUN apt-get update && \\\n    apt-get install -y --no-install-recommends \\\n        build-essential \\\n        libpq-dev \\\n        python3-dev \\\n        curl \\\n        rustc \\\n        cargo \\\n    && rm -rf /var/lib/apt/lists/*

# 复制requirements.txt并安装Python依赖
# 注意：这里使用COPY以利用Docker缓存层，代码通过bind mount挂载
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && \
    rm /tmp/requirements.txt

# 创建非root用户运行应用（安全最佳实践）
RUN useradd -m -u 1000 -s /bin/bash appuser && \
    chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 8001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# 启动命令
# 1. 等待PostgreSQL就绪（通过docker-compose的depends_on和healthcheck处理）
# 2. 运行Alembic数据库迁移
# 3. 启动Uvicorn服务器
CMD ["sh", "-c", "\
    cd /app/backend && \
    echo '🔄 Running database migrations...' && \
    alembic upgrade head && \
    echo '✅ Migrations completed' && \
    echo '🚀 Starting backend server...' && \
    cd /app && \
    uvicorn backend.src.main:app --host 0.0.0.0 --port 8001 \
"]
