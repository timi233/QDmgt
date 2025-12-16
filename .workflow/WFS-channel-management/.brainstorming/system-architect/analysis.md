# System Architect Analysis: 分销商渠道管理系统

## Executive Summary

本系统设计针对小团队(10-30人销售+少数领导)的渠道管理需求，采用**前后端分离单体架构**，通过PostgreSQL+Redis+定时任务实现准实时数据同步。系统强调快速开发、简单部署、灵活扩展，为销售团队提供高效的渠道信息管理能力，为领导层提供数据驱动的决策支持。

---

## 1. 架构设计概述

### 1.1 系统目标与范围

**核心目标**:
- 为销售团队提供易用的分销商渠道信息管理工具
- 为领导层提供实时的渠道业务数据总览
- 支持销售-领导协同的任务跟进工作流
- 实现快速开发(6-8周)和低成本部署

**系统规模与约束**:
- 用户规模: 10-30名销售 + 5-10名领导管理者
- 数据量估计: 初期5000-10000条分销商记录，年增长率20-30%
- 并发用户: 峰值50-100并发(日间使用)
- 数据实时性要求: 准实时(1-5分钟延迟可接受)

**核心价值主张**:
- **对销售**: 快速录入、查询、编辑自己负责的分销商信息，接收任务提醒
- **对领导**: 全面掌握渠道布局、成交情况、任务进展，数据驱动决策
- **对组织**: 低成本快速交付，支持未来功能迭代和模块化扩展

### 1.2 架构原则

**简洁性优先** - 单体架构适合初期开发，避免分布式系统的复杂性

**数据驱动** - 通过Redis缓存加速看板查询，定时聚合实现准实时指标

**安全隔离** - 应用层权限过滤确保数据隔离，防止越权访问

**运维友好** - Docker Compose一键部署，便于快速迭代和备份恢复

**可扩展设计** - 为未来模块化和微服务化预留接口和事件流

---

## 2. 系统架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用层 (React/Vue3)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 分销商管理    │  │ 任务工作台    │  │ 领导看板      │          │
│  │ (列表+详情)   │  │ (优先级视图)   │  │ (数据统计)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼─────────────────┼──────────────────┘
          │                  │                 │
          └──────────────────┼─────────────────┘
                       │
        ┌──────────────▼────────────────┐
        │   API 网关 (Nginx反向代理)     │
        │   + JWT 身份验证和授权         │
        └──────────────┬────────────────┘
                       │
        ┌──────────────▼──────────────────────┐
        │     后端服务层 (Node.js/Python)      │
        │                                      │
        │  ┌────────────────────────────────┐ │
        │  │  业务逻辑服务                    │ │
        │  │  ├─ Distributor Service          │ │
        │  │  ├─ Task Service                 │ │
        │  │  ├─ Dashboard Service            │ │
        │  │  └─ User Service                 │ │
        │  └────────────────────────────────┘ │
        │                                      │
        │  ┌────────────────────────────────┐ │
        │  │  权限和安全层                    │ │
        │  │  ├─ JWT 验证中间件               │ │
        │  │  ├─ 角色权限中间件               │ │
        │  │  └─ 数据权限过滤                 │ │
        │  └────────────────────────────────┘ │
        │                                      │
        │  ┌────────────────────────────────┐ │
        │  │  定时任务引擎 (Cron)             │ │
        │  │  └─ 每分钟数据聚合任务           │ │
        │  └────────────────────────────────┘ │
        └──────────────┬──────────────────────┘
                       │
        ┌──────────────┴──────────────────────────┐
        │                                         │
   ┌────▼─────────────┐              ┌────────▼─────────┐
   │   PostgreSQL      │              │   Redis 缓存      │
   │   (主数据存储)     │              │   (看板数据缓存)   │
   │                   │              │                   │
   │ ┌─────────────┐   │              │ ┌───────────────┐ │
   │ │ distributors│   │              │ │ dashboard:    │ │
   │ │ tasks       │   │              │ │ • total_count │ │
   │ │ users       │   │              │ │ • new_count   │ │
   │ │ events      │   │              │ │ • ratio       │ │
   │ │ roles       │   │              │ │ • region_dist │ │
   │ │ permissions │   │              │ └───────────────┘ │
   │ └─────────────┘   │              │                   │
   └───────────────────┘              └───────────────────┘
```

### 2.2 核心组件设计

#### 2.2.1 前端应用层

**技术选型**: React 18 + TypeScript / Vue 3 + TypeScript

**核心模块**:

1. **分销商管理模块** (Distributor Management)
   - 列表页: 搜索、筛选、分页、排序
   - 详情页: 完整信息展示、编辑、创建跟进任务
   - 分步录入表单: 三步向导，支持快速保存和后续补全
   - 状态: 联系中、合作中、已成交、无效、暂停

2. **任务工作台模块** (Task Workbench)
   - 销售视图: 按时间分组(今日/明日/本周)的任务列表
   - 任务卡片: 优先级颜色标识、分销商摘要、截止时间、进度更新
   - 快速操作: 标记完成、更新进度、添加备注

3. **领导看板模块** (Leadership Dashboard)
   - 关键指标卡片: 分销商总数、本月新增、成交率、区域分布
   - 数据表格: 完整分销商列表，支持多维度筛选和下钻
   - 趋势图表: 月度新增趋势、各区域对比、销售人均渠道数
   - 任务监控: 整体任务完成率、逾期任务预警

4. **用户和权限管理**
   - 登录/注册: 支持企业SSO集成
   - 个人中心: 密码修改、偏好设置
   - 权限管理界面(仅限管理员): 用户列表、角色分配

**UI框架和组件库**:
- Ant Design (React) 或 Element Plus (Vue) 作为主要UI组件库
- Echarts 进行图表展示
- React Query (React) 或 Vue Query 处理数据获取和缓存
- Responsive 设计支持平板使用

**状态管理**:
- Redux Toolkit (React) 或 Pinia (Vue) 管理全局状态
- 重点状态: 用户认证、权限、当前选中分销商、任务列表

**通信协议**: RESTful API + JSON，支持WebSocket用于实时任务通知(可选二期功能)

#### 2.2.2 后端服务层

**技术选型**:
- 推荐: Node.js (Express/NestJS) 或 Python (FastAPI/Django)
- 语言: TypeScript (Node.js推荐) 或 Python
- ORM: TypeORM/Sequelize (Node.js) 或 SQLAlchemy (Python)

**核心服务模块**:

1. **分销商服务** (Distributor Service)
   ```
   核心接口:
   - POST /api/distributors - 创建分销商(支持分步提交)
   - GET /api/distributors - 查询分销商列表(含权限过滤)
   - GET /api/distributors/:id - 获取分销商详情
   - PUT /api/distributors/:id - 更新分销商信息
   - DELETE /api/distributors/:id - 删除分销商(软删除)
   - GET /api/distributors/stats/summary - 获取摘要统计

   业务逻辑:
   - 字段验证和数据规范化
   - 权限检查: 销售仅能操作自己的分销商
   - 事件记录: 创建/修改操作记录到事件流表
   - 缓存失效: 触发Redis缓存更新信号
   ```

2. **任务服务** (Task Service)
   ```
   核心接口:
   - POST /api/tasks - 创建任务
   - GET /api/tasks - 查询任务(按日期范围筛选)
   - PUT /api/tasks/:id - 更新任务状态/进度
   - DELETE /api/tasks/:id - 删除任务
   - GET /api/tasks/:id/distributors - 获取任务关联的分销商

   业务逻辑:
   - 任务创建时验证分销商和分配用户存在
   - 支持任务优先级排序
   - 事件记录: 任务生命周期事件
   - 提醒机制: 逾期任务标记和通知(后期可集成邮件/短信)
   ```

3. **看板服务** (Dashboard Service)
   ```
   核心接口:
   - GET /api/dashboard/stats - 获取看板统计数据(从Redis读取)
   - GET /api/dashboard/charts - 获取图表数据(趋势/对比)
   - GET /api/dashboard/alerts - 获取预警信息(逾期任务、关键指标变化)

   业务逻辑:
   - 从Redis缓存读取预计算的统计数据
   - 缓存miss时回源到PostgreSQL进行实时计算
   - 权限检查: 仅领导和管理员可访问
   ```

4. **用户和认证服务** (User & Auth Service)
   ```
   核心接口:
   - POST /api/auth/login - 用户登录(返回JWT Token)
   - POST /api/auth/logout - 用户登出
   - POST /api/auth/refresh - 刷新Token
   - GET /api/users/profile - 获取当前用户信息
   - GET /api/users - 获取用户列表(仅管理员)
   - POST /api/users - 创建用户(仅管理员)

   业务逻辑:
   - JWT Token生成和验证
   - 密码加密存储(bcrypt)
   - 用户角色和权限管理
   ```

5. **事件流服务** (Event Stream Service)
   ```
   核心功能:
   - 记录所有关键业务操作: distributor_created, distributor_updated, task_created, task_assigned等
   - 事件存储到events表
   - 提供审计日志查询接口: GET /api/audit/events
   - 支持事件订阅和webhook通知(可选)

   事件模型:
   - event_id (UUID)
   - event_type (枚举)
   - entity_type (distributor/task/user)
   - entity_id (被操作的对象ID)
   - user_id (操作用户)
   - payload (JSON - 操作详情)
   - timestamp (事件时间)
   ```

6. **定时任务引擎** (Cron Job Engine)
   ```
   核心任务:

   [每分钟执行]
   - 聚合任务: 计算分销商总数、新增数、成交率、区域分布
   - 计算逻辑:
     SELECT COUNT(*) as total FROM distributors WHERE deleted_at IS NULL
     SELECT COUNT(*) as new FROM distributors WHERE created_at >= TODAY()
     SELECT COUNT(*) as success FROM distributors WHERE status = 'COOPERATED'
     SELECT region, COUNT(*) FROM distributors GROUP BY region
   - 存储结果到Redis:
     SET dashboard:total_count [value] EX 300
     SET dashboard:new_count [value] EX 300
     HSET dashboard:stats "total" [value] "new" [value] ...

   [每天执行]
   - 生成日报: 汇总前一天的新增、成交、任务完成等数据
   - 检查逾期任务: 找出截止时间已过的未完成任务
   - 发送通知: 通知相关销售和领导

   [每周执行]
   - 生成周报: 汇总本周的重要指标和趋势

   [每月执行]
   - 事件表归档: 将6个月前的事件移到归档表(optional)
   - 生成月报: 完整的月度总结
   ```

**中间件和横切关注**:

1. **认证中间件** (Authentication Middleware)
   ```javascript
   // 验证JWT Token
   // 解析user_id和role
   // 注入到request上下文
   ```

2. **权限检查中间件** (Authorization Middleware)
   ```javascript
   // 检查用户role是否有权限访问资源
   // 对分销商查询自动注入owner_user_id过滤(非领导)
   // 对任务查询自动注入user_id过滤(非领导)
   ```

3. **错误处理中间件** (Error Handling)
   ```javascript
   // 统一的错误响应格式
   // 记录错误日志到日志系统
   // 返回友好的错误信息给前端
   ```

4. **日志中间件** (Logging Middleware)
   ```javascript
   // 记录每个API请求和响应
   // 重点关注权限检查、数据库操作、外部服务调用
   ```

5. **限流中间件** (Rate Limiting)
   ```javascript
   // 基于IP或用户ID的请求限流
   // 防止滥用和DDoS攻击
   ```

#### 2.2.3 数据存储层

**PostgreSQL - 主数据存储**:

核心表结构:

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL, -- FOREIGN KEY to roles
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 角色表
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL, -- 'SALES', 'LEADER', 'ADMIN'
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 分销商表
CREATE TABLE distributors (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  address VARCHAR(500),
  region VARCHAR(50), -- 省份
  city VARCHAR(50),

  -- 业务字段
  status VARCHAR(50) DEFAULT 'CONTACT', -- CONTACT, COOPERATING, COOPERATED, INVALID, PAUSED
  cooperation_level VARCHAR(10), -- A, B, C
  credit_limit DECIMAL(12,2),

  -- 扩展字段(JSONB)
  tags JSONB, -- ['tag1', 'tag2', ...]
  historical_performance JSONB, -- {year: [{month: 1, revenue: 100000}, ...]}
  extra_fields JSONB, -- 自定义扩展字段

  -- 关联字段
  owner_user_id UUID NOT NULL, -- FOREIGN KEY to users

  -- 审计字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  INDEX (owner_user_id),
  INDEX (region),
  INDEX (status),
  INDEX (created_at)
);

-- 任务表
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  distributor_id UUID NOT NULL, -- FOREIGN KEY to distributors
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- 任务属性
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
  priority VARCHAR(10) DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW

  -- 分配信息
  assigned_to_user_id UUID NOT NULL, -- FOREIGN KEY to users
  created_by_user_id UUID NOT NULL, -- FOREIGN KEY to users

  -- 截止时间
  due_date TIMESTAMP NOT NULL,

  -- 进度和备注
  progress_percentage INT DEFAULT 0, -- 0-100
  notes TEXT,

  -- 审计字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  deleted_at TIMESTAMP,

  INDEX (distributor_id),
  INDEX (assigned_to_user_id),
  INDEX (due_date),
  INDEX (status)
);

-- 事件流表(审计日志)
CREATE TABLE events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- distributor_created, distributor_updated, task_created, etc.
  entity_type VARCHAR(50) NOT NULL, -- distributor, task, user
  entity_id UUID NOT NULL,

  user_id UUID, -- 操作用户
  payload JSONB NOT NULL, -- 操作详情和变更信息

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX (entity_type, entity_id),
  INDEX (event_type),
  INDEX (user_id),
  INDEX (created_at)
);

-- 权限表(可选,用于灵活的权限管理)
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  role_id UUID NOT NULL, -- FOREIGN KEY to roles
  resource VARCHAR(100) NOT NULL, -- 'distributors', 'tasks', 'dashboard'
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
  condition VARCHAR(255), -- 可选的条件表达式

  UNIQUE(role_id, resource, action)
);
```

