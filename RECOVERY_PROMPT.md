# 项目状态恢复 Prompt

## 项目概况
- **项目名称**: 渠道管理系统 (Channel Management System)
- **技术栈**:
  - 后端: Express.js + TypeScript + PostgreSQL + Prisma + Redis
  - 前端: React 18 + TypeScript + Vite + Ant Design 5
- **部署方式**: Docker Compose
- **项目路径**: `/home/pytc/渠道`

## 当前状态 (2025-12-05 18:32)

### ✅ 后端状态 - 正常运行
- **容器**: channel-backend (运行中)
- **端口**: 3001:4000
- **数据库**: PostgreSQL (健康)
- **缓存**: Redis (健康)
- **已修复问题**:
  1. P0 安全漏洞 (3个):
     - Visit record 授权绕过 (visitService.ts, visitController.ts)
     - Backup 路径遍历漏洞 (backupService.ts)
     - Excel 导入用户 ID 错误 (dataController.ts)
  2. P1 问题 (3个):
     - Excel tags 类型不匹配 (excelService.ts)
     - PrismaClient 重复实例化 (workPlanService.ts, targetService.ts, eventLogger.ts)
     - Dashboard 性能优化 - 21个串行查询改为并行 (dashboardService.ts)
  3. P2 代码质量 (3个):
     - 前端 token 管理统一 (创建 axios.ts, 更新35个文件)
     - App.tsx 组件拆分 (AppHeader.tsx, SideMenu.tsx)
     - 错误边界 (ErrorFallback.tsx)
  4. 启动命令: `--loader tsx` → `--import tsx`

### ❌ 前端状态 - 语法错误
- **容器**: channel-frontend (运行中但有错误)
- **端口**: 4001:3000
- **问题**: 批量修复时破坏了 try-catch 结构和 axios 调用
- **受影响文件**: 40+ TSX 文件在 `src/pages/` 目录
- **典型错误**:
  ```typescript
  // 错误模式 1: axios 调用缺少闭合括号
  const response = await axios.put(url, data  // 缺少 )

  // 错误模式 2: try 块不完整
  try {
  }  // 空 try 块
  const code = ...
  } catch (error) {

  // 错误模式 3: axios 导入失败
  Failed to resolve import "../../../utils/axios"
  ```

### 🔧 配置修改
- **端口映射**: 80→81, 443→444 (避免冲突)
- **docker-compose.yml**: 已更新端口和后端启动命令
- **前端 axios**: 创建了 `/frontend/src/utils/axios.ts` (httpOnly cookie 支持)

## 快速恢复步骤

### 1. 检查服务状态
```bash
cd /home/pytc/渠道
docker ps --filter "name=channel-"
```

### 2. 查看后端日志
```bash
docker logs channel-backend --tail 50
```

### 3. 查看前端错误
```bash
docker logs channel-frontend 2>&1 | grep "error" | head -20
```

### 4. 访问地址
- **Nginx**: http://localhost:81
- **前端直连**: http://localhost:4001
- **后端 API**: http://localhost:3001
- **后端健康检查**: http://localhost:3001/health

## 前端修复方案

### 方案 A: 使用修复脚本 (推荐)
已有脚本但需要完善: `/home/pytc/渠道/frontend/fix_pages.py`

### 方案 B: 手动修复关键文件
优先修复以下文件（按重要性排序）:
1. `src/pages/auth/Login.tsx`
2. `src/pages/dashboard/Dashboard.tsx`
3. `src/pages/workspace/Workspace.tsx`
4. `src/pages/distributors/DistributorList.tsx`

### 方案 C: 从备份恢复
如果有 git 仓库或备份，恢复 `frontend/src/pages/` 目录

## 关键文件位置

### 后端修复文件
```
backend/src/services/visitService.ts       # P0: 授权检查
backend/src/controllers/visitController.ts # P0: 授权检查
backend/src/services/backupService.ts      # P0: 路径验证
backend/src/controllers/dataController.ts  # P0: 用户ID修复
backend/src/services/excelService.ts       # P1: tags类型
backend/src/services/dashboardService.ts   # P1: 并行查询
backend/src/utils/prisma.ts                # P1: 共享实例
```

### 前端关键文件
```
frontend/src/utils/axios.ts                # 统一axios实例
frontend/src/components/Layout/AppHeader.tsx
frontend/src/components/Layout/SideMenu.tsx
frontend/src/components/ErrorBoundary/ErrorFallback.tsx
frontend/src/App.tsx                       # 使用拆分组件
```

## 已知问题清单

### 前端语法错误文件 (部分)
- CertificationEdit.tsx:59 - axios 调用缺少 )
- CertificationCreate.tsx:58 - axios 调用缺少 )
- CertificationList.tsx:323 - 意外 token
- ResourceEdit.tsx:56 - 缺少逗号
- ResourceDetail.tsx:72 - 缺少 catch/finally
- TicketCreate.tsx:79 - 缺少逗号
- TicketEdit.tsx:75 - 缺少逗号
- TicketDetail.tsx:133 - 缺少 catch/finally
- CertificationDetail.tsx - axios 导入失败
- CertificationVerify.tsx - axios 导入失败

## 修复历史

### 批量修复尝试 (失败)
1. 使用 sed 批量删除空 try 块 - 破坏了结构
2. 使用 Python 脚本 fix_tsx.py - 不完整
3. 使用 Python 脚本 fix_tsx2.py - 不完整
4. 使用 Gemini 生成的 fix_try_catch.py - 部分成功
5. 使用 Codex 生成的 fix_pages.py - 修复了31个括号，但仍有遗留问题

### 成功的修复
- 后端所有 P0/P1/P2 问题已完全修复
- 前端 axios 统一实例已创建
- 前端组件拆分已完成
- 错误边界已添加

## 下一步建议

### 立即行动
1. 决定前端修复方案 (A/B/C)
2. 如选择方案 B，使用 codex 逐个修复文件
3. 修复后重启前端: `docker restart channel-frontend`
4. 验证访问: http://localhost:81

### 长期改进
1. 添加 ESLint/Prettier 防止语法错误
2. 添加 pre-commit hooks
3. 建立 git 仓库进行版本控制
4. 添加前端单元测试

## 重要提示
- ⚠️ 不要再使用批量 sed 命令修改代码
- ⚠️ 修复前先备份文件
- ⚠️ 每次修复后验证语法: `npx tsc --noEmit`
- ⚠️ 使用 codex/gemini 时要求它们只给出 unified diff patch，不直接修改

## 联系信息
- 项目路径: `/home/pytc/渠道`
- Docker Compose 项目名: `channel`
- 网络: `channel-network`
- 数据卷: `postgres_data`, `redis_data`, `backend_logs`, `nginx_logs`
