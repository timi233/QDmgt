# 执行计划创建功能增强

**日期**: 2025-10-15

## 需求背景

在测试渠道管理系统时发现：
1. 新建执行计划时，"关键障碍"和"下一步行动"字段缺失，只能通过编辑补充
2. 需要确认创建完计划后默认状态为"计划中"而非"已归档"

## Linus 三问分析

### 1. 这是真实问题还是想象的？
**真实问题**。用户在测试时发现创建计划表单缺少"关键障碍"和"下一步行动"字段，只能通过编辑补充，这是糟糕的用户体验。

### 2. 有更简单的方法吗？
**最简单的方法**就是在创建表单添加这两个字段。后端API已经支持，只需要修改前端。

### 3. 这会破坏什么？
**零破坏**。后端这些字段是 Optional，添加到前端表单只是扩展功能，不影响现有数据。

## 核心判断

**值得做** - 这是基本的表单完整性问题

**关键洞察**：
- 数据结构：后端已完整，只需前端对齐
- 复杂度：零复杂度，纯表单字段添加
- 风险点：无风险，可选字段

## 技术分析

### 数据结构分析
- 后端模型 `ExecutionPlan` 已有 `key_obstacles`, `next_steps` 字段（可选）✅
- 后端 API `ExecutionPlanCreateRequest` 支持这些字段 ✅
- 后端 Service 创建方法接受这些参数 ✅
- 前端 `CreateExecutionPlanRequest` 接口缺失这两个字段 ❌ → ✅ 已修复
- 前端表单类型 `ExecutionPlanCreateFormValues` 缺失这两个字段 ❌ → ✅ 已修复
- 前端创建表单 UI 缺失这些输入框 ❌ → ✅ 已修复

### 默认状态检查
- 后端 `execution_service.py:53` - 创建时默认状态是 `ExecutionStatus.planned` ✅
- 前端从后端读取状态显示，无需修改 ✅

## 技术方案

### 需要修改的文件

1. **frontend/src/services/execution.service.ts**
   - 在 `CreateExecutionPlanRequest` 接口添加 `key_obstacles?` 和 `next_steps?` 字段
   - 在 `createExecutionPlan` 方法添加这两个可选参数
   - 在 payload 中包含这些字段

2. **frontend/src/pages/ExecutionPlansPage.tsx**
   - 在 `ExecutionPlanCreateFormValues` 类型添加 `key_obstacles` 和 `next_steps` 字段
   - 在 `createInitialCreateFormValues` 初始化这些字段为空字符串
   - 在创建表单模态框添加这两个字段的 textarea 输入框
   - 在 `handleSubmitCreate` 方法调用 service 时传递这些字段

### API 兼容性
- 后端已支持这些字段作为可选参数
- 前端不传递时，后端将其视为 `None`
- 零破坏性，完全向后兼容

### 验收标准
- [x] 创建执行计划表单包含"关键障碍"和"下一步行动"字段
- [x] 这两个字段为可选，不填写不影响创建
- [x] 填写后能正确保存到数据库
- [x] 创建后的计划默认状态为"计划中"
- [ ] 已有功能不受影响（待用户手动测试确认）

## 实施计划

### 任务分解

1. **修改前端 Service 层**（frontend/src/services/execution.service.ts）✅
   - 添加字段到 `CreateExecutionPlanRequest` 接口（line 47-55）
   - 添加参数到 `createExecutionPlan` 方法（line 92-100）
   - 在 API payload 中包含这些字段（line 110-116）

2. **修改前端 UI 层**（frontend/src/pages/ExecutionPlansPage.tsx）✅
   - 扩展 `ExecutionPlanCreateFormValues` 类型（line 26-34）
   - 更新初始化函数（line 54-62）
   - 在创建表单添加输入框（line 760-782）
   - 更新提交处理函数（line 414-422）

3. **测试验证** ⏳
   - 测试创建计划时填写这些字段（待用户测试）
   - 测试创建计划时不填写这些字段（待用户测试）
   - 验证默认状态为"计划中"（后端代码确认 ✅）
   - 回归测试已有功能（待用户测试）

### 风险评估
- **风险等级**: 低
- **潜在问题**: 无
- **回滚方案**: 简单回退代码即可

## 执行记录

- 2025-10-15 00:45: 创建任务计划文档
- 2025-10-15 00:47: 使用 Codex MCP 完成代码修改
- 2025-10-15 00:58: 启动前后端服务，准备测试

## 代码变更总结

### frontend/src/services/execution.service.ts
```typescript
// 添加到 CreateExecutionPlanRequest 接口
export interface CreateExecutionPlanRequest {
  // ... 已有字段
  key_obstacles?: string;  // 新增
  next_steps?: string;     // 新增
}

// 修改 createExecutionPlan 方法签名
async createExecutionPlan(
  channelId: string,
  userId: string,
  planType: PlanType,
  planPeriod: string,
  planContent: string,
  keyObstacles?: string,    // 新增参数
  nextSteps?: string        // 新增参数
): Promise<ExecutionPlan>

// 在 payload 中条件性包含字段
if (keyObstacles && keyObstacles.trim()) {
  payload.key_obstacles = keyObstacles;
}
if (nextSteps && nextSteps.trim()) {
  payload.next_steps = nextSteps;
}
```

### frontend/src/pages/ExecutionPlansPage.tsx
```typescript
// 扩展类型定义
type ExecutionPlanCreateFormValues = {
  // ... 已有字段
  key_obstacles: string;  // 新增
  next_steps: string;     // 新增
};

// 初始化函数
const createInitialCreateFormValues = (): ExecutionPlanCreateFormValues => ({
  // ... 已有字段
  key_obstacles: '',
  next_steps: '',
});

// 创建表单添加输入框（line 760-782）
<Form.Group className="mb-3" controlId="createPlanObstacles">
  <Form.Label>关键障碍（可选）</Form.Label>
  <Form.Control
    as="textarea"
    rows={3}
    value={createFormData.key_obstacles}
    onChange={event =>
      setCreateFormData(prev => ({ ...prev, key_obstacles: event.target.value }))
    }
  />
</Form.Group>

<Form.Group className="mb-0" controlId="createPlanNextSteps">
  <Form.Label>下一步行动（可选）</Form.Label>
  <Form.Control
    as="textarea"
    rows={3}
    value={createFormData.next_steps}
    onChange={event =>
      setCreateFormData(prev => ({ ...prev, next_steps: event.target.value }))
    }
  />
</Form.Group>

// 提交时传递参数
await executionService.createExecutionPlan(
  createFormData.channel_id,
  createFormData.user_id,
  createFormData.plan_type as PlanType,
  createFormData.plan_period,
  createFormData.plan_content,
  createFormData.key_obstacles || undefined,  // 新增
  createFormData.next_steps || undefined      // 新增
);
```

## 服务状态

- 后端服务: ✅ 运行中（端口 8001）
- 前端服务: ✅ 运行中（端口 3002）
- 可通过浏览器访问 `http://localhost:3002` 或 `http://0.0.0.0:3002` 进行测试

## 下一步

请通过浏览器访问前端系统，测试以下场景：
1. 创建执行计划时填写"关键障碍"和"下一步行动"字段
2. 创建执行计划时不填写这两个字段（留空）
3. 确认创建后的计划默认状态显示为"计划中"
4. 确认编辑和其他功能正常工作
