# 渠道目标页面数据接入 - 2025-10-15

## 修改概述

接入真实的用户数据到渠道目标管理页面,并优化筛选选项。

## 修改内容

### 1. 接入用户数据

#### 导入依赖
```typescript
import authService, { User } from '../services/auth.service';
```

#### 添加状态管理
```typescript
// 用户数据
const [users, setUsers] = useState<User[]>([]);
```

#### 数据加载
```typescript
const fetchUsers = useCallback(async () => {
  try {
    const userList = await authService.getUsers();
    setUsers(userList);
    console.log('[ChannelTargets] Users loaded', { count: userList.length });
  } catch (err) {
    console.error('[ChannelTargets] Failed to load users', err);
    // 用户加载失败不影响主流程,只记录错误
  }
}, []);

useEffect(() => {
  // 并行加载用户和目标数据
  Promise.all([
    fetchUsers(),
    fetchTargets(),
  ]).catch(() => {});
}, [fetchUsers, fetchTargets]);
```

### 2. 过滤默认测试用户

排除以下测试账户:
- admin
- manager
- user
- TestUser
- MangerUser
- SuperUser

```typescript
// 过滤掉默认的测试用户
const defaultTestUsernames = ['admin', 'manager', 'user', 'testuser', 'mangeruser', 'superuser'];
const filteredUsers = users.filter(u => !defaultTestUsernames.includes(u.username.toLowerCase()));
```

### 3. 人员下拉框更新

使用真实用户数据替换占位数据:

```typescript
<Form.Select
  value={selectedPerson}
  onChange={(e) => setSelectedPerson(e.target.value)}
>
  <option value="all">全部人员</option>
  {filteredUsers.map((user) => (
    <option key={user.id} value={user.id}>
      {user.full_name || user.username}
    </option>
  ))}
</Form.Select>
```

**显示逻辑:**
- 优先显示 `full_name`(全名)
- 如果没有全名,则显示 `username`(用户名)
- 选项值为用户的 `id`

### 4. 维度筛选优化

仅保留"个人"维度,暂时隐藏"团队"和"部门":

```typescript
// 维度暂时只保留个人
const dimensions = [
  { value: 'personal', label: '个人' },
  // { value: 'team', label: '团队' },      // 暂时隐藏
  // { value: 'department', label: '部门' }, // 暂时隐藏
];
```

## 数据流程

1. **页面加载**
   - 并行加载用户列表和目标数据
   - 用户加载失败不影响页面主功能

2. **用户筛选**
   - 从用户服务获取所有用户
   - 过滤掉三个默认测试账户
   - 在下拉框中显示过滤后的用户列表

3. **目标查询** (TODO)
   - 根据选中的人员ID查询目标数据
   - 根据年份、季度筛选数据

## 相关文件

- `frontend/src/pages/ChannelTargetsPage.tsx` - 页面组件(已修改)
- `frontend/src/services/auth.service.ts` - 用户服务(使用)

## 使用说明

### 人员筛选
1. 打开页面后自动加载用户列表
2. 下拉框显示除 admin/manager/user 外的所有用户
3. 选择"全部人员"或特定用户
4. TODO: 根据选择筛选目标数据

### 维度筛选
- 目前只显示"个人"选项
- 默认选中"个人"
- 团队和部门维度已注释,后续可以取消注释启用

## 后续优化

1. **用户加载优化**
   - 添加用户加载失败的提示
   - 考虑缓存用户列表

2. **目标数据筛选**
   - 根据选中的人员ID筛选目标
   - 实现按年份、季度筛选

3. **维度功能扩展**
   - 实现团队维度的数据聚合
   - 实现部门维度的数据聚合

## 注意事项

1. **默认用户过滤**:
   - 过滤6个测试账户: admin, manager, user, TestUser, MangerUser, SuperUser
   - 使用 `toLowerCase()` 进行比较,避免大小写问题
2. **用户显示**: 优先显示全名,提升用户体验
3. **错误处理**: 用户加载失败时不阻塞页面,只记录日志
4. **并行加载**: 用户和目标数据并行加载,提升性能
