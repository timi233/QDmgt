# 仪表盘渠道列表功能实现

**日期**: 2025-10-15
**功能类型**: 新功能
**优先级**: 中

## 需求背景

用户在仪表盘需要快速查看渠道列表:
- **管理员**: 查看全部渠道
- **普通用户**: 查看分配给自己的渠道

原先的仪表盘只显示统计数字和图表,缺少详细的渠道列表视图。

## 功能设计

### 用户界面

#### 管理员视图
```
+--------------------------------------------------+
| 全部渠道                        [搜索框...]      |
+--------------------------------------------------+
| 渠道名称  | 状态    | 业务类型 | 负责人  | 操作  |
|-----------|---------|---------|---------|----------|
| 渠道A     | [活跃]  | 基本盘  | 张三    | 查看详情 |
| 渠道B     | [停用]  | 高价值  | 李四    | 查看详情 |
+--------------------------------------------------+
| 显示 1-10 条，共 12 条                          |
| [上一页] [下一页]                                |
+--------------------------------------------------+
```

#### 普通用户视图
```
+--------------------------------------------------+
| 我的渠道                        [搜索框...]      |
+--------------------------------------------------+
| 渠道名称  | 状态    | 业务类型 | 负责人  | 操作  |
|-----------|---------|---------|---------|----------|
| 渠道C     | [活跃]  | 待签约  | 自己    | 查看详情 |
+--------------------------------------------------+
| 显示 1-3 条，共 3 条                            |
+--------------------------------------------------+
```

### 功能特性

1. **角色区分**:
   - 管理员看到"全部渠道"标题,显示所有渠道
   - 普通用户看到"我的渠道"标题,仅显示分配给自己的渠道

2. **搜索功能**:
   - 支持按渠道名称搜索
   - 支持按负责人姓名搜索
   - 客户端实时过滤,无需后端请求

3. **分页功能**:
   - 每页显示10条渠道
   - 上一页/下一页按钮
   - 显示当前范围和总数 (如"显示 1-10 条，共 25 条")

4. **状态标签**:
   - 活跃: 绿色徽章
   - 停用: 灰色徽章
   - 暂停: 橙色徽章

5. **业务类型标签**:
   - 基本盘
   - 高价值
   - 待签约

6. **操作按钮**:
   - "查看详情"按钮跳转到渠道管理页面

## 技术实现

### 数据结构

#### 扩展的渠道类型
```typescript
type ChannelWithResponsible = Channel & {
  responsible_user: string; // 负责人姓名
};
```

#### 状态和分页
```typescript
const [channels, setChannels] = useState<Channel[]>([]);
const [channelAssignments, setChannelAssignments] = useState<Assignment[]>([]);
const [users, setUsers] = useState<AppUser[]>([]);
const [channelSearchTerm, setChannelSearchTerm] = useState<string>('');
const [channelPage, setChannelPage] = useState<number>(1);
const channelsPerPage = 10;
```

### 数据加载逻辑

**文件**: `frontend/src/pages/DashboardPage.tsx:79-159`

```typescript
const loadDashboardData = async () => {
  // 1. 并行加载基础数据
  const usersPromise = isAdminUser
    ? authService.getUsers()  // 管理员加载所有用户
    : Promise.resolve<AppUser[]>([]);

  const [channelResponse, assignmentsResult, usersResult] = await Promise.all([
    channelService.getChannels({ limit: 1000 }),
    user ? assignmentService.getAssignmentsByUser(user.id) : Promise.resolve([]),
    usersPromise,
  ]);

  const channelsData = channelResponse.channels ?? [];
  const userAssignmentsData = assignmentsResult ?? [];
  const usersData = usersResult ?? [];

  // 2. 管理员额外加载所有渠道的分配关系
  let assignmentsForListing: Assignment[] = userAssignmentsData;

  if (isAdminUser) {
    const assignmentPromises = channelsData.map(channel =>
      assignmentService.getAssignmentsByChannel(channel.id)
        .catch(() => [] as Assignment[])
    );
    const assignmentGroups = await Promise.all(assignmentPromises);
    assignmentsForListing = assignmentGroups.flat();
  }

  // 3. 保存到状态
  setChannels(channelsData);
  setUsers(usersData);
  setChannelAssignments(assignmentsForListing);

  // ... 其他统计数据处理
};
```

### 数据处理逻辑

#### 1. 用户映射 (userMap)

**文件**: `frontend/src/pages/DashboardPage.tsx:260-265`

```typescript
const userMap = useMemo(() => {
  return users.reduce<Record<string, AppUser>>((acc, currentUser) => {
    acc[currentUser.id] = currentUser;
    return acc;
  }, {});
}, [users]);
```

