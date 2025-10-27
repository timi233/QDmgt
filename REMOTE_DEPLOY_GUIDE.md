# 远程服务器部署指南

**目标服务器:** 192.168.101.9 (或其他IP)
**部署包:** `qdmgt-complete.tar.gz`

---

## 📦 步骤1: 传输部署包

```bash
# 在本地执行
scp qdmgt-complete.tar.gz server@192.168.101.9:~/
```

**说明:**
- 替换 `server` 为实际用户名
- 替换 IP 地址为目标服务器地址

---

## 🚀 步骤2: 在远程服务器部署

### 2.1 解压部署包

```bash
# SSH 登录远程服务器
ssh server@192.168.101.9

# 创建部署目录
mkdir -p ~/QDmgt
cd ~/QDmgt

# 解压（会覆盖现有文件）
tar xzf ~/qdmgt-complete.tar.gz

# 验证关键文件
ls -la docker-compose.yml backend/Dockerfile frontend/Dockerfile
```

**预期输出:**
```
-rw-r--r-- 1 server server 3200 Oct 20 12:00 docker-compose.yml
-rw-r--r-- 1 server server 1871 Oct 20 12:00 backend/Dockerfile
-rw-r--r-- 1 server server 1492 Oct 20 12:00 frontend/Dockerfile
```

### 2.2 配置环境变量

```bash
# 复制配置模板
cp .env.docker.example .env.docker

# 编辑配置
vim .env.docker
```

**必须修改的配置项:**

```bash
# 1. 数据库密码 (强密码,至少16字符)
POSTGRES_PASSWORD=YourStrongPassword123!@#

# 2. JWT密钥 (生成新的)
# 运行: openssl rand -base64 48
JWT_SECRET_KEY=<生成的48字符密钥>

# 3. 通用密钥 (生成新的)
# 运行: openssl rand -base64 48
SECRET_KEY=<生成的48字符密钥>

# 4. CORS允许的来源 (修改为实际IP)
SECURITY_ALLOWED_ORIGINS=http://192.168.101.9:3002,http://localhost:3002

# 5. 前端API地址 (修改为实际IP)
REACT_APP_API_BASE_URL=http://192.168.101.9:8001/api/v1
```

**快速生成密钥:**
```bash
# 生成JWT密钥
echo "JWT_SECRET_KEY=$(openssl rand -base64 48)"

# 生成通用密钥
echo "SECRET_KEY=$(openssl rand -base64 48)"
```

### 2.3 启动服务

```bash
# 确保脚本可执行
chmod +x docker-start.sh docker-stop.sh

# 启动服务
./docker-start.sh
```

**预期输出:**
```
🐳 QDmgt Docker容器环境启动
========================================
✓ 找到配置文件: .env.docker
✓ Docker已安装: Docker version 28.4.0
✓ Docker Compose已安装: Docker Compose version v2.32.3
✓ Docker daemon运行中

========================================
📦 构建Docker镜像...
========================================
[+] Building 120.5s (25/25) FINISHED
✓ 镜像构建成功

========================================
🚀 启动容器服务...
========================================
[+] Running 3/3
 ✔ Container qdmgt_postgres   Started
 ✔ Container qdmgt_backend    Started
 ✔ Container qdmgt_frontend   Started
✓ 容器启动成功

等待PostgreSQL... ✓
等待后端API... ✓
等待前端Web... ✓

========================================
✅ QDmgt容器环境启动完成！
========================================

📍 访问地址：
  🌐 前端Web:    http://localhost:3002
  🌐 前端Web:    http://192.168.101.9:3002
  🔧 后端API:    http://localhost:8001
  📚 API文档:    http://localhost:8001/docs
  🔍 健康检查:   http://localhost:8001/health
```

---

## ✅ 步骤3: 验证部署

### 3.1 检查容器状态

```bash
docker compose --env-file .env.docker ps
```

**预期输出:**
```
NAME              STATUS          PORTS
qdmgt_backend     Up (healthy)    0.0.0.0:8001->8001/tcp
qdmgt_frontend    Up (healthy)    0.0.0.0:3002->80/tcp
qdmgt_postgres    Up (healthy)    5432/tcp
```

