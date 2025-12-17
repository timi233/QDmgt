# 变更日志

## [2025-12-17] 任务模块修复 🔧

### 问题修复

#### 后端修复
- **taskSchema.ts**: 修复任务创建验证，使 `distributorId` 和 `assignedUserId` 为可选
  - 添加 `optionalUuid` 辅助函数处理 UUID、空字符串或 null 值
  - 现在可以创建不关联经销商的任务

- **taskRoutes.ts**: 添加任务删除路由
  - 路由: `DELETE /api/v1/tasks/:id`
  - 需要 `confirm=true` 查询参数
  - 仅任务创建者或 leader/admin 可删除

- **taskController.ts**: 添加 `remove` 函数处理删除请求

- **taskService.ts**: 添加 `deleteTask` 函数，包含权限检查和事件日志

#### 前端修复
- **Workspace.tsx**: 修复 API 响应处理
  - 移除 `response.data.success` 检查（后端不返回此字段）
  - 改为检查实际数据: `response.data.tasks`, `response.data.distributors`

- **TaskDetail.tsx**:
  - 修复任务获取和评论的 API 响应处理
  - 将状态更新从 `PATCH /tasks/:id` 改为 `PUT /tasks/:id/status`
  - 为删除请求添加 `?confirm=true` 参数

- **CreateTask.tsx**: 修复经销商和任务创建的 API 响应处理

### 技术细节

**400 错误根因**: `src/schemas/taskSchema.ts` 中的验证 schema（被 `validateBody` 中间件使用）将 `distributorId` 和 `assignedUserId` 设为必填 UUID。

**任务不显示根因**: 前端检查 `response.data.success` 但后端返回 `{ tasks, pagination }` 不包含 `success` 字段。

**删除 404 根因**: 后端没有任务的 DELETE 路由。

**状态更改 404 根因**: 前端使用 `PATCH /tasks/:id` 但后端期望 `PUT /tasks/:id/status`。

---

## [2025-12-05] P2 代码质量优化 🔵

### 🎨 前端优化

#### 1. Token 管理统一化
- **问题**: 35 个文件使用废弃的 `localStorage.getItem('token')`
- **修复**: 创建统一 axios 实例，依赖 httpOnly cookie
- **文件**:
  - 新增 `frontend/src/utils/axios.ts`
  - 批量更新 35 个组件文件
- **效果**: 移除所有手动 token 管理，提升安全性

#### 2. App.tsx 组件拆分
- **问题**: 单文件 557 行，包含 Header、Sider、路由
- **修复**: 拆分为独立组件
- **文件**:
  - 新增 `frontend/src/components/Layout/AppHeader.tsx`
  - 新增 `frontend/src/components/Layout/SideMenu.tsx`
  - 更新 `frontend/src/App.tsx`
- **效果**: 提升可维护性和代码复用

#### 3. 错误边界
- **问题**: 缺少全局错误处理
- **修复**: 添加 ErrorBoundary 包裹应用
- **文件**:
  - 新增 `frontend/src/components/ErrorBoundary/ErrorFallback.tsx`
  - 更新 `frontend/src/App.tsx`
- **效果**: 优雅处理运行时错误

---

## [2025-12-05] P0 严重安全漏洞修复 🔴

### 🔒 关键安全修复

#### 1. 拜访记录权限绕过漏洞 (CVE-级别)
- **问题**: 销售人员可通过猜测 ID 访问/修改/删除任何人的拜访记录
- **影响**: 数据泄露、未授权修改
- **修复**:
  - 新增 `ensureVisitAccess()` 权限检查函数
  - 在 `getVisitById()`, `updateVisit()`, `deleteVisit()` 中强制验证所有权
  - Controller 层添加 403 错误处理
- **修改文件**:
  - `backend/src/services/visitService.ts`
  - `backend/src/controllers/visitController.ts`

