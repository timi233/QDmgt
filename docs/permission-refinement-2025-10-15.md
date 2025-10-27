# 权限细粒度调整 - 2025-10-15

## 需求概述

调整分配管理中的权限模型,使其更符合实际业务需求:
- 普通用户(role: user)只能获得 read 或 write 权限
- admin/manager 角色拥有隐含的全局管理权限
- 前端分配管理页面只显示"只读/编辑"选项

## 权限模型

### 权限级别
| 权限级别 | 说明 | 允许操作 |
|---------|------|---------|
| read | 只读 | 查看渠道信息、目标、计划 |
| write | 编辑 | 修改渠道目标(ChannelTarget)和执行计划(ExecutionPlan),但不能修改渠道基本信息 |
| admin | 管理 | 完全管理权限(新增/删除/修改渠道本身),仅限 admin/manager 角色 |

### 角色权限
| 用户角色 | 可分配权限 | 说明 |
|---------|-----------|------|
| user | read, write | 通过 ChannelAssignment 表分配权限 |
| manager | (隐含 admin) | 对所有渠道自动拥有管理权限 |
| admin | (隐含 admin) | 对所有渠道自动拥有管理权限 |

## 实施修改

### 后端修改

#### 1. API 层 (`backend/src/api/assignments.py`)

**默认权限级别:**
```python
class AssignmentCreateRequest(BaseModel):
    user_id: UUID
    channel_id: UUID
    permission_level: PermissionLevelEnum = PermissionLevelEnum.read  # 默认只读
    target_responsibility: bool = False
```

**创建分配时的权限校验:**
```python
# 禁止给普通用户分配 admin 权限
user = db.query(User).filter(User.id == str(assignment_data.user_id)).first()
if user and user.role == "user" and assignment_data.permission_level == "admin":
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="普通用户只能被分配只读或编辑权限"
    )
```

**更新分配时的权限校验:**
- 同样检查用户角色,禁止将普通用户提升为 admin 权限

#### 2. 服务层 (`backend/src/services/assignment_service.py`)

**增强 `has_permission` 方法:**
```python
# admin/manager 角色自动拥有所有渠道的管理权限
user = db.query(User).filter(User.id == user_id_str).first()
if user and user.role in ["admin", "manager"]:
    return True  # 隐含的 admin 权限

# 普通用户检查 ChannelAssignment 表
assignment = db.query(ChannelAssignment).filter(...).first()
# ... 权限级别比较逻辑
```

### 前端修改

#### AssignmentsPage (`frontend/src/pages/AssignmentsPage.tsx`)

**默认权限级别:**
```typescript
const createInitialCreateFormValues = (): AssignmentCreateFormValues => ({
  user_id: '',
  channel_id: '',
  permission_level: 'read',  // 默认只读
  target_responsibility: false,
});
```

**权限选择下拉框:**
- 创建分配模态框:移除 "管理员" 选项,保留 "只读" 和 "编辑",默认选中"只读"
- 编辑分配模态框:移除 "管理员" 选项,保留 "只读" 和 "编辑"
- 标签显示为"权限级别(默认:只读)"

**权限标签显示:**
```typescript
const permissionLevelLabel = (level: PermissionLevel): string => {
  switch (level) {
    case 'write':
      return '编辑';  // 从 "写入" 改为 "编辑"
    case 'read':
      return '只读';
    case 'admin':
      return '管理员';  // 保留以兼容历史数据
  }
};
```

## 权限控制逻辑

### 渠道基本信息修改
- **read 权限**: 不能修改
- **write 权限**: 不能修改渠道基本信息(名称、业务类型、状态等)
- **admin 权限**: 可以修改(仅 admin/manager 角色)

### 目标和计划修改
- **read 权限**: 只能查看
- **write 权限**: 可以编辑 ChannelTarget 和 ExecutionPlan
- **admin 权限**: 可以编辑(仅 admin/manager 角色)

### 渠道新增/删除
- 仅 **admin/manager 角色** 可以执行(隐含 admin 权限)

## 测试验证

### 后端验证
```bash
# 语法检查
✓ src/api/assignments.py
✓ src/services/assignment_service.py

# 权限枚举测试
Permission levels: ['read', 'write', 'admin']
```

### 前端验证
- 分配管理页面下拉框只显示 "只读" 和 "编辑"
- 权限标签正确显示中文名称

## 向后兼容性

- 数据库中已存在的 admin 权限分配记录保持不变
- 前端仍能正确显示历史的 admin 权限记录
- 后端 API 仍支持 admin 权限级别,但前端不再主动创建

## 相关文件

### 后端
- `backend/src/models/assignment.py` - PermissionLevel 枚举定义
- `backend/src/api/assignments.py` - 权限校验逻辑
- `backend/src/services/assignment_service.py` - has_permission 方法增强
- `backend/src/auth/middleware.py` - 权限中间件(未修改)

### 前端
- `frontend/src/pages/AssignmentsPage.tsx` - UI 调整
- `frontend/src/services/assignment.service.ts` - API 客户端(未修改)

## 注意事项

1. **角色检查**: admin/manager 角色的隐含权限在 `AssignmentService.has_permission` 中实现
2. **普通用户限制**: 在 API 层阻止给普通用户分配 admin 权限
3. **UI 简化**: 前端只显示普通用户可用的权限选项,降低操作复杂度
4. **向后兼容**: 保留 admin 权限枚举值,兼容历史数据

## 后续优化建议

1. 在渠道、目标、执行计划的 API 路由中添加具体的权限检查
2. 编写单元测试覆盖新的权限校验逻辑
3. 在前端添加基于权限的按钮显示/隐藏控制
4. 考虑在数据库中记录权限变更审计日志
