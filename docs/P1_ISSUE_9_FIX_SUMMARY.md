# 输入验证测试指南

## 概述

本文档描述如何测试问题#9的输入验证修复。所有API端点现已集成Zod验证中间件。

## 修复内容

### 1. 创建的文件

#### 验证中间件
- `backend/src/middlewares/validateMiddleware.ts` - 通用验证中间件（validateQuery, validateBody, validateParams）

#### Schema定义
- `backend/src/schemas/dataSchema.ts` - 数据聚合端点验证规则
- `backend/src/schemas/distributorSchema.ts` - 经销商端点验证规则
- `backend/src/schemas/taskSchema.ts` - 任务端点验证规则
- `backend/src/schemas/targetSchema.ts` - 目标端点验证规则
- `backend/src/schemas/workPlanSchema.ts` - 工作计划端点验证规则

### 2. 更新的路由文件

所有路由文件已更新，添加验证中间件：
- `backend/src/routes/dataRoutes.ts`
- `backend/src/routes/distributorRoutes.ts`
- `backend/src/routes/taskRoutes.ts`
- `backend/src/routes/targetRoutes.ts`
- `backend/src/routes/workPlanRoutes.ts`

## 验证测试指南

### 手动测试示例

#### 1. 测试经销商创建验证

**正确的请求：**
```bash
curl -X POST http://localhost:3000/api/distributors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "测试经销商",
    "region": "北京市朝阳区",
    "contactPerson": "张三",
    "phone": "13800138000",
    "cooperationLevel": "gold"
  }'
```

**预期结果：** 201 Created

**错误的请求（缺少必填字段）：**
```bash
curl -X POST http://localhost:3000/api/distributors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "测"
  }'
```

**预期结果：**
```json
{
  "error": "请求体验证失败",
  "details": [
    {
      "path": "name",
      "message": "名称至少需要2个字符",
      "code": "too_small"
    },
    {
      "path": "region",
      "message": "Required",
      "code": "invalid_type"
    }
  ]
}
```

#### 2. 测试查询参数验证

**正确的请求：**
```bash
curl -X GET "http://localhost:3000/api/distributors?page=1&limit=20&region=北京" \
  -H "Authorization: Bearer <your-token>"
```

**预期结果：** 200 OK

**错误的请求（无效的page参数）：**
```bash
curl -X GET "http://localhost:3000/api/distributors?page=abc&limit=200" \
  -H "Authorization: Bearer <your-token>"
```

**预期结果：**
```json
{
  "error": "查询参数验证失败",
  "details": [
    {
      "path": "page",
      "message": "页码必须是整数",
      "code": "invalid_type"
    },
    {
      "path": "limit",
      "message": "每页最多100条",
      "code": "too_big"
    }
  ]
}
```

#### 3. 测试路径参数验证

**正确的请求：**
```bash
curl -X GET http://localhost:3000/api/distributors/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your-token>"
```

**预期结果：** 200 OK 或 404 Not Found

**错误的请求（无效的UUID）：**
```bash
curl -X GET http://localhost:3000/api/distributors/invalid-uuid \
  -H "Authorization: Bearer <your-token>"
```

**预期结果：**
```json
{
  "error": "路径参数验证失败",
  "details": [
    {
      "path": "id",
      "message": "无效的ID格式",
      "code": "invalid_string"
    }
  ]
}
```

### 自动化测试建议

虽然本次修复没有包含完整的自动化测试套件，但建议使用以下工具：

#### 使用Jest + Supertest

```typescript
// tests/integration/distributors.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/distributors - 输入验证', () => {
  it('应该拒绝缺少必填字段的请求', async () => {
    const response = await request(app)
      .post('/api/distributors')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: '测'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('请求体验证失败');
    expect(response.body.details).toBeInstanceOf(Array);
  });

  it('应该拒绝无效的cooperationLevel', async () => {
    const response = await request(app)
      .post('/api/distributors')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: '测试经销商',
        region: '北京',
        contactPerson: '张三',
        phone: '13800138000',
        cooperationLevel: 'invalid'
      });

    expect(response.status).toBe(400);
    expect(response.body.details.some(d => d.path === 'cooperationLevel')).toBe(true);
  });

  it('应该接受有效的请求', async () => {
    const response = await request(app)
      .post('/api/distributors')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: '测试经销商',
        region: '北京市朝阳区',
        contactPerson: '张三',
        phone: '13800138000',
        cooperationLevel: 'gold'
      });

    expect(response.status).toBe(201);
  });
});
```

## 验证覆盖的端点

