# 渠道管理系统

全栈渠道管理平台，基于 React + Express + SQLite 技术栈，专为渠道销售团队设计的一站式管理解决方案。

## 功能特性

### 核心功能
- **工作台** - 个人任务看板，紧急任务提醒，任务创建与跟踪
- **分销商管理** - 渠道伙伴信息管理，多维度分类，层级管理
- **拜访记录** - 客户拜访记录，满意度评分，行动追踪
- **健康度管理** - 渠道伙伴健康评分，风险预警，推荐行动
- **工作计划** - 月度工作计划制定，周度复盘，执行跟踪
- **培训管理** - 培训活动管理，参与者登记，考核评分
- **资料库** - 销售资料、产品文档、案例集中管理
- **支持工单** - 渠道问题反馈，工单流转，SLA追踪
- **认证管理** - 渠道认证管理，有效期追踪，验证查询

### 管理功能（Leader/Admin）
- **目标管理** - 年度/季度/月度目标设定与追踪
- **数据看板** - 团队业绩统计，趋势分析
- **用户管理** - 系统用户管理（仅Admin）

### 系统特性
- 飞书单点登录集成
- 基于角色的权限控制（Admin/Leader/Sales）
- 响应式设计，支持移动端访问
- RESTful API 设计

## 项目结构

```
.
├── frontend/          # 前端应用 (React + Vite + TypeScript)
├── backend/           # 后端 API (Express + TypeScript + Prisma)
├── docker/            # Docker 配置和脚本
├── docs/              # 项目文档
├── scripts/           # 开发和部署脚本
├── data/              # 本地数据持久化 (Git 忽略)
└── .github/           # GitHub Actions CI/CD
```

## 技术栈

### 前端
- React 18.2 + TypeScript 5.3
- Vite 5.x
- Ant Design 5.12
- React Router 6
- Axios

### 后端
- Node.js 20+ + Express 4.18
- TypeScript 5.3
- Prisma ORM 5.7
- SQLite (开发) / PostgreSQL (生产)
- JWT 认证

## 快速开始

### 环境要求
- Node.js 20+
- npm 或 yarn

### 开发环境

```bash
# 克隆仓库
git clone <repo-url>
cd 渠道

# 安装依赖
npm install

# 后端配置
cd backend
cp .env.example .env
npx prisma generate
npx prisma migrate dev

# 启动后端
npm run dev

# 另开终端，启动前端
cd frontend
npm install
npm run dev
```

### Docker 部署

```bash
# 使用 Docker Compose 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 访问地址

- 前端: http://localhost:4002
- 后端 API: http://localhost:3002

## 用户角色

| 角色 | 权限说明 |
|------|----------|
| **Admin** | 系统管理员，拥有所有权限，可管理用户 |
| **Leader** | 团队负责人，可查看团队数据、设定目标 |
| **Sales** | 销售人员，管理自己的分销商和任务 |

## 环境变量

### 后端 (.env)

```env
# 服务端口
PORT=3002

# 数据库
DATABASE_URL="file:./dev.db"

# JWT密钥
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# 飞书集成（可选）
FEISHU_APP_ID=your-feishu-app-id
FEISHU_APP_SECRET=your-feishu-app-secret
```

### 前端 (.env.local)

```env
VITE_API_BASE_URL=http://localhost:3002/api
VITE_FEISHU_APP_ID=your-feishu-app-id
```

## API 文档

主要 API 端点：

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/auth/*` | 登录、注册、飞书登录 |
| 分销商 | `/api/distributors/*` | 分销商 CRUD |
| 任务 | `/api/tasks/*` | 任务管理 |
| 拜访 | `/api/visits/*` | 拜访记录 |
| 健康度 | `/api/health-scores/*` | 健康评分 |
| 工作计划 | `/api/work-plans/*` | 月度计划 |
| 目标 | `/api/targets/*` | 目标管理 |
| 培训 | `/api/trainings/*` | 培训管理 |
| 资料 | `/api/resources/*` | 资料库 |
| 工单 | `/api/tickets/*` | 支持工单 |
| 认证 | `/api/certifications/*` | 认证管理 |
| 看板 | `/api/dashboard/*` | 数据统计 |

## 开发指南

详细文档请参见：
- [使用手册](./docs/user-manual.html) - 系统功能介绍与操作指南
- [API 文档](./docs/api.md) - 后端接口详细说明
- [部署指南](./docs/deployment.md) - 生产环境部署说明

## 许可证

MIT
