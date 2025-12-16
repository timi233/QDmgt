# 原生开发环境配置指南

本文档描述如何在不使用 Docker 的情况下进行本地开发。

## 概述

项目支持两种开发模式：
1. **Docker 模式**：使用 `docker-compose up -d` 一键启动所有服务
2. **原生模式**：直接在本机运行 PostgreSQL、Redis 和 Node.js 服务

本指南针对**原生模式**。

---

## 前置条件

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 16
- Redis 7
- OpenSSL（Prisma 依赖）

---

## 一、安装原生服务

### 1. PostgreSQL 16

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-16 postgresql-client-16

# 启动并设置开机自启
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Redis 7

```bash
# Ubuntu/Debian
sudo apt install redis-server

# 启动并设置开机自启
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 3. 验证安装

```bash
# PostgreSQL
psql --version
sudo systemctl status postgresql

# Redis
redis-cli --version
sudo systemctl status redis-server
```

---

## 二、配置数据库

### 1. 创建数据库和用户

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 psql 中执行
CREATE USER postgres WITH PASSWORD 'postgres123' SUPERUSER;
CREATE DATABASE channel_db OWNER postgres;
\q
```

### 2. 配置 Redis 密码（可选）

编辑 `/etc/redis/redis.conf`：

```bash
sudo vim /etc/redis/redis.conf
```

找到并修改：
```
requirepass redis123
```

重启 Redis：
```bash
sudo systemctl restart redis-server
```

### 3. 验证连接

```bash
# PostgreSQL
psql -h localhost -U postgres -d channel_db -c "SELECT 1;"

# Redis
redis-cli -a redis123 ping
```

---

## 三、环境配置

项目根目录的 `.env` 文件已配置为 localhost，通常无需修改：

```env
# Database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/channel_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=channel_db

# Redis
REDIS_URL=redis://default:redis123@localhost:6379
REDIS_PASSWORD=redis123

# JWT
JWT_SECRET=your-jwt-secret-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# CORS
CORS_ORIGIN=http://localhost:4001

# Logging
LOG_LEVEL=debug

# Frontend
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_APP_TITLE=渠道管理系统
```

---

## 四、安装项目依赖

```bash
cd /home/pytc/渠道

# 安装所有依赖（根目录 + frontend + backend）
npm run install:all

# 或分别安装
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

---

## 五、初始化数据库

```bash
cd backend

# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# （可选）填充种子数据
npm run db:seed

# （可选）打开数据库管理界面
npm run db:studio
```

---

## 六、启动开发服务

### 方式一：分别启动（推荐）

打开两个终端：

**终端 1 - 后端**
```bash
cd /home/pytc/渠道
npm run dev:backend
# 后端运行在 http://localhost:3001
```

**终端 2 - 前端**
```bash
cd /home/pytc/渠道
npm run dev:frontend
# 前端运行在 http://localhost:4001
```

### 方式二：使用 concurrently 并行启动

```bash
# 先安装 concurrently（如未安装）
npm install -g concurrently

# 启动
concurrently "npm run dev:backend" "npm run dev:frontend"
```

---

## 七、访问应用

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:4001 |
| 后端 API | http://localhost:3001/api/v1 |
| Prisma Studio | http://localhost:5555 |

---

## 八、常用命令

```bash
# 开发
npm run dev:frontend     # 启动前端
npm run dev:backend      # 启动后端

# 数据库
npm run db:migrate       # 运行迁移
npm run db:seed          # 填充种子数据
npm run db:studio        # 打开 Prisma Studio

# 构建
npm run build:frontend   # 构建前端
npm run build:backend    # 构建后端
npm run build            # 构建全部
```

---

## 九、与 Docker 模式对比

| 特性 | Docker 模式 | 原生模式 |
|------|-------------|----------|
| 启动命令 | `npm run dev` | `npm run dev:backend` + `npm run dev:frontend` |
| 环境一致性 | 高（容器隔离） | 中（依赖本机环境） |
| 热重载速度 | 较慢 | 快 |
| 资源占用 | 较高 | 较低 |
| 首次配置 | 简单 | 需要安装 PG/Redis |
| 适用场景 | 部署、CI/CD | 日常开发 |

---

## 十、故障排除

### 1. PostgreSQL 连接失败

```bash
# 检查服务状态
sudo systemctl status postgresql

# 检查端口
sudo netstat -tlnp | grep 5432

# 检查认证配置
sudo cat /etc/postgresql/16/main/pg_hba.conf
```

### 2. Redis 连接失败

```bash
# 检查服务状态
sudo systemctl status redis-server

# 测试连接
redis-cli -a redis123 ping

# 检查配置
sudo cat /etc/redis/redis.conf | grep -E "^(bind|requirepass)"
```

### 3. Prisma 错误

```bash
# 重新生成 Client
cd backend && npx prisma generate

# 重置数据库（谨慎！会清空数据）
npx prisma migrate reset --force
```

### 4. 端口被占用

```bash
# 查找占用端口的进程
sudo lsof -i :3001
sudo lsof -i :4001
sudo lsof -i :5432
sudo lsof -i :6379

# 终止进程
kill -9 <PID>
```

---

## 十一、注意事项

1. **Docker 文件保留**：`docker/`、`docker-compose.yml`、`Dockerfile` 等文件保留，用于生产部署
2. **备份脚本**：`scripts/backup.sh` 中的 Redis 备份依赖 Docker，原生模式下会跳过
3. **Nginx**：开发环境不需要 Nginx，前端直接通过 Vite 代理连接后端
4. **生产部署**：上线时仍建议使用 Docker 以保证环境一致性

---

## 更新日志

- **2025-12-16**：创建文档，支持原生开发模式