### 数据聚合端点 (`/api/data`)
- ✅ `GET /export/distributors` - 查询参数验证
- ✅ `POST /import/distributors` - 请求体验证
- ✅ `GET /events` - 查询参数验证（含日期范围验证）
- ✅ `GET /events/:entityType/:entityId` - 路径参数验证

### 经销商端点 (`/api/distributors`)
- ✅ `POST /` - 创建经销商请求体验证
- ✅ `GET /` - 查询参数验证（分页、过滤）
- ✅ `GET /:id` - UUID参数验证
- ✅ `PUT /:id` - UUID参数 + 更新请求体验证
- ✅ `DELETE /:id` - UUID参数验证

### 任务端点 (`/api/tasks`)
- ✅ `POST /` - 创建任务请求体验证
- ✅ `GET /` - 查询参数验证（分页、过滤、搜索）
- ✅ `GET /:id` - UUID参数验证
- ✅ `PUT /:id` - UUID参数 + 更新请求体验证
- ✅ `PUT /:id/status` - UUID参数 + 状态更新验证
- ✅ `PUT /:id/assign` - UUID参数 + 分配请求体验证
- ✅ `POST /:id/collaborators` - UUID参数 + 协作者请求体验证
- ✅ `DELETE /:id/collaborators/:userId` - 双UUID参数验证
- ✅ `POST /:id/comments` - UUID参数 + 评论请求体验证

### 目标端点 (`/api/targets`)
- ✅ `POST /` - 创建目标请求体验证（含日期逻辑验证）
- ✅ `GET /` - 查询参数验证
- ✅ `GET /statistics` - 统计查询参数验证
- ✅ `GET /:id` - UUID参数验证
- ✅ `PUT /:id` - UUID参数 + 更新请求体验证
- ✅ `DELETE /:id` - UUID参数验证

### 工作计划端点 (`/api/work-plans`)
- ✅ `POST /` - 创建工作计划请求体验证
- ✅ `GET /` - 查询参数验证
- ✅ `GET /:id` - UUID参数验证
- ✅ `PUT /:id` - UUID参数 + 更新请求体验证
- ✅ `DELETE /:id` - UUID参数验证
- ✅ `POST /weekly-reviews` - 创建周报请求体验证
- ✅ `PUT /weekly-reviews/:id` - UUID参数 + 更新周报请求体验证
- ✅ `DELETE /weekly-reviews/:id` - UUID参数验证

## 验证特性

### 1. 类型强制转换
查询参数自动转换：
- `page=1` (字符串) → `1` (数字)
- `limit=20` (字符串) → `20` (数字)
- `year=2024` (字符串) → `2024` (数字)

### 2. 默认值
- `page` 默认值：1
- `limit` 默认值：10-20（根据端点）
- `status` 默认值：'planning'（工作计划）

### 3. 范围验证
- `page`: 必须是正整数
- `limit`: 1-100
- `year`: 2000-2100
- `month`: 1-12
- `weekNumber`: 1-53
- `creditLimit`: 0-999999

### 4. 格式验证
- UUID格式验证
- 日期时间格式验证
- 枚举值验证（cooperationLevel, status, priority等）
- 字符串长度限制

### 5. 业务逻辑验证
- 日期范围验证（startDate <= endDate）
- 目标类型与时间字段的关联验证（季度目标必须有quarter字段）
- 数组最大长度限制（tags最多5个）

## 错误响应格式

所有验证错误统一返回400状态码，格式如下：

```json
{
  "error": "验证失败类型",
  "details": [
    {
      "path": "字段路径",
      "message": "错误信息",
      "code": "错误代码"
    }
  ]
}
```

## 安全改进

1. **防止SQL注入** - Prisma ORM + 参数验证双重保护
2. **防止XSS** - 字符串长度限制，类型验证
3. **防止DoS** - 分页限制（最多100条）
4. **数据完整性** - 必填字段验证，格式验证
5. **业务规则执行** - 自定义refine验证

## 编译确认

```bash
cd backend
npm run build
```

✅ 编译成功，无TypeScript错误

## 下一步建议

1. **添加单元测试** - 为每个schema添加测试
2. **添加集成测试** - 测试完整的API请求流程
3. **性能测试** - 确保验证不影响性能
4. **文档更新** - 更新API文档，包含验证规则
5. **错误监控** - 记录验证失败的请求，分析常见错误

## 总结

✅ **问题#9已修复** - 所有查询端点已添加完整的输入验证

修复范围：
- 5个模块（data, distributors, tasks, targets, work-plans）
- 30+ 个端点
- 100% 覆盖率（所有端点都有验证）

验证类型：
- 查询参数验证（Query）
- 请求体验证（Body）
- 路径参数验证（Params）

安全提升：
- P1级别安全问题已解决
- 显著降低注入攻击风险
- 提高数据完整性和一致性
