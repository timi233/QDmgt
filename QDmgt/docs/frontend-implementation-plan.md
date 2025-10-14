# 前端实现计划 - Frontend Implementation Plan

**生成时间**: 2025-10-14
**状态**: 进行中

## 概述

后端API已完整实现，前端需要连接所有功能并补充缺失模块。

---

## Phase 1: 基础设施 (Infrastructure) ✅ **已完成**

### 1.1 API客户端封装
- [x] 创建 `src/services/api.ts` - Axios配置和拦截器
- [x] 创建 `src/services/auth.service.ts` - 认证API服务
- [x] 创建 `src/services/channel.service.ts` - 渠道API服务
- [ ] 创建 `src/services/assignment.service.ts` - 分配API服务
- [ ] 创建 `src/services/target.service.ts` - 目标API服务
- [ ] 创建 `src/services/execution.service.ts` - 执行计划API服务
- [x] JWT Token存储和管理（localStorage）
- [x] 请求/响应拦截器（自动添加token、错误处理）

### 1.2 全局状态管理
- [x] 评估是否需要Redux/Context（使用React Context）
- [x] 创建 `src/contexts/AuthContext.tsx` - 认证状态管理
- [x] 创建自定义hooks: `useAuth()`

### 1.3 路由系统
- [x] 更新 `src/App.js` 路由配置
- [x] 添加受保护路由组件 `PrivateRoute.tsx`
- [x] 路由结构：
  ```
  /login          → 登录页 ✅
  /               → 重定向到/channels（需认证） ✅
  /channels       → 渠道管理（需认证） ✅
  /register       → 注册页（待实现）
  /assignments    → 分配管理（待实现）
  /targets        → 目标规划（待实现）
  /execution      → 执行计划（待实现）
  /users          → 用户管理（待实现）
  ```

---

## Phase 2: 认证系统 (Authentication) ✅ **基本完成**

### 2.1 登录/注册页面
- [x] 创建 `src/pages/LoginPage.tsx`
- [ ] 创建 `src/pages/RegisterPage.tsx`
- [x] 登录表单（用户名、密码）
- [ ] 注册表单（用户名、邮箱、密码、全名）
- [x] 表单验证
- [x] 错误提示

### 2.2 认证集成
- [x] 实现登录逻辑（调用 `POST /auth/login`）
- [ ] 实现注册逻辑（调用 `POST /auth/register`）
- [x] Token存储和自动刷新
- [x] 登出功能
- [x] 路由守卫（未登录跳转到登录页）

---

## Phase 3: 渠道管理连接API 📡 高优先级

### 3.1 连接现有UI到后端
- [ ] 修改 `ChannelsPage.tsx` - 移除mock数据，调用真实API
- [ ] 实现 `GET /channels/` - 列表、分页、搜索、筛选
- [ ] 实现 `POST /channels/` - 创建渠道（表单提交）
- [ ] 实现 `PUT /channels/{id}` - 更新渠道（编辑表单提交）
- [ ] 实现 `DELETE /channels/{id}` - 删除渠道（添加删除按钮）
- [ ] 实现 `GET /channels/{id}` - 查看详情

### 3.2 错误处理和加载状态
- [ ] 添加API调用错误处理
- [ ] 优化加载状态UI
- [ ] 添加成功/失败Toast提示

---

## Phase 4: 导航系统 (Navigation) 🧭 中优先级

### 4.1 全局导航
- [ ] 创建 `src/components/Navbar.tsx` - 顶部导航栏
- [ ] 创建 `src/components/Sidebar.tsx` - 侧边栏（可选）
- [ ] 导航菜单项：
  - 仪表板
  - 渠道管理
  - 分配管理
  - 目标规划
  - 执行计划
  - 用户管理（仅管理员可见）
- [ ] 用户信息显示（右上角）
- [ ] 登出按钮

### 4.2 布局组件
- [ ] 创建 `src/components/Layout.tsx` - 主布局
- [ ] 响应式设计

---

## Phase 5: 分配管理 (Assignments) 📋 中优先级

### 5.1 分配管理页面
- [ ] 创建 `src/pages/AssignmentsPage.tsx`
- [ ] 分配列表（按用户/按渠道筛选）
- [ ] 创建分配表单
- [ ] 编辑分配（权限级别、目标责任）
- [ ] 删除分配
- [ ] 权限检查功能

### 5.2 API集成
- [ ] 实现 `POST /assignments/` - 创建分配
- [ ] 实现 `GET /assignments/user/{user_id}` - 查询用户分配
- [ ] 实现 `GET /assignments/channel/{channel_id}` - 查询渠道分配
- [ ] 实现 `PUT /assignments/{id}` - 更新分配
- [ ] 实现 `DELETE /assignments/{id}` - 删除分配