**PostgreSQL特性利用**:

1. **JSONB支持**: tags、historical_performance、extra_fields等灵活扩展字段
2. **全文搜索**: 分销商name和address的全文索引加速搜索
3. **窗口函数**: 计算区域排名、环比增长率
4. **事务隔离**: REPEATABLE READ隔离级别防止脏读和不可重复读
5. **审计功能**: 通过events表记录所有数据变更

**Redis缓存层**:

```
缓存结构:

1. 看板统计数据(Hash)
   KEY: dashboard:stats
   FIELDS:
     - total_count: 分销商总数
     - new_count_today: 今日新增
     - new_count_week: 本周新增
     - new_count_month: 本月新增
     - cooperation_rate: 成交率(%)
     - region_dist: {region: count, ...} (JSON)
     - top_regions: [region1, region2, ...] (JSON)
   TTL: 300秒(5分钟)

2. 用户会话
   KEY: session:{user_id}
   VALUE: {token, permissions, last_activity}
   TTL: 86400秒(24小时)

3. 热点数据缓存(可选)
   KEY: distributor:{distributor_id}
   VALUE: 完整分销商对象
   TTL: 3600秒(1小时)

4. 任务列表缓存(可选)
   KEY: tasks:user:{user_id}:date:{date}
   VALUE: 该用户该日期的任务列表
   TTL: 300秒(5分钟)

缓存更新策略:
- 主动失效: 创建/修改分销商或任务时清除相关缓存
- 定时更新: Cron任务每分钟重新计算看板数据写入Redis
- 被动更新: 缓存miss时回源数据库并写回缓存
```

**数据权限隔离策略** (应用层实现):

```python
# 示例: Python/FastAPI实现

def get_distributors(user_id, role, filters):
    query = db.query(Distributor)

    # 权限过滤: 非领导用户只能查看自己的分销商
    if role != 'LEADER':
        query = query.filter(Distributor.owner_user_id == user_id)

    # 应用业务过滤
    if 'region' in filters:
        query = query.filter(Distributor.region == filters['region'])

    if 'status' in filters:
        query = query.filter(Distributor.status == filters['status'])

    return query.all()
```

### 2.3 API设计

**基础API规范**:

```
协议: RESTful HTTP/HTTPS
认证: JWT Bearer Token
响应格式: JSON
错误处理: 标准HTTP状态码 + 错误详情JSON
```

**核心API端点列表**:

| 功能 | 方法 | 端点 | 权限 | 描述 |
|------|------|------|------|------|
| **分销商管理** |
| 创建 | POST | /api/distributors | SALES, LEADER | 创建分销商(支持分步提交) |
| 列表 | GET | /api/distributors | SALES, LEADER | 查询分销商列表(含权限过滤) |
| 详情 | GET | /api/distributors/:id | SALES, LEADER | 获取分销商详情 |
| 更新 | PUT | /api/distributors/:id | SALES, LEADER | 更新分销商(自己的) |
| 删除 | DELETE | /api/distributors/:id | LEADER | 删除分销商(软删除) |
| 统计 | GET | /api/distributors/stats/summary | SALES, LEADER | 获取个人/全局统计 |
| **任务管理** |
| 创建 | POST | /api/tasks | LEADER | 创建并分配任务 |
| 列表 | GET | /api/tasks | SALES, LEADER | 查询任务(按日期范围) |
| 详情 | GET | /api/tasks/:id | SALES, LEADER | 获取任务详情 |
| 更新 | PUT | /api/tasks/:id | SALES, LEADER | 更新任务状态/进度 |
| 删除 | DELETE | /api/tasks/:id | LEADER | 删除任务 |
| **看板数据** |
| 统计 | GET | /api/dashboard/stats | LEADER | 获取看板统计数据 |
| 图表 | GET | /api/dashboard/charts | LEADER | 获取趋势/对比图表 |
| 预警 | GET | /api/dashboard/alerts | LEADER | 获取预警信息 |
| **认证** |
| 登录 | POST | /api/auth/login | PUBLIC | 用户登录 |
| 登出 | POST | /api/auth/logout | AUTHENTICATED | 用户登出 |
| 刷新 | POST | /api/auth/refresh | AUTHENTICATED | 刷新Token |
| **用户** |
| 个人信息 | GET | /api/users/profile | AUTHENTICATED | 获取当前用户信息 |
| 列表 | GET | /api/users | ADMIN | 获取用户列表 |
| 创建 | POST | /api/users | ADMIN | 创建用户 |
| 更新 | PUT | /api/users/:id | ADMIN | 更新用户 |
| **审计** |
| 事件日志 | GET | /api/audit/events | ADMIN | 查询操作审计日志 |

**API请求/响应示例**:

