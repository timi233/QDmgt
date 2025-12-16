# 安全配置指南

**重要性**: 🔴 关键安全配置
**最后更新**: 2025-12-03

---

## ⚠️ 重要警告

**生产环境部署前必须完成以下安全配置！**

默认的开发环境密码是**不安全**的，仅用于本地开发。在生产环境中使用弱密码会导致：
- 数据库被未授权访问
- 用户认证凭证被破解
- 系统完全被攻击

---

## 1. JWT密钥生成和配置

### 为什么需要强JWT密钥？

JWT密钥用于签名和验证认证令牌。弱密钥可以被暴力破解，导致攻击者伪造用户身份。

### 生成强JWT密钥

```bash
# 生成64字节的随机密钥（推荐）
openssl rand -base64 64

# 示例输出：
# hZKs1rtGbypBatKNdU2F3B74iQKrRyl+R9/wquPJCcYmY/ld9HkXXbtL18tRsmSwPshOimZuIjruVythcAY28g==
```

### 配置步骤

1. **生成两个不同的密钥**（一个用于访问令牌，一个用于刷新令牌）：

```bash
# JWT访问令牌密钥
openssl rand -base64 64

# JWT刷新令牌密钥
openssl rand -base64 64
```

2. **更新.env文件**：

```bash
# 复制.env.example到.env（如果还没有）
cp .env.example .env

# 编辑.env文件
nano .env  # 或使用你喜欢的编辑器
```

3. **替换占位符**：

```bash
# 将以下内容替换为实际生成的密钥
JWT_SECRET=<第一个生成的密钥>
JWT_REFRESH_SECRET=<第二个生成的密钥>
```

### ✅ 最佳实践

- ✅ 使用至少64字节（512位）的随机密钥
- ✅ 为访问令牌和刷新令牌使用不同的密钥
- ✅ 定期轮换密钥（建议每90天）
- ✅ 不要在代码中硬编码密钥
- ✅ 使用密钥管理服务（生产环境）

### ❌ 不安全的做法

- ❌ 使用简单字符串如 "secret" 或 "password"
- ❌ 使用短于32字节的密钥
- ❌ 在多个环境使用相同的密钥
- ❌ 将密钥提交到Git仓库

---

## 2. 数据库密码配置

### 生成强数据库密码

```bash
# 生成32字节的随机密码
openssl rand -base64 32

# 示例输出：
# kJ8mN2pQ5rT7vX9zB4cD6fH8jK0lM3nP5qR7sT9uV1wX3yZ5
```

### 配置步骤

1. **生成密码**：

```bash
openssl rand -base64 32
```

2. **更新.env文件**：

```bash
POSTGRES_PASSWORD=<生成的密码>
DATABASE_URL=postgresql://postgres:<生成的密码>@localhost:5432/channel_db
```

3. **更新Docker配置**（如果使用Docker）：

编辑 `docker-compose.yml`:

```yaml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: <生成的密码>
```

4. **重启数据库**：

```bash
# 如果使用Docker
docker-compose down
docker-compose up -d postgres

# 如果使用本地PostgreSQL
sudo systemctl restart postgresql
```

### ✅ 密码要求

- ✅ 至少32个字符
- ✅ 包含大小写字母、数字和特殊字符
- ✅ 避免使用字典单词
- ✅ 每个环境使用不同的密码

---

## 3. Redis密码配置

### 生成Redis密码

```bash
# 生成32字节的随机密码
openssl rand -base64 32
```

### 配置步骤

1. **更新.env文件**：

```bash
REDIS_PASSWORD=<生成的密码>
REDIS_URL=redis://default:<生成的密码>@localhost:6379
```

2. **更新Redis配置**（如果使用本地Redis）：

编辑 `/etc/redis/redis.conf`:

```
requirepass <生成的密码>
```

3. **重启Redis**：

```bash
# Docker
docker-compose restart redis

# 本地安装
sudo systemctl restart redis
```

---

## 4. 环境变量管理

### 开发环境

1. **创建本地.env文件**：

```bash
cp .env.example .env
```

2. **使用相对较弱但独特的密码**（仅用于开发）：

```bash
# 开发环境示例
JWT_SECRET=dev-jwt-secret-$(openssl rand -hex 16)
POSTGRES_PASSWORD=dev-postgres-$(openssl rand -hex 8)
REDIS_PASSWORD=dev-redis-$(openssl rand -hex 8)
```

### 生产环境

**推荐方案**：使用密钥管理服务

#### 选项1：环境变量（基础）

```bash
# 在服务器上设置环境变量
export JWT_SECRET="<生成的强密钥>"
export POSTGRES_PASSWORD="<生成的强密码>"
export REDIS_PASSWORD="<生成的强密码>"
```

#### 选项2：AWS Secrets Manager

```bash
# 安装AWS CLI
aws configure

# 存储密钥
aws secretsmanager create-secret \
  --name channel-system/jwt-secret \
  --secret-string "<生成的JWT密钥>"

aws secretsmanager create-secret \
  --name channel-system/postgres-password \
  --secret-string "<生成的数据库密码>"
```

