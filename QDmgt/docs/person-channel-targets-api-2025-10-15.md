# 人员/渠道目标管理 API - 2025-10-15

## API概述

实现了完整的人员/渠道目标管理后端API,支持按人员或渠道维度设置和管理季度及月度目标。

## 数据库设计

### 表: `person_channel_targets`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | UUID | 主键 |
| target_type | Enum | 目标类型: person/channel |
| target_id | UUID | 关联ID (user.id 或 channel.id) |
| year | Integer | 年份 |
| quarter | Integer | 季度 (1-4) |
| quarter_new_signing | Integer | 季度新签目标 |
| quarter_core_opportunity | Integer | 季度核心商机目标 |
| quarter_core_performance | Integer | 季度核心业绩目标 |
| quarter_high_value_opportunity | Integer | 季度高价值商机目标 |
| quarter_high_value_performance | Integer | 季度高价值业绩目标 |
| month_targets | JSON | 月度目标数据 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |
| created_by | UUID | 创建者ID |
| last_modified_by | UUID | 最后修改者ID |

**唯一约束**: (target_type, target_id, year, quarter)

**索引**:
- target_type
- target_id
- year
- quarter
- created_at

## API端点

### Base URL
```
/api/v1/person-channel-targets
```

### 1. 创建目标

**端点**: `POST /`

**权限**: Manager/Admin

**请求体**:
```json
{
  "target_type": "person",
  "target_id": "uuid",
  "year": 2025,
  "quarter": 4,
  "quarter_target": {
    "new_signing": 100,
    "core_opportunity": 50,
    "core_performance": 80,
    "high_value_opportunity": 30,
    "high_value_performance": 60
  },
  "month_targets": {
    "10": {
      "new_signing": 30,
      "core_opportunity": 15,
      "core_performance": 25,
      "high_value_opportunity": 10,
      "high_value_performance": 20
    },
    "11": {
      "new_signing": 35,
      "core_opportunity": 18,
      "core_performance": 28,
      "high_value_opportunity": 12,
      "high_value_performance": 22
    },
    "12": {
      "new_signing": 35,
      "core_opportunity": 17,
      "core_performance": 27,
      "high_value_opportunity": 8,
      "high_value_performance": 18
    }
  }
}
```

**响应**: 201 Created
```json
{
  "id": "uuid",
  "target_type": "person",
  "target_id": "uuid",
  "year": 2025,
  "quarter": 4,
  "quarter_new_signing": 100,
  "quarter_core_opportunity": 50,
  "quarter_core_performance": 80,
  "quarter_high_value_opportunity": 30,
  "quarter_high_value_performance": 60,
  "month_targets": {...},
  "created_at": "2025-10-15T10:00:00Z",
  "updated_at": "2025-10-15T10:00:00Z",
  "created_by": "uuid",
  "last_modified_by": "uuid"
}
```

### 2. 获取目标列表

**端点**: `GET /`

**权限**: 所有已认证用户

**查询参数**:
- `target_type` (可选): person | channel
- `target_id` (可选): UUID
- `year` (可选): 年份
- `quarter` (可选): 季度 (1-4)
- `skip` (可选,默认0): 跳过记录数
- `limit` (可选,默认100,最大1000): 返回记录数

**响应**: 200 OK
```json
{
  "targets": [...],
  "total": 10,
  "skip": 0,
  "limit": 100
}
```

### 3. 获取目标详情

**端点**: `GET /{target_id}`

**权限**: 所有已认证用户

**响应**: 200 OK (同创建响应)

### 4. 更新目标

**端点**: `PUT /{target_id}`

**权限**: Manager/Admin

**请求体**:
```json
{
  "quarter_target": {
    "new_signing": 120,
    "core_opportunity": 60,
    "core_performance": 90,
    "high_value_opportunity": 40,
    "high_value_performance": 70
  },
  "month_targets": {...}
}
```

**响应**: 200 OK (更新后的目标)

### 5. 删除目标

**端点**: `DELETE /{target_id}`

**权限**: Manager/Admin

**响应**: 204 No Content

## 业务逻辑

### PersonChannelTargetService

**方法**:
- `create_target()`: 创建新目标,验证target_id存在性
- `get_targets()`: 获取目标列表,支持多维度筛选
- `get_target_by_id()`: 根据ID获取目标
- `update_target()`: 更新目标数据
- `delete_target()`: 删除目标

### 验证规则

1. **年份验证**: 2000-2100
2. **季度验证**: 1-4
3. **目标ID验证**:
   - person类型: 验证user是否存在
   - channel类型: 验证channel是否存在
4. **唯一性验证**: 同一target_type + target_id + year + quarter只能有一条记录

## 错误处理

- `400 Bad Request`: 验证失败
- `401 Unauthorized`: 未认证
- `403 Forbidden`: 无权限
- `404 Not Found`: 目标或关联对象不存在
- `409 Conflict`: 目标已存在
- `500 Internal Server Error`: 服务器错误

## 使用示例

### 创建人员目标

```bash
curl -X POST http://localhost:8001/api/v1/person-channel-targets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "target_type": "person",
    "target_id": "user-uuid",
    "year": 2025,
    "quarter": 4,
    "quarter_target": {...},
    "month_targets": {...}
  }'
```

### 查询特定人员的目标

```bash
curl http://localhost:8001/api/v1/person-channel-targets?target_type=person&target_id=user-uuid&year=2025&quarter=4 \
  -H "Authorization: Bearer <token>"
```

### 更新目标

```bash
curl -X PUT http://localhost:8001/api/v1/person-channel-targets/{target_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "quarter_target": {...},
    "month_targets": {...}
  }'
```

### 删除目标

```bash
curl -X DELETE http://localhost:8001/api/v1/person-channel-targets/{target_id} \
  -H "Authorization: Bearer <token>"
```

## 文件清单

### 后端文件
- `backend/src/models/channel_target.py` - 数据模型 (PersonChannelTarget, TargetType)
- `backend/src/services/person_channel_target_service.py` - 业务逻辑服务
- `backend/src/api/person_channel_targets.py` - API路由和端点
- `backend/src/main.py` - 路由注册
- `backend/alembic/versions/d3a8cc08b2e8_add_person_channel_targets_table.py` - 数据库迁移

### 前端文件 (待对接)
- `frontend/src/pages/ChannelTargetsPage.tsx` - 前端页面
- `frontend/src/services/channel-target.service.ts` - API客户端 (需创建)

## 后续工作

1. **前端对接**:
   - 创建 channel-target.service.ts API客户端
   - 在 ChannelTargetsPage 中替换 TODO 注释为实际API调用
   - 处理用户/渠道名称显示

2. **功能增强**:
   - 添加目标完成进度跟踪
   - 支持目标模板功能
   - 批量导入/导出功能
   - 目标对比和分析

3. **测试**:
   - 单元测试
   - 集成测试
   - API端到端测试

## 注意事项

1. 所有修改操作需要 Manager 或 Admin 权限
2. 目标数据采用 JSON 格式存储月度数据,便于灵活扩展
3. 使用唯一约束防止重复创建相同时期的目标
4. 所有操作都有完整的日志记录
5. 事务保护确保数据一致性

## API文档

启动后端服务后访问:
- Swagger UI: http://localhost:8001/api/docs
- ReDoc: http://localhost:8001/api/redoc