### 3.2 测试后端健康检查

```bash
curl http://localhost:8001/health | python3 -m json.tool
```

**预期输出:**
```json
{
    "status": "healthy",
    "app": "Channel Management System",
    "version": "0.1.0",
    "timestamp": "2025-10-20T12:00:00",
    "components": {
        "database": "healthy",
        "api": "healthy"
    }
}
```

### 3.3 访问前端Web

在浏览器打开: `http://192.168.101.9:3002`

应该看到系统登录页面。

---

## 📊 常用命令

```bash
# 查看所有服务日志
docker compose --env-file .env.docker logs -f

# 查看后端日志
docker compose --env-file .env.docker logs -f backend

# 查看前端日志
docker compose --env-file .env.docker logs -f frontend

# 查看数据库日志
docker compose --env-file .env.docker logs -f postgres

# 重启所有服务
docker compose --env-file .env.docker restart

# 停止服务
./docker-stop.sh

# 进入后端容器
docker exec -it qdmgt_backend sh

# 进入数据库
docker exec -it qdmgt_postgres psql -U qdmgt_user -d qdmgt_db
```

---

## 🔧 故障排查

### 问题1: 构建失败 - "Dockerfile not found"

**症状:**
```
failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
```

**解决:**
```bash
# 确认文件存在
ls -la backend/Dockerfile frontend/Dockerfile

# 如果不存在,重新解压
cd ~/QDmgt
tar xzf ~/qdmgt-complete.tar.gz --overwrite
```

### 问题2: 后端容器不断重启

**症状:**
```
qdmgt_backend    Restarting
```

**解决:**
```bash
# 查看后端日志找错误
docker compose --env-file .env.docker logs backend | tail -100

# 常见原因:
# 1. 数据库连接失败 - 检查 .env.docker 中的 DATABASE_URL
# 2. 缺少依赖 - 重新构建: docker compose build backend
# 3. 端口冲突 - 检查 8001 端口是否被占用: lsof -i:8001
```

### 问题3: 前端无法连接后端

**症状:**
前端页面打开,但无法登录或加载数据

**解决:**
```bash
# 1. 检查 .env.docker 中的 REACT_APP_API_BASE_URL
#    必须是: http://<服务器IP>:8001/api/v1

# 2. 检查 CORS 配置
#    SECURITY_ALLOWED_ORIGINS 必须包含前端访问地址

# 3. 重新构建前端
docker compose --env-file .env.docker build frontend
docker compose --env-file .env.docker up -d frontend
```

### 问题4: PostgreSQL 健康检查失败

**症状:**
```
qdmgt_postgres    Up (unhealthy)
```

**解决:**
```bash
# 查看数据库日志
docker compose --env-file .env.docker logs postgres

# 检查数据卷
docker volume ls | grep qdmgt_postgres_data

# 如需重置数据库 (⚠️ 会删除所有数据!)
docker compose --env-file .env.docker down -v
./docker-start.sh
```

---

## 🔐 安全提示

1. **修改默认密码**: 务必修改 `POSTGRES_PASSWORD`
2. **生成新密钥**: 不要使用示例中的 `JWT_SECRET_KEY` 和 `SECRET_KEY`
3. **CORS 限制**: `SECURITY_ALLOWED_ORIGINS` 只添加可信来源
4. **防火墙**: 建议配置防火墙只允许必要端口 (3002, 8001)
5. **HTTPS**: 生产环境建议配置 Nginx 反向代理 + SSL 证书

---

## 📝 数据备份

### 备份数据库

```bash
# 导出数据库
docker exec qdmgt_postgres pg_dump -U qdmgt_user qdmgt_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup_20251020.sql | docker exec -i qdmgt_postgres psql -U qdmgt_user -d qdmgt_db
```

### 备份配置

```bash
# 备份环境配置
cp .env.docker .env.docker.backup_$(date +%Y%m%d)
```

---

**创建日期:** 2025-10-20
**版本:** v1.0.0
**维护者:** QDmgt Team