**用途**: 通过用户ID快速查找用户信息

#### 2. 分配关系映射 (channelAssignmentsMap)

**文件**: `frontend/src/pages/DashboardPage.tsx:267-275`

```typescript
const channelAssignmentsMap = useMemo(() => {
  return channelAssignments.reduce<Record<string, Assignment[]>>((acc, assignment) => {
    if (!acc[assignment.channel_id]) {
      acc[assignment.channel_id] = [];
    }
    acc[assignment.channel_id].push(assignment);
    return acc;
  }, {});
}, [channelAssignments]);
```

**用途**: 通过渠道ID快速查找该渠道的所有分配关系

#### 3. 渠道列表数据 (channelListData)

**文件**: `frontend/src/pages/DashboardPage.tsx:277-304`

```typescript
const channelListData: ChannelWithResponsible[] = useMemo(() => {
  // 管理员看全部,普通用户看分配给自己的
  let channelsToShow: Channel[] = channels;

  if (!isAdminUser && user) {
    // 普通用户筛选
    const myChannelIds = new Set(
      channelAssignments
        .filter(assignment => assignment.user_id === user.id)
        .map(assignment => assignment.channel_id)
    );
    channelsToShow = channels.filter(channel => myChannelIds.has(channel.id));
  }

  // 为每个渠道添加负责人信息
  return channelsToShow.map<ChannelWithResponsible>(channel => {
    const assignmentsForChannel = channelAssignmentsMap[channel.id] || [];

    // 优先找标记为目标责任人的分配
    const responsibleAssignment = assignmentsForChannel.find(
      assignment => assignment.target_responsibility
    );
    const fallbackAssignment = assignmentsForChannel[0];

    const responsibleUserId = responsibleAssignment?.user_id ?? fallbackAssignment?.user_id;
    const responsibleUser = responsibleUserId ? userMap[responsibleUserId] : undefined;
    const responsibleName = responsibleUser?.full_name || responsibleUser?.username || '-';

    return {
      ...channel,
      responsible_user: responsibleName,
    };
  });
}, [channels, channelAssignments, channelAssignmentsMap, userMap, isAdminUser, user]);
```

**逻辑说明**:
1. **角色过滤**: 管理员看全部,普通用户只看分配给自己的渠道
2. **负责人查找**:
   - 优先使用标记为 `target_responsibility` 的分配
   - 若无,使用第一个分配的用户
   - 若无分配,显示 "-"

#### 4. 搜索过滤 (filteredChannels)

**文件**: `frontend/src/pages/DashboardPage.tsx:306-317`

```typescript
const filteredChannels = useMemo(() => {
  const searchTerm = channelSearchTerm.trim().toLowerCase();
  if (!searchTerm) {
    return channelListData;
  }

  return channelListData.filter(channel => {
    const nameMatch = channel.name.toLowerCase().includes(searchTerm);
    const responsibleMatch = channel.responsible_user.toLowerCase().includes(searchTerm);
    return nameMatch || responsibleMatch;
  });
}, [channelListData, channelSearchTerm]);
```

**特点**: 客户端实时过滤,支持渠道名称和负责人姓名搜索

#### 5. 分页数据 (paginatedChannels)

**文件**: `frontend/src/pages/DashboardPage.tsx:326-329`

```typescript
const paginatedChannels = useMemo(() => {
  const start = (channelPage - 1) * channelsPerPage;
  return filteredChannels.slice(start, start + channelsPerPage);
}, [filteredChannels, channelPage, channelsPerPage]);
```

#### 6. 分页控制逻辑

**文件**: `frontend/src/pages/DashboardPage.tsx:331-342`

```typescript
useEffect(() => {
  // 当过滤结果为空时,重置到第一页
  if (totalPages === 0) {
    if (channelPage !== 1) {
      setChannelPage(1);
    }
    return;
  }

  // 当前页超过总页数时,跳转到最后一页
  if (channelPage > totalPages) {
    setChannelPage(totalPages);
  }
}, [channelPage, totalPages]);
```

### 辅助函数

#### 状态标签转换

**文件**: `frontend/src/pages/DashboardPage.tsx:344-357`

```typescript
const getStatusVariant = (status: string): string => {
  switch (status) {
    case 'active': return 'success';   // 绿色
    case 'inactive': return 'secondary'; // 灰色
    case 'suspended': return 'warning';  // 橙色
    default: return 'secondary';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active': return '活跃';
    case 'inactive': return '停用';
    case 'suspended': return '暂停';
    default: return status;
  }
};
```

