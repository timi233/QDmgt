# 仪表盘管理员渠道列表视图

**日期**: 2025-10-15

## 需求背景

管理员用户需要在仪表盘上快速查看所有渠道的列表信息，便于一览全局。

## Linus 三问分析

### 1. 这是真实问题还是想象的？
**真实问题**。管理员需要快速了解所有渠道状态，不应该每次都跳转到渠道管理页面。

### 2. 有更简单的方法吗？
**在仪表盘添加表格视图**：
- 使用现有的渠道数据（已加载）
- 展示关键信息：渠道名、状态、业务类型、负责人
- 支持快速操作：查看详情链接

### 3. 这会破坏什么？
**零破坏**。只是为管理员添加额外视图，普通用户不受影响。

## 核心判断

**值得做** - 管理员快速查看是高频需求

**关键洞察**：
- 数据结构：渠道数据已在 `loadDashboardData` 中加载
- 复杂度：低，只是添加表格展示组件
- 风险点：无，只读展示

## 技术分析

### 设计方案

**布局位置**：图表下方，仅管理员可见

**展示内容**：
- 渠道名称
- 状态（带颜色标签）
- 业务类型
- 负责人（从分配关系获取）
- 快速操作（查看详情链接）

**交互设计**：
- 支持分页（每页10条）
- 支持快速搜索（客户端过滤）
- 点击渠道名跳转到渠道管理页

### 数据结构

```typescript
// 渠道数据已有，需要整合分配信息
interface ChannelListItem {
  id: string;
  name: string;
  status: ChannelStatus;
  business_type: string;
  responsible_user?: string; // 从分配关系获取
}
```

### UI设计

```
+--------------------------------------------------+
| 全部渠道 (管理员)                    [搜索框]     |
+--------------------------------------------------+
| 渠道名称  | 状态    | 业务类型 | 负责人  | 操作  |
|-----------|---------|---------|---------|-------|
| 渠道A     | [活跃]  | 基本盘  | 张三    | 查看  |
| 渠道B     | [停用]  | 高价值  | 李四    | 查看  |
+--------------------------------------------------+
| 显示 1-10 条，共 12 条                          |
+--------------------------------------------------+
```

## 技术方案

### 需要修改的文件

1. **frontend/src/pages/DashboardPage.tsx**
   - 添加渠道列表状态（搜索关键词、分页）
   - 添加过滤和分页逻辑
   - 添加管理员专属的渠道列表表格组件
   - 添加负责人信息整合逻辑

### 实现步骤

**Step 1: 添加状态管理**
```typescript
const [channelSearchTerm, setChannelSearchTerm] = useState('');
const [channelPage, setChannelPage] = useState(1);
const channelsPerPage = 10;
```

**Step 2: 整合渠道和分配数据**
```typescript
// 在useMemo中整合渠道和负责人信息
const channelListData = useMemo(() => {
  if (!isAdminUser) return [];

  return channels.map(channel => {
    // 找到该渠道的负责人
    const channelAssignments = assignments.filter(a => a.channel_id === channel.id);
    const responsibleAssignment = channelAssignments.find(a => a.target_responsibility);
    const responsibleUserId = responsibleAssignment?.user_id || channelAssignments[0]?.user_id;
    const responsibleUser = responsibleUserId ? userMap[responsibleUserId] : null;

    return {
      ...channel,
      responsible_user: responsibleUser?.full_name || responsibleUser?.username || '-',
    };
  });
}, [channels, assignments, userMap, isAdminUser]);
```

**Step 3: 客户端过滤和分页**
```typescript
const filteredChannels = useMemo(() => {
  if (!channelSearchTerm.trim()) return channelListData;

  const term = channelSearchTerm.toLowerCase();
  return channelListData.filter(channel =>
    channel.name.toLowerCase().includes(term) ||
    channel.responsible_user.toLowerCase().includes(term)
  );
}, [channelListData, channelSearchTerm]);

const paginatedChannels = useMemo(() => {
  const start = (channelPage - 1) * channelsPerPage;
  return filteredChannels.slice(start, start + channelsPerPage);
}, [filteredChannels, channelPage]);

const totalPages = Math.ceil(filteredChannels.length / channelsPerPage);
```

**Step 4: 添加UI组件**
```tsx
{isAdminUser && (
  <Row className="mt-4">
    <Col>
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title className="mb-0">全部渠道</Card.Title>
            <Form.Control
              type="text"
              placeholder="搜索渠道名称或负责人..."
              value={channelSearchTerm}
              onChange={(e) => {
                setChannelSearchTerm(e.target.value);
                setChannelPage(1);
              }}
              style={{ maxWidth: '300px' }}
            />
          </div>

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
                        onClick={() => window.location.href = '/channels'}
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
                  onClick={() => setChannelPage(p => p - 1)}
                  className="me-2"
                >
                  上一页
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={channelPage >= totalPages}
                  onClick={() => setChannelPage(p => p + 1)}
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
)}
```

**Step 5: 辅助函数**
```typescript
const getStatusVariant = (status: string): string => {
  switch (status) {
    case 'active': return 'success';
    case 'inactive': return 'secondary';
    case 'suspended': return 'warning';
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

### 验收标准

- [x] 管理员用户在仪表盘看到"全部渠道"表格
- [x] 普通用户不显示渠道列表
- [x] 表格显示渠道名、状态、业务类型、负责人
- [x] 状态使用Badge组件带颜色
- [x] 支持搜索功能（客户端过滤）
- [x] 支持分页（每页10条）
- [x] 有"查看详情"按钮
- [x] 搜索后重置到第一页
- [x] 显示总数和当前范围

## 实施计划

### 任务分解

1. **修改 DashboardPage.tsx** ⏳
   - 添加搜索和分页状态
   - 添加渠道列表数据整合逻辑（含负责人）
   - 添加过滤和分页useMemo
   - 添加辅助函数（状态、类型标签转换）
   - 添加管理员专属的渠道列表UI

2. **测试验证** ⏳
   - 测试管理员能看到渠道列表
   - 测试普通用户看不到
   - 测试搜索功能
   - 测试分页功能
   - 测试查看详情按钮

### 风险评估

- **风险等级**: 低
- **潜在问题**:
  - 渠道数量很多时客户端分页可能性能不佳
  - 负责人信息可能缺失
- **缓解方案**:
  - 数据量大时考虑服务端分页
  - 负责人缺失时显示"-"

## 执行记录

- 2025-10-15 02:00: 创建任务计划文档
- 待执行: 使用 Codex MCP 完成代码实现

## 后续优化（可选）

1. **增强交互**
   - 点击行跳转到编辑页
   - 支持快速状态切换
   - 支持导出Excel

2. **性能优化**
   - 服务端分页和搜索
   - 虚拟滚动（数据量大时）

3. **功能扩展**
   - 多字段排序
   - 高级筛选（状态、类型组合）
   - 批量操作