```bash
# 创建分销商 - 第一步
POST /api/distributors/step1
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "name": "浙江省代理商A",
  "address": "杭州市西湖区",
  "cooperation_level": "A"
}

Response 201:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "浙江省代理商A",
  "address": "杭州市西湖区",
  "cooperation_level": "A",
  "status": "INCOMPLETE", -- 标记为不完整状态
  "step": 1,
  "created_at": "2025-11-21T10:30:00Z"
}

# 创建分销商 - 第二步(补充联系和合作信息)
PUT /api/distributors/:id/step2
Content-Type: application/json

{
  "contact_person": "张三",
  "phone": "13800138000",
  "credit_limit": 500000,
  "tags": ["重点客户", "长期合作"]
}

Response 200:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "step": 2,
  "status": "COMPLETE" -- 标记为完整状态
}

# 创建任务
POST /api/tasks
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "distributor_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "与浙江代理商A签订年度协议",
  "description": "需要签订2025年度购销协议，商定价格和返点",
  "assigned_to_user_id": "660e8400-e29b-41d4-a716-446655440001",
  "priority": "HIGH",
  "due_date": "2025-12-15T17:00:00Z"
}

Response 201:
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "distributor_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "与浙江代理商A签订年度协议",
  "assigned_to_user_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "PENDING",
  "priority": "HIGH",
  "due_date": "2025-12-15T17:00:00Z",
  "created_at": "2025-11-21T10:30:00Z"
}

# 获取领导看板统计
GET /api/dashboard/stats
Authorization: Bearer {JWT_TOKEN}

Response 200:
{
  "total_count": 1250,
  "new_count_today": 5,
  "new_count_week": 32,
  "new_count_month": 145,
  "cooperation_rate": 68.5,
  "region_distribution": {
    "浙江": 320,
    "江苏": 280,
    "山东": 250,
    "上海": 200,
    "其他": 200
  },
  "cached_at": "2025-11-21T10:31:00Z",
  "cache_ttl_seconds": 298
}
```

---

## 3. 技术栈与基础设施

### 3.1 完整技术栈

**前端技术栈**:
- **框架**: React 18 + TypeScript 或 Vue 3 + TypeScript (推荐React)
- **构建**: Vite 或 Create React App
- **状态管理**: Redux Toolkit + Redux Thunk
- **数据获取**: React Query (TanStack Query)
- **UI组件库**: Ant Design 或 Material-UI
- **图表**: ECharts 或 Recharts
- **样式**: CSS-in-JS (Emotion/Styled Components) 或 Tailwind CSS
- **表单处理**: React Hook Form + Zod验证
- **路由**: React Router v6
- **开发工具**: ESLint + Prettier + Husky

**后端技术栈** (推荐方案):
- **运行时**: Node.js v18+
- **框架**: Express + TypeScript 或 NestJS
- **ORM**: TypeORM 或 Sequelize
- **验证**: class-validator + class-transformer
- **日志**: Winston 或 Pino
- **测试**: Jest + Supertest
- **API文档**: Swagger/OpenAPI + Nestjs-Swagger

**后端技术栈** (替代方案):
- **运行时**: Python 3.9+
- **框架**: FastAPI
- **ORM**: SQLAlchemy + Alembic
- **验证**: Pydantic
- **日志**: Loguru
- **测试**: Pytest + Httpx
- **API文档**: Swagger/OpenAPI

**数据库**:
- **主数据库**: PostgreSQL 13+
- **缓存**: Redis 6+
- **数据驱动**: SQLAlchemy ORM / TypeORM

**基础设施和部署**:
- **容器化**: Docker
- **编排**: Docker Compose (单机)
- **反向代理**: Nginx
- **Web服务器**: Gunicorn (Python) / Node.js内置 (Express)

### 3.2 Docker Compose部署方案

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:15-alpine
    container_name: channel-postgres
    environment:
      POSTGRES_DB: channel_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      TZ: Asia/Shanghai
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - channel_network

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: channel-redis
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - channel_network

  # 后端服务(Node.js)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: channel-backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: channel_db
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      LOG_LEVEL: info
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/logs:/app/logs
    networks:
      - channel_network
    restart: always

  # 前端应用(Nginx)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: channel-frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    networks:
      - channel_network
    restart: always

  # Nginx 反向代理和API网关(可选,也可在frontend中合并)
  # nginx:
  #   image: nginx:alpine
  #   container_name: channel-nginx
  #   ports:
  #     - "80:80"
  #     - "443:443"
  #   volumes:
  #     - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  #     - ./nginx/ssl:/etc/nginx/ssl:ro
  #   depends_on:
  #     - backend
  #     - frontend
  #   networks:
  #     - channel_network
  #   restart: always

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  channel_network:
    driver: bridge
```

**Dockerfile示例**:

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3.3 监控和可观测性

**日志系统**:
- **后端日志**: Winston/Pino + 日志文件轮转
- **前端错误**: Sentry 集成(可选)
- **日志存储**: ELK Stack (可选,初期可使用日志文件)

**性能监控**:
- **APM工具**: New Relic 或 Datadog (可选)
- **数据库监控**: PostgreSQL pg_stat_* 视图
- **Redis监控**: Redis INFO命令和redis_exporter

**告警**:
- **数据库故障**: 连接失败、CPU/内存使用超过阈值
- **缓存故障**: Redis不可用告警
- **API故障**: 响应时间超过阈值、错误率过高
- **应用告警**: 未捕获异常、内存泄漏

---

## 4. 安全架构设计

### 4.1 认证和授权

**认证流程**:

```
用户登录 → 验证用户名密码 → 生成JWT Token → 返回Token给前端
           │
           └─ 密码使用bcrypt加密存储

Token结构:
{
  "iss": "channel-system",
  "sub": "user_id",
  "iat": 1234567890,
  "exp": 1234571490,  // 1小时过期
  "role": "SALES",
  "permissions": ["read_distributors", "write_distributors"]
}

Token验证:
- 前端请求时在Authorization: Bearer {token}中传递
- 后端验证Token签名和过期时间
- 提取user_id和role注入到请求上下文
```

**授权策略** (基于角色的访问控制 - RBAC):

```
角色定义:
- SALES: 销售员,可创建/编辑/查看自己的分销商,查看分配给自己的任务
- LEADER: 领导,可查看所有分销商,创建/分配任务,查看全局看板
- ADMIN: 管理员,完全权限,管理用户和系统配置

