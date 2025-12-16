#!/bin/bash

# 安全密钥生成脚本
# 用途：为渠道管理系统生成强加密密钥

echo "========================================="
echo "  渠道管理系统 - 安全密钥生成工具"
echo "========================================="
echo ""
echo "正在生成安全密钥..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. JWT访问令牌密钥 (JWT_SECRET)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_SECRET=$JWT_SECRET"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. JWT刷新令牌密钥 (JWT_REFRESH_SECRET)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. PostgreSQL数据库密码 (POSTGRES_PASSWORD)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Redis密码 (REDIS_PASSWORD)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. 完整的DATABASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@localhost:5432/channel_db"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. 完整的REDIS_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "REDIS_URL=redis://default:$REDIS_PASSWORD@localhost:6379"
echo ""

echo "========================================="
echo "  下一步操作"
echo "========================================="
echo ""
echo "1. 将以上密钥复制到 .env 文件中"
echo "2. 如果使用Docker，更新 docker-compose.yml"
echo "3. 重启所有服务"
echo ""
echo "⚠️  安全警告："
echo "  • 不要将这些密钥提交到Git仓库"
echo "  • 在生产环境使用不同的密钥"
echo "  • 定期轮换密钥（建议90天）"
echo "  • 将密钥安全备份到密钥管理服务"
echo ""
echo "📖 详细文档: docs/SECURITY_CONFIGURATION_GUIDE.md"
echo ""