#### 2. 备份路径遍历漏洞 (CVE-级别)
- **问题**: 主管可传入 `../../etc/passwd` 删除/恢复任意系统文件
- **影响**: 系统文件破坏、权限提升
- **修复**:
  - 新增 `resolveBackupPath()` 函数验证文件名
  - 使用 `path.basename()` 阻止路径遍历
  - 应用于 `restoreBackup()`, `deleteBackup()`, `verifyBackup()`
- **修改文件**:
  - `backend/src/services/backupService.ts`

#### 3. Excel 导入用户 ID 错误
- **问题**: 读取 `req.user.id` 但 JWT 存储 `userId`，导致访问控制失效
- **影响**: 导入数据 `ownerUserId` 为 null，违反数据库约束
- **修复**:
  - 修正为 `req.user.userId`
  - 添加 `req.user` 存在性检查
- **修改文件**:
  - `backend/src/controllers/dataController.ts`

### ✅ 审查验证
- Codex 代码审查通过
- 无回归问题
- 遵循现有代码风格

---

## [2025-12-03] P1级别安全修复 - 输入验证 ✅

### 🔒 安全修复（问题#9）

#### 添加完整的输入验证 (P1级别问题#9)
- **问题**: 所有查询端点缺少输入验证，存在注入攻击风险
- **修复**: 使用Zod为所有API端点添加完整的请求验证
- **创建的文件**:
  - `backend/src/middlewares/validateMiddleware.ts` - 通用验证中间件
  - `backend/src/schemas/dataSchema.ts` - 数据端点验证规则
  - `backend/src/schemas/distributorSchema.ts` - 经销商端点验证规则
  - `backend/src/schemas/taskSchema.ts` - 任务端点验证规则
  - `backend/src/schemas/targetSchema.ts` - 目标端点验证规则
  - `backend/src/schemas/workPlanSchema.ts` - 工作计划端点验证规则
  - `docs/P1_ISSUE_9_FIX_SUMMARY.md` - 验证测试指南
- **修改的文件**:
  - `backend/src/routes/dataRoutes.ts` - 添加验证中间件
  - `backend/src/routes/distributorRoutes.ts` - 添加验证中间件
  - `backend/src/routes/taskRoutes.ts` - 添加验证中间件
  - `backend/src/routes/targetRoutes.ts` - 添加验证中间件
  - `backend/src/routes/workPlanRoutes.ts` - 添加验证中间件
- **验证覆盖**:
  - ✅ 5个模块，30+ 个端点
  - ✅ 查询参数验证（Query）
  - ✅ 请求体验证（Body）
  - ✅ 路径参数验证（Params）
  - ✅ 类型强制转换和默认值
  - ✅ 范围验证和格式验证
  - ✅ 业务逻辑验证（日期范围等）
- **安全提升**:
  - ✅ 防止SQL注入攻击
  - ✅ 防止XSS攻击
  - ✅ 防止DoS攻击（分页限制）
  - ✅ 提高数据完整性
  - ✅ 统一错误响应格式

### 📊 进度更新

- **P0级别**: 100% (6/6) ✅
- **P1级别**: 100% (4/4) ✅
- **P2级别**: 0% (0/5) ⏳
- **总进度**: 66.7% (10/15)

---

## [2025-12-03] 安全加固 - 所有P0级别问题已修复 ✅

### 🔒 安全修复（第二批）

#### 3. 保护登出端点 (P0级别问题#4)
- **问题**: 登出端点未受保护，任何人都可以调用
- **修复**: 添加 `authenticateToken` 中间件到 `/api/auth/logout` 路由
- **修改文件**: `backend/src/routes/authRoutes.ts`
- **安全提升**:
  - ✅ 防止未授权用户调用登出端点
  - ✅ 防止DoS攻击和日志中毒
  - ✅ 确保登出操作记录正确的用户ID