权限矩阵:
┌──────────────┬──────────┬────────┬───────┐
│ 资源/操作    │ SALES    │ LEADER │ ADMIN │
├──────────────┼──────────┼────────┼───────┤
│ Distributor  │          │        │       │
│  - Read      │ 自己的   │ 全部   │ 全部  │
│  - Create    │ 是       │ 是     │ 是    │
│  - Update    │ 自己的   │ 全部   │ 全部  │
│  - Delete    │ 否       │ 是     │ 是    │
├──────────────┼──────────┼────────┼───────┤
│ Task         │          │        │       │
│  - Read      │ 分配给自己│ 全部   │ 全部  │
│  - Create    │ 否       │ 是     │ 是    │
│  - Update    │ 自己的   │ 全部   │ 全部  │
│  - Delete    │ 否       │ 是     │ 是    │
├──────────────┼──────────┼────────┼───────┤
│ Dashboard    │ 否       │ 是     │ 是    │
├──────────────┼──────────┼────────┼───────┤
│ Users        │ 否       │ 否     │ 是    │
├──────────────┼──────────┼────────┼───────┤
│ Audit        │ 否       │ 否     │ 是    │
└──────────────┴──────────┴────────┴───────┘
```

### 4.2 数据保护

**传输安全**:
- HTTPS/TLS 1.3: 所有通信都需加密
- HSTS: 启用HTTP严格传输安全
- CORS: 严格的跨域资源共享策略

**存储安全**:
- 密码加密: bcrypt + salt
- 敏感数据加密: 数据库中敏感信息(如授信额度)可考虑加密存储
- 数据隐私: GDPR/CCPA合规,用户数据不跨域存储

**API安全**:
- 请求验证: 输入验证和类型检查
- SQL注入防护: 使用参数化查询/ORM
- CSRF防护: Token验证
- 限流: 基于IP/用户的请求限流

### 4.3 审计和合规

**操作审计**:
- 所有关键操作(创建/修改/删除)记录到events表
- 记录操作人、操作类型、操作时间、变更详情
- 不可篡改的审计日志(考虑使用区块链或不可修改存储)

**数据备份**:
- 每日增量备份
- 每周全量备份
- 备份存储在安全的异地(云存储或冷存储)
- 定期恢复测试(每月)

---

## 5. 实现策略与分阶段计划

### 5.1 开发阶段划分

**Phase 1: 基础设施和核心数据模型** (1.5-2周)
- [ ] 项目脚手架搭建(后端框架初始化、前端项目创建)
- [ ] Docker Compose部署配置
- [ ] PostgreSQL和Redis部署和初始化
- [ ] 数据库表结构设计和迁移脚本
- [ ] 基础API框架(认证、权限中间件)
- [ ] 前端基础布局和路由

**Phase 2: 分销商管理功能** (1.5-2周)
- [ ] 后端API: 分销商CRUD操作
- [ ] 后端API: 分销商列表和搜索、过滤、排序
- [ ] 后端API: 分销商统计接口
- [ ] 权限过滤实现: 销售仅看自己的分销商
- [ ] 事件流记录: 分销商操作事件
- [ ] 前端: 分销商列表页面
- [ ] 前端: 分销商详情页面
- [ ] 前端: 分销商分步录入表单(3步)

**Phase 3: 任务管理功能** (1.5-2周)
- [ ] 后端API: 任务CRUD操作
- [ ] 后端API: 任务查询(按日期范围、状态、优先级)
- [ ] 后端API: 任务分配和进度更新
- [ ] 事件流记录: 任务操作事件
- [ ] 前端: 任务工作台(时间轴视图)
- [ ] 前端: 任务卡片和详情页
- [ ] 前端: 任务创建和分配表单

**Phase 4: 领导看板功能** (1-1.5周)
- [ ] 后端: 定时聚合任务(Cron Job)
- [ ] 后端: 看板统计接口(从Redis读取)
- [ ] 后端API: 图表数据接口
- [ ] 后端API: 预警接口
- [ ] Redis缓存配置和更新策略
- [ ] 前端: 领导看板(统计卡片、数据表格、图表)
- [ ] 前端: 筛选和下钻交互

**Phase 5: 测试、优化和上线** (1-1.5周)
- [ ] 单元测试(至少70%覆盖率)
- [ ] 集成测试(权限、数据隔离)
- [ ] 性能测试(并发、缓存效率)
- [ ] 安全审计(SQL注入、权限漏洞、XSS)
- [ ] UI测试(跨浏览器、响应式)
- [ ] 文档编写(API文档、部署手册、用户手册)
- [ ] 用户培训和上线支持

### 5.2 风险管理和缓解策略

| 风险 | 概率 | 影响 | 缓解策略 | 负责人 |
|------|------|------|----------|-------|
| **技术风险** |
| 前端和后端API集成延迟 | M | H | 定义清晰的API契约,使用Mock Server并行开发 | Tech Lead |
| Redis缓存失效导致看板无法访问 | L | H | 实现缓存容错(miss时回源查询) | 后端 |
| 权限过滤漏洞导致数据越权 | L | H | 严格的代码审查,集成测试覆盖权限场景 | QA/Dev |
| 数据库性能下降 | M | M | 定期分析慢查询,添加必要索引 | DBA |
| **业务风险** |
| 需求变更导致开发周期延长 | M | M | 明确MVP范围,变更管理流程 | PM |
| 用户培训不充分导致低采用率 | M | M | 提前准备培训材料和用户手册 | PM/Support |
| **运维风险** |
| 单机故障导致系统不可用 | M | M | 定期备份(每日增量+每周全量),恢复演练 | Ops |
| 数据库连接耗尽 | L | M | 配置连接池,监控连接数 | DBA |

---

## 6. 系统集成与扩展设计

### 6.1 与其他系统集成

**用户认证集成** (SSO/LDAP):
- 支持企业单点登录(如钉钉、企业微信、AD)
- 实现OAuth 2.0端点以支持第三方应用集成

**数据同步和导出**:
- 支持Excel导出(分销商列表、任务列表、看板数据)
- 支持外部数据源导入(如ERP系统中的客户数据)

**通知和提醒集成**:
- 邮件通知: 任务分配、逾期提醒
- 短信通知: 重要任务的紧急提醒
- 钉钉/企业微信: 集成工作流通知

### 6.2 未来扩展方向

**Phase 2 (后续迭代)**:
1. **移动App**: React Native/Flutter开发移动端
2. **高级分析**: 机器学习预测成交率、推荐合作机会
3. **工作流审批**: 支持复杂的任务审批流程
4. **数据集成**: 接入销售系统、财务系统实现数据闭环
5. **多语言**: 国际化支持

**架构升级** (如需扩展):
1. **微服务化**: 按模块拆分成微服务(Distributor Service、Task Service等)
2. **事件驱动**: 引入Kafka/RabbitMQ实现异步事件处理
3. **分布式部署**: 多区域部署,提升可用性和性能
4. **GraphQL**: 考虑提供GraphQL接口供前端查询

---

## 7. 性能和可扩展性设计

### 7.1 性能优化策略

**数据库优化**:
- 索引优化: 在owner_user_id, region, status, created_at等常用查询列建立索引
- 查询优化: 避免N+1查询,使用JOIN替代关联查询
- 分区策略: 大表(events)按时间分区以提升查询性能
- 聚合优化: 使用物化视图存储常用的聚合结果

**缓存策略**:
- 多层缓存: Redis缓存 → 应用内存缓存 → CDN(用于静态资源)
- 缓存预热: 系统启动时预加载热点数据
- 缓存更新: 积极更新策略(事件驱动)vs被动更新策略(LRU)
- Cache-Aside Pattern: 应用检查缓存miss时回源数据库

**查询优化**:
- 字段选择: 避免SELECT *,只查询需要的字段
- 分页: 使用游标分页而非offset分页以提升大结果集性能
- 排序限制: LIMIT优先级查询,避免全表排序

**前端优化**:
- 代码分割: 按路由和功能模块分割JavaScript包
- 图片优化: 使用WebP格式、懒加载、CDN加速
- 虚拟滚动: 长列表使用虚拟滚动优化渲染性能
- 状态缓存: 避免重复查询同一个数据

### 7.2 可扩展性设计

**水平扩展** (初期不需要):
- 后端无状态设计: 支持多后端实例负载均衡
- 会话存储: 使用Redis存储会话而非本地内存
- 数据库主从: PostgreSQL主从复制支持读写分离

**垂直扩展**:
- 服务器升级: 增加CPU/内存
- 数据库优化: 更好的硬件或数据库版本升级
- 缓存扩容: 增加Redis内存或集群化

**功能隔离**:
- 将定时任务独立为单独的Worker服务,避免影响主服务
- 异步处理: 长运行操作(报表生成)使用异步队列

---

## 8. 部署和运维

### 8.1 部署流程

**开发环境**:
```bash
# 克隆项目
git clone https://github.com/company/channel-management.git
cd channel-management

# 启动Docker Compose
cp .env.example .env
docker-compose up -d

# 初始化数据库
docker-compose exec backend npm run migrate

# 种子数据(可选)
docker-compose exec backend npm run seed

# 访问应用
# 前端: http://localhost:80
# 后端API: http://localhost:3000
# 数据库: localhost:5432
# 缓存: localhost:6379
```

**生产环境**:
1. 使用Docker镜像仓库(Docker Hub / 私有仓库)存储镜像
2. 使用容器编排平台(Kubernetes或Docker Swarm)部署
3. 配置CI/CD流程(GitHub Actions / GitLab CI)自动化测试和部署
4. 配置反向代理(Nginx)和SSL证书
5. 设置监控告警(Prometheus + Grafana)
6. 配置日志收集(ELK或其他日志系统)

### 8.2 备份和恢复

**数据库备份**:
```bash
# 每日增量备份
0 2 * * * pg_dump channel_db | gzip > /backup/db_$(date +\%Y\%m\%d).sql.gz

# 每周全量备份到冷存储
0 3 * * 0 aws s3 cp /backup/db_$(date +\%Y\%m\%d).sql.gz s3://company-backup/
```

**恢复流程**:
```bash
# 恢复数据库
gunzip < /backup/db_20251121.sql.gz | psql channel_db

