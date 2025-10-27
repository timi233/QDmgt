# QDmgt Docker容器化部署文档

## 📋 目录

- [系统架构](#系统架构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细部署步骤](#详细部署步骤)
- [环境变量配置](#环境变量配置)
- [数据迁移](#数据迁移)
- [运维管理](#运维管理)
- [故障排查](#故障排查)
- [安全最佳实践](#安全最佳实践)

---

## 系统架构

### 容器架构图

```
外部访问 (192.168.101.9)
        ↓
┌────────────────────────────┐
│  Frontend Container        │  ← Port 3002 (Nginx)
│  React SPA                 │
└────────────────────────────┘
        ↓
┌────────────────────────────┐
│  Backend Container         │  ← Port 8001 (FastAPI)
│  Python + Uvicorn          │
└────────────────────────────┘
        ↓ (内部网络 qdmgt_network)
┌────────────────────────────┐
│  PostgreSQL Container      │  ← 仅内部访问（无端口暴露）
│  Database Server           │
└────────────────────────────┘
        ↓
    Docker Volume
  (postgres_data)
```

### 关键特性

- ✅ **PostgreSQL容器化**：仅内部网络访问，不对外暴露端口
- ✅ **数据持久化**：Docker managed volume，数据安全可靠
- ✅ **代码热更新**：Bind mount支持开发时代码修改实时生效
- ✅ **自动数据库迁移**：Alembic自动创建/更新表结构
- ✅ **健康检查**：所有服务配置健康检查机制
- ✅ **多阶段构建**：前端使用Node构建 + Nginx运行，镜像体积小

---

## 环境要求

### 硬件要求

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核+ |
| 内存 | 2GB | 4GB+ |
| 磁盘 | 10GB | 20GB+ |

### 软件要求

- **操作系统**：Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **Docker**：20.10+
- **Docker Compose**：2.0+

### 检查Docker安装

```bash
# 检查Docker版本
docker --version

# 检查Docker Compose版本
docker-compose --version

# 检查Docker运行状态
docker info
```

### 安装Docker（如需要）

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 快速开始

### 5分钟快速部署

```bash
# 1. 进入项目目录
cd /path/to/QDmgt

# 2. 复制环境变量模板
cp .env.docker.example .env.docker

# 3. 编辑配置文件（必须修改密码和密钥！）
vim .env.docker

# 4. 启动容器
./docker-start.sh

# 5. 访问系统
# 前端：http://192.168.101.9:3002
# 后端API：http://192.168.101.9:8001/docs
```

---

## 详细部署步骤

### 步骤1：准备配置文件

#### 1.1 复制环境变量模板

```bash
cp .env.docker.example .env.docker
```

#### 1.2 生成安全密钥

```bash
# 生成JWT密钥
openssl rand -base64 48

# 生成SECRET_KEY
openssl rand -base64 48

# 生成PostgreSQL密码（推荐16+字符）
openssl rand -base64 24
```

#### 1.3 编辑配置文件

```bash
vim .env.docker
```

**必须修改的配置：**

```bash
# PostgreSQL密码（必改！）
POSTGRES_PASSWORD=YourSecurePassword123!

# JWT密钥（必改！）
JWT_SECRET_KEY=your-generated-jwt-secret-key-here

# 通用密钥（必改！）
SECRET_KEY=your-generated-secret-key-here

# CORS地址（根据实际IP修改）
SECURITY_ALLOWED_ORIGINS=http://192.168.101.9:3002,http://localhost:3002

# 前端API地址（根据实际IP修改）
REACT_APP_API_BASE_URL=http://192.168.101.9:8001/api/v1
```

### 步骤2：构建并启动容器

#### 2.1 使用自动化脚本（推荐）

```bash
./docker-start.sh
```

脚本会自动：
- ✓ 检查配置文件
- ✓ 验证Docker环境
- ✓ 构建Docker镜像
- ✓ 启动所有容器
- ✓ 等待服务就绪
- ✓ 运行健康检查

#### 2.2 手动启动（可选）

```bash
# 构建镜像
docker-compose --env-file .env.docker build

# 启动容器（后台运行）
docker-compose --env-file .env.docker up -d

# 查看容器状态
docker-compose --env-file .env.docker ps

# 查看日志
docker-compose --env-file .env.docker logs -f
```

### 步骤3：验证部署

#### 3.1 检查容器状态

```bash
docker-compose --env-file .env.docker ps
```

期望输出：
```
NAME                COMMAND                  STATUS              PORTS
qdmgt_postgres      "docker-entrypoint.s…"   Up (healthy)        5432/tcp
qdmgt_backend       "sh -c 'cd /app/back…"   Up (healthy)        0.0.0.0:8001->8001/tcp
qdmgt_frontend      "nginx -g 'daemon of…"   Up (healthy)        0.0.0.0:3002->80/tcp
```

#### 3.2 测试后端API

```bash
# 健康检查
curl http://localhost:8001/health

# 期望返回：
# {
#   "status": "healthy",
#   "app": "Channel Management System",
#   "version": "0.1.0",
#   ...
# }

# 查看API文档
curl http://localhost:8001/docs
```

#### 3.3 访问前端

打开浏览器访问：`http://192.168.101.9:3002`

### 步骤4：数据迁移（可选）

如果有旧的SQLite数据需要迁移：

```bash
./scripts/migrate-to-postgres.sh test.db
```

选择迁移方案：
- **方案1**：使用pgloader（推荐，自动转换）
- **方案2**：手动SQL导出/导入
- **方案3**：跳过迁移（空数据库）

---

## 环境变量配置

### PostgreSQL配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `POSTGRES_USER` | qdmgt_user | 数据库用户名 |
| `POSTGRES_PASSWORD` | - | **数据库密码（必须设置）** |
| `POSTGRES_DB` | qdmgt_db | 数据库名称 |

### 后端配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | 自动生成 | PostgreSQL连接字符串 |
| `SECURITY_ALLOWED_ORIGINS` | - | **CORS允许的源（必须设置）** |
| `JWT_SECRET_KEY` | - | **JWT签名密钥（必须设置）** |
| `SECRET_KEY` | - | **通用加密密钥（必须设置）** |
| `ENVIRONMENT` | production | 运行环境（production/development） |
| `DEBUG` | false | 调试模式 |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | 30 | 访问令牌过期时间（分钟） |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | 7 | 刷新令牌过期时间（天） |

### 前端配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REACT_APP_API_BASE_URL` | - | **后端API地址（必须设置）** |

### 端口配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `BACKEND_PORT` | 8001 | 后端API端口 |
| `FRONTEND_PORT` | 3002 | 前端Web端口 |

---

## 数据迁移

### 从SQLite迁移到PostgreSQL

#### 方案1：使用pgloader（推荐）

```bash
./scripts/migrate-to-postgres.sh test.db
# 选择方案1
```

**优点：**
- 自动处理类型转换
- 支持大型数据库
- 保留索引和约束

#### 方案2：手动SQL导出导入

```bash
./scripts/migrate-to-postgres.sh test.db
# 选择方案2
```

**适用场景：**
- 小型数据库（<100MB）
- 需要手动控制迁移过程

#### 方案3：重新初始化

```bash
./scripts/migrate-to-postgres.sh test.db
# 选择方案3
```

**适用场景：**
- 开发/测试环境
- 不需要保留旧数据

---

## 运维管理

### 启动/停止服务

```bash
# 启动
./docker-start.sh

# 停止
./docker-stop.sh

# 重启
docker-compose --env-file .env.docker restart

# 重启单个服务
docker-compose --env-file .env.docker restart backend
```

### 查看日志

```bash
# 查看所有日志
docker-compose --env-file .env.docker logs -f

# 查看后端日志
docker-compose --env-file .env.docker logs -f backend

# 查看最近100行
docker-compose --env-file .env.docker logs --tail=100 backend
```

### 进入容器

```bash
# 进入后端容器
docker exec -it qdmgt_backend sh

# 进入PostgreSQL
docker exec -it qdmgt_postgres psql -U qdmgt_user -d qdmgt_db

# 进入前端容器
docker exec -it qdmgt_frontend sh
```

### 数据库管理

#### 备份数据库

```bash
# 导出SQL文件
docker exec qdmgt_postgres pg_dump -U qdmgt_user qdmgt_db > backup_$(date +%Y%m%d).sql

# 备份到容器外
docker exec qdmgt_postgres pg_dump -U qdmgt_user -F c qdmgt_db > backup.dump
```

#### 恢复数据库

```bash
# 从SQL文件恢复
docker exec -i qdmgt_postgres psql -U qdmgt_user -d qdmgt_db < backup.sql

# 从dump文件恢复
docker exec -i qdmgt_postgres pg_restore -U qdmgt_user -d qdmgt_db < backup.dump
```

#### 数据库维护

```bash
# 进入PostgreSQL
docker exec -it qdmgt_postgres psql -U qdmgt_user -d qdmgt_db

# 查看所有表
\dt

# 查看表结构
\d users

# 查看索引
\di

# 执行SQL查询
SELECT * FROM users LIMIT 10;

# 退出
\q
```

### 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker-compose --env-file .env.docker build

# 3. 重启服务
docker-compose --env-file .env.docker up -d

# 4. 查看日志确认
docker-compose --env-file .env.docker logs -f
```

### 清理资源

```bash
# 停止并删除容器（保留数据卷）
docker-compose --env-file .env.docker down

# 停止并删除容器和数据卷（警告：会删除所有数据！）
docker-compose --env-file .env.docker down -v

# 清理未使用的镜像
docker image prune -a

# 清理未使用的卷
docker volume prune
```

---

## 故障排查

### 常见问题

#### 1. 容器启动失败

**问题：** 容器无法启动

**解决方法：**
```bash
# 查看容器状态
docker-compose --env-file .env.docker ps

# 查看容器日志
docker-compose --env-file .env.docker logs backend

# 检查端口占用
sudo lsof -i :8001
sudo lsof -i :3002
sudo lsof -i :5432
```

#### 2. PostgreSQL连接失败

**问题：** 后端无法连接数据库

**解决方法：**
```bash
# 检查PostgreSQL健康状态
docker exec qdmgt_postgres pg_isready -U qdmgt_user

# 检查网络连接
docker network ls
docker network inspect qdmgt_network

# 验证环境变量
docker exec qdmgt_backend env | grep DATABASE_URL
```

#### 3. 前端无法访问后端

**问题：** 前端页面显示API错误

**解决方法：**
```bash
# 检查CORS配置
docker exec qdmgt_backend env | grep SECURITY_ALLOWED_ORIGINS

# 测试后端API
curl http://localhost:8001/health

# 检查前端环境变量
docker exec qdmgt_frontend env | grep REACT_APP_API_BASE_URL
```

#### 4. 数据迁移失败

**问题：** SQLite到PostgreSQL迁移出错

**解决方法：**
```bash
# 检查SQLite文件权限
ls -l test.db

# 使用空数据库重新开始
docker-compose --env-file .env.docker down -v
./docker-start.sh
```

### 日志分析

#### 后端日志关键词

- `✅ Migrations completed` - 数据库迁移成功
- `ERROR` - 错误信息
- `WARNING` - 警告信息
- `CORS allowed origins` - CORS配置

#### PostgreSQL日志关键词

- `database system is ready` - 数据库就绪
- `connection` - 连接信息
- `ERROR` - 数据库错误

---

## 安全最佳实践

### 1. 密钥管理

- ✅ 使用强随机密钥（至少32字符）
- ✅ 定期更换密钥（建议每季度）
- ✅ 不要在代码仓库中提交`.env.docker`
- ✅ 使用环境变量而非硬编码

### 2. 网络安全

- ✅ PostgreSQL仅内部网络访问（无外部端口）
- ✅ 配置防火墙限制访问IP
- ✅ 使用HTTPS（生产环境）
- ✅ 限制CORS允许的源

### 3. 数据库安全

- ✅ 使用强密码（16+字符，包含大小写、数字、特殊字符）
- ✅ 定期备份数据库
- ✅ 限制数据库用户权限
- ✅ 启用PostgreSQL审计日志

### 4. 容器安全

- ✅ 使用非root用户运行应用
- ✅ 定期更新基础镜像
- ✅ 扫描镜像漏洞
- ✅ 限制容器资源使用

### 5. 生产环境配置

```bash
# .env.docker生产环境示例
ENVIRONMENT=production
DEBUG=false
POSTGRES_PASSWORD=<strong-random-password>
JWT_SECRET_KEY=<long-random-key-48+chars>
SECRET_KEY=<long-random-key-48+chars>
SECURITY_ALLOWED_ORIGINS=https://yourdomain.com
```

---

## 附录

### A. 文件结构

```
QDmgt/
├── docker-compose.yml          # Docker编排配置
├── .env.docker.example         # 环境变量模板
├── .env.docker                 # 环境变量配置（不提交）
├── docker-start.sh             # 启动脚本
├── docker-stop.sh              # 停止脚本
├── backend/
│   ├── Dockerfile              # 后端镜像构建文件
│   ├── requirements.txt        # Python依赖
│   └── src/                    # 后端源代码
├── frontend/
│   ├── Dockerfile              # 前端镜像构建文件
│   ├── nginx.conf              # Nginx配置
│   └── src/                    # 前端源代码
├── scripts/
│   └── migrate-to-postgres.sh  # 数据迁移脚本
└── docs/
    └── docker-deployment.md    # 本文档
```

### B. 端口映射

| 服务 | 容器端口 | 宿主机端口 | 说明 |
|------|---------|-----------|------|
| PostgreSQL | 5432 | - | 仅内部访问 |
| Backend | 8001 | 8001 | API服务 |
| Frontend | 80 | 3002 | Web界面 |

### C. 数据卷

| 卷名 | 挂载点 | 说明 |
|------|--------|------|
| postgres_data | /var/lib/postgresql/data | PostgreSQL数据 |
| ./backend | /app/backend | 后端代码（bind mount） |
| ./frontend/nginx.conf | /etc/nginx/conf.d/default.conf | Nginx配置（bind mount） |

---

## 联系支持

如有问题，请通过以下方式联系：

- 📧 Email: support@example.com
- 🐛 Issue: https://github.com/yourorg/QDmgt/issues
- 📖 文档: https://docs.example.com

---

**版本：** v1.0.0
**最后更新：** 2025-10-20
**文档维护者：** QDmgt Team