#### 4. 增强密码验证策略 (P0级别问题#5)
- **问题**: 密码要求过于宽松（仅8字符最小长度）
- **修复**: 增强密码复杂度要求
  - 最小长度：12字符（从8提升）
  - 必须包含大写字母
  - 必须包含小写字母
  - 必须包含数字
  - 必须包含特殊字符
  - 清晰的中文错误提示
- **修改文件**: `backend/src/controllers/authController.ts`
- **安全提升**:
  - ✅ 大幅提升密码强度
  - ✅ 符合NIST密码标准
  - ✅ 有效防止字典攻击和暴力破解

#### 5. 加强速率限制 (P0级别问题#6)
- **问题**: 认证端点速率限制过于宽松（100次/15分钟）
- **修复**: 为登录和注册端点添加严格的速率限制
  - 限制：5次尝试/15分钟/IP
  - 成功的请求不计入限制
  - 使用标准RateLimit响应头
  - 中文错误提示
- **修改文件**: `backend/src/routes/authRoutes.ts`
- **安全提升**:
  - ✅ 有效防止暴力破解攻击
  - ✅ 限制从100次降低到5次（提升20倍）
  - ✅ 优化用户体验（成功请求不计数）

#### 6. 强化JWT密钥和数据库凭证 (P0级别问题#1)
- **问题**: 使用弱密码和不安全的占位符
  - `postgres123`（数据库密码）
  - `redis123`（Redis密码）
  - `your-jwt-secret-change-in-production`（JWT密钥）
- **修复**:
  - 更新 `.env.example` 添加安全警告和生成指令
  - 创建完整的安全配置指南文档
  - 创建自动化密钥生成脚本
- **新增文件**:
  - `docs/SECURITY_CONFIGURATION_GUIDE.md` - 完整的安全配置指南（8章节）
  - `scripts/generate-secrets.sh` - 自动生成强密钥的脚本
- **修改文件**:
  - `.env.example` - 添加安全警告和示例
- **安全提升**:
  - ✅ 提供强密钥生成工具（openssl）
  - ✅ 文档化密钥管理最佳实践
  - ✅ 支持多种密钥管理方案（4种）
  - ✅ 建立密钥轮换策略（90天/180天）
  - ✅ 应急响应流程完整

### 📋 P0安全问题修复总结

**修复完成**: 6/6 (100%) ✅

| 问题编号 | 问题描述 | 状态 |
|---------|---------|------|
| #1 | 强化JWT密钥和数据库凭证 | ✅ 已修复 |
| #2 | 添加HTTP安全头配置 | ✅ 已修复 |
| #3 | 实现HttpOnly Cookies替代localStorage | ✅ 已修复 |
| #4 | 保护登出端点 | ✅ 已修复 |
| #5 | 增强密码验证策略 | ✅ 已修复 |
| #6 | 加强速率限制 | ✅ 已修复 |

**整体安全提升**:
- ✅ 防止XSS攻击窃取认证令牌
- ✅ 自动CSRF保护
- ✅ 生产环境强制HTTPS
- ✅ 防止点击劫持和MIME嗅探
- ✅ 内容安全策略（CSP）防护
- ✅ 请求体大小限制防DoS
- ✅ 移除敏感信息泄露
- ✅ 防止暴力破解攻击（强密码+速率限制）
- ✅ 完整的密钥管理体系
- ✅ 登出端点安全保护

### 📁 新增文件

- `docs/SECURITY_REVIEW.md` - 完整的安全审查报告（已更新）
- `docs/SECURITY_FIX_SUMMARY.md` - 第一批修复总结
- `docs/SECURITY_CONFIGURATION_GUIDE.md` - 安全配置指南
- `scripts/generate-secrets.sh` - 密钥生成脚本

### 🔧 修改文件

- `backend/src/app.ts` - 增强Helmet、CORS、请求体限制
- `backend/src/controllers/authController.ts` - httpOnly Cookie、密码验证
- `backend/src/middlewares/authMiddleware.ts` - 支持Cookie认证
- `backend/src/routes/authRoutes.ts` - 保护登出端点、速率限制
- `backend/package.json` - 添加cookie-parser
- `frontend/src/services/authService.ts` - HttpOnly Cookie支持
- `.env.example` - 安全警告和密钥生成指令