在代码中读取：

```javascript
// backend/src/config/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

async function getSecret(secretName: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return response.SecretString || "";
}

export const JWT_SECRET = await getSecret("channel-system/jwt-secret");
```

#### 选项3：HashiCorp Vault

```bash
# 启动Vault
vault server -dev

# 存储密钥
vault kv put secret/channel-system \
  jwt_secret="<生成的JWT密钥>" \
  postgres_password="<生成的数据库密码>" \
  redis_password="<生成的Redis密码>"
```

#### 选项4：Docker Secrets

```bash
# 创建secret
echo "<JWT密钥>" | docker secret create jwt_secret -
echo "<数据库密码>" | docker secret create postgres_password -

# 在docker-compose.yml中使用
services:
  backend:
    secrets:
      - jwt_secret
      - postgres_password
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
```

---

## 5. 密钥轮换策略

### 为什么需要轮换？

定期轮换密钥可以：
- 限制密钥泄露的影响时间
- 符合安全合规要求
- 降低长期攻击风险

### JWT密钥轮换

**建议频率**：每90天

**步骤**：

1. **生成新密钥**：

```bash
NEW_JWT_SECRET=$(openssl rand -base64 64)
```

2. **配置双密钥支持**（优雅迁移）：

```javascript
// backend/src/services/authService.ts
const JWT_SECRETS = [
  process.env.JWT_SECRET,        // 当前密钥
  process.env.JWT_SECRET_OLD     // 旧密钥（验证用）
]

export function verifyToken(token: string): JwtPayload {
  // 先尝试当前密钥
  try {
    return jwt.verify(token, JWT_SECRETS[0]) as JwtPayload
  } catch {
    // 回退到旧密钥
    return jwt.verify(token, JWT_SECRETS[1]) as JwtPayload
  }
}
```

3. **更新环境变量**：

```bash
JWT_SECRET_OLD=$JWT_SECRET
JWT_SECRET=$NEW_JWT_SECRET
```

4. **重启服务**

5. **30天后移除旧密钥**

### 数据库密码轮换

**建议频率**：每180天

**步骤**：

```sql
-- 创建新密码
ALTER USER postgres WITH PASSWORD '<新密码>';

-- 更新应用配置
-- 重启应用
```

---

## 6. 安全检查清单

### 部署前检查

- [ ] 所有密钥已使用强随机生成
- [ ] JWT_SECRET 至少64字节
- [ ] 数据库密码至少32字节
- [ ] Redis密码至少32字节
- [ ] .env文件在.gitignore中
- [ ] 生产环境使用HTTPS
- [ ] 环境变量不包含默认值
- [ ] 密钥管理服务已配置（生产）
- [ ] 备份了所有密钥（安全存储）
- [ ] 文档化了密钥轮换流程

### 定期审计

- [ ] 每季度检查密钥强度
- [ ] 每90天轮换JWT密钥
- [ ] 每180天轮换数据库密码
- [ ] 审计密钥访问日志
- [ ] 检查是否有密钥泄露

---

## 7. 应急响应

### 如果密钥泄露

1. **立即行动**：

```bash
# 1. 生成新密钥
NEW_JWT_SECRET=$(openssl rand -base64 64)

# 2. 更新环境变量
export JWT_SECRET=$NEW_JWT_SECRET

# 3. 重启服务
systemctl restart channel-backend

# 4. 失效所有现有令牌
# （用户需要重新登录）
```

2. **通知用户**：
   - 发送邮件通知用户重新登录
   - 记录事件日志

3. **审计**：
   - 检查访问日志
   - 识别可疑活动
   - 生成事件报告

### 如果数据库密码泄露

1. **立即更改密码**：

```sql
ALTER USER postgres WITH PASSWORD '<新强密码>';
```

2. **检查数据库日志**：

```bash
# PostgreSQL日志位置
tail -f /var/log/postgresql/postgresql-16-main.log
```

3. **审计数据访问**：
   - 检查是否有未授权的数据修改
   - 恢复备份（如需要）

---

## 8. 快速启动脚本

创建 `scripts/generate-secrets.sh`:

```bash
#!/bin/bash

echo "生成安全密钥..."

echo ""
echo "JWT_SECRET="
openssl rand -base64 64

echo ""
echo "JWT_REFRESH_SECRET="
openssl rand -base64 64

echo ""
echo "POSTGRES_PASSWORD="
openssl rand -base64 32

echo ""
echo "REDIS_PASSWORD="
openssl rand -base64 32

echo ""
echo "请将以上密钥复制到.env文件中"
echo "⚠️  不要将密钥提交到Git仓库！"
```

使用：

```bash
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
```

---

## 参考资源

- [OWASP密钥管理最佳实践](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [NIST密码标准](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [JWT最佳实践](https://tools.ietf.org/html/rfc8725)
- [PostgreSQL安全](https://www.postgresql.org/docs/current/auth-password.html)

---

**注意**: 本指南提供的是基础安全配置。对于高度敏感的生产环境，请咨询专业的安全团队。
