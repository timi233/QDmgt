# 渠道管理系统

全栈渠道管理平台，基于 React + Express + Prisma 技术栈，覆盖渠道伙伴管理、任务协作、健康度监控、培训与支持等核心流程。

## 功能特性
- **工作台/任务**：个人看板、任务分配与协作、状态流转、评论
- **分销商与拜访**：伙伴档案、分层分级、拜访记录与统计
- **健康度与目标**：健康评分、预警，目标设定与跟踪（Leader）
- **工作计划**：月度/周度计划与执行跟踪
- **培训/资料/工单/认证**：培训管理、资料库、支持工单、认证校验
- **审计与备份**：审计日志、数据库备份/恢复、性能与安全监控

## 技术栈
- 前端：React 18、TypeScript、Vite、Ant Design、React Router、Axios
- 后端：Node.js 20、Express、TypeScript、Prisma ORM、PostgreSQL/SQLite、JWT
- 基础设施：Docker Compose（Postgres + Redis + Backend + Frontend + Nginx）

## 环境要求
- Node.js **>=20**，npm **>=10**（使用 npm workspaces）
- Docker & Docker Compose（用于数据库/缓存或一键启动）
- 推荐使用本地 Node 运行前后端，数据库/Redis 通过 Docker 提供

## 项目结构
```
.
├── backend/          # 后端 API (Express + TS + Prisma)
├── frontend/         # 前端应用 (React + Vite + TS)
├── docker/           # Nginx、Postgres、Redis 等容器配置
├── docs/             # 额外文档（API、部署）
├── scripts/          # 辅助脚本（备份、重置、测试）
├── data/             # 本地数据持久化卷（git 忽略）
└── src/              # 旧版前端代码（如无需求可忽略）
```

## 快速开始

### 方式一：本地开发（Node + Docker 数据层）
1) 配置环境变量  
   - 复制根目录 `.env.example` 为 `.env`，替换数据库、Redis、JWT 等密钥。  
   - 后端：`backend/.env`（提供默认开发值，建议按需调整端口/密钥）。  
   - 前端：`frontend/.env.local`（已提供示例，确保 `VITE_API_BASE_URL=http://localhost:3002/api/v1`）。  
2) 启动数据库与缓存  
   ```bash
   docker-compose up -d postgres redis
   ```
3) 安装依赖（workspace）  
   ```bash
   npm install
   ```
4) 初始化数据库并运行后端（默认端口 3002）  
   ```bash
   cd backend
   npx prisma generate
   npm run db:migrate
   npm run db:seed   # 可选
   npm run dev
   ```
5) 启动前端（默认端口 4002，代理到 3002）  
   ```bash
   cd frontend
   npm install   # 首次可由根目录安装替代
   npm run dev -- --host --port 4002
   ```
6) 访问地址  
   - 前端：http://localhost:4002  
   - API：http://localhost:3002/api/v1

### 方式二：全栈 Docker Compose
```bash
docker-compose up -d
```
- 前端：http://localhost:4001  
- API：http://localhost:3001/api/v1  
- Nginx 反向代理：http://localhost:81 （含前端与 `/api/v1` 转发）

### 常用命令
- 根目录：`npm run docker:up` / `docker:down` / `docker:logs`（封装 docker-compose）  
- 后端：`npm run db:migrate`、`npm run db:seed`、`npm run test`（Jest）、`npm run backup:*`  
- 前端：`npm run dev`、`npm run build`、`npm run lint`  
- 脚本：`scripts/db-reset.sh`、`scripts/db-seed.sh`、`scripts/backup.sh`

## 环境变量
- 关键文件：`.env.example`（根）、`backend/.env`、`frontend/.env.local`、`.env.production`。  
- 重要项：`DATABASE_URL`、`REDIS_URL`、`JWT_SECRET`/`JWT_REFRESH_SECRET`、`CORS_ORIGIN`、`VITE_API_BASE_URL`。  
- 请在生产环境使用强随机密钥，并避免将真实密钥提交到仓库。

## 文档与测试
- 使用手册与接口文档：`docs/user-manual.html`、`docs/api.md`、`docs/deployment.md`  
- 健康检查：`/health`、`/health/db`  
- 后端测试：`cd backend && npm test`（需要数据库准备）  

## 角色与权限
| 角色 | 权限 |
| --- | --- |
| Admin | 全量管理、用户/审计/配置 |
| Leader | 团队数据、目标、备份等管理 |
| Sales | 个人及负责伙伴的日常操作 |

## 许可证
MIT