### 🚀 使用说明

#### 生成强密钥

```bash
# 运行密钥生成脚本
cd /mnt/d/渠道
./scripts/generate-secrets.sh

# 将输出的密钥复制到.env文件中
# 详细说明见: docs/SECURITY_CONFIGURATION_GUIDE.md
```

#### 注意事项

1. **用户需要重新登录**:
   - 旧的localStorage token不再有效
   - 清除浏览器localStorage: `localStorage.clear()`

2. **密码复杂度要求**:
   - 新用户注册需要满足12字符+复杂度要求
   - 现有用户下次更改密码时会应用新规则

3. **速率限制**:
   - 登录/注册限制为5次/15分钟/IP
   - 成功的请求不计入限制
   - 超过限制将显示中文提示

4. **生产环境部署前必做**:
   - ✅ 运行 `./scripts/generate-secrets.sh` 生成强密钥
   - ✅ 更新所有环境变量
   - ✅ 验证HTTPS配置
   - ✅ 测试所有认证流程

### 📖 相关文档

- [完整安全审查报告](./docs/SECURITY_REVIEW.md)
- [安全配置指南](./docs/SECURITY_CONFIGURATION_GUIDE.md)
- [第一批修复总结](./docs/SECURITY_FIX_SUMMARY.md)

---

## [2025-12-03] 安全加固 - P0级别问题修复（第一批）

### 🔒 安全修复

#### 1. 增强HTTP安全头配置 (P0级别问题#2)
- **问题**: 缺少关键的HTTP安全头，存在XSS、点击劫持、中间人攻击风险
- **修复**:
  - 增强Helmet配置，添加Content-Security-Policy (CSP)
  - 配置Strict-Transport-Security (HSTS) - 1年有效期
  - 添加X-Frame-Options: deny防止点击劫持
  - 添加X-Content-Type-Options: nosniff
  - 改进CORS配置，生产环境使用单一域名
  - 添加请求体大小限制（1MB）防止DoS攻击
  - 移除生产环境中的环境信息泄露
- **修改文件**: `backend/src/app.ts`

#### 2. 实现HttpOnly Cookies替代localStorage (P0级别问题#3)
- **问题**: JWT令牌存储在localStorage中，易受XSS攻击
- **修复**:
  - **后端改动**:
    - 安装并配置`cookie-parser`中间件
    - 登录时设置httpOnly cookie（无法被JavaScript访问）
    - Cookie配置：httpOnly, secure (生产), sameSite: strict
    - 登出时清除httpOnly cookie
    - 认证中间件支持从cookie读取token（向后兼容Authorization header）
  - **前端改动**:
    - 配置axios全局启用withCredentials
    - 移除token在localStorage中的存储
    - 仅保存用户信息到localStorage
    - 废弃getToken()函数
- **修改文件**:
  - `backend/src/controllers/authController.ts`
  - `backend/src/middlewares/authMiddleware.ts`
  - `backend/src/app.ts`
  - `frontend/src/services/authService.ts`
  - `backend/package.json`（添加cookie-parser依赖）

### 📋 安全提升

**修复成果**:
- ✅ 防止XSS攻击窃取认证令牌
- ✅ 自动CSRF保护（sameSite: strict）
- ✅ 生产环境强制HTTPS
- ✅ 防止点击劫持攻击
- ✅ 防止MIME类型嗅探攻击
- ✅ 内容安全策略（CSP）防护
- ✅ 请求体大小限制防DoS
- ✅ 移除敏感信息泄露

**注意事项**:
- 用户需要重新登录以获得新的httpOnly cookie
- 需要清除浏览器中的旧localStorage数据
- 确保前后端使用相同的域名或正确配置CORS

### 📁 新增文件
- `docs/SECURITY_REVIEW.md` - 完整的安全审查报告

