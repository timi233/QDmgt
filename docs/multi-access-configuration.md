# 多地址访问配置指南

**创建时间**: 2025-10-14

## 问题背景

当用户从不同的网络地址访问前端时（如 `http://10.242.94.9:3002`、`http://192.168.31.157:3002`、`http://localhost:3002`），需要确保前端能够正确连接到后端API。

## 当前配置

### 前端配置

`frontend/.env`:
```bash
# API Configuration
# 使用服务器IP地址，支持远程访问
REACT_APP_API_BASE_URL=http://10.242.94.9:8001/api/v1
```

### 后端CORS配置

后端启动命令中设置允许的源：
```bash
SECURITY_ALLOWED_ORIGINS='["http://localhost:3002","http://localhost:3000","http://192.168.31.157:3002","http://10.242.94.9:3002"]' \
  uvicorn src.main:app --reload --port 8001 --host 0.0.0.0
```

## 解决方案

### 方案1：使用固定服务器IP（当前方案）

**优点**：
- 简单直接
- 适合固定IP的内网环境

**缺点**：
- 每次更换访问地址都需要重新配置
- 不支持动态IP

**配置步骤**：
1. 修改 `frontend/.env` 中的 `REACT_APP_API_BASE_URL` 为服务器IP
2. 重启前端: `PORT=3002 npm start`
3. 确保后端CORS允许该地址

### 方案2：使用相对路径 + 反向代理（推荐）

使用nginx反向代理，前端和后端通过同一域名访问。

**nginx配置示例**：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**前端配置**：
```bash
# 使用相对路径，自动使用当前域名
REACT_APP_API_BASE_URL=/api/v1
```

**优点**：
- 用户可以从任意地址访问
- 无需配置CORS
- 生产环境标准方案

### 方案3：动态API地址

修改前端代码，根据当前访问地址动态确定API地址。

`frontend/src/services/api.ts`:
```typescript
// 动态获取API基础URL
const getApiBaseUrl = (): string => {
  // 优先使用环境变量
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  // 否则使用当前window.location的host + 端口8001
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8001/api/v1`;
};

const API_BASE_URL = getApiBaseUrl();
```

**CORS配置**（后端允许所有来源，仅开发环境）：
```python
# backend/src/config/settings.py
ALLOWED_ORIGINS: List[str] = ["*"]  # 仅开发环境
```

**优点**：
- 灵活性高
- 适合开发和测试

**缺点**：
- 生产环境不安全（需要限制CORS）
- 假设后端端口固定为8001

## 测试用户

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | `superuser` | `Director#2024$` |
| 经理 | `manager1` | `ChiefOps#2024$` |
| 用户 | `testuser` | `TechLead#2024$` |

## 访问地址

- 前端: `http://<SERVER_IP>:3002`
- 后端: `http://<SERVER_IP>:8001`
- API文档: `http://<SERVER_IP>:8001/docs`

将 `<SERVER_IP>` 替换为实际服务器IP（如 `10.242.94.9`）

## 故障排查

### 问题1: 连接被拒绝 (ERR_CONNECTION_REFUSED)

**原因**: 前端使用 `localhost`，但从远程访问

**解决**:
1. 检查 `.env` 中的 `REACT_APP_API_BASE_URL` 是否使用服务器IP
2. 重启前端以加载新配置
3. 清除浏览器缓存 (Ctrl+F5)

### 问题2: CORS错误

**原因**: 后端CORS未允许当前访问地址

**解决**:
1. 检查后端启动命令中的 `SECURITY_ALLOWED_ORIGINS`
2. 添加当前访问地址（包括端口）
3. 重启后端

### 问题3: 环境变量未生效

**原因**: React需要重启才能加载 `.env` 变化

**解决**:
1. Kill 前端进程
2. 重新运行 `PORT=3002 npm start`
3. 等待编译完成

## 生产环境建议

1. ✅ 使用nginx反向代理（方案2）
2. ✅ 启用HTTPS
3. ✅ 限制CORS允许的源
4. ✅ 使用环境变量管理配置
5. ✅ 实施IP白名单
6. ✅ 启用防火墙规则

## 开发环境快速设置

```bash
# 1. 获取服务器IP
SERVER_IP=$(hostname -I | awk '{print $1}')

# 2. 更新前端配置
echo "REACT_APP_API_BASE_URL=http://$SERVER_IP:8001/api/v1" >> frontend/.env

# 3. 启动后端
cd backend
SECURITY_ALLOWED_ORIGINS="[\"http://localhost:3002\",\"http://$SERVER_IP:3002\"]" \
  uvicorn src.main:app --reload --port 8001 --host 0.0.0.0 &

# 4. 启动前端
cd ../frontend
PORT=3002 npm start &
```

## 下一步

建议实施方案2（nginx反向代理），以获得最佳的可维护性和安全性。
