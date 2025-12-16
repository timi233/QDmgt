# 问题 #15 修复：敏感操作二次确认

## 修复概述

为所有敏感操作添加了二次确认机制，防止意外的数据删除或修改。

## 实现内容

### 1. 创建确认中间件

**文件**: `src/middlewares/confirmationMiddleware.ts`

实现了三个确认中间件：

#### `requireConfirmation`
- 用途：单个删除操作的确认
- 检查：请求中必须包含 `confirm=true` 参数

#### `requireBatchConfirmation(threshold)`
- 用途：批量操作的确认
- 检查：
  - 基本确认：`confirm=true`
  - 超过阈值时额外确认：`batchConfirm=true`
- 参数：`threshold` - 触发额外确认的数量阈值（默认10）

#### `requireRoleChangeConfirmation`
- 用途：角色/权限更改的确认
- 检查：如果请求包含 `role` 字段，需要 `confirmRoleChange=true`

### 2. 应用到敏感操作

已为以下端点添加确认要求：

| 操作 | 端点 | 确认类型 |
|------|------|----------|
| 删除分销商 | DELETE `/api/distributors/:id` | 单个删除确认 |
| 删除目标 | DELETE `/api/targets/:id` | 单个删除确认 |
| 删除工作计划 | DELETE `/api/work-plans/:id` | 单个删除确认 |
| 删除周报 | DELETE `/api/work-plans/weekly-reviews/:id` | 单个删除确认 |
| 移除协作者 | DELETE `/api/tasks/:id/collaborators/:userId` | 单个删除确认 |
| 导入分销商数据 | POST `/api/data/import/distributors` | 批量操作确认 |

## 使用方法

### 客户端实现

#### 方式1：查询参数（推荐用于DELETE请求）

```typescript
// 删除分销商
fetch(`/api/distributors/${id}?confirm=true`, {
  method: 'DELETE',
  headers: {
    'Cookie': document.cookie, // 包含认证token
  },
})
```

#### 方式2：请求体

```typescript
// 导入数据
fetch('/api/data/import/distributors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': document.cookie,
  },
  body: JSON.stringify({
    data: [/* ... */],
    confirm: true,  // 确认参数
  }),
})
```

### 用户界面建议

#### 删除确认对话框

```typescript
function deleteDistributor(id: string) {
  // 第一步：显示确认对话框
  const confirmed = window.confirm(
    '您确定要删除此分销商吗？\n此操作无法撤销。'
  )

  if (!confirmed) {
    return
  }

  // 第二步：发送包含确认的请求
  fetch(`/api/distributors/${id}?confirm=true`, {
    method: 'DELETE',
    // ...
  })
}
```

#### 批量操作确认

```typescript
function importDistributors(data: any[]) {
  const count = data.length

  let message = `您将导入 ${count} 条分销商记录。`

  // 如果超过阈值，显示额外警告
  if (count > 10) {
    message += '\n\n⚠️ 这是一个大批量操作，请仔细确认。'
  }

  const confirmed = window.confirm(message)

  if (!confirmed) {
    return
  }

  fetch('/api/data/import/distributors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data,
      confirm: true,
      // 如果超过阈值，需要额外确认
      batchConfirm: count > 10 ? true : undefined,
    }),
  })
}
```

## API 响应

### 缺少确认时的响应

```json
{
  "error": "操作需要确认",
  "message": "此操作具有风险性，需要明确确认。请在请求中包含 confirm=true 参数。",
  "code": "CONFIRMATION_REQUIRED"
}
```

HTTP 状态码：`400 Bad Request`

### 批量操作缺少额外确认

```json
{
  "error": "批量操作需要额外确认",
  "message": "您正在操作 25 个项目，超过了阈值 10。请在请求中包含 batchConfirm=true 参数以确认此批量操作。",
  "code": "BATCH_CONFIRMATION_REQUIRED",
  "count": 25,
  "threshold": 10
}
```

HTTP 状态码：`400 Bad Request`

