# 测试用户账号

**创建时间**: 2025-10-14

## 测试账号列表

### 1. 管理员账号 (Admin)
- **用户名**: `superuser`
- **密码**: `Director#2024$`
- **邮箱**: superuser@example.com
- **全名**: Super User
- **角色**: admin
- **权限**: 完全访问权限，��管理所有功能

### 2. 经理账号 (Manager)
- **用户名**: `manager1`
- **密码**: `ChiefOps#2024$`
- **邮箱**: manager1@example.com
- **全名**: Manager User
- **角色**: manager
- **权限**: 渠道管理权限，可创建、编辑渠道

### 3. 普通用户 (User)
- **用户名**: `testuser`
- **密码**: `TechLead#2024$`
- **邮箱**: testuser@example.com
- **全名**: Test User
- **角色**: user
- **权限**: 仅查看分配给自己的渠道

---

## 密码策略说明

密码必须满足以下要求：
- 最少8个字符
- 至少包含1个大写字母
- 至少包含1个小写字母
- 至少包含1个数字
- 至少包含1个特殊字符 (!@#$%^&*(),.?":{}|<>)
- **不能包含**以下常见弱模式（不区分大小写）：
  - `123456`
  - `password`
  - `qwerty`
  - `abc123`
  - `admin`
  - `login`
- 不能有3个或更多重复字符

---

## API测试

### 登录测试
```bash
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superuser","password":"Director#2024$"}'
```

### 获取当前用户信息
```bash
curl -X GET http://localhost:8001/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

## 前端访问

1. 访问: http://localhost:3002
2. 使用以上任一账号登录
3. 登录成功后会跳转到渠道管理页面 (/channels)

---

## 注意事项

⚠️ **这些是测试账号，仅用于开发环境**
- 不要在生产环境使用这些密码
- 生产环境应使用更强的密码策略
- 定期更换测试账号密码