# 恢复Redis数据
redis-cli < /backup/redis_20251121.rdb
```

**备份验证**:
- 每月测试恢复流程,确保备份有效

### 8.3 监控和告警

**关键指标**:
- **应用性能**: 平均响应时间、P95响应时间、错误率
- **系统资源**: CPU使用率、内存使用率、磁盘IO
- **数据库**: 连接数、慢查询、复制延迟
- **缓存**: 命中率、驱逐率、内存使用率

**告警阈值**:
- 错误率 > 1% → 立即告警
- 响应时间 P95 > 1000ms → 警告
- CPU使用率 > 80% → 警告
- 内存使用率 > 85% → 告警
- Redis缓存命中率 < 50% → 警告

---

## 9. 技术决策和权衡分析

### 9.1 关键设计决策

| 决策 | 备选方案 | 选择理由 | 取舍 |
|------|----------|---------|------|
| **整体架构** | 微服务 vs 单体 | 单体 | 开发快速、部署简单,但未来扩展需重构 |
| **数据同步** | 事件驱动(Kafka) vs 定时聚合 | 定时聚合 | 实现简单、成本低,满足1-5分钟延迟需求 |
| **缓存策略** | Redis vs Memcached | Redis | 支持更复杂的数据结构、持久化、高可用 |
| **权限控制** | 数据库层 vs 应用层 | 应用层 | 灵活性高、便于调试,避免数据库成为瓶颈 |
| **部署平台** | Kubernetes vs Docker Compose | Docker Compose | 初期复杂度低、成本低,可升级到K8s |
| **前端框架** | React vs Vue | React (推荐) | 生态强大、组件丰富,公司技术积累 |
| **后端框架** | Express vs NestJS | Express (初期推荐) | 更轻量、学习曲线低,Express/NestJS都可 |

### 9.2 技术债和改进计划

**可接受的技术债**:
- 初期不实现分布式事务,假设单体内数据一致性
- 权限检查在应用层,未来可考虑API Gateway统一处理
- 日志系统初期使用文件,未来可迁移到ELK

**一年内改进计划**:
- [ ] 建立API网关层(使用Kong或AWS API Gateway)
- [ ] 引入消息队列(如果需要异步处理增加)
- [ ] 实现分布式缓存(Redis Cluster)
- [ ] 迁移到Kubernetes部署
- [ ] 建立完整的可观测性体系(ELK + Prometheus + Grafana)

---

## 10. 成功指标和交付物

### 10.1 技术成功指标

| 指标 | 目标 | 测量方法 |
|------|------|----------|
| **性能** | | |
| API平均响应时间 | < 200ms | 监控工具 |
| 看板查询响应时间 | < 500ms | 监控工具 |
| 页面加载时间 | < 2s | Lighthouse / 用户体验监控 |
| **可用性** | | |
| 系统可用性 | > 99% | 监控告警 |
| 备份恢复时间(RTO) | < 2小时 | 恢复演练 |
| **代码质量** | | |
| 单元测试覆盖率 | > 70% | Jest覆盖率报告 |
| 集成测试覆盖率 | > 50% | 测试框架报告 |
| 代码审查通过率 | > 95% | GitHub Pull Request |

### 10.2 业务成功指标

| 指标 | 目标 | 基线 | 测量方法 |
|------|------|------|----------|
| **采用率** | | |
| 销售日活跃度 | > 70% | 0% | 日志分析 |
| 看板月使用频率 | > 10次 | 0% | 使用分析 |
| **数据质量** | | |
| 分销商信息完整性 | > 80% | 0% | 数据审计 |
| 任务按时完成率 | > 85% | TBD | 数据分析 |
| **业务价值** | | |
| 渠道成交周期缩短 | -20% | 基线 | CRM数据对比 |
| 销售效率提升 | +30% | 基线 | 人均渠道数对比 |

### 10.3 交付物清单

**代码交付**:
- [ ] 完整的前端代码仓库(React/Vue)
- [ ] 完整的后端代码仓库(Node.js/Python)
- [ ] Docker镜像和docker-compose配置
- [ ] 数据库schema和迁移脚本
- [ ] API文档(Swagger/OpenAPI格式)

**文档交付**:
- [ ] 系统架构设计文档(本文档)
- [ ] API接口规范文档
- [ ] 数据库表结构设计文档
- [ ] 部署运维手册
- [ ] 用户操作手册
- [ ] 开发环境搭建指南

**测试交付**:
- [ ] 单元测试套件(70%+覆盖率)
- [ ] 集成测试套件
- [ ] 性能基准测试报告
- [ ] 安全审计报告

**培训和支持**:
- [ ] 用户培训材料(PPT + 视频)
- [ ] FAQ文档
- [ ] 问题排查指南
- [ ] 一周的上线支持

---

## 结论

本系统架构设计为一个10-30人的小型销售团队提供了**简洁、高效、可靠的渠道管理解决方案**。

**核心设计优势**:
1. **快速交付**: 单体架构和标准技术栈支持6-8周内完整交付
2. **易于维护**: 清晰的分层结构和权限隔离便于后期维护和迭代
3. **数据驱动**: Redis缓存和定时聚合提供准实时的数据洞察
4. **可扩展性**: 为未来的微服务化和功能扩展预留了接口

**未来演进**:
- **短期(3-6个月)**: 优化性能、积累用户反馈、规划迭代功能
- **中期(6-12个月)**: 实现高级功能(移动端、AI推荐)、考虑微服务化
- **长期(12-24个月)**: 构建大数据分析能力、实现跨系统数据整合

此架构设计为公司在渠道管理领域建立了坚实的技术基础,为业务的长期发展提供了支持。

---

## 11. 综合改进（Synthesis Enhancements）

本部分整合了综合需求分析阶段的五大增强点(EP-001~EP-006),进一步完善了系统的API契约、权限模型、任务状态管理、数据迁移和看板数据处理能力。

### 11.1 API契约与集成规范完善 (EP-001)

**API契约标准化**:

1. **完整的请求/响应JSON Schema**:
   ```json
   // Distributor创建请求Schema
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "type": "object",
     "properties": {
       "name": { "type": "string", "minLength": 1, "maxLength": 255 },
       "contact_person": { "type": "string", "minLength": 1, "maxLength": 100 },
       "phone": {
         "type": "string",
         "pattern": "^1[3-9]\\d{9}$",  // 中国手机号格式
         "description": "必须是有效的中国手机号码"
       },
       "address": { "type": "string", "maxLength": 500 },
       "region": { "type": "string", "enum": ["浙江", "江苏", "山东", "上海", "其他"] },
       "cooperation_level": { "type": "string", "enum": ["A", "B", "C"] },
       "credit_limit": { "type": "number", "minimum": 0, "maximum": 99999999.99 }
     },
     "required": ["name"]
   }
   ```

2. **HTTP状态码和错误代码映射**:
   ```
   2xx Success:
   - 200 OK: 请求成功,返回数据
   - 201 Created: 资源创建成功
   - 204 No Content: 请求成功但无返回数据(如DELETE)

   4xx Client Errors:
   - 400 Bad Request: 请求格式错误,可能字段验证失败
     error_code: "INVALID_REQUEST_FORMAT"
   - 401 Unauthorized: 未提供有效的认证凭证
     error_code: "AUTH_REQUIRED"
   - 403 Forbidden: 用户无权限访问此资源
     error_code: "PERMISSION_DENIED"
   - 404 Not Found: 资源不存在
     error_code: "RESOURCE_NOT_FOUND"
   - 409 Conflict: 资源冲突(如重复创建)
     error_code: "DUPLICATE_RESOURCE"
   - 422 Unprocessable Entity: 业务验证失败
     error_code: "VALIDATION_FAILED"

   5xx Server Errors:
   - 500 Internal Server Error: 服务器内部错误
     error_code: "INTERNAL_ERROR"
   - 503 Service Unavailable: 服务暂时不可用
     error_code: "SERVICE_UNAVAILABLE"

   标准错误响应格式:
   {
     "error": {
       "code": "VALIDATION_FAILED",
       "message": "Phone number format is invalid",
       "details": {
         "field": "phone",
         "value": "123456789",
         "constraint": "pattern"
       },
       "timestamp": "2025-11-21T10:30:00Z",
       "request_id": "req-12345-67890"
     }
   }
   ```

3. **字段验证规则规范**:
   ```
   用户名 (username):
   - 长度: 3-20字符
   - 字符集: 字母/数字/下划线
   - 唯一性: 数据库UNIQUE约束

   电话号码 (phone):
   - 格式: ^1[3-9]\d{9}$ (中国手机号)
   - 可选验证: 第三方API验证号码有效性

   邮箱 (email):
   - 格式: RFC 5322标准
   - 可选验证: 发送验证邮件

   地址 (address):
   - 长度: 1-500字符
   - 推荐格式: "城市-区县-详细地址"
   - 地理编码: 存储经纬度(可选)

   标签 (tags):
   - 数组类型,每个标签1-30字符
   - 建议标签集合(可扩展): ["重点客户", "长期合作", "新客户", "流失客户"]
   ```

4. **版本控制策略**:
   ```
   Accept-Version HTTP头规范:
   - 请求: Accept-Version: 1.0 | 1.1 | 2.0
   - 响应: X-API-Version: 1.0

   向后兼容策略:
   - v1.x: 基础功能
   - v2.x: 新增高级特性,兼容v1向后不兼容
   - 弃用期: 新版本发布后,旧版本支持6个月

   版本变更日志 (API Changelog):
   - v1.0 (2025-11): 初始发布
   - v1.1 (2026-02): 添加批量操作接口
   - v2.0 (2026-06): 重构权限模型,引入细粒度权限
   ```

5. **频率限制(Rate Limit)规范**:
   ```
   Rate Limit响应头:
   - X-RateLimit-Limit: 300 (窗口内最大请求数)
   - X-RateLimit-Remaining: 287 (剩余请求数)
   - X-RateLimit-Reset: 1637485500 (窗口重置时间戳)

   速率限制规则:
   - 全局限制: 每IP每小时300请求
   - 用户限制: 每认证用户每小时1000请求
   - 端点限制: 某些高成本端点额外限制
     * POST /distributors/import (导入): 每小时10次
     * GET /dashboard/charts (图表): 每分钟5次

   触发限制响应(429 Too Many Requests):
   {
     "error": {
       "code": "RATE_LIMIT_EXCEEDED",
       "message": "Too many requests",
       "retry_after": 3600
     }
   }
   ```

6. **OpenAPI/Swagger文档生成**:
   ```yaml
   # swagger.yaml
   openapi: 3.0.3
   info:
     title: Channel Management System API
     version: 1.0.0
     description: 分销商渠道管理系统API文档

   servers:
     - url: https://api.channel.example.com/v1
       description: 生产环境
     - url: http://localhost:3000/v1
       description: 开发环境

   paths:
     /api/distributors:
       post:
         summary: 创建分销商
         operationId: createDistributor
         tags: [Distributors]
         security:
           - BearerAuth: [read, write]
         requestBody:
           required: true
           content:
             application/json:
               schema:
                 $ref: '#/components/schemas/DistributorCreateRequest'
         responses:
           '201':
             description: 分销商创建成功
             content:
               application/json:
                 schema:
                   $ref: '#/components/schemas/DistributorResponse'
           '400':
             $ref: '#/components/responses/BadRequest'
           '401':
             $ref: '#/components/responses/Unauthorized'
           '403':
             $ref: '#/components/responses/Forbidden'

   components:
     securitySchemes:
       BearerAuth:
         type: http
         scheme: bearer
         bearerFormat: JWT
     schemas:
       DistributorCreateRequest:
         type: object
         required: [name]
         properties:
           name: { type: string }
           phone: { type: string }
           # ... 其他字段
   ```

### 11.2 权限模型详细规范 (EP-003)

**扩展权限模型**:

1. **权限转移场景** (销售离职或调岗):
   ```
   场景: 销售员A离职,需要转移其分销商所有权

   转移流程:
   1. 管理员/领导发起权限转移请求
   2. 指定源用户(A)、目标用户(B)、转移对象(全部分销商 | 选定分销商列表)
   3. 系统校验:
      - 源用户是否存在,是否有分销商所有权
      - 目标用户是否存在,是否有权接收分销商
      - 是否会产生权限冲突(如目标用户已拥有该分销商)
   4. 执行转移:
      UPDATE distributors SET owner_user_id = B WHERE owner_user_id = A
   5. 记录审计日志:
      event_type: 'permission_transferred'
      payload: {
        from_user_id: A,
        to_user_id: B,
        distributor_count: N,
        distributor_ids: [...]
      }
   6. 通知相关方(目标用户、待转移分销商关联的任务创建者)

   API: POST /api/admin/permissions/transfer
   ```

2. **临时权限机制**:
   ```
   场景: 领导临时需要查看某销售的分销商数据或代理操作某销售的任务

   临时权限结构:
   CREATE TABLE temporary_permissions (
     id UUID PRIMARY KEY,
     granted_to_user_id UUID NOT NULL,  // 获得临时权限的用户
     granted_by_user_id UUID NOT NULL,  // 授予者(通常是ADMIN或上级领导)

     resource_type VARCHAR(50),  // 'distributor', 'task', 'dashboard'
     resource_id UUID,  // 特定资源ID(可为NULL表示整个资源类型)
     permission_type VARCHAR(50),  // 'READ', 'WRITE', 'DELETE', 'EXPORT'

     expires_at TIMESTAMP NOT NULL,  // 过期时间
     reason TEXT,  // 授予理由

     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     revoked_at TIMESTAMP  // 提前撤销时间(如有)
   );

   实现:
   - 检查权限时同时查询temporary_permissions表
   - 检验expires_at > NOW()
   - 若临时权限存在且有效,则授予访问权限
   - 定时任务(每小时): 清理过期的临时权限记录

   API:
   - POST /api/admin/permissions/temporary - 授予临时权限
   - DELETE /api/admin/permissions/temporary/{id} - 撤销临时权限
   - GET /api/users/{id}/temporary-permissions - 查看用户所有临时权限
   ```

3. **审计日志权限细化**:
   ```
   权限控制:
   - ADMIN: 可查看所有审计日志
   - LEADER: 可查看其管理范围内的审计日志(如其直属团队的操作)
   - SALES: 仅可查看自己操作相关的日志

   审计日志字段权限:
   - 普通字段: event_type, entity_type, timestamp (所有人可见)
   - 敏感字段: 变更前后的字段值、金额字段
     * 仅ADMIN和相关权限用户可见
     * LEADER可见其下属的敏感操作
     * SALES可见自己操作相关的日志

   实现(应用层):
   GET /api/audit/events
   - 检查用户角色和权限
   - 根据权限动态过滤events表和返回字段
   ```

4. **数据导出权限**:
   ```
   导出权限规则:
   | 导出对象 | SALES | LEADER | ADMIN |
   |---------|-------|--------|-------|
   | 个人分销商列表 | 是 | 是 | 是 |
   | 全部分销商 | 否 | 是 | 是 |
   | 个人任务 | 是 | 是 | 是 |
   | 全部任务 | 否 | 是 | 是 |
   | 看板数据 | 否 | 是 | 是 |
   | 审计日志 | 否(自己的) | 有限 | 是 |

   导出数据脱敏:
   - SALES导出自己的分销商时: 隐藏credit_limit等敏感字段
   - LEADER导出时: 包含完整数据但包含审计追踪
   - 大量导出(>10000行): 触发异步导出,返回下载链接而非直接响应
   ```

5. **批量操作权限**:
   ```
   批量删除/修改需要额外权限检查:

   批量删除权限:
   - SALES: 仅能批量删除自己所有的分销商(且满足一定条件如无关联任务)
   - LEADER: 能删除任何分销商但需要确认操作
   - 操作限制: 单次批量最多100条,防止误操作

   批量修改权限:
   - 修改字段权限矩阵: 有些字段仅ADMIN可批量修改(如credit_limit)
   - 操作日志: 每条修改记录单独记入events表

   API示例:
   POST /api/distributors/batch-delete
   {
     "ids": ["id1", "id2", ...],
     "reason": "批量删除理由(必填,用于审计)",
     "confirmation": true
   }
   Response:
   {
     "success_count": 95,
     "failed_count": 5,
     "errors": [
       { "id": "id1", "reason": "关联任务未完成" }
     ]
   }
   ```

6. **权限冲突解决规则**:
   ```
   多个权限来源时的优先级(从高到低):
   1. 直接权限 (direct permission)
     - 用户的角色权限中明确定义的
   2. 临时权限 (temporary permission)
     - 显式授予的临时权限,但不能超越基础角色权限
   3. 继承权限 (inherited permission)
     - 从管理员组织结构继承的权限(如LEADER继承其上级权限)
   4. 默认权限 (default permission)
     - 角色的基础权限

   冲突示例:
   - 场景: 用户同时拥有SALES角色和LEADER临时权限
   - 解决: 权限取并集,但受限于临时权限的resource_id和expires_at

   权限拒绝场景(Always Deny):
   - 若直接权限表明拒绝,即使临时权限允许也拒绝
   - 黑名单永远优先于白名单

   代码示例:
   function checkPermission(userId, resource, action) {
     // 1. 检查黑名单(拒绝规则)
     if (blocklist.has(userId, resource, action)) {
       return false;
     }

     // 2. 检查临时权限
     const tempPerm = getTempPermission(userId, resource, action);
     if (tempPerm && !isExpired(tempPerm)) {
       return true;
     }

     // 3. 检查角色权限
     const user = getUser(userId);
     return hasRolePermission(user.role, resource, action);
   }
   ```

7. **权限检查无漏洞设计**:
   ```
   常见权限漏洞及防护:

   漏洞1: 水平越权 (访问他人资源)
   防护:
   - 每个API端点都必须检查数据所有权
   - GET /api/distributors/:id 时检查: user_id == distributor.owner_user_id

   漏洞2: 垂直越权 (权限提升)
   防护:
   - 禁止在客户端修改role字段
   - 角色修改仅通过/api/admin接口,需ADMIN权限

   漏洞3: 权限缓存过期
   防护:
   - 权限检查不使用过期缓存
   - 用户权限变更后立即清除相关缓存

   审计机制:
   - 所有权限检查失败都记录日志
   - 频繁权限检查失败(>10次/分钟) 触发告警
   ```

### 11.3 任务状态和流转规则规范 (EP-004)

**完善任务状态机制**:

1. **状态转移图**:
   ```
   状态定义:
   - PENDING: 任务已创建,等待执行
   - IN_PROGRESS: 任务进行中,销售已开始处理
   - COMPLETED: 任务已完成
   - OVERDUE: 任务已逾期(自动标记)
   - CANCELLED: 任务已取消

   转移规则:
   PENDING
     ├──> IN_PROGRESS (销售点击"开始")
     ├──> CANCELLED (领导取消)
     └──> OVERDUE (自动转移,当due_date < NOW)

   IN_PROGRESS
     ├──> COMPLETED (销售点击"完成")
     ├──> CANCELLED (领导取消)
     ├──> OVERDUE (自动转移,当due_date < NOW且未完成)
     └──> PENDING (销售重新标记为待处理)

   OVERDUE
     ├──> COMPLETED (完成逾期任务)
     ├──> CANCELLED (取消逾期任务)
     └──> IN_PROGRESS (重新激活)

   COMPLETED
     └─X (终态,不可转移,除非明确撤销)

   CANCELLED
     └─X (终态,不可恢复)

   禁止的转移:
   - COMPLETED → * (已完成任务禁止转移)
   - CANCELLED → * (已取消任务禁止恢复)
   - PENDING → COMPLETED (不允许跳过IN_PROGRESS直接完成)
   ```

2. **逾期处理规则**:
   ```
   逾期判定:
   - 任务due_date < CURRENT_TIMESTAMP 且 status != COMPLETED
   - 判定点: Cron任务每分钟检查一次

   自动标记流程:
   UPDATE tasks
   SET status = 'OVERDUE'
   WHERE due_date < NOW() AND status IN ('PENDING', 'IN_PROGRESS')

   逾期变更:
   - 自动变更: 不需人工干预,系统自动转移状态
   - 记录事件:
     event_type: 'task_auto_overdue'
     payload: { previous_status, new_status, due_date, overdue_duration }
   - 不改变进度百分比: 逾期不影响progress_percentage
   ```

3. **超期任务处理流程**:
   ```
   超期定义: overdue_duration > 1天

   自动通知:
   - 向分配用户发送通知: "任务已逾期{duration}天,请及时处理"
   - 通知渠道: 邮件 + 应用内通知 + 可选短信
   - 通知频率:
     * 逾期当天: 实时通知
     * 之后: 每天一次(下午3点)
   - 停止通知: 任务完成或取消后停止

   优先级降级(可选):
   - 逾期3天以上: 自动降级为MEDIUM优先级
   - 逾期7天以上: 降级为LOW优先级
   - 不影响用户设置的优先级,仅用于排序

   领导可见性:
   - 看板显示逾期任务汇总
   - 预警提醒: "您有10个逾期任务需处理"
   - 详情页显示逾期时长: "逾期3天2小时"
   ```

4. **任务取消规则**:
   ```
   取消权限:
   - 创建者(created_by_user_id): 总是可取消
   - 分配者(需明确权限): 通常是LEADER可取消
   - 分配用户(assigned_to_user_id): 可申请取消,需创建者批准

   取消要求:
   - 必填理由字段: reason (文本,1-500字符)
   - 建议理由集合: ["销售离职", "分销商无效", "任务重复", "分销商成交", "其他"]

   取消操作:
   PUT /api/tasks/:id/cancel
   {
     "reason": "分销商已成交,无需继续跟进"
   }

   取消响应:
   {
     "id": "task_id",
     "status": "CANCELLED",
     "cancelled_at": "2025-11-21T10:30:00Z",
     "cancelled_by_user_id": "user_id",
     "reason": "分销商已成交,无需继续跟进"
   }

   取消记录:
   - 记入events表: event_type: 'task_cancelled'
   - 不删除任务数据,使用逻辑删除(soft delete)
   ```

5. **批量操作**:
   ```
   批量完成任务:
   POST /api/tasks/batch-complete
   {
     "task_ids": ["task1", "task2", ...],
     "note": "本周回访客户,已全部沟通完成"  // 统一备注(可选)
   }
   Response:
   {
     "success_count": 8,
     "failed_count": 2,
     "errors": [
       { "task_id": "task3", "reason": "任务已逾期,不符合快速完成条件" }
     ]
   }

   批量标记逾期:
   POST /api/tasks/batch-overdue
   {
     "task_ids": ["task1", "task2", ...],
     "reason": "手动标记为逾期(紧急情况)"
   }

   限制条件:
   - 单次批量最多50条(防止误操作)
   - 批量操作需额外权限确认(LEADER以上)
   - 每个操作单独记录审计日志
   ```

6. **时间自动化**:
   ```
   Cron任务配置:

   [每分钟执行]
   - 检查和标记逾期任务
   - 任务: 查询status IN ('PENDING', 'IN_PROGRESS') 且 due_date < NOW()
   - 转移: 更新status为'OVERDUE',记录事件

   [每天下午3点执行]
   - 发送逾期任务提醒通知
   - 任务: 查询status = 'OVERDUE' 的任务
   - 分组: 按assigned_to_user_id分组
   - 通知: 发送邮件/短信汇总

   [每周一上午10点执行]
   - 生成周报: 任务完成统计
   - 统计: 本周完成/逾期/取消的任务数
   - 对象: LEADER用户

   [每月1日执行]
   - 生成月报和趋势分析

   任务配置示例(Node.js):
   const cron = require('node-cron');

   // 每分钟检查逾期任务
   cron.schedule('* * * * *', async () => {
     await taskService.markOverdueTasks();
   });

   // 每天下午3点发送通知
   cron.schedule('0 15 * * *', async () => {
     await taskService.sendOverdueNotifications();
   });
   ```

### 11.4 数据初始化和迁移策略 (EP-005)

**完整的数据迁移方案**:

1. **Excel导入模板定义**:
   ```
   模板文件: distributor_import_template.xlsx

   必填列(红色标记):
   | 列号 | 字段名 | 类型 | 要求 | 示例 |
   |------|--------|------|------|------|
   | A | 分销商名称(name) | 字符串 | 1-255字符 | 浙江代理商A |
   | B | 所有者(owner_username) | 字符串 | 必须存在于系统 | zhangsan |
   | C | 合作等级(cooperation_level) | 下拉 | A/B/C | A |

   可选列(灰色标记):
   | 列号 | 字段名 | 类型 | 要求 | 示例 |
   |------|--------|------|------|------|
   | D | 联系人(contact_person) | 字符串 | 1-100字符 | 王五 |
   | E | 电话(phone) | 字符串 | 13800138000 | 13800138000 |
   | F | 地址(address) | 字符串 | 1-500字符 | 杭州市西湖区 |
   | G | 省份(region) | 下拉 | 省份列表 | 浙江 |
   | H | 城市(city) | 字符串 | | 杭州 |
   | I | 授信额度(credit_limit) | 数字 | 0-99999999.99 | 500000 |
   | J | 标签(tags) | 字符串 | 多个标签用;分隔 | 重点客户;长期合作 |

   备注列(信息列):
   | 列号 | 字段名 | 说明 |
   |------|--------|------|
   | K | 操作备注(notes) | 可选,不存入数据库,用于导入后的处理说明 |
   | L | 导入结果 | 系统自动填充,表示该行导入状态 |

   验证规则:
   - 必填列不能为空
   - 电话号码格式: ^1[3-9]\d{9}$
   - cooperation_level: 必须在[A, B, C]中
   - credit_limit: 必须为正数,最多两位小数
   - owner_username: 必须在users表中存在且为SALES角色
   - 标签: 每个标签最长30字符
   ```

2. **字段映射规则**:
   ```
   映射配置:
   {
     "name": { "excel_column": "A", "required": true, "transformer": "trim" },
     "owner_username": { "excel_column": "B", "required": true, "transformer": "validateUser" },
     "contact_person": { "excel_column": "D", "required": false, "transformer": "trim" },
     "phone": { "excel_column": "E", "required": false, "transformer": "validatePhone" },
     "address": { "excel_column": "F", "required": false, "transformer": "trim" },
     "region": { "excel_column": "G", "required": false, "transformer": "validateRegion" },
     "cooperation_level": { "excel_column": "C", "required": true, "transformer": "validateLevel" },
     "credit_limit": { "excel_column": "I", "required": false, "transformer": "parseFloat" },
     "tags": { "excel_column": "J", "required": false, "transformer": "parseTags" }
   }

   转换器实现:
   - trim: 去除首尾空格
   - validatePhone: 验证电话号码格式,返回标准格式
   - validateUser: 查询用户是否存在,返回user_id
   - validateLevel: 验证合作等级有效性
   - parseFloat: 转换为数字,限制范围
   - parseTags: 分割字符串并转为数组
   ```

3. **数据验证规则**:
   ```
   多层验证:

   层1: 格式验证(Excel解析层)
   - 类型检查: 日期字段必须是日期格式
   - 长度检查: 字符串字段长度在范围内

   层2: 业务规则验证(导入前检查)
   - 必填字段检查
   - 枚举字段值检查
   - 格式验证(电话、邮箱)
   - 外键验证: 用户/分销商是否存在
   - 唯一性检查: 同一文件中是否有重复记录

   层3: 数据库验证(导入时)
   - 外键约束
   - UNIQUE约束(如username)
   - CHECK约束(如credit_limit >= 0)

   错误报告:
   {
     "row": 5,
     "errors": [
       { "field": "phone", "value": "123", "message": "Phone format invalid" },
       { "field": "owner_username", "value": "invalid_user", "message": "User not found" }
     ]
   }
   ```

4. **错误处理策略**:
   ```
   行级错误隔离:
   - 某行数据有错误不影响其他行导入
   - 导入结果: { success: 95, failed: 5, errors: [...] }

   部分成功导入:
   - 使用数据库事务: BEGIN ... (导入每行) ... COMMIT
   - 若某行失败: ROLLBACK该行,继续处理下一行
   - 保持原子性: 单行要么全部成功要么全部失败

   导入失败日志:
   CREATE TABLE import_errors (
     id UUID PRIMARY KEY,
     import_batch_id UUID,
     row_number INT,
     field_name VARCHAR(100),
     value TEXT,
     error_message TEXT,
     created_at TIMESTAMP
   );

   重试机制:
   - 允许用户修正错误行并重新上传部分文件
   - 记录import_batch_id追踪多次导入
   ```

5. **重复数据检测**:
   ```
   重复判定规则:
   - 主键: distributor名称 + owner_user_id (同一销售的分销商名称唯一)
   - 检查范围:
     1. 同一导入文件中: 检查重复
     2. 与已有数据对比: 检查冲突

   重复处理:
   选项1: 跳过重复 (默认)
   - 提示用户: "第5行与第8行重复,已跳过第5行"

   选项2: 更新已有记录 (需用户确认)
   - 若导入文件中的分销商名称已存在,是否更新其信息
   - 记录变更详情: 哪些字段被修改

   选项3: 创建版本 (高级)
   - 允许同名分销商存在,添加版本号区分
   - 保留历史记录用于追踪变化

   检查代码:
   const duplicates = excelRows.reduce((acc, row, idx) => {
     const key = `${row.name}_${row.owner_username}`;
     if (acc.has(key)) {
       acc.get(key).push(idx);
     } else {
       acc.set(key, [idx]);
     }
     return acc;
   }, new Map());
   ```

6. **数据归一化**:
   ```
   地址归一化:
   输入: "浙江杭州西湖" → 输出: "浙江-杭州-西湖"
   - 拆分: 使用国家行政区划库识别省市区
   - 补全: 自动填充缺失的区县信息
   - 验证: 确保省市区组合有效

   电话号码归一化:
   输入: "13800138000" | "138-0013-8000" | "+86 138 0013 8000"
   输出: "13800138000"
   - 去除非数字字符
   - 去除国家代码前缀(+86)
   - 验证长度为11位

   标签归一化:
   输入: ["重点客户", "IMPORTANT", "重点客户"]
   输出: ["重点客户"]  // 去重和转换为统一名称
   - 建立标签规范库: 标准标签与别名的映射关系
   - 自动转换: IMPORTANT → 重点客户
   - 去重: 相同标签只保留一个

   数据库标准化:
   CREATE TABLE tag_mappings (
     id UUID PRIMARY KEY,
     standard_tag VARCHAR(50),
     alias_tag VARCHAR(50),
     UNIQUE(alias_tag)
   );
   ```

7. **导入后审查流程**:
   ```
   审查流程:
   1. 导入完成后: 标记status为'PENDING_REVIEW'
   2. 管理员审查:
      - 查看导入摘要: 总数、成功数、失败数
      - 逐行审查: 重点审查新创建的分销商
      - 字段完整性检查: 是否有太多空值
   3. 批准或拒绝:
      - 批准: 标记为'APPROVED',正式激活分销商
      - 拒绝: 标记为'REJECTED',需修正并重新导入

   审查字段:
   - 数据完整性: 关键字段填写率
   - 数据质量: 是否有明显错误(如名字过长)
   - 合规性: 是否符合业务规则(如所有者都是有效销售)
   - 重复性: 是否有与现有数据的重复

   API: PUT /api/admin/imports/:id/approve | /reject
   ```

8. **回滚机制**:
   ```
   导入失败回滚:
   - 若导入过程中出现未恢复的错误,自动回滚所有变更
   - 数据库事务级别: 整个导入操作作为一个事务

   部分回滚(用户主动):
   DELETE FROM distributors
   WHERE created_at >= ? AND import_batch_id = ?
   - 允许用户在导入后短期内撤销整个导入
   - 记录撤销事件: event_type: 'import_rolled_back'

   导入批次跟踪:
   CREATE TABLE import_batches (
     id UUID PRIMARY KEY,
     file_name VARCHAR(255),
     uploaded_by_user_id UUID,
     total_rows INT,
     success_count INT,
     failed_count INT,
     status VARCHAR(50),  // PENDING_REVIEW, APPROVED, REJECTED, ROLLED_BACK
     created_at TIMESTAMP,
     approved_at TIMESTAMP,
     approved_by_user_id UUID
   );
   ```

### 11.5 看板数据缺失和异常处理 (EP-006)

**完善看板数据处理规范**:

1. **缓存失效时的回源策略**:
   ```
   三级缓存架构:
   1. Redis缓存 (主)
   2. 应用内存缓存 (备)
   3. PostgreSQL数据库 (源)

   缓存读取流程:
   GET /api/dashboard/stats
     ├─ 检查Redis: 是否存在dashboard:stats
     ├─ 如果存在且未过期: 返回Redis数据 ✓
     ├─ 如果过期或不存在:
     │  ├─ 降级到应用内存缓存
     │  ├─ 再无: 从PostgreSQL查询
     │  ├─ 计算结果
     │  └─ 写回Redis + 应用内存缓存
     └─ 返回数据

   故障处理:

   场景1: Redis连接异常
   - 自动捕获Redis异常
   - 降级: 直接从PostgreSQL查询 (响应时间增加)
   - 告警: 记录日志并发送告警
   - 自动恢复: 定期重试Redis连接

   场景2: PostgreSQL查询超时
   - 设置查询超时: 5秒
   - 若超时: 返回缓存的旧数据 + 提示"数据可能过期"
   - 若无缓存: 返回降级数据(如上次已知的值)

   代码示例:
   async function getDashboardStats() {
     try {
       // 尝试Redis
       const cached = await redis.get('dashboard:stats');
       if (cached && !isExpired(cached)) {
         return JSON.parse(cached);
       }
     } catch (err) {
       logger.warn('Redis error, falling back', err);
     }

     try {
       // 尝试数据库
       const stats = await calculateStats();
       await redis.set('dashboard:stats', JSON.stringify(stats), 'EX', 300);
       return stats;
     } catch (err) {
       logger.error('DB query timeout');
       return getLastKnownStats();  // 返回备份
     }
   }
   ```

2. **零值显示规则**:
   ```
   新系统无数据的显示策略:

   场景1: 分销商总数为0
   - 显示: "暂无分销商数据"
   - 而非: "0"
   - 原因: 提示用户需要导入数据或创建分销商

   场景2: 新增数为0
   - 显示: "本月暂无新增"
   - 样式: 灰色背景,较小字号
   - 对比: 若为正数,显示绿色上升箭头

   场景3: 成交率无法计算(总数=0)
   - 显示: "--" 或 "无数据"
   - 不显示: "0%"(易被误解)

   实现:
   const renderStat = (value, label) => {
     if (value === null || value === undefined) {
       return `暂无${label}`;
     }
     if (value === 0 && label === '分销商总数') {
       return '暂无分销商数据';
     }
     return formatNumber(value);
   };

   配置:
   {
     "dashboard_stats": {
       "zero_handling": "show_placeholder",  // or "show_zero"
       "placeholder": "暂无数据",
       "null_handling": "show_placeholder"    // or "show_dash"
     }
   }
   ```

3. **计算异常处理**:
   ```
   常见异常及回源:

   异常1: COUNT(*)执行失败
   - 原因: 数据库故障、表锁定
   - 回源: 从缓存返回上次成功的计数值
   - 备注: 在响应中标记"数据可能过期"
   - Fallback: 若无缓存,返回"暂无数据"

   异常2: 计算超时(查询>5秒)
   - 原因: 表过大或索引不足
   - 回源: 使用近似值(EXPLAIN行数) 而非精确值
   - 优化: 启动后台异步任务重新计算

   异常3: 除数为零(如成交率计算)
   - 场景: SELECT success_count / total_count
   - 防护: IF(total_count=0, NULL, success_count/total_count)
   - 显示: "--" 或 "无可用数据"

   错误恢复:
   async function calculateWithFallback(query) {
     const MAX_TIMEOUT = 5000;
     const timeout = new Promise((_, reject) =>
       setTimeout(() => reject(new Error('Query timeout')), MAX_TIMEOUT)
     );

     try {
       return await Promise.race([db.query(query), timeout]);
     } catch (err) {
       logger.warn(`Calculation failed: ${err.message}`);
       return getCachedValue(query);  // 返回缓存值
     }
   }
   ```

4. **NaN和Null值的展示**:
   ```
   值类型处理:

   null值:
   - 数据库NULL: 表示数据缺失
   - 显示: "--" 或 "暂无数据"
   - 案例: 某个地区无分销商 → "--"

   undefined值:
   - 前端数据未初始化
   - 显示: "加载中..." (if loading) 或 "--" (if completed)

   NaN值(不应出现):
   - 原因: 数学计算错误 (如 0/0)
   - 防护: 在计算前检查分母
   - 显示: "数据异常,请联系管理员"

   0值:
   - 有效数值,不等同于无数据
   - 显示: "0"
   - 案例: 本月新增=0 → "本月新增:0"(有效)

   实现(前端):
   const formatValue = (value) => {
     if (value === null || value === undefined) {
       return '--';
     }
     if (Number.isNaN(value)) {
       return '数据异常';
     }
     return String(value);
   };

   类型定义(TypeScript):
   type StatValue = number | null | '--' | '数据异常';

   interface DashboardStats {
     total_count: number;
     cooperation_rate: number | null;  // 可能为null
     region_distribution: Record<string, number | null>;
   }
   ```

5. **数据延迟说明**:
   ```
   缓存TTL说明:
   - 显示位置: 看板卡片右上角或数据表下方
   - 格式: "更新于 2025-11-21 10:35:00" 或 "1分钟前更新"
   - 更新频率: 每次从Redis返回数据时显示实时时间戳

   实现:
   {
     "total_count": 1250,
     "cached_at": "2025-11-21T10:35:00Z",
     "cache_ttl_seconds": 275,  // 缓存还剩多少秒过期
     "display_text": "更新于 10:35"
   }

   前端显示:
   <div className="stat-timestamp">
     更新于 {formatTime(response.cached_at)}
     {response.cache_ttl_seconds < 60 &&
       <span className="warning">即将刷新</span>}
   </div>

   差异显示:
   - 实时数据(缓存<10秒): 显示"实时"
   - 准实时(10-60秒): 显示具体时间
   - 过期数据(>300秒): 显示"数据过期,刷新中..."
   ```

6. **异常告警机制**:
   ```
   告警规则:

   规则1: 数据与预期偏差过大
   - 当前值 vs 上日期值: 变化 > 30% → 警告
   - 示例: 昨天新增10,今天新增30 (增加200%) → 告警
   - 检查: 是否有批量导入或异常操作

   规则2: 缓存长期无法更新
   - 若某个缓存key连续3次更新失败 → 告警
   - 发送: 通知系统管理员检查数据库连接

   规则3: 异常数据组合
   - 成交数 > 总数 → 告警(数据一致性错误)
   - 负数统计值 → 告警(数据异常)

   规则4: 查询性能异常
   - 某个查询耗时 > 5秒 → 警告
   - 连续3次超过 → 告警(可能需要优化)

   告警实现:
   async function checkDataAnomalies() {
     const current = await getStats();
     const previous = await getStatsFromDay(-1);

     const percentChange = (current.total - previous.total) / previous.total;
     if (Math.abs(percentChange) > 0.3) {
       await alertManager.send({
         level: 'warning',
         message: `Data anomaly: total count changed ${(percentChange * 100).toFixed(0)}%`,
         data: { current, previous }
       });
     }
   }
   ```

7. **趋势数据不足时的处理**:
   ```
   数据点要求:
   - 趋势图最少需要 N=3 个数据点才显示趋势线
   - 若数据点 < 3: 显示"数据不足"而非绘制趋势

   实现:
   const renderTrendChart = (data) => {
     const validPoints = data.filter(p => p.value !== null);

     if (validPoints.length < 3) {
       return (
         <div className="empty-state">
           数据不足以显示趋势(需要至少3个数据点)
         </div>
       );
     }

     return <LineChart data={validPoints} />;
   };

   渐进式显示:
   - 1个数据点: 显示单点
   - 2个数据点: 显示柱状图,不显示趋势线
   - 3+个数据点: 显示趋势线

   时间范围说明:
   - 若选择时间范围内数据不足: 提示"该时间范围内数据不足"
   - 建议: 建议用户扩大时间范围(如"上月" 改为 "近3个月")
   ```

8. **分母为0的防护**:
   ```
   常见的分母为0场景:

   场景1: 成交率 = 成交数 / 总数
   - 若总数=0: SELECT CASE WHEN COUNT(*) = 0 THEN NULL ELSE success/COUNT(*) END
   - 显示: 如为NULL,显示 "--"

   场景2: 人均分销商数 = 总数 / 销售人数
   - 若销售人数=0: SELECT CASE WHEN COUNT(DISTINCT user_id) = 0 THEN 0 ELSE COUNT(*) / COUNT(DISTINCT user_id) END
   - 显示: 若无销售,显示0而非错误

   场景3: 月环比 = (本月 - 上月) / 上月
   - 若上月=0: SELECT CASE WHEN previous = 0 THEN NULL ELSE (current - previous) / previous END
   - 显示: "--" 表示无法计算环比

   SQL防护示例:
   SELECT
     total_count,
     success_count,
     CASE
       WHEN total_count = 0 THEN NULL
       ELSE success_count * 100.0 / total_count
     END as cooperation_rate
   FROM distributors_stats

   前端检查:
   const calculateRate = (numerator, denominator) => {
     if (denominator === 0 || denominator === null) {
       return null;  // 由UI层处理null值显示为"--"
     }
     return (numerator / denominator) * 100;
   };
   ```

---

**文档信息**:
- **作者**: System Architect Agent
- **日期**: 2025-11-21
- **版本**: v1.1 (Synthesis Enhancements - EP-001, EP-003, EP-004, EP-005, EP-006)
- **状态**: 已完成 - 综合改进集成阶段
- **下一步**: 提交至开发团队,启动详细设计和实现阶段
