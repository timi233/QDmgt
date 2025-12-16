# 分销商渠道管理系统实施计划

---
identifier: WFS-channel-management
source: "Brainstorming综合分析（Product Manager + System Architect + Data Architect + API Designer + Scrum Master + Synthesis）"
analysis: .workflow/.brainstorming/
created: 2025-11-21
project_path: D:\渠道
---

## 项目概述

### 项目目标
构建一个功能完备的B2B分销商渠道管理系统，支持多层级渠道架构、差异化定价策略、订单管理、库存协同和数据分析能力。

### 核心价值
- **渠道赋能**: 支持总代理→区域代理→一级经销商→二级经销商的多层级管理
- **智能定价**: 动态定价规则引擎，根据渠道层级、销量、季节自动调整
- **业务洞察**: 实时数据分析看板，支持销售预测和渠道绩效评估
- **运营效率**: 订单、库存、佣金全流程自动化

### 技术栈

#### 前端技术
- **框架**: React 18.2+ (TypeScript 5.0+)
- **UI组件**: Ant Design 5.x
- **状态管理**: Zustand 4.x (轻量级、开发友好)
- **数据请求**: React Query 5.x (服务端状态管理)
- **路由**: React Router 6.x
- **构建工具**: Vite 5.x
- **CSS方案**: Tailwind CSS 3.x + CSS Modules

#### 后端技术
- **运行时**: Node.js 20.x LTS
- **框架**: Express 4.x + TypeScript
- **ORM**: Prisma 5.x (类型安全、开发效率高)
- **数据库**: PostgreSQL 16.x (主数据库)
- **缓存**: Redis 7.x (会话、热数据)
- **认证**: JWT (Access Token + Refresh Token)
- **校验**: Zod 3.x (运行时类型校验)

#### 基础设施
- **容器化**: Docker + Docker Compose
- **API文档**: OpenAPI 3.0 (Swagger UI)
- **日志**: Winston + Morgan
- **监控**: Prometheus + Grafana (可选，后期集成)

### 交付范围

#### MVP核心功能 (6周交付)
1. 用户认证与权限管理
2. 多层级渠道管理（4级层级）
3. 产品与差异化定价策略
4. 订单全流程管理
5. 库存协同管理
6. 佣金自动计算
7. 数据分析BI看板

#### 后续增强 (Phase 2)
- 移动端适配
- 高级数据分析（销售预测）
- 消息通知系统
- 第三方ERP集成

---

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                    React 18 + TypeScript                     │
│              (Ant Design + Zustand + React Query)            │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS (REST API)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  API Gateway (Express)                       │
│             JWT Auth Middleware + CORS                       │
├──────────────────────────────────────────────────────────────┤
│                  Application Layer                           │
│   ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│   │  Auth    │ Channel  │ Product  │  Order   │ Inventory│  │
│   │ Service  │ Service  │ Service  │ Service  │ Service  │  │
│   └──────────┴──────────┴──────────┴──────────┴──────────┘  │
├──────────────────────────────────────────────────────────────┤
│                   Data Access Layer                          │
│                   Prisma ORM Client                          │
└────────────┬─────────────────────────────┬───────────────────┘
             │                             │
    ┌────────▼────────┐          ┌────────▼────────┐
    │   PostgreSQL    │          │      Redis      │
    │  (主数据库)      │          │   (缓存/会话)    │
    └─────────────────┘          └─────────────────┘
```

### 前端架构模式

```
src/
├── components/        # 可复用UI组件
│   ├── common/       # 通用组件 (Button, Modal, Table...)
│   └── business/     # 业务组件 (ChannelTree, PriceCalculator...)
├── pages/            # 页面组件
│   ├── auth/         # 登录/注册
│   ├── dashboard/    # 数据看板
│   ├── channels/     # 渠道管理
│   ├── products/     # 产品管理
│   ├── orders/       # 订单管理
│   └── inventory/    # 库存管理
├── hooks/            # 自定义React Hooks
├── stores/           # Zustand状态管理
├── services/         # API调用封装 (React Query)
├── utils/            # 工具函数
└── types/            # TypeScript类型定义
```

### 后端架构模式 (分层架构)

```
src/
├── routes/           # 路由定义 (Express Router)
├── controllers/      # 控制器 (请求处理)
├── services/         # 业务逻辑层
├── repositories/     # 数据访问层 (Prisma)
├── middlewares/      # 中间件 (认证、日志、错误处理)
├── validators/       # 请求校验 (Zod Schemas)
├── utils/            # 工具函数
├── types/            # TypeScript类型定义
└── config/           # 配置文件
```

---

## 数据库设计

### 核心数据模型 (Prisma Schema精简版)

```prisma
// 用户表
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  name          String
  role          Role     @default(AGENT)
  channelId     String?
  channel       Channel? @relation(fields: [channelId])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// 渠道表 (支持多层级)
