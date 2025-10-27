# QDmgt Docker快速开始 🚀

5分钟快速部署渠道管理系统到任意Linux服务器。

---

## 📦 准备工作

### 系统要求
- Linux服务器（Ubuntu 20.04+, CentOS 8+, Debian 11+）
- 2GB+ 内存
- 10GB+ 磁盘空间
- Docker 20.10+
- Docker Compose 2.0+

### 检查Docker
```bash
docker --version
docker-compose --version
```

没有Docker？执行：
```bash
curl -fsSL https://get.docker.com | sh
```

---

## 🚀 快速部署（5步）

### 步骤1：获取代码

```bash
# 克隆仓库
git clone <repository-url>
cd QDmgt

# 或者解压传输的文件
tar xzf qdmgt-docker.tar.gz
cd qdmgt-docker
```

### 步骤2：配置环境

```bash
# 复制环境变量模板
cp .env.docker.example .env.docker

# 生成密钥
JWT_KEY=$(openssl rand -base64 48)
SECRET=$(openssl rand -base64 48)
DB_PASS=$(openssl rand -base64 24)

# 自动配置（推荐）
sed -i "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT_KEY|" .env.docker
sed -i "s|SECRET_KEY=.*|SECRET_KEY=$SECRET|" .env.docker
sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$DB_PASS|" .env.docker
```

### 步骤3：配置IP地址

```bash
# 获取服务器IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "服务器IP: $SERVER_IP"

# 更新配置文件中的IP地址
sed -i "s|192.168.101.9|$SERVER_IP|g" .env.docker
```

**或者手动编辑：**
```bash
vim .env.docker
```

修改以下配置：
```bash
SECURITY_ALLOWED_ORIGINS=http://YOUR_IP:3002,http://localhost:3002
REACT_APP_API_BASE_URL=http://YOUR_IP:8001/api/v1
```

### 步骤4：启动服务

```bash
# 赋予执行权限
chmod +x docker-start.sh docker-stop.sh

# 启动
./docker-start.sh
```

脚本会自动：
- ✓ 检查环境
- ✓ 构建镜像
- ✓ 启动容器
- ✓ 运行数据库迁移
- ✓ 健康检查

### 步骤5：访问系统

打开浏览器访问：

```
http://YOUR_IP:3002
```

- **前端Web**: http://YOUR_IP:3002
- **后端API**: http://YOUR_IP:8001/docs
- **健康检查**: http://YOUR_IP:8001/health

---

## 🔄 常用操作

### 查看状态
```bash
docker-compose --env-file .env.docker ps
```

### 查看日志
```bash
# 所有服务
docker-compose --env-file .env.docker logs -f

# 仅后端
docker-compose --env-file .env.docker logs -f backend
```

### 停止服务
```bash
./docker-stop.sh
```

### 重启服务
```bash
docker-compose --env-file .env.docker restart
```

---

## 📊 数据迁移（可选）

如果有旧的SQLite数据：

```bash
./scripts/migrate-to-postgres.sh test.db
```

选择迁移方案（推荐方案1）。

---

## 🛠️ 故障排查

### 1. 端口被占用

```bash
# 检查端口占用
sudo lsof -i :8001
sudo lsof -i :3002

# 杀死占用进程
sudo kill -9 <PID>
```

### 2. 容器启动失败

```bash
# 查看容器状态
docker-compose --env-file .env.docker ps

# 查看日志
docker-compose --env-file .env.docker logs backend

# 重新构建
docker-compose --env-file .env.docker build --no-cache
./docker-start.sh
```

### 3. 数据库连接失败

```bash
# 检查PostgreSQL
docker exec qdmgt_postgres pg_isready -U qdmgt_user

# 重启数据库
docker-compose --env-file .env.docker restart postgres
```

### 4. 前端无法访问后端

检查CORS配置：
```bash
# 查看后端环境变量
docker exec qdmgt_backend env | grep SECURITY_ALLOWED_ORIGINS

# 确认前端API地址
docker exec qdmgt_frontend env | grep REACT_APP_API_BASE_URL
```

---

## 🔐 安全提示

### ⚠️ 生产环境必做

1. **修改所有默认密码**
   ```bash
   vim .env.docker
   # 修改：
   # - POSTGRES_PASSWORD
   # - JWT_SECRET_KEY
   # - SECRET_KEY
   ```

2. **配置防火墙**
   ```bash
   # 允许Web和API端口
   sudo ufw allow 3002/tcp
   sudo ufw allow 8001/tcp
   sudo ufw enable
   ```

3. **定期备份数据库**
   ```bash
   docker exec qdmgt_postgres pg_dump -U qdmgt_user qdmgt_db > backup.sql
   ```

4. **更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## 📖 详细文档

更多信息请查看：

- 📚 [完整部署文档](docs/docker-deployment.md)
- 🔧 [运维管理指南](docs/docker-deployment.md#运维管理)
- 🐛 [故障排查手册](docs/docker-deployment.md#故障排查)

---

## 💡 快速命令参考

| 操作 | 命令 |
|------|------|
| 启动服务 | `./docker-start.sh` |
| 停止服务 | `./docker-stop.sh` |
| 查看状态 | `docker-compose --env-file .env.docker ps` |
| 查看日志 | `docker-compose --env-file .env.docker logs -f` |
| 重启服务 | `docker-compose --env-file .env.docker restart` |
| 进入后端 | `docker exec -it qdmgt_backend sh` |
| 进入数据库 | `docker exec -it qdmgt_postgres psql -U qdmgt_user -d qdmgt_db` |
| 备份数据库 | `docker exec qdmgt_postgres pg_dump -U qdmgt_user qdmgt_db > backup.sql` |
| 清理所有 | `docker-compose --env-file .env.docker down -v` |

---

## ❓ 需要帮助？

- 📧 Email: support@example.com
- 🐛 Issues: https://github.com/yourorg/QDmgt/issues

---

**版本：** v1.0.0
**最后更新：** 2025-10-20