### 角色更改缺少确认

```json
{
  "error": "角色更改需要确认",
  "message": "修改用户角色是敏感操作，需要明确确认。请在请求中包含 confirmRoleChange=true 参数。",
  "code": "ROLE_CHANGE_CONFIRMATION_REQUIRED",
  "newRole": "leader"
}
```

HTTP 状态码：`400 Bad Request`

## 测试示例

### 测试1：删除分销商（无确认）

```bash
# 应该失败 - 缺少确认
curl -X DELETE "http://localhost:3000/api/distributors/123e4567-e89b-12d3-a456-426614174000" \
  -H "Cookie: token=YOUR_TOKEN"

# 预期响应：400 Bad Request
# { "error": "操作需要确认", ... }
```

### 测试2：删除分销商（有确认）

```bash
# 应该成功
curl -X DELETE "http://localhost:3000/api/distributors/123e4567-e89b-12d3-a456-426614174000?confirm=true" \
  -H "Cookie: token=YOUR_TOKEN"

# 预期响应：200 OK
# { "message": "Distributor deleted successfully" }
```

### 测试3：删除目标

```bash
# 应该成功
curl -X DELETE "http://localhost:3000/api/targets/456e7890-e12b-34c5-d678-901234567890?confirm=true" \
  -H "Cookie: token=YOUR_TOKEN"
```

### 测试4：移除任务协作者

```bash
# 应该成功
curl -X DELETE "http://localhost:3000/api/tasks/789abc12-d34e-56f7-g890-hijklmnopqrs/collaborators/user-id-123?confirm=true" \
  -H "Cookie: token=YOUR_TOKEN"
```

### 测试5：导入分销商数据

```bash
# 应该成功
curl -X POST "http://localhost:3000/api/data/import/distributors" \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{
    "data": [
      {
        "name": "测试分销商",
        "contactPerson": "张三",
        "phone": "13800138000",
        "email": "test@example.com",
        "region": "华北",
        "province": "北京市",
        "city": "北京市"
      }
    ],
    "confirm": true
  }'
```

## 安全性说明

### 防止意外操作

1. **双重保护**
   - 用户界面层：确认对话框
   - API层：确认参数检查

2. **明确的错误信息**
   - 清楚说明需要什么确认
   - 提供错误代码便于前端处理

3. **审计日志**
   - 所有敏感操作都会记录到审计日志
   - 包括用户ID、IP地址、时间戳等信息

### 最佳实践

1. **始终显示确认对话框**
   - 让用户明确知道操作的影响
   - 特别是删除操作

2. **批量操作额外警告**
   - 当操作数量较大时，显示额外警告
   - 建议分批处理大量数据

3. **敏感操作权限控制**
   - 删除操作通常只允许特定角色
   - 结合角色中间件使用

## 修改的文件

### 新增文件
- `src/middlewares/confirmationMiddleware.ts` - 确认中间件

### 修改的路由文件
- `src/routes/distributorRoutes.ts` - 删除分销商
- `src/routes/taskRoutes.ts` - 移除协作者
- `src/routes/targetRoutes.ts` - 删除目标
- `src/routes/workPlanRoutes.ts` - 删除工作计划和周报
- `src/routes/dataRoutes.ts` - 导入数据

## 下一步

建议在前端实现：

1. **通用确认组件**
   - 创建可复用的确认对话框组件
   - 支持自定义消息和警告级别

2. **批量操作进度指示**
   - 显示批量操作的进度
   - 提供取消功能

3. **操作历史记录**
   - 显示用户最近的敏感操作
   - 便于追踪和审计

## 总结

问题 #15 已完成：

✅ 创建了确认中间件系统
✅ 为所有删除操作添加确认要求
✅ 为批量操作添加额外确认机制
✅ 为角色更改添加专门确认
✅ 提供清晰的API响应和错误信息
✅ 编写完整的使用文档和测试示例

这些改进大大降低了意外删除或修改数据的风险，提高了系统的安全性。