model Channel {
  id          String    @id @default(uuid())
  name        String
  level       Int       // 1=总代理, 2=区域代理, 3=一级经销商, 4=二级经销商
  parentId    String?
  parent      Channel?  @relation("ChannelHierarchy", fields: [parentId])
  children    Channel[] @relation("ChannelHierarchy")
  discountRate Float    @default(1.0) // 折扣率
  status      Status    @default(ACTIVE)
  users       User[]
  orders      Order[]
}

// 产品表
model Product {
  id          String   @id @default(uuid())
  sku         String   @unique
  name        String
  basePrice   Float
  stock       Int      @default(0)
  status      Status   @default(ACTIVE)
  pricingRules PricingRule[]
  orderItems  OrderItem[]
}

// 定价规则表
model PricingRule {
  id          String  @id @default(uuid())
  productId   String
  product     Product @relation(fields: [productId])
  channelLevel Int    // 适用渠道层级
  discountRate Float  // 折扣率
  minQuantity Int     @default(1) // 起订量
}

// 订单表
model Order {
  id          String      @id @default(uuid())
  orderNo     String      @unique
  channelId   String
  channel     Channel     @relation(fields: [channelId])
  totalAmount Float
  status      OrderStatus @default(PENDING)
  items       OrderItem[]
  createdAt   DateTime    @default(now())
}

// 订单明细表
model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  order     Order   @relation(fields: [orderId])
  productId String
  product   Product @relation(fields: [productId])
  quantity  Int
  unitPrice Float
  subtotal  Float
}

// 佣金记录表
model Commission {
  id          String   @id @default(uuid())
  channelId   String
  orderId     String
  amount      Float
  status      Status   @default(PENDING)
  createdAt   DateTime @default(now())
}

// 审计日志表
model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // CREATE, UPDATE, DELETE
  entity    String   // User, Channel, Order...
  entityId  String
  changes   Json?    // 变更内容 (JSON)
  createdAt DateTime @default(now())
}

enum Role {
  ADMIN
  AGENT
  DISTRIBUTOR
}

