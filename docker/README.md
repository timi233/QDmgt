# Docker - 容器化配置

Docker Compose 配置和相关脚本。

## 服务列表

- **postgres**: PostgreSQL 16 数据库
- **redis**: Redis 7 缓存
- **backend**: Express API 服务
- **frontend**: Vite 前端开发服务器
- **nginx**: 反向代理服务器

## 使用

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service-name]

# 停止服务
docker-compose down

# 停止并删除卷
docker-compose down -v
```

## 生产部署

```bash
# 使用生产配置构建
docker-compose -f docker-compose.prod.yml build

# 启动生产环境
docker-compose -f docker-compose.prod.yml up -d
```

## 网络

所有服务在 `app-network` 网络中通信。

## 数据持久化

- PostgreSQL: `./data/postgres`
- Redis: `./data/redis`

这些目录已在 `.gitignore` 中排除。
