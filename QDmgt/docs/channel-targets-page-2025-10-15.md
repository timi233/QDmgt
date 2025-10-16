# 渠道目标管理页面 - 2025-10-15

## 功能概述

新增渠道目标管理页面,用于管理销售人员/组织的季度和月度目标。页面风格已与系统其他页面统一。

## 页面路径

- URL: `/channel-targets`
- 权限: Manager 及以上角色
- 导航位置: 顶部导航栏 "渠道目标" (仅 Manager/Admin 可见)

## 页面布局

### 顶部区域

#### 操作按钮
- **返回按钮**: 返回上一页
- **新增渠道目标**: 创建新的目标记录

#### 筛选条件
| 筛选项 | 类型 | 说明 |
|--------|------|------|
| 人员 | 下拉选择 | 筛选特定人员或查看全部 |
| 维度 | 下拉选择 | 个人/团队/部门 |
| 年份 | 下拉选择 | 支持前后一年,默认当前年份 |
| 季度 | 按钮组 | Q1-Q4,默认当前季度 |

### 表格区域

#### 表头结构(多层)

**第一层表头:**
- 销售/组织 (跨2行)
- Q{季度} 目标 (跨5列)
- {月份1} 月目标 (跨5列)
- {月份2} 月目标 (跨5列)
- {月份3} 月目标 (跨5列)
- 操作 (跨2行)

**第二层表头(每个目标列下):**
- 新签
- 核心商机
- 核心业绩
- 高价值商机
- 高价值业绩

#### 数据行
每行显示一个销售人员/组织的目标数据:
- 名称
- 季度目标的5个指标
- 3个月度目标各5个指标
- 操作按钮(编辑/删除)

## 技术实现

### 组件文件
- `frontend/src/pages/ChannelTargetsPage.tsx`

### 核心功能

#### 1. 当前季度自动选择
```typescript
const getCurrentQuarter = (): number => {
  const month = new Date().getMonth() + 1;
  return Math.ceil(month / 3);
};
```

#### 2. 根据季度计算月份
```typescript
const getMonthsByQuarter = (quarter: number): number[] => {
  const startMonth = (quarter - 1) * 3 + 1;
  return [startMonth, startMonth + 1, startMonth + 2];
};
```

#### 3. 数据类型定义

**目标数据:**
```typescript
interface TargetData {
  newSigning: number;              // 新签
  coreOpportunity: number;         // 核心商机
  corePerformance: number;         // 核心业绩
  highValueOpportunity: number;    // 高价值商机
  highValuePerformance: number;    // 高价值业绩
}
```

**目标行:**
```typescript
interface TargetRow {
  id: string;
  name: string;
  type: 'person' | 'organization';
  quarterTarget: TargetData;
  monthTargets: {
    [month: number]: TargetData;
  };
}
```

### 路由配置

在 `frontend/src/App.js` 中添加:
```javascript
<Route
  path="/channel-targets"
  element={
    <ManagerRoute element={withLayout(<ChannelTargetsPage />)} />
  }
/>
```

## 页面特性

### 1. 响应式设计
- 使用 Bootstrap Grid 系统
- 筛选条件在小屏幕上自动堆叠
- 表格支持水平滚动

### 2. 样式特点
- 季度目标列使用蓝色背景 (bg-primary)
- 月度目标列使用浅蓝色背景 (bg-info)
- 表头文字居中,数据右对齐
- 多层表头结构清晰

### 3. 交互功能
- 季度按钮组切换自动更新月份显示
- 年份/人员/维度下拉筛选
- 编辑/删除按钮(待实现具体逻辑)

## 示例数据

目前使用模拟数据:
```typescript
{
  id: '1',
  name: '张三',
  type: 'person',
  quarterTarget: {
    newSigning: 100,
    coreOpportunity: 50,
    corePerformance: 80,
    highValueOpportunity: 30,
    highValuePerformance: 60,
  },
  monthTargets: {
    10: { newSigning: 30, coreOpportunity: 15, ... },
    11: { newSigning: 35, coreOpportunity: 18, ... },
    12: { newSigning: 35, coreOpportunity: 17, ... },
  },
}
```

## 待实现功能

1. **后端集成**
   - 连接渠道目标 API
   - 实现数据的增删改查

2. **新增目标对话框**
   - 创建模态框表单
   - 支持批量设置月度目标

3. **编辑功能**
   - 内联编辑或模态框编辑
   - 支持单元格直接编辑

4. **删除确认**
   - 添加删除确认对话框
   - 实现软删除或硬删除

5. **数据统计**
   - 显示目标总和
   - 显示达成率

6. **导入/导出**
   - Excel 导入目标数据
   - 导出当前视图数据

## 使用说明

### 访问页面
1. 以 Manager 或 Admin 角色登录
2. 访问 `/channel-targets`

### 查看目标
1. 选择筛选条件(人员/维度/年份)
2. 选择季度 Q1-Q4
3. 查看对应的季度和月度目标

### 管理目标
1. 点击"新增渠道目标"创建新目标
2. 点击"编辑"修改现有目标
3. 点击"删除"移除目标

## 页面风格统一

与系统现有页面保持一致:
- 使用 `Container fluid > Row > Col > Card` 布局结构
- Card.Header 包含标题和操作按钮
- Card.Body 包含筛选条件和表格
- 统一使用 Bootstrap Alert 组件显示成功/错误消息
- 统一使用 Spinner 显示加载状态
- 表格使用 `table-light` 表头和 `bordered hover` 样式
- 按钮使用 `outline-secondary` 和 `outline-danger` 变体

## 相关文件

- `frontend/src/pages/ChannelTargetsPage.tsx` - 页面组件
- `frontend/src/App.js` - 路由配置
- `frontend/src/components/Navbar.tsx` - 导航栏(已添加"渠道目标"链接)

## 注意事项

1. **权限控制**: 仅 Manager/Admin 可访问
2. **数据验证**: 需要在保存时验证目标数值的合理性
3. **季度月份对应**: 自动计算,无需手动配置
4. **表格宽度**: 列数较多,建议在大屏幕上操作

## 后续优化建议

1. 添加目标达成进度条
2. 支持目标模板功能
3. 添加历史目标对比
4. 支持目标审批流程
5. 添加目标完成情况图表