### 🔍 安全审查

完成了系统的全面安全代码审查，识别了15个安全问题：
- **P0级别**: 6个关键安全问题（已修复2个）
- **P1级别**: 4个高优先级问题（已修复2个）
- **P2级别**: 5个改进建议

详细报告请查看: `docs/SECURITY_REVIEW.md`

---

## [2025-11-24] 功能优化与路由修复

### 🔧 修复问题

#### 1. 工作计划和目标管理页面导航问题
- **问题**: 点击"查看"和"编辑"按钮会跳转到登录页面
- **原因**: 缺少路由定义，通配符路由将未定义路由重定向到登录页
- **修复**:
  - 创建 `WorkPlanDetail.tsx` - 工作计划详情页
  - 创建 `WorkPlanEdit.tsx` - 工作计划编辑页
  - 创建 `TargetDetail.tsx` - 目标详情页
  - 创建 `TargetEdit.tsx` - 目标编辑页
  - 在 `App.tsx` 添加相应路由配置

#### 2. 工作计划创建页面不存在
- **问题**: 点击"新建工作计划"提示工作计划不存在
- **修复**: 移除工作计划列表中的"新建工作计划"按钮

### 🚀 功能优化

#### 1. 任务模块整合优化
- **问题**: 新建任务功能与其他模块割裂
- **优化方案**:
  - 移除侧边栏菜单中独立的"新建任务"菜单项
  - 移除独立的任务创建路由 `/tasks/create`
  - 将任务创建改为模态框形式，直接在工作台中完成
  - 任务创建时可选择关联的经销商，实现模块联动

#### 2. 工作台简化
- 移除"新建经销商"按钮（功能与经销商管理重复）
- 任务创建流程优化，无需页面跳转

### 📁 修改文件清单

#### 新增文件
- `frontend/src/pages/work-plans/WorkPlanDetail.tsx`
- `frontend/src/pages/work-plans/WorkPlanEdit.tsx`
- `frontend/src/pages/targets/TargetDetail.tsx`
- `frontend/src/pages/targets/TargetEdit.tsx`

#### 修改文件
- `frontend/src/App.tsx`
  - 添加新页面导入
  - 添加工作计划详情/编辑路由
  - 添加目标详情/编辑路由
  - 移除独立的任务创建路由
  - 移除菜单中的"新建任务"菜单项

- `frontend/src/pages/workspace/Workspace.tsx`
  - 移除"新建经销商"按钮
  - 添加任务创建模态框
  - 添加经销商列表获取
  - 添加任务创建表单提交逻辑

- `frontend/src/pages/work-plans/WorkPlanList.tsx`
  - 移除"新建工作计划"按钮
  - 移除未使用的 PlusOutlined 导入

### 📋 优化后的菜单结构
- 工作台（包含任务管理和创建）
- 分销商管理
- 工作计划
- 目标管理（仅主管可见）
- 数据看板（仅主管可见）

### 🔗 模块联动增强
- 任务创建时可直接关联经销商
- 工作台统一管理所有任务
- 功能集中，减少割裂感

---

## [2025-11-24] 数据本地化

### 🌍 区域数据更新
- 将所有经销商区域数据更新为山东省地市信息
- 包含济南、青岛、烟台、潍坊、临沂等城市

### 📁 修改文件
- `backend/prisma/seed.ts` - 更新种子数据中的经销商信息
- `frontend/src/pages/workspace/Workspace.tsx` - 更新mock数据
- `frontend/src/pages/tasks/CreateTask.tsx` - 更新mock经销商列表

---

## [2025-11-24] 界面本地化

### 🌐 中文翻译
- 将 CreateTask.tsx 页面所有英文文本翻译为中文
- 包括：页面标题、表单标签、按钮、验证信息、优先级选项等

### 🔧 TypeScript 修复
- 修复 Workspace.tsx 中 Record 类型声明语法错误
- `Record[str, str]` → `Record<string, string>`
