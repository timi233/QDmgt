# Docker Compose 兼容性修复

**问题:** 远程服务器 Docker Compose V2 使用 `docker compose` (无连字符) 而非 `docker-compose`

**修复内容:**
- ✅ `docker-start.sh` - 自动检测并使用正确的命令
- ✅ `docker-stop.sh` - 自动检测并使用正确的命令

**兼容性:**
- Docker Compose V1: `docker-compose` (独立二进制)
- Docker Compose V2: `docker compose` (Docker CLI 插件)

**修改时间:** 2025-10-20 12:20