enum Status {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
```

### 数据库索引策略
- 主键: 所有表使用UUID
- 外键索引: channelId, productId, orderId等
- 业务查询索引: email(unique), sku(unique), orderNo(unique)
- 复合索引: (channelId, createdAt) for 渠道订单查询

---

## Sprint规划

### Sprint 1: 基础架构与核心模块 (Week 1-2)

**Sprint目标**:
- 搭建完整的前后端开发环境
- 实现用户认证和渠道管理基础功能
- 建立代码规范和CI/CD基础

**可交付成果**:
- ✅ 本地开发环境正常运行 (Docker Compose一键启动)
- ✅ 用户可以注册、登录、退出
- ✅ 管理员可以创建、编辑渠道层级关系
- ✅ 基础权限控制生效

#### 任务清单 (6个任务)

| 任务ID | 任务名称 | 预估工时 | 优先级 | 依赖 |
|--------|---------|---------|--------|------|
| IMPL-001 | 项目初始化和开发环境配置 | 8h | High | - |
| IMPL-002 | 数据库设计和Prisma Schema定义 | 12h | High | IMPL-001 |
| IMPL-003 | 后端基础架构搭建 (Express + 中间件) | 16h | High | IMPL-001 |
| IMPL-004 | 前端基础架构搭建 (React + 路由 + 状态管理) | 16h | High | IMPL-001 |
| IMPL-005 | 用户认证模块 (注册/登录/JWT) | 16h | High | IMPL-002, IMPL-003 |
| IMPL-006 | 渠道管理模块 (CRUD + 层级关系) | 16h | High | IMPL-005 |

**Sprint 1 总工时**: 84小时 (约2周，双人开发)

---

### Sprint 2: 业务核心功能 (Week 3-4)

**Sprint目标**:
- 实现产品管理和差异化定价策略
- 完成订单全流程管理
- 实现佣金自动计算引擎

**可交付成果**:
- ✅ 支持产品CRUD和批量导入
- ✅ 根据渠道层级自动计算价格
- ✅ 订单可以创建、审核、发货、完成
- ✅ 佣金自动计算并记录

#### 任务清单 (4个任务)

| 任务ID | 任务名称 | 预估工时 | 优先级 | 依赖 |
|--------|---------|---------|--------|------|
| IMPL-007 | 产品管理模块 (CRUD + 批量导入) | 16h | High | IMPL-006 |
| IMPL-008 | 差异化定价策略引擎 | 16h | High | IMPL-007 |
| IMPL-009 | 订单管理模块 (全流程) | 20h | High | IMPL-008 |
| IMPL-010 | 佣金计算引擎 | 12h | Medium | IMPL-009 |

**Sprint 2 总工时**: 64小时 (约2周)

---

### Sprint 3: 高级功能与优化 (Week 5-6)

**Sprint目标**:
- 实现库存管理和预警机制
- 构建数据分析BI看板
- 权限细粒度控制
- 性能优化和生产部署准备

**可交付成果**:
- ✅ 库存实时同步和预警通知
- ✅ 多维度数据分析看板
- ✅ 细粒度权限控制 (RBAC)
- ✅ 系统通过性能测试
- ✅ 生产环境部署就绪

#### 任务清单 (5个任务)

| 任务ID | 任务名称 | 预估工时 | 优先级 | 依赖 |
|--------|---------|---------|--------|------|
| IMPL-011 | 库存管理模块 (实时同步 + 预警) | 16h | High | IMPL-009 |
| IMPL-012 | 数据分析BI看板 (ECharts集成) | 20h | High | IMPL-010 |
| IMPL-013 | 权限管理优化 (RBAC细粒度) | 12h | Medium | IMPL-006 |
| IMPL-014 | 性能优化与监控 (Redis缓存 + 查询优化) | 16h | Medium | IMPL-012 |
| IMPL-015 | 集成测试与部署准备 | 12h | High | All |

**Sprint 3 总工时**: 76小时 (约2周)

---

## 风险管理

### 识别的风险和缓解措施

#### 技术风险

| 风险项 | 可能性 | 影响 | 缓解措施 |
|--------|--------|------|----------|
| Prisma迁移失败导致数据丢失 | 低 | 高 | 1. 使用迁移版本控制<br>2. 定期备份数据库<br>3. 在测试环境充分验证 |
| Redis缓存失效导致性能下降 | 中 | 中 | 1. 实现降级策略 (直接查DB)<br>2. 设置合理过期时间<br>3. 监控缓存命中率 |
| JWT Token泄露安全风险 | 中 | 高 | 1. 短过期时间 (15分钟)<br>2. 实现Refresh Token机制<br>3. HTTPS强制 |
| 并发订单导致库存超卖 | 中 | 高 | 1. 数据库事务隔离<br>2. 乐观锁机制<br>3. 库存预留策略 |

#### 业务风险

| 风险项 | 可能性 | 影响 | 缓解措施 |
|--------|--------|------|----------|
| 定价规则复杂导致计算错误 | 中 | 高 | 1. 单元测试覆盖所有场景<br>2. 手工复核关键订单<br>3. 可视化定价规则配置 |
| 渠道层级变更导致历史数据混乱 | 低 | 中 | 1. 审计日志记录所有变更<br>2. 软删除策略<br>3. 数据迁移脚本 |

#### 进度风险

| 风险项 | 可能性 | 影响 | 缓解措施 |
|--------|--------|------|----------|
| 需求变更导致返工 | 高 | 中 | 1. 严格需求评审<br>2. MVP优先原则<br>3. 预留10%缓冲时间 |
| 关键人员离职 | 低 | 高 | 1. 代码文档化<br>2. 知识分享会<br>3. Pair Programming |

---

## 质量保证

### 测试策略

#### 1. 单元测试 (覆盖率目标: 70%)
- **工具**: Jest + React Testing Library
- **范围**:
  - 工具函数 (utils)
  - 业务逻辑 (services)
  - 定价引擎核心算法
- **时机**: 每个功能开发完成后

#### 2. 集成测试
- **工具**: Supertest (后端API测试)
- **范围**:
  - 认证流程
  - 订单创建流程
  - 佣金计算流程
- **时机**: Sprint结束前

#### 3. 端到端测试 (E2E)
- **工具**: Playwright (可选，Phase 2引入)
- **范围**: 核心业务流程
- **时机**: 发布前

### 代码审查规范

#### Pull Request要求
1. **标题格式**: `[IMPL-XXX] 简短描述`
2. **描述内容**:
   - 任务背景和目标
   - 主要变更点
   - 测试说明
   - 截图 (UI相关)
3. **Review清单**:
   - [ ] 代码符合ESLint规范
   - [ ] 有单元测试覆盖
   - [ ] TypeScript类型完整
   - [ ] 无安全漏洞 (npm audit)
   - [ ] 性能无明显回退

#### 代码规范
- **TypeScript**: 严格模式 (`strict: true`)
- **命名**: 驼峰命名法 (camelCase)
- **注释**: 复杂业务逻辑必须注释
- **Prettier**: 统一代码格式化

### 性能指标

| 指标 | 目标值 | 测量方式 |
|------|--------|----------|
| API响应时间 (P95) | < 200ms | 后端日志统计 |
| 页面加载时间 (FCP) | < 1.5s | Lighthouse |
| 数据库查询时间 | < 50ms | Prisma日志 |
| 并发支持 | 100 TPS | 压力测试 (Artillery) |

---

## 开发规范

### Git Workflow
- **主分支**: `main` (受保护，需PR合并)
- **开发分支**: `develop` (日常开发)
- **功能分支**: `feature/IMPL-XXX-short-description`
- **修复分支**: `fix/IMPL-XXX-bug-description`

### Commit Message格式
```
<type>(scope): <subject>

<body>

<footer>
```

**Type类型**:
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具配置

**示例**:
```
feat(auth): implement JWT refresh token mechanism

- Add refreshToken field to User model
- Create /api/v1/auth/refresh endpoint
- Update TokenService to handle token rotation

Closes IMPL-005
```

---

## 部署计划

### 环境规划

| 环境 | 用途 | 访问地址 | 数据库 |
|------|------|----------|--------|
| Local | 本地开发 | http://localhost:3000 | Docker PostgreSQL |
| Dev | 开发测试 | https://dev.channel-system.com | 测试数据库 |
| Staging | 预发布 | https://staging.channel-system.com | 生产副本 |
| Production | 生产环境 | https://channel-system.com | 生产数据库 |

### Docker部署

#### docker-compose.yml结构
```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:80"]