---

## Phase 6: 目标规划 (Targets) 🎯 中优先级

### 6.1 目标管理页面
- [ ] 创建 `src/pages/TargetsPage.tsx`
- [ ] 目标列表（按渠道分组）
- [ ] 创建目标表单（年、季度、月、业绩目标、商机目标、项目数量）
- [ ] 编辑目标
- [ ] 更新达成情况
- [ ] 完成度百分比展示

### 6.2 API集成
- [ ] 实现 `POST /targets/` - 创建目标
- [ ] 实现 `GET /targets/channel/{channel_id}` - 查询渠道目标
- [ ] 实现 `PUT /targets/{id}` - 更新目标
- [ ] 实现 `PATCH /targets/{id}/achievement` - 更新达成
- [ ] 实现 `GET /targets/{id}/completion` - 获取完成度

---

## Phase 7: 执行计划 (Execution Plans) 📅 低优先级

### 7.1 执行计划页面
- [ ] 创建 `src/pages/ExecutionPlansPage.tsx`
- [ ] 计划列表（月度/周度筛选）
- [ ] 创建计划表单
- [ ] 编辑计划
- [ ] 更新执行状态
- [ ] 删除计划

### 7.2 API集成
- [ ] 实现 `POST /execution-plans/` - 创建计划
- [ ] 实现 `GET /execution-plans/channel/{channel_id}` - 查询渠道计划
- [ ] 实现 `GET /execution-plans/user/{user_id}` - 查询用户计划
- [ ] 实现 `PUT /execution-plans/{id}` - 更新计划
- [ ] 实现 `PATCH /execution-plans/{id}/status` - 更新状态
- [ ] 实现 `DELETE /execution-plans/{id}` - 删除计划

---

## Phase 8: 用户管理 (Users) 👥 低优先级

### 8.1 用户管理页面（仅管理员）
- [ ] 创建 `src/pages/UsersPage.tsx`
- [ ] 用户列表
- [ ] 创建用户
- [ ] 编辑用户（角色、激活状态）
- [ ] 删除/禁用用户

### 8.2 需要后端新增API
- [ ] 后端添加 `GET /users/` - 用户列表
- [ ] 后端添加 `PUT /users/{id}` - 更新用户
- [ ] 后端添加 `DELETE /users/{id}` - 删除用户

---

## Phase 9: 数据可视化 (Visualization) 📊 低优先级

### 9.1 仪表板页面
- [ ] 创建 `src/pages/DashboardPage.tsx`
- [ ] 总体完成度展示
- [ ] 渠道业绩对比图表
- [ ] 时间序列趋势图

### 9.2 API集成
- [ ] 实现 `GET /api/visualization/dashboard-summary` - 仪表板摘要
- [ ] 实现 `GET /api/visualization/channel/{id}/targets` - 渠道统计
- [ ] 实现 `GET /api/visualization/channel/{id}/time-series` - 时间序列
- [ ] 使用Chart.js或Recharts绘制图表

---

## Phase 10: 优化和完善 ✨ 持续改进

### 10.1 用户体验
- [ ] 添加全局Toast通知组件
- [ ] 添加确认对话框（删除操作）
- [ ] 优化表单验证
- [ ] 响应式设计优化

### 10.2 性能优化
- [ ] 实现数据缓存
- [ ] 分页优化
- [ ] 懒加载
- [ ] 代码分割

### 10.3 测试
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] E2E测试

---

## 当前进度

- ✅ Phase 0: 渠道管理UI框架（已完成，使用mock数据）
- ✅ Phase 1: 基础设施（已完成）- API客户端、认证服务、路由系统
- ✅ Phase 2: 认证系统（基本完成）- 登录页面、路由守卫
- 🔄 Phase 3: 渠道管理连接API - **下一步**

---

## 技术栈确认

- **前端框架**: React 18.2.0
- **UI库**: React Bootstrap 2.7.4
- **HTTP客户端**: Axios (需安装)
- **路由**: React Router 6
- **状态管理**: React Context + Hooks
- **图表**: Chart.js / Recharts (需选择)
- **TypeScript**: 5.0.4

---

## 下一步行动

1. 安装依赖: `npm install axios`
2. 创建API客户端: `src/services/api.ts`
3. 创建认证服务: `src/services/auth.service.ts`
4. 创建登录页面: `src/pages/LoginPage.tsx`
5. 更新路由配置