#### 业务类型转换

**文件**: `frontend/src/pages/DashboardPage.tsx:359-370`

```typescript
const getBusinessTypeLabel = (type: string): string => {
  switch (type) {
    case 'basic': return '基本盘';
    case 'high-value':
    case 'high_value': return '高价值';
    case 'pending-signup':
    case 'pending_signup': return '待签约';
    default: return type;
  }
};
```

**特点**: 兼容连字符和下划线两种格式

### UI组件

**文件**: `frontend/src/pages/DashboardPage.tsx:528-622`

```tsx
<Row className="mt-4">
  <Col>
    <Card className="border-0 shadow-sm">
      <Card.Body>
        {/* 标题和搜索框 */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Card.Title className="mb-0">
            {isAdminUser ? '全部渠道' : '我的渠道'}
          </Card.Title>
          <Form.Control
            type="text"
            placeholder="搜索渠道名称或负责人..."
            value={channelSearchTerm}
            onChange={e => {
              setChannelSearchTerm(e.target.value);
              setChannelPage(1); // 搜索时重置到第一页
            }}
            style={{ maxWidth: '300px' }}
          />
        </div>

        {/* 渠道列表表格 */}
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>渠道名称</th>
              <th>状态</th>
              <th>业务类型</th>
              <th>负责人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedChannels.length > 0 ? (
              paginatedChannels.map(channel => (
                <tr key={channel.id}>
                  <td>{channel.name}</td>
                  <td>
                    <Badge bg={getStatusVariant(channel.status)}>
                      {getStatusLabel(channel.status)}
                    </Badge>
                  </td>
                  <td>{getBusinessTypeLabel(channel.business_type)}</td>
                  <td>{channel.responsible_user}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        window.location.href = '/channels';
                      }}
                    >
                      查看详情
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  {channelSearchTerm ? '未找到匹配的渠道' : '暂无渠道'}
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {/* 分页控件 */}
        {filteredChannels.length > channelsPerPage && (
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted">
              显示 {((channelPage - 1) * channelsPerPage) + 1}-
              {Math.min(channelPage * channelsPerPage, filteredChannels.length)} 条，
              共 {filteredChannels.length} 条
            </div>
            <div>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={channelPage === 1}
                onClick={() => setChannelPage(page => page - 1)}
                className="me-2"
              >
                上一页
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={channelPage >= totalPages}
                onClick={() => setChannelPage(page => page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  </Col>
</Row>
```

## 性能优化

### 1. useMemo缓存

所有数据处理逻辑都使用 `useMemo` 避免不必要的重新计算:
- `userMap`: 用户ID到用户对象的映射
- `channelAssignmentsMap`: 渠道ID到分配列表的映射
- `channelListData`: 带负责人信息的渠道列表
- `filteredChannels`: 搜索过滤后的渠道列表
- `paginatedChannels`: 分页后的渠道列表

### 2. 并行数据加载

使用 `Promise.all` 并行加载:
- 渠道列表
- 用户分配关系
- 所有用户(管理员)

### 3. 客户端分页和搜索

优点:
- 无需额外API请求
- 响应速度快
- 用户体验好

限制:
- 数据量大时(>1000条)可能需要改为服务端分页

## 测试验证

### 测试用例1: 管理员查看全部渠道

**前置条件**: 使用管理员账号登录

**步骤**:
1. 访问仪表盘页面
2. 滚动到底部

**预期结果**:
- ✅ 看到"全部渠道"标题
- ✅ 显示所有渠道(不受分配关系限制)
- ✅ 每个渠道显示负责人姓名
- ✅ 搜索功能正常
- ✅ 分页功能正常

### 测试用例2: 普通用户查看我的渠道

**前置条件**: 使用非管理员账号登录

**步骤**:
1. 访问仪表盘页面
2. 滚动到底部

**预期结果**:
- ✅ 看到"我的渠道"标题
- ✅ 仅显示分配给自己的渠道
- ✅ 搜索功能正常
- ✅ 分页功能正常(如有多页)

### 测试用例3: 搜索功能

**步骤**:
1. 在搜索框输入渠道名称关键词
2. 观察列表变化
3. 清空搜索框
4. 在搜索框输入负责人姓名
5. 观察列表变化

**预期结果**:
- ✅ 输入关键词后立即过滤
- ✅ 支持渠道名称搜索
- ✅ 支持负责人姓名搜索
- ✅ 搜索时重置到第一页
- ✅ 未找到匹配时显示"未找到匹配的渠道"

### 测试用例4: 分页功能