  backend:
    build: ./backend
    ports: ["4000:4000"]
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16-alpine
    volumes: [./data/postgres:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    volumes: [./data/redis:/data]
```

### 发布检查清单
- [ ] 所有测试通过
- [ ] 数据库迁移脚本就绪
- [ ] 环境变量配置完成
- [ ] 备份策略已执行
- [ ] 监控告警已配置
- [ ] 回滚方案已准备

---

## 附录

### 关键决策记录 (ADR)

#### ADR-001: 选择Zustand而非Redux
- **背景**: 需要轻量级状态管理方案
- **决策**: 使用Zustand
- **理由**:
  - 学习曲线低
  - 无需boilerplate代码
  - 性能优秀
  - 包体积小 (3KB)

#### ADR-002: 选择Prisma而非TypeORM
- **背景**: 需要类型安全的ORM
- **决策**: 使用Prisma
- **理由**:
  - 完整TypeScript支持
  - Schema驱动开发
  - 优秀的迁移工具
  - 活跃的社区

#### ADR-003: JWT认证策略
- **背景**: 需要无状态认证方案
- **决策**: Access Token (15分钟) + Refresh Token (7天)
- **理由**:
  - 平衡安全性和用户体验
  - 支持Token刷新机制
  - 减少数据库查询

---

## 参考资料

### 相关文档
- [Brainstorming综合分析](D:\渠道\.workflow\.brainstorming\)
- [Prisma官方文档](https://www.prisma.io/docs)
- [React Query最佳实践](https://tanstack.com/query/latest/docs/react/overview)
- [Ant Design组件库](https://ant.design/components/overview)

### 设计资源
- [数据库ERD图](D:\渠道\.workflow\.design\database-erd.png)
- [系统架构图](D:\渠道\.workflow\.design\system-architecture.png)
- [API接口文档](D:\渠道\.workflow\.design\api-spec.yaml)

---

**文档版本**: v1.0
**最后更新**: 2025-11-21
**维护者**: Planning Agent