**前置条件**: 渠道数量 > 10

**步骤**:
1. 查看第一页
2. 点击"下一页"
3. 查看第二页
4. 点击"上一页"

**预期结果**:
- ✅ 每页显示10条渠道
- ✅ 显示正确的范围和总数
- ✅ 第一页时"上一页"按钮禁用
- ✅ 最后一页时"下一页"按钮禁用

### 测试用例5: 状态和业务类型标签

**步骤**:
1. 查看不同状态的渠道

**预期结果**:
- ✅ 活跃渠道显示绿色"活跃"徽章
- ✅ 停用渠道显示灰色"停用"徽章
- ✅ 暂停渠道显示橙色"暂停"徽章
- ✅ 业务类型正确显示中文标签

### 测试用例6: 查看详情按钮

**步骤**:
1. 点击任一渠道的"查看详情"按钮

**预期结果**:
- ✅ 跳转到 `/channels` 渠道管理页面

## 已知限制

### 1. 客户端分页性能

**限制**: 当渠道数量 > 1000 时,客户端处理可能较慢

**缓解方案**: 当前通过 `limit: 1000` 限制加载的渠道数量

**未来优化**:
- 实现服务端分页
- 虚拟滚动(如使用 react-window)

### 2. 负责人信息准确性

**限制**: 负责人信息基于分配关系推断,可能不准确

**规则**:
1. 优先使用标记为 `target_responsibility` 的分配
2. 若无,使用第一个分配的用户
3. 若无分配,显示 "-"

**未来优化**: 在渠道表增加 `owner_id` 字段明确负责人

### 3. 实时性

**限制**: 数据在页面加载时获取,不会自动更新

**缓解方案**: 用户可以刷新页面获取最新数据

**未来优化**:
- WebSocket实时推送
- 定时轮询刷新

## 后续优化建议

### 优化1: 服务端分页

**触发条件**: 渠道数量 > 1000

**实现方案**:
```typescript
// 后端API添加分页参数
GET /api/v1/channels?page=1&per_page=10&search=关键词

// 前端修改为服务端分页
const loadChannels = async (page: number, search: string) => {
  const response = await channelService.getChannels({
    page,
    per_page: 10,
    search
  });
  setChannels(response.channels);
  setTotalCount(response.total);
};
```

### 优化2: 表格排序

**功能**: 点击列标题排序

**实现**:
```typescript
const [sortField, setSortField] = useState<'name' | 'status' | 'business_type'>('name');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

const sortedChannels = useMemo(() => {
  return [...filteredChannels].sort((a, b) => {
    // 排序逻辑
  });
}, [filteredChannels, sortField, sortDirection]);
```

### 优化3: 批量操作

**功能**: 选择多个渠道进行批量操作

**实现**:
- 添加复选框列
- 添加批量操作按钮(批量分配、批量修改状态等)

### 优化4: 导出功能

**功能**: 导出渠道列表为Excel

**实现**:
```typescript
import * as XLSX from 'xlsx';

const exportToExcel = () => {
  const data = filteredChannels.map(channel => ({
    '渠道名称': channel.name,
    '状态': getStatusLabel(channel.status),
    '业务类型': getBusinessTypeLabel(channel.business_type),
    '负责人': channel.responsible_user,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '渠道列表');
  XLSX.writeFile(wb, '渠道列表.xlsx');
};
```

## 执行记录

- **2025-10-15 01:50**: 需求分析,创建计划文档
- **2025-10-15 01:55**: 使用 Codex MCP 实现管理员渠道列表
- **2025-10-15 02:00**: 前端编译成功,初步测试通过
- **2025-10-15 02:10**: 用户反馈需要同步到普通用户
- **2025-10-15 02:15**: 修改逻辑支持普通用户查看自己的渠道
- **2025-10-15 02:20**: 修复缩进和语法错误
- **2025-10-15 02:25**: 前端编译成功,功能就绪
- **2025-10-15 02:35**: 创建功能实现文档

## 总结

**功能**: 在仪表盘添加渠道列表视图,管理员看全部,普通用户看自己的

**技术亮点**:
1. 基于角色的数据过滤
2. 客户端实时搜索和分页
3. useMemo性能优化
4. 负责人信息智能推断
5. 响应式设计

**用户价值**:
- 管理员快速了解全部渠道状态
- 普通用户便捷查看自己负责的渠道
- 搜索和分页提高使用效率

**代码质量**:
- 类型安全(TypeScript)
- 性能优化(useMemo)
- 代码可维护(清晰的数据流)
- 用户体验好(实时搜索,平滑分页)
