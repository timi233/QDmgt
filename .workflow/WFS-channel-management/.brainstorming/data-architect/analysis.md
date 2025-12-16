# 渠道管理系统 - 数据架构分析

**分析角色**: 数据架构师
**生成时间**: 2025-11-21
**分析范围**: 数据模型设计、存储策略、数据流转、一致性保证、性能优化

---

## 1. 数据架构总体设计

### 1.1 核心理念

数据架构设计围绕**三层分离**原则：

```
┌─────────────────────────────────────────────────────┐
│           应用层数据查询 (Application)               │
│  - 销售工作台查询: 带权限过滤(WHERE owner_user_id)   │
│  - 领导看板查询: 无权限过滤                          │
│  - 权限验证: 在ORM层统一注入                        │
└─────────────┬───────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────┐
│           缓存层 (Redis + Cron Job)                  │
│  - 定时聚合: 每分钟计算看板指标                      │
│  - 数据结构: Hash存储统计结果                        │
│  - TTL策略: 5分钟过期，自动回源数据库                │
└─────────────┬───────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────┐
│        数据库层 (PostgreSQL)                         │
│  - 业务表: distributors, tasks, users               │
│  - 事件表: events(审计日志)                          │
│  - ACID保证: 事务一致性                             │
└─────────────────────────────────────────────────────┘
```

**关键决策**:
- **业务数据**: 使用传统关系表存储当前状态，提高查询性能
- **事件流**: 独立存储操作日志，支持完整的审计追溯
- **看板数据**: 通过定时聚合+Redis缓存，提供准实时查询
- **权限隔离**: 应用层WHERE过滤，灵活可控，便于特殊场景处理

---

## 2. 核心数据模型设计

### 2.1 分销商模型 (Distributors)

**表结构设计**:

```sql
CREATE TABLE distributors (
  -- 基础标识
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基础信息
  name VARCHAR(255) NOT NULL UNIQUE,           -- 分销商名称
  address TEXT NOT NULL,                       -- 详细地址
  region VARCHAR(100) NOT NULL,                -- 地区(省份/城市)
  status VARCHAR(50) DEFAULT 'active',         -- 状态(active/inactive/archived)

  -- 联系信息
  contact_person VARCHAR(100),                 -- 联系人名称
  phone VARCHAR(20),                           -- 联系电话

  -- 合作信息
  cooperation_level VARCHAR(10),               -- 合作等级(A/B/C)
  credit_limit DECIMAL(12,2),                  -- 授信额度

  -- 扩展字段(JSONB支持灵活扩展)
  tags JSONB DEFAULT '[]'::jsonb,              -- 标签数组['vip','strategic','new']
  historical_performance JSONB DEFAULT '{}'::jsonb,  -- 历史业绩{year:amount}
  notes TEXT,                                  -- 备注信息

  -- 关键外键
  owner_user_id UUID NOT NULL,                 -- 负责销售ID(权限隔离关键字段)

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,                             -- 创建者
  updated_by UUID,                             -- 更新者

  -- 索引定义
  CONSTRAINT fk_owner FOREIGN KEY (owner_user_id) REFERENCES users(id),
  INDEX idx_owner_user (owner_user_id),        -- 关键索引:权限过滤查询
  INDEX idx_region (region),                   -- 地区索引:看板分布统计
  INDEX idx_cooperation_level (cooperation_level),  -- 合作等级索引
  INDEX idx_status (status),                   -- 状态索引
  INDEX idx_updated_at (updated_at)            -- 同步索引:增量更新
);
```

**字段设计说明**:

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| cooperation_level | VARCHAR(10) | A/B/C | 分销商分级管理，便于分析和精细化运营 |
| credit_limit | DECIMAL(12,2) | ≥0 | 授信额度，支持财务风控 |
| tags | JSONB | 数组 | 灵活标签系统，支持后续动态扩展(vip/strategic/slow-mover等) |
| historical_performance | JSONB | 对象 | 历史业绩JSON结构：`{2024:500000, 2025:750000}` |
| owner_user_id | UUID | NOT NULL | **权限隔离关键字段**，所有查询必须通过此字段过滤 |

**设计特点**:
- **JSONB字段**: 提供灵活的扩展能力，支持后续业务快速迭代，无需频繁修改表结构
- **owner_user_id索引**: 关键索引，优化权限过滤查询性能，避免全表扫描
- **区域索引**: 优化看板地区分布统计查询
- **updated_at索引**: 支持增量数据同步和缓存更新

---

### 2.2 任务模型 (Tasks)

**表结构设计**:

```sql
CREATE TABLE tasks (
  -- 基础标识
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 关联关系
  distributor_id UUID NOT NULL,               -- 所属分销商
  assigned_to_user_id UUID NOT NULL,          -- 分配给(销售ID)
  created_by_user_id UUID NOT NULL,           -- 创建者(通常是领导)

  -- 任务信息
  title VARCHAR(255) NOT NULL,                -- 任务标题/描述
  description TEXT,                           -- 详细描述

  -- 优先级和截止
  priority VARCHAR(20) DEFAULT 'medium',      -- 优先级(high/medium/low)
  due_date DATE,                              -- 截止日期

  -- 任务状态
  status VARCHAR(20) DEFAULT 'pending',       -- 状态(pending/in_progress/completed/overdue)

  -- 进度跟踪
  progress_notes TEXT,                        -- 进度备注
  completed_at TIMESTAMP,                     -- 完成时间

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 外键约束
  CONSTRAINT fk_distributor FOREIGN KEY (distributor_id) REFERENCES distributors(id),
  CONSTRAINT fk_assigned_to FOREIGN KEY (assigned_to_user_id) REFERENCES users(id),
  CONSTRAINT fk_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),

  -- 索引定义
  INDEX idx_assigned_to (assigned_to_user_id),          -- 销售工作台查询
  INDEX idx_distributor (distributor_id),                -- 分销商详情页
  INDEX idx_status (status),                             -- 状态统计
  INDEX idx_due_date (due_date),                         -- 截止日期查询
  INDEX idx_priority_due (priority, due_date),           -- 复合索引:优先级+截止日期
  INDEX idx_created_at (created_at)                      -- 创建时间排序
);
```

**字段设计说明**:

| 字段 | 类型 | 用途 | 查询场景 |
|------|------|------|---------|
| assigned_to_user_id | UUID | 分配给哪个销售 | 销售工作台：查询分配给该销售的任务 |
| distributor_id | UUID | 关联分销商 | 分销商详情页：查询该分销商相关任务 |
| priority, due_date | VARCHAR, DATE | 任务排序 | 工作台：按优先级和截止日期排序 |
| completed_at | TIMESTAMP | 完成状态标记 | 看板统计：计算任务完成率 |

**设计特点**:
- **双重索引**: assigned_to_user_id用于销售工作台查询，distributor_id用于分销商详情页
- **复合索引**: 优先级+截止日期的复合索引，优化工作台排序查询
- **完成时间标记**: 通过completed_at判断是否完成，便于统计完成率

---

### 2.3 用户模型 (Users)

**表结构设计**:

```sql
CREATE TABLE users (
  -- 基础标识
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用户信息
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255),

  -- 角色和权限
  role VARCHAR(50) NOT NULL,                  -- 'salesperson' 或 'leader'
  department VARCHAR(100),                    -- 部门

  -- 账户状态
  status VARCHAR(20) DEFAULT 'active',

  -- 系统字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 索引定义
  INDEX idx_role (role),                      -- 权限过滤
  INDEX idx_status (status)                   -- 账户状态查询
);
```

**角色定义**:

| 角色 | 权限 | 数据访问 |
|------|------|---------|
| salesperson | 创建/编辑/删除自己的分销商，更新分配给自己的任务 | WHERE owner_user_id = {current_user_id} |
| leader | 查看所有分销商，创建任务，查看看板 | 无WHERE限制 |

---

### 2.4 事件流表 (Events) - 审计日志

**表结构设计**:

```sql
CREATE TABLE events (
  -- 事件标识
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(100) UNIQUE,               -- 业务事件ID(可选,用于追溯)

  -- 事件类型
  event_type VARCHAR(50) NOT NULL,            -- distributor_created/updated/deleted
                                              -- task_created/assigned/completed
  entity_type VARCHAR(50) NOT NULL,           -- 'distributor' 或 'task'
  entity_id UUID NOT NULL,                    -- 关联实体ID

  -- 操作者信息
  user_id UUID,                               -- 执行操作的用户ID
  user_email VARCHAR(255),                    -- 用户邮箱(记录快照,防止用户删除)

  -- 事件数据
  payload JSONB NOT NULL,                     -- 完整的事件数据
  old_values JSONB,                           -- 修改前值(update操作)
  new_values JSONB,                           -- 修改后值(update操作)

  -- 请求信息
  ip_address INET,                            -- 操作来源IP
  user_agent TEXT,                            -- 用户代理

  -- 时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 索引定义
  INDEX idx_entity (entity_type, entity_id),  -- 查询特定实体的历史
  INDEX idx_event_type (event_type),          -- 查询特定事件类型
  INDEX idx_user (user_id),                   -- 查询用户操作历史
  INDEX idx_created_at (created_at),          -- 时间范围查询
  INDEX idx_distributor_created (
    event_type, entity_type, created_at
  ) WHERE event_type = 'distributor_created' -- 分区索引:新增分销商
);
```

**事件类型定义**:

| 事件类型 | 触发条件 | payload示例 |
|---------|---------|-----------|
| distributor_created | 新建分销商 | `{id, name, region, owner_user_id}` |
| distributor_updated | 编辑分销商信息 | `{id, fields_changed:[]}` |
| distributor_deleted | 删除分销商 | `{id, name, reason}` |
| task_created | 创建跟进任务 | `{id, distributor_id, assigned_to}` |
| task_assigned | 分配任务 | `{id, assigned_to_user_id}` |
| task_completed | 完成任务 | `{id, completed_at, notes}` |

**设计特点**:
- **JSONB payload**: 灵活存储事件数据，支持后续扩展新事件类型无需修改表结构
- **old_values + new_values**: 记录修改前后值，支持完整的审计追溯
- **分区索引**: 优化新增分销商的高频查询
- **用户快照**: 记录user_email防止用户删除后无法追溯

---

## 3. 数据流转设计

### 3.1 完整数据流线图

```
┌──────────────────────────────────────────────────────────────────┐
│                    用户操作 (前端应用)                             │
│  - 销售: 创建/编辑分销商、更新任务进度                             │
│  - 领导: 创建任务、查看看板                                       │
└────────────────────┬─────────────────────────────────────────────┘
                     │
         ┌───────────▼──────────────┐
         │ API层: 权限验证 + 业务逻辑 │
         │  中间件验证JWT Token     │
         │  解析user_id + role      │
         └───────────┬──────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼─────────────┐ │ ┌────────────▼─────────────┐
│ 写入业务表        │ │ │ 写入事件表(异步)          │
│ - distributors  │ │ │ - events                 │
│ - tasks         │ │ │ - 消息队列或直接写入      │
└────┬─────────────┘ │ └────────────┬─────────────┘
     │               │              │
     │               └──────┬───────┘
     │                      │
     │      ┌───────────────▼────────────────┐
     │      │ 后台Cron Job(每分钟执行)       │
     │      │ - 聚合SQL查询统计数据          │
     │      │ - 计算关键指标                 │
     │      │ - 写入Redis缓存(TTL: 5分钟)   │
     │      └───────────────┬────────────────┘
     │                      │
     │                      ▼
     │              ┌──────────────────┐
     │              │  Redis缓存       │
     │              │  - dashboard:stats│
     │              │  - 其他聚合数据   │
     │              └──────────┬───────┘
     │                         │
     │         ┌───────────────┼───────────────┐
     │         │               │               │
┌────▼──────────────────┐ ┌──▼──────────┐ ┌───▼──────────┐
│ 应用层查询              │ │ 看板查询    │ │ 权限过滤查询  │
│ WHERE owner_user_id=X  │ │ Redis读取   │ │ 销售工作台   │
│ (销售角色自动添加)      │ │ 毫秒级响应   │ │ 领导角色无过滤│
└────────────────────────┘ └─────────────┘ └──────────────┘
```

**关键环节说明**:

1. **写入阶段**: 业务操作同时写入关系表和事件表
2. **聚合阶段**: 后台Cron Job每分钟计算聚合数据
3. **缓存阶段**: 聚合结果存入Redis，TTL 5分钟
4. **查询阶段**: 应用层从数据库或缓存读取，不同角色应用不同权限过滤

---

### 3.2 分销商创建数据流

```
┌─────────────────────────────────┐
│ 销售提交分步表单(三步完成)       │
│ Step 1: 名称、地址、合作等级    │
│ Step 2: 联系人、电话、授信、标签 │
│ Step 3(可选): 业绩、备注         │
└──────────────┬──────────────────┘
               │
        ┌──────▼───────┐
        │ POST /api/distributors
        │ 请求体包含所有字段
        └──────┬────────┘
               │
     ┌─────────▼───────────┐
     │ 权限验证             │
     │ - JWT Token有效性    │
     │ - 用户身份确认       │
     │ - 自动注入当前user_id│
     └─────────┬───────────┘
               │
     ┌─────────▼──────────────────┐
     │ 业务逻辑处理                │
     │ - 名称唯一性检查           │
     │ - 字段有效性验证           │
     │ - 地址地理编码(可选)       │
     └─────────┬──────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼──────────┐ ┌──────▼──────────┐
│ INSERT INTO  │ │ 异步写入事件表   │
│ distributors │ │ event_type:     │
│ - id(UUID)   │ │   distributor_  │
│ - name       │ │   created       │
│ - owner_user_│ │ payload: {...}  │
│   id(当前用户)│ │                │
│ - ...其他字段 │ └────────────────┘
│ RETURNING id │
└───┬──────────┘
    │
┌───▼──────────────────────┐
│ 应用层业务逻辑            │
│ - 缓存失效(可选)          │
│ - 同步返回创建成功        │
│ - 前端导航至详情页       │
└───┬──────────────────────┘
    │
┌───▼──────────────────┐
│ 后续Cron Job处理     │
│ (下一分钟执行)        │
│ - 重新统计总数        │
│ - 更新看板缓存        │
└──────────────────────┘
```

**事务一致性保证**:
- 主表INSERT成功后立即返回客户端
- 事件表写入采用异步机制，确保不阻塞主业务
- 若事件表写入失败，通过日志监控，支持离线补偿

---

## 4. 缓存策略设计

### 4.1 Redis数据结构和存储

**看板统计缓存**:

```
Key: dashboard:stats
Type: Hash
结构:
{
  "total_distributors": 156,           -- 总分销商数
  "new_distributors_this_month": 12,   -- 本月新增
  "cooperation_rate": 0.72,            -- 成交率(已合作/总数)
  "region_distribution": {             -- 地区分布JSON
    "北京": 45,
    "上海": 38,
    "浙江": 32,
    ...
  },
  "cooperation_level_distribution": {  -- 合作等级分布
    "A": 80,
    "B": 50,
    "C": 26
  },
  "monthly_trend": {                   -- 月度新增趋势
    "2025-01": 8,
    "2025-02": 10,
    "2025-03": 12,
    ...
  }
}
TTL: 5 minutes (300 seconds)
```

**任务统计缓存** (可选):

```
Key: tasks:stats:{user_id}              -- 按销售分类统计
Type: Hash
{
  "pending_count": 5,
  "overdue_count": 1,
  "completed_count": 23,
  "this_week_count": 8
}
TTL: 10 minutes
```

**数据源定义**:

| 缓存字段 | 数据库SQL | 更新频率 |
|---------|----------|---------|
| total_distributors | `SELECT COUNT(*) FROM distributors WHERE status='active'` | 每分钟 |
| new_distributors_this_month | `SELECT COUNT(*) FROM distributors WHERE created_at >= date_trunc('month', NOW())` | 每分钟 |
| cooperation_rate | `SELECT COUNT(*) FILTER (WHERE status='active')/NULLIF(COUNT(*), 0) FROM distributors` | 每分钟 |
| region_distribution | `SELECT region, COUNT(*) FROM distributors GROUP BY region` | 每分钟 |
| monthly_trend | `SELECT DATE_TRUNC('month', created_at), COUNT(*) FROM distributors GROUP BY 1` | 每分钟 |

---

### 4.2 Cron Job聚合实现

**后台定时任务伪代码**:

```python
# 文件: services/cache_aggregation.py
# 执行周期: 每分钟(* * * * *)

import redis
import psycopg2
from datetime import datetime, timedelta
from decimal import Decimal

def aggregate_dashboard_stats():
    """聚合看板统计数据到Redis"""

    try:
        # 1. 从PostgreSQL查询统计数据
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # 查询总分销商数
        cur.execute("""
            SELECT COUNT(*) as total
            FROM distributors
            WHERE status = 'active'
        """)
        total_distributors = cur.fetchone()[0]

        # 查询本月新增
        cur.execute("""
            SELECT COUNT(*) as new_this_month
            FROM distributors
            WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
            AND status = 'active'
        """)
        new_distributors = cur.fetchone()[0]

        # 查询地区分布
        cur.execute("""
            SELECT region, COUNT(*) as count
            FROM distributors
            WHERE status = 'active'
            GROUP BY region
            ORDER BY count DESC
        """)
        region_distribution = dict(cur.fetchall())

        # 查询成交率(已有cooperation_level为A/B的算作成交)
        cur.execute("""
            SELECT
              CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE COUNT(*) FILTER (WHERE cooperation_level IN ('A', 'B'))::FLOAT
                     / COUNT(*)
              END as cooperation_rate
            FROM distributors
            WHERE status = 'active'
        """)
        cooperation_rate = cur.fetchone()[0]

        # 2. 构建Redis数据
        cache_data = {
            'total_distributors': str(total_distributors),
            'new_distributors_this_month': str(new_distributors),
            'cooperation_rate': f"{cooperation_rate:.2f}",
            'region_distribution': json.dumps(region_distribution),
            'last_updated': datetime.utcnow().isoformat()
        }

        # 3. 写入Redis(使用Pipeline确保原子性)
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
        pipe = r.pipeline()

        pipe.delete('dashboard:stats')  # 先删除旧数据
        pipe.hset('dashboard:stats', mapping=cache_data)
        pipe.expire('dashboard:stats', 300)  # 5分钟过期

        results = pipe.execute()

        logger.info(f"Dashboard stats aggregated successfully: {total_distributors} distributors")
        return True

    except Exception as e:
        logger.error(f"Error aggregating dashboard stats: {str(e)}")
        # 故障通知机制(可选)
        send_alert(f"Cron job failed: {str(e)}")
        return False
    finally:
        conn.close()

# 缺失处理: Redis故障降级
def get_dashboard_stats(use_cache=True):
    """获取看板统计(支持缓存miss自动回源)"""

    if use_cache:
        try:
            r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
            stats = r.hgetall('dashboard:stats')

            if stats:
                return {
                    'total_distributors': int(stats[b'total_distributors']),
                    'new_distributors_this_month': int(stats[b'new_distributors_this_month']),
                    'cooperation_rate': float(stats[b'cooperation_rate']),
                    'region_distribution': json.loads(stats[b'region_distribution']),
                    'from_cache': True
                }
        except Exception as e:
            logger.warning(f"Redis unavailable, falling back to DB: {str(e)}")

    # 回源数据库(缓存miss或Redis故障)
    return aggregate_dashboard_stats_realtime()
```

**Cron配置** (Docker Compose或k8s):

```yaml
# docker-compose.yml
services:
  backend:
    image: channel-management-api:latest
    environment:
      CRON_ENABLED: "true"
      CRON_SCHEDULE: "* * * * *"  # 每分钟

  # 可选: 独立Cron服务(高可用)
  scheduler:
    image: channel-management-api:latest
    command: python -m services.cron_scheduler
    environment:
      CRON_ENABLED: "true"
      CRON_SCHEDULE: "* * * * *"
```

---

### 4.3 缓存失效和更新策略

**缓存失效场景**:

| 场景 | 触发条件 | 处理方式 |
|------|---------|---------|
| 定时失效 | TTL=5分钟自动过期 | 自动，无需主动处理 |
| 主动失效 | 写入操作后立即清除(可选) | `UNLINK dashboard:stats` |
| Redis故障 | 连接超时或key不存在 | 自动回源PostgreSQL查询 |
| 数据不一致 | 业务修改未反映到缓存 | 最多延迟5分钟，可接受 |

**推荐策略**: **TTL自动失效 + 缺失回源**
- 优势: 简单可靠，无需复杂的失效管理
- 缺点: 最多5分钟延迟(业务可接受)
- **不推荐**: 同步写入更新，会增加业务逻辑复杂度

---

## 5. 权限隔离设计 (应用层过滤)

### 5.1 权限过滤机制

**设计原则**: 在ORM层封装统一查询方法，自动注入权限条件

```python
# 文件: models/distributor.py

class DistributorModel(BaseModel):
    """分销商ORM模型"""

    @classmethod
    def get_user_distributors(cls, user_id: str, role: str = 'salesperson'):
        """
        获取用户可见的分销商列表

        权限规则:
        - salesperson: 仅查询自己负责的分销商(owner_user_id = user_id)
        - leader: 查询所有分销商(无过滤)
        """
        query = cls.select()

        # 销售角色添加权限过滤
        if role == 'salesperson':
            query = query.where(cls.owner_user_id == user_id)

        # leader角色无过滤，获取所有
        return query

    @classmethod
    def get_by_id(cls, distributor_id: str, user_id: str, role: str):
        """
        获取单个分销商详情(包含权限检查)
        """
        distributor = cls.get(cls.id == distributor_id)

        if distributor is None:
            raise NotFoundError("Distributor not found")

        # 权限检查
        if role == 'salesperson' and distributor.owner_user_id != user_id:
            raise ForbiddenError("No permission to access this distributor")

        return distributor

    @classmethod
    def update_by_id(cls, distributor_id: str, updates: dict, user_id: str, role: str):
        """
        更新分销商信息(权限检查)
        """
        distributor = cls.get_by_id(distributor_id, user_id, role)

        # 销售用户只能修改自己的分销商
        if role == 'salesperson' and distributor.owner_user_id != user_id:
            raise ForbiddenError("No permission to update this distributor")

        return distributor.update(**updates)
```

**API层集成**:

```python
# 文件: routes/distributors.py

@router.get("/api/distributors")
async def list_distributors(
    request: Request,
    role: str = Header(...),
    user_id: str = Header(...)
):
    """列表查询(自动应用权限过滤)"""
    # 从JWT Token中提取role和user_id
    # (由中间件注入到Header中)

    distributors = DistributorModel.get_user_distributors(
        user_id=user_id,
        role=role
    )
    return {"data": distributors}

@router.get("/api/distributors/{id}")
async def get_distributor(
    id: str,
    request: Request,
    role: str = Header(...),
    user_id: str = Header(...)
):
    """详情查询(权限检查)"""
    distributor = DistributorModel.get_by_id(
        distributor_id=id,
        user_id=user_id,
        role=role
    )
    return {"data": distributor}

@router.put("/api/distributors/{id}")
async def update_distributor(
    id: str,
    body: UpdateDistributorRequest,
    request: Request,
    role: str = Header(...),
    user_id: str = Header(...)
):
    """更新分销商(权限检查)"""
    distributor = DistributorModel.update_by_id(
        distributor_id=id,
        updates=body.dict(),
        user_id=user_id,
        role=role
    )
    return {"data": distributor}
```

**中间件实现**:

```python
# 文件: middleware/auth.py

from fastapi import Request, HTTPException
import jwt

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """
    JWT认证中间件
    - 验证Token有效性
    - 提取user_id和role
    - 注入到request.state中
    """
    token = request.headers.get("Authorization")

    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        # 验证JWT签名和过期时间
        payload = jwt.decode(
            token.replace("Bearer ", ""),
            SECRET_KEY,
            algorithms=["HS256"]
        )

        user_id = payload.get("user_id")
        role = payload.get("role")  # 'salesperson' or 'leader'

        # 注入到Header中供路由处理器使用
        request.headers.__dict__['user-id'] = user_id
        request.headers.__dict__['role'] = role

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    response = await call_next(request)
    return response
```

---

### 5.2 权限矩阵

**完整权限控制表**:

| 操作 | 销售(salesperson) | 领导(leader) | SQL WHERE条件 |
|------|-----------------|------------|--------------|
| 查询分销商列表 | 仅自己的 | 全部 | `owner_user_id = user_id` / 无 |
| 查询分销商详情 | 仅自己的 | 全部 | `id = {id} AND owner_user_id = user_id` / `id = {id}` |
| 编辑分销商 | 仅自己的 | 全部 | 检查owner_user_id匹配 |
| 删除分销商 | 仅自己的 | 全部 | 检查owner_user_id匹配 |
| 查询分配给自己的任务 | 是 | 否(查看全部) | `assigned_to_user_id = user_id` / 无 |
| 创建任务 | 否 | 是 | 权限检查:role='leader' |
| 分配任务给销售 | 否 | 是 | 权限检查:role='leader' |
| 查看看板 | 否 | 是 | 权限检查:role='leader' |

---

## 6. 数据库设计(ER图)

### 6.1 实体关系图

```
┌─────────────────────────────────┐
│         Users                    │
├─────────────────────────────────┤
│ PK  id (UUID)                   │
│     username (VARCHAR)           │
│     email (VARCHAR)              │
│     password_hash (VARCHAR)      │
│     role (VARCHAR) [FK constraint]│
│     status (VARCHAR)             │
│     created_at (TIMESTAMP)       │
└─────────────────────────────────┘
          ▲          ▲
          │          │
      1:N │          │ 1:N
          │          │
┌─────────┴────────────────────────────────┐
│                                           │
┌─────────────────────────────────┐   ┌──────────────────────────────┐
│      Distributors               │   │        Tasks                 │
├─────────────────────────────────┤   ├──────────────────────────────┤
│ PK  id (UUID)                   │   │ PK  id (UUID)                │
│     name (VARCHAR)              │   │     distributor_id (FK) ─────┼──┐
│     address (TEXT)              │   │     assigned_to_user_id (FK) │  │
│     region (VARCHAR)            │   │     created_by_user_id (FK)  │  │
│ FK  owner_user_id (UUID) ───────┼─┐ │     title (VARCHAR)          │  │
│     contact_person (VARCHAR)    │ │ │     priority (VARCHAR)       │  │
│     phone (VARCHAR)             │ │ │     due_date (DATE)          │  │
│     cooperation_level (VARCHAR) │ │ │     status (VARCHAR)         │  │
│     credit_limit (DECIMAL)      │ │ │     created_at (TIMESTAMP)   │  │
│     tags (JSONB)                │ │ │     updated_at (TIMESTAMP)   │  │
│     notes (TEXT)                │ │ └──────────────────────────────┘  │
│     created_at (TIMESTAMP)      │ │                                   │
│     updated_at (TIMESTAMP)      │ │ (1:N) 一个分销商有多个任务         │
└─────────────────────────────────┘ │ (1:N) 一个销售可被分配多个任务    │
          ▲                          │
          └──────────────────────────┘

┌─────────────────────────────────┐
│        Events (审计日志)          │
├─────────────────────────────────┤
│ PK  id (UUID)                   │
│     event_type (VARCHAR)        │
│     entity_type (VARCHAR)       │
│ FK  entity_id (UUID)            │ ──┐ 可关联到 distributors 或 tasks
│ FK  user_id (UUID)              │ ──┐ 关联到 users
│     payload (JSONB)             │
│     created_at (TIMESTAMP)      │
└─────────────────────────────────┘
```

### 6.2 索引优化

**关键索引清单**:

```sql
-- 分销商表索引
CREATE INDEX idx_distributors_owner_user_id
  ON distributors(owner_user_id);                    -- 权限过滤关键索引

CREATE INDEX idx_distributors_region
  ON distributors(region);                           -- 地区分布统计

CREATE INDEX idx_distributors_cooperation_level
  ON distributors(cooperation_level);                -- 合作等级分析

CREATE INDEX idx_distributors_status
  ON distributors(status);                           -- 状态过滤

CREATE INDEX idx_distributors_updated_at
  ON distributors(updated_at);                       -- 增量同步

-- 任务表索引
CREATE INDEX idx_tasks_assigned_to_user_id
  ON tasks(assigned_to_user_id);                     -- 销售工作台查询

CREATE INDEX idx_tasks_distributor_id
  ON tasks(distributor_id);                          -- 分销商详情页

CREATE INDEX idx_tasks_due_date
  ON tasks(due_date);                                -- 截止日期排序

CREATE INDEX idx_tasks_status
  ON tasks(status);                                  -- 任务状态统计

-- 复合索引(多字段条件查询优化)
CREATE INDEX idx_tasks_assigned_due
  ON tasks(assigned_to_user_id, due_date)
  WHERE status != 'completed';                       -- 销售工作台:待处理任务

CREATE INDEX idx_distributors_owner_region
  ON distributors(owner_user_id, region)
  WHERE status = 'active';                           -- 销售区域分析

-- 事件表索引
CREATE INDEX idx_events_entity
  ON events(entity_type, entity_id);                 -- 实体历史追溯

CREATE INDEX idx_events_user
  ON events(user_id);                                -- 用户操作历史

CREATE INDEX idx_events_created_at
  ON events(created_at);                             -- 时间范围查询

-- 部分索引(高选择性)
CREATE INDEX idx_events_distributor_created
  ON events(created_at)
  WHERE event_type = 'distributor_created';         -- 新增分销商高频查询
```

---

## 7. 数据一致性保证

### 7.1 事务设计

**关键操作的事务处理**:

```python
# 分销商创建(原子操作)
def create_distributor(data: CreateDistributorRequest, user_id: str) -> dict:
    """
    创建分销商(保证原子性)
    - 业务表写入: distributors
    - 事件表写入: events
    """
    try:
        with db.transaction():
            # 1. 插入distributors表
            distributor = Distributor.create(
                name=data.name,
                address=data.address,
                owner_user_id=user_id,
                cooperation_level=data.cooperation_level,
                created_by=user_id,
                # ... 其他字段
            )

            # 2. 记录事件(异步或同步)
            Event.create(
                event_type='distributor_created',
                entity_type='distributor',
                entity_id=distributor.id,
                user_id=user_id,
                payload={
                    'distributor_id': distributor.id,
                    'name': distributor.name,
                    'region': distributor.region,
                    'owner_user_id': user_id
                }
            )

            return {
                'id': distributor.id,
                'status': 'created'
            }

    except IntegrityError as e:
        # 处理唯一性冲突等数据库约束错误
        if 'name' in str(e):
            raise BusinessError("Distributor name already exists")
        raise

# 任务分配(两阶段验证)
def assign_task(task_id: str, assigned_to: str, leader_id: str):
    """
    任务分配(验证 -> 更新 -> 事件)
    """
    try:
        with db.transaction():
            # 1. 读取现有任务(行级锁)
            task = Task.select().where(Task.id == task_id).for_update().first()

            if not task:
                raise NotFoundError("Task not found")

            # 2. 验证销售用户存在
            assignee = User.get_by_id(assigned_to)
            if not assignee or assignee.role != 'salesperson':
                raise ValidationError("Invalid assignee")

            # 3. 更新任务分配
            task.assigned_to_user_id = assigned_to
            task.updated_by = leader_id
            task.save()

            # 4. 记录事件
            Event.create(
                event_type='task_assigned',
                entity_type='task',
                entity_id=task_id,
                user_id=leader_id,
                payload={
                    'task_id': task_id,
                    'assigned_to': assigned_to
                }
            )

            return {'status': 'assigned'}

    except DeadlockError:
        # 处理死锁(可重试)
        logger.warning(f"Deadlock on task assignment: {task_id}")
        raise RetryableError("Please retry")
```

### 7.2 ACID保证

| 属性 | 保证方式 | 实现细节 |
|------|---------|--------|
| **Atomicity(原子性)** | 数据库事务 | `BEGIN...COMMIT/ROLLBACK` |
| **Consistency(一致性)** | 约束+应用逻辑 | 外键约束、唯一性约束、业务规则验证 |
| **Isolation(隔离性)** | 事务隔离级别 | PostgreSQL默认Read Committed |
| **Durability(持久性)** | WAL日志 | PostgreSQL自动持久化 |

---

## 8. 性能优化策略

### 8.1 查询性能优化

**关键查询优化**:

| 查询场景 | SQL优化 | 索引支持 | 预期响应时间 |
|---------|--------|--------|-----------|
| 销售工作台(任务列表) | `WHERE assigned_to_user_id=? AND status != 'completed'` | 复合索引 | <50ms |
| 分销商详情(权限过滤) | `WHERE id=? AND owner_user_id=?` | 双字段查询 | <10ms |
| 看板统计 | 从Redis读取 | Redis Hash | <5ms |
| 区域分布统计 | `GROUP BY region` | region索引 | <100ms(第一次聚合) |

**Explain分析示例**:

```sql
-- 销售工作台查询(应该使用复合索引)
EXPLAIN ANALYZE
SELECT * FROM tasks
WHERE assigned_to_user_id = '123'
  AND status != 'completed'
ORDER BY due_date;

-- 预期执行计划
-- Index Scan using idx_tasks_assigned_due on tasks
--   Index Cond: (assigned_to_user_id = '123')
--   Filter: (status != 'completed')
--   Planning Time: 0.1ms
--   Execution Time: 5-10ms (假设100条任务)
```

### 8.2 缓存策略

**多层缓存架构**:

```
┌──────────────────┐
│   浏览器缓存      │  (可选: HTTP ETag)
│   1小时过期      │
└────────┬─────────┘
         │
┌────────▼─────────┐
│   应用内存缓存    │  (可选: Guava Cache)
│   (可选)         │
└────────┬─────────┘
         │
┌────────▼─────────┐
│   Redis缓存      │  (必选: dashboard:stats)
│   5分钟TTL       │  (可选: 用户权限缓存)
└────────┬─────────┘
         │
┌────────▼─────────┐
│   PostgreSQL DB  │  (源数据库)
└──────────────────┘
```

---

## 9. 数据备份和恢复

### 9.1 备份策略

**备份方案**:

```bash
# 每日增量备份(凌晨2点)
0 2 * * * pg_dump --format=custom --verbose \
  postgresql://user:pass@localhost:5432/channel_db \
  | gzip > /backup/channel_db_$(date +%Y%m%d).sql.gz

# 每周全量备份(周日凌晨3点)
0 3 * * 0 pg_basebackup -D /backup/full_backup_$(date +%Y%m%d) \
  -U postgres -v -P

# 备份上传到对象存储(S3/阿里云OSS)
0 4 * * * aws s3 sync /backup/channel_db_$(date +%Y%m%d).sql.gz \
  s3://channel-backup/postgres/ \
  --region=cn-north-1
```

**备份保留策略**:
- 日备份: 保留7天
- 周备份: 保留4周
- 月备份: 保留12个月(可选)

### 9.2 恢复流程

```bash
# 查看备份列表
ls -la /backup/channel_db_*.sql.gz

# 恢复到特定时间点(PITR: Point In Time Recovery)
# 1. 停止应用连接
docker-compose down

# 2. 恢复数据库
pg_restore --format=custom --verbose \
  /backup/channel_db_20250115.sql.gz \
  -d channel_db -U postgres

# 3. 验证数据
psql -U postgres -d channel_db -c "SELECT COUNT(*) FROM distributors;"

# 4. 重启应用
docker-compose up -d
```

---

## 10. 监控和告警

### 10.1 关键指标监控

**数据库监控指标**:

| 指标 | 阈值告警 | 监控工具 |
|------|---------|--------|
| 连接数 | >80% max_connections | PostgreSQL pg_stat_statements |
| 查询耗时 | >1s | pgBadger日志分析 |
| 事务表大小 | >10GB | 数据库磁盘监控 |
| 缓存命中率 | <80% | Redis INFO命令 |
| 复制延迟 | >5s | PostgreSQL pg_stat_replication |

**应用监控指标**:

| 指标 | 监控方式 |
|------|---------|
| API响应时间 | APM工具(Datadog/New Relic) |
| 缓存miss率 | Redis监控 |
| 数据库连接池 | 应用内部metrics |

### 10.2 告警规则

```yaml
# Prometheus告警规则
groups:
- name: database_alerts
  rules:
  - alert: HighDatabaseConnections
    expr: pg_stat_activity_count > 90
    for: 5m
    annotations:
      summary: "High database connections ({{ $value }})"

  - alert: SlowQueries
    expr: pg_slow_query_count > 10
    for: 5m
    annotations:
      summary: "Slow queries detected"

  - alert: EventsTableGrowth
    expr: events_table_size_bytes > 10737418240  # 10GB
    for: 1h
    annotations:
      summary: "Events table size exceeds 10GB"
```

---

## 11. 可扩展性考量

### 11.1 短期(现在-3个月)

**当前架构支持**:
- 数据库单机PostgreSQL足够支持小团队
- Redis缓存提供毫秒级查询响应
- 无需考虑水平扩展

### 11.2 中期(3-6个月)

**可能的扩展需求**:
- 如果事件表增长迅速(>50GB)，考虑表分区(按时间分区)
- 多实例部署时，考虑Redis集群替代单机

**表分区示例**:
```sql
-- 按年份分区事件表
CREATE TABLE events_2025 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE events_2026 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

### 11.3 长期(6个月+)

**高并发场景下的优化**:
- 读写分离: 主从复制，读从库
- 分布式缓存: Redis Cluster或Memcached
- 消息队列: 异步处理事件写入(RabbitMQ/Kafka)

```
                   ┌─────────────────────┐
                   │   Master DB         │
                   │ (写入)              │
                   └──────────┬──────────┘
                              │
                  ┌───────────┴────────────┐
                  │                        │
            ┌─────▼──────┐          ┌─────▼──────┐
            │ Slave DB 1 │          │ Slave DB 2 │
            │ (只读)     │          │ (只读)     │
            └─────┬──────┘          └─────┬──────┘
                  │                       │
            ┌─────┴───────────────────────┘
            │
        ┌───▼──────────────────┐
        │  应用层读写分离      │
        │  写 -> Master        │
        │  读 -> Slave (轮询) │
        └──────────────────────┘
```

---

## 12. 风险分析与缓解

### 12.1 识别的风险

**1. 事件流表存储增长**

```
风险等级: 中
影响: 数据库性能下降
缓解方案:
- 定期归档历史事件(保留最近6个月)
- 表分区隔离(按月份分区)
- 监控表大小告警
```

**实施示例**:
```sql
-- 每月自动归档旧事件
DELETE FROM events
WHERE created_at < NOW() - INTERVAL '6 months';

-- 定期VACUUM回收磁盘空间
VACUUM ANALYZE events;
```

**2. Redis缓存失效**

```
风险等级: 低
影响: 看板无法访问
缓解方案:
- 缓存miss时自动回源数据库
- Redis持久化(RDB+AOF)
- 定期备份Redis内存快照
```

**3. 单机部署单点故障**

```
风险等级: 高
影响: 系统不可用
缓解方案:
- Docker服务器定期备份(每日增量+每周全量)
- 数据库持久化日志保证数据不丢失
- 监控告警及时发现故障
- 中期考虑: 主从复制实现高可用
```

**备份RPO/RTO指标**:

| 故障类型 | RPO(数据丢失) | RTO(恢复时间) | 备份方案 |
|---------|---------------|-------------|--------|
| 磁盘故障 | <1小时 | <2小时 | 增量备份+异地存储 |
| 数据损坏 | <1天 | <4小时 | 每日快照备份 |
| 应用崩溃 | 0 | <10分钟 | 容器自动重启 |

**4. 权限过滤遗漏导致数据越权**

```
风险等级: 高
影响: 数据安全
缓解方案:
- ORM层强制注入权限条件(无法绕过)
- 代码review审查SQL查询
- 集成测试覆盖权限场景
- 定期安全审计
```

**权限测试用例**:
```python
def test_salesperson_cannot_access_other_distributor():
    """销售不能查询其他销售的分销商"""
    user1_distributor = Distributor.get(owner_user_id='user1')

    # 用user2身份查询user1的分销商，应该抛异常
    with pytest.raises(ForbiddenError):
        DistributorModel.get_by_id(
            user1_distributor.id,
            user_id='user2',
            role='salesperson'
        )
```

---

## 13. 数据安全和隐私

### 13.1 数据加密

**传输层**:
```
HTTPS/TLS 1.3 传输所有API数据
- 强制HTTPS, 禁用HTTP
- HSTS Header防中间人攻击
```

**存储层**:
```sql
-- 敏感字段加密存储(可选)
ALTER TABLE distributors
ADD COLUMN phone_encrypted BYTEA;

-- 使用pgcrypto扩展加密敏感信息
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 存储时加密
UPDATE distributors
SET phone_encrypted = pgp_sym_encrypt(phone, 'encryption_key')
WHERE phone IS NOT NULL;
```

### 13.2 数据脱敏

```python
# 返回给前端的数据脱敏
def mask_sensitive_data(distributor: dict) -> dict:
    """脱敏分销商数据(若干字段)"""
    masked = distributor.copy()

    # 脱敏电话号(仅显示最后4位)
    if masked.get('phone'):
        masked['phone'] = f"***-{masked['phone'][-4:]}"

    # 脱敏授信额度(四舍五入到万位)
    if masked.get('credit_limit'):
        masked['credit_limit'] = int(masked['credit_limit'] / 10000) * 10000

    return masked
```

---

## 14. 数据模型扩展路径

### 14.1 未来扩展字段(JSONB)

当前JSONB字段已支持灵活扩展:

```python
# 示例: 添加新的扩展字段(不需要修改表结构)
distributor.tags = ['vip', 'strategic', 'high-value']
distributor.historical_performance = {
    '2024': 5000000,
    '2025': 7500000,
    '2025-Q1': 1800000
}

# 新增字段不需要ALTER TABLE
distributor.custom_fields = {
    'competition_situation': '与XX竞争对手有较强竞争力',
    'supply_chain_risk': 'low',
    'technical_capability': 'advanced'
}
```

### 14.2 数据仓库集成(未来)

```
PostgreSQL (OLTP)
    ↓ ETL (dbt或自定义脚本)
Snowflake/BigQuery (OLAP)
    ↓
BI工具 (Tableau/Metabase)
```

---

## 综合改进（Synthesis Enhancements）

### EP-001: API契约与集成规范完善

**完整的API契约定义**:

#### 请求/响应JSON Schema

```json
{
  "POST /api/distributors": {
    "request": {
      "type": "object",
      "required": ["name", "address", "region", "cooperation_level"],
      "properties": {
        "name": {"type": "string", "minLength": 2, "maxLength": 50},
        "address": {"type": "string", "minLength": 5, "maxLength": 500},
        "region": {"type": "string", "enum": ["北京", "上海", "浙江", "..."]},
        "cooperation_level": {"type": "string", "enum": ["A", "B", "C"]},
        "contact_person": {"type": "string", "maxLength": 100},
        "phone": {"type": "string", "pattern": "^1[3-9]\\d{9}$"},
        "credit_limit": {"type": "number", "minimum": 0}
      }
    },
    "response": {
      "success": {
        "statusCode": 201,
        "body": {
          "id": "uuid",
          "name": "string",
          "created_at": "ISO8601"
        }
      },
      "errors": {
        "400": {"code": "VALIDATION_ERROR", "message": "字段验证失败"},
        "409": {"code": "DUPLICATE_NAME", "message": "分销商名称已存在"},
        "401": {"code": "UNAUTHORIZED", "message": "Token无效或过期"},
        "403": {"code": "FORBIDDEN", "message": "无权限执行此操作"}
      }
    }
  }
}
```

#### HTTP状态码和错误代码映射

| HTTP状态码 | 错误代码 | 说明 | 重试策略 |
|-----------|--------|------|--------|
| 200 | OK | 成功 | N/A |
| 201 | CREATED | 资源已创建 | N/A |
| 400 | VALIDATION_ERROR | 请求参数验证失败 | 不重试 |
| 400 | DUPLICATE_NAME | 分销商名称重复 | 不重试 |
| 401 | UNAUTHORIZED | Token失效或无效 | 重新登录 |
| 403 | FORBIDDEN | 用户无权限 | 不重试 |
| 404 | NOT_FOUND | 资源不存在 | 不重试 |
| 409 | CONFLICT | 数据冲突 | 重试 |
| 429 | RATE_LIMITED | 请求过于频繁 | 指数退避 |
| 500 | INTERNAL_ERROR | 服务器错误 | 重试 |
| 503 | SERVICE_UNAVAILABLE | 服务暂时不可用 | 重试 |

#### 字段验证规则详细表

| 字段 | 验证规则 | 示例 | 错误提示 |
|------|--------|------|--------|
| name | 必填, 2-50字符, 唯一 | "ABC分销有限公司" | 名称长度必须2-50字符 |
| phone | 格式验证(11位手机号) | "13912345678" | 电话号码格式不正确 |
| email | 格式验证(RFC 5322) | "contact@example.com" | 邮箱格式不正确 |
| credit_limit | 正数, ≤99999999.99 | 500000 | 授信额度必须为正数 |
| region | 枚举值 | "北京" | 地区不在允许列表中 |
| cooperation_level | 枚举值 | "A" | 合作等级只能是A/B/C |

#### 版本控制策略

```
Request Header: Accept-Version: 1.0
Response Header: API-Version: 1.0

版本升级规则:
- 破坏性变更: 主版本号+1 (如1.0 -> 2.0)
- 新增字段(可选): 次版本号+1 (如1.0 -> 1.1)
- bug修复: 修订版本+1 (如1.0 -> 1.0.1)
```

#### 频率限制(Rate Limit)响应头规范

```
Response Headers:
- X-RateLimit-Limit: 1000          (每小时请求限制)
- X-RateLimit-Remaining: 950       (剩余请求数)
- X-RateLimit-Reset: 1705600000    (限制重置时间 Unix时间戳)
- Retry-After: 60                  (超出限制时，建议重试等待秒数)

429 Too Many Requests响应体:
{
  "code": "RATE_LIMITED",
  "message": "请求过于频繁，请稍候再试",
  "retry_after_seconds": 60
}
```

---

### EP-002: 表单验证规则明确化

**完整的表单验证规则矩阵**:

#### 1) 必填字段清单

| 字段 | 必填 | 说明 |
|------|-----|------|
| name | ✓ | 分销商名称 |
| address | ✓ | 详细地址 |
| region | ✓ | 地区 |
| cooperation_level | ✓ | 合作等级 |
| phone | ✗ | 联系电话(可选) |
| contact_person | ✗ | 联系人(可选) |
| credit_limit | ✗ | 授信额度(可选) |
| tags | ✗ | 标签(可选) |

#### 2) 格式验证规则

```json
{
  "phone": {
    "pattern": "^1[3-9]\\d{9}$",
    "description": "11位中国手机号",
    "examples": ["13912345678", "18888888888"],
    "invalid": ["1234567890", "12345678901"]
  },
  "email": {
    "pattern": "^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    "description": "标准邮箱格式",
    "examples": ["user@example.com", "contact@company.co.uk"]
  },
  "url": {
    "pattern": "^https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    "description": "http或https开头的URL",
    "examples": ["https://example.com", "http://www.company.com"]
  }
}
```

#### 3) 长度限制和边界值

| 字段 | 最小长度 | 最大长度 | 说明 |
|------|---------|---------|------|
| name | 2 | 50 | 分销商名称 |
| contact_person | 1 | 100 | 联系人名称 |
| address | 5 | 500 | 详细地址 |
| phone | 11 | 11 | 固定11位 |
| region | - | 100 | 地区/城市 |
| notes | 0 | 2000 | 备注信息 |

#### 4) 唯一性检查

```python
# 前端: 异步检查(防止用户重复输入)
async def check_distributor_name_exists(name: str) -> bool:
    """检查分销商名称是否已存在"""
    response = await fetch('/api/check-name', {name})
    return response.exists

# 后端: 数据库查询验证
def validate_unique_name(name: str, exclude_id: str = None) -> bool:
    query = f"SELECT 1 FROM distributors WHERE name = '{name}'"
    if exclude_id:  # 编辑时排除当前记录
        query += f" AND id != '{exclude_id}'"

    return db.query(query) is None
```

#### 5) 条件验证

```python
# 授信额度必须为正数
if credit_limit is not None and credit_limit <= 0:
    raise ValidationError("授信额度必须为正数")

# 合作等级为A时，授信额度必须 ≥ 1000000
if cooperation_level == 'A' and (credit_limit is None or credit_limit < 1000000):
    raise ValidationError("A级合作伙伴授信额度必须≥100万")

# 如果status为archived，需要记录原因
if status == 'archived' and not archive_reason:
    raise ValidationError("归档分销商必须提供原因")
```

#### 6) 特殊字符过滤规则

```python
def sanitize_input(field_value: str, field_type: str) -> str:
    """输入数据清理"""

    # 移除SQL注入风险的字符(通过参数化查询更好，但此处展示清理规则)
    dangerous_chars = ["'", '"', ';", "--", "/*", "*/", "xp_", "sp_"]
    for char in dangerous_chars:
        field_value = field_value.replace(char, "")

    # 名称字段: 仅允许中文、英文、数字、常见特殊符号
    if field_type == 'name':
        import re
        field_value = re.sub(r'[^a-zA-Z0-9\u4e00-\u9fff\s\-\(\)（）]', '', field_value)

    # 地址字段: 过滤脚本标签
    if field_type == 'address':
        field_value = field_value.replace('<script>', '').replace('</script>', '')

    return field_value.strip()
```

#### 7) 前端和后端验证分工

| 验证类型 | 前端 | 后端 | 说明 |
|---------|------|------|------|
| 必填字段 | ✓ 实时反馈 | ✓ 安全检查 | 前端快速反馈，后端确保安全 |
| 格式验证 | ✓ 实时反馈 | ✓ 安全检查 | 前端提升用户体验，后端防止绕过 |
| 长度限制 | ✓ 提示 | ✓ 强制检查 | 前端UX提示，后端强制限制 |
| 唯一性检查 | ✓ 异步检查 | ✓ 插入时检查 | 前端提前提示，后端防止并发冲突 |
| 业务规则 | ✗ 不做 | ✓ 强制检查 | 仅后端验证复杂业务逻辑 |

---

### EP-003: 权限模型详细规范

**权限模型扩展**:

#### 权限转移机制

```sql
-- 权限转移表(用于权限交接)
CREATE TABLE permission_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  transfer_reason VARCHAR(255),
  transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by UUID,
  approval_status VARCHAR(20) DEFAULT 'pending',  -- pending/approved/rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_distributor FOREIGN KEY (distributor_id) REFERENCES distributors(id),
  CONSTRAINT fk_from_user FOREIGN KEY (from_user_id) REFERENCES users(id),
  CONSTRAINT fk_to_user FOREIGN KEY (to_user_id) REFERENCES users(id),
  CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_status (approval_status),
  INDEX idx_distributor (distributor_id)
);

-- 权限转移流程
-- 1. 员工A申请将分销商转移给员工B
-- 2. 领导审批转移请求
-- 3. 自动更新distributors表的owner_user_id
-- 4. 记录权限转移事件到events表
```

#### 临时权限机制

```sql
-- 临时权限表(如出差期间的权限委托)
CREATE TABLE temporary_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  delegated_to_user_id UUID NOT NULL,
  permission_scope VARCHAR(50),  -- 'all_distributors', 'specific_distributor'
  resource_id UUID,  -- 如果permission_scope='specific_distributor'，存distributor_id
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_delegated_to FOREIGN KEY (delegated_to_user_id) REFERENCES users(id),
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_active (end_date),
  CHECK (end_date > start_date)
);

-- 查询时自动应用临时权限
SELECT * FROM distributors
WHERE owner_user_id = current_user_id
   OR owner_user_id IN (
     SELECT user_id FROM temporary_permissions
     WHERE delegated_to_user_id = current_user_id
       AND NOW() BETWEEN start_date AND end_date
   )
```

#### 审计日志权限

```sql
-- 审计日志访问权限控制
-- 仅拥有'audit_viewer'角色的用户可以访问事件表

-- 扩展Users表添加权限标签
ALTER TABLE users ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;

-- 权限示例
UPDATE users SET permissions = '["distributor_manage", "audit_viewer", "report_viewer"]'
WHERE id = 'leader_user_id';

-- API层权限检查
if 'audit_viewer' not in current_user.permissions:
    raise ForbiddenError("无权查看审计日志")
```

#### 数据导出权限

```python
# 数据导出权限控制
def export_distributors(user_id: str, format: str = 'excel'):
    """导出分销商数据"""

    # 权限检查
    user = User.get_by_id(user_id)
    if 'data_export' not in user.permissions:
        raise ForbiddenError("无权导出数据")

    # 记录导出操作
    Event.create(
        event_type='data_exported',
        entity_type='distributors',
        user_id=user_id,
        payload={
            'export_format': format,
            'record_count': distributor_count,
            'exported_at': datetime.utcnow()
        }
    )

    # 执行导出
    if format == 'excel':
        return generate_excel_report(user_id)
    elif format == 'csv':
        return generate_csv_report(user_id)
```

#### 批量操作权限

```python
# 批量操作权限控制
def batch_update_distributors(user_id: str, updates: list):
    """批量更新分销商信息"""

    # 权限检查
    user = User.get_by_id(user_id)
    if 'batch_operation' not in user.permissions:
        raise ForbiddenError("无权进行批量操作")

    # 最多允许一次批量操作100条记录
    if len(updates) > 100:
        raise ValidationError("单次批量操作最多100条")

    # 权限检查: 用户是否拥有这些分销商
    distributor_ids = [u['id'] for u in updates]
    user_distributors = Distributor.select().where(
        Distributor.owner_user_id == user_id,
        Distributor.id.in_(distributor_ids)
    )

    if len(user_distributors) != len(distributor_ids):
        raise ForbiddenError("您无权修改部分分销商")

    # 执行更新
    for update in updates:
        Distributor.update_by_id(update['id'], update['data'], user_id, 'salesperson')
```

#### 权限冲突解决规则

```python
# 权限冲突处理
def resolve_permission_conflict(user_id: str, resource_id: str) -> bool:
    """
    权限冲突解决逻辑
    场景: 用户同时通过多种方式获得权限
    """

    # 获取所有权限来源
    direct_permission = check_direct_ownership(user_id, resource_id)
    temporary_permission = check_temporary_delegation(user_id, resource_id)
    inherited_permission = check_inherited_permission(user_id, resource_id)

    # 权限优先级 (从高到低)
    # 1. 直接所有权 (最高优先级)
    if direct_permission:
        return True

    # 2. 临时权限(活跃的)
    if temporary_permission and temporary_permission['is_active']:
        return True

    # 3. 继承权限(如通过角色)
    if inherited_permission:
        return True

    return False
```

---

### EP-005: 数据初始化和迁移策略

**完整的数据迁移方案**:

#### Excel导入模板和字段映射

```json
{
  "excel_template": {
    "sheet_name": "分销商数据",
    "columns": [
      {
        "col": "A",
        "field": "name",
        "type": "string",
        "required": true,
        "validation": "2-50字符, 唯一"
      },
      {
        "col": "B",
        "field": "address",
        "type": "string",
        "required": true,
        "validation": "5-500字符"
      },
      {
        "col": "C",
        "field": "region",
        "type": "string",
        "required": true,
        "validation": "枚举值: 北京,上海,浙江"
      },
      {
        "col": "D",
        "field": "cooperation_level",
        "type": "string",
        "required": true,
        "validation": "枚举值: A,B,C"
      },
      {
        "col": "E",
        "field": "contact_person",
        "type": "string",
        "required": false,
        "validation": "1-100字符"
      },
      {
        "col": "F",
        "field": "phone",
        "type": "string",
        "required": false,
        "validation": "11位手机号"
      },
      {
        "col": "G",
        "field": "credit_limit",
        "type": "number",
        "required": false,
        "validation": "正数"
      },
      {
        "col": "H",
        "field": "tags",
        "type": "string",
        "required": false,
        "validation": "逗号分隔, 如: vip,strategic"
      }
    ]
  },
  "mapping_rules": {
    "header_row": 1,
    "data_start_row": 2,
    "encoding": "utf-8",
    "date_format": "YYYY-MM-DD"
  }
}
```

#### 数据验证流程

```python
def validate_import_data(file_path: str) -> dict:
    """逐行验证导入数据"""

    import pandas as pd

    errors = []
    warnings = []
    validated_data = []

    # 读取Excel文件
    df = pd.read_excel(file_path, sheet_name='分销商数据')

    for index, row in df.iterrows():
        row_num = index + 2  # Excel行号(header在第1行)
        row_errors = []

        # 1. 必填字段检查
        required_fields = ['name', 'address', 'region', 'cooperation_level']
        for field in required_fields:
            if pd.isna(row[field]) or str(row[field]).strip() == '':
                row_errors.append(f"第{row_num}行: {field}为必填项")

        # 2. 字段格式验证
        if not pd.isna(row['name']):
            if not (2 <= len(str(row['name']).strip()) <= 50):
                row_errors.append(f"第{row_num}行: name长度必须2-50字符")

        if not pd.isna(row['phone']):
            import re
            if not re.match(r'^1[3-9]\d{9}$', str(row['phone'])):
                row_errors.append(f"第{row_num}行: phone格式不正确(11位手机号)")

        if not pd.isna(row['credit_limit']):
            try:
                credit = float(row['credit_limit'])
                if credit < 0:
                    row_errors.append(f"第{row_num}行: credit_limit必须为正数")
            except ValueError:
                row_errors.append(f"第{row_num}行: credit_limit必须是数字")

        # 3. 枚举值验证
        valid_regions = ['北京', '上海', '浙江', '...']
        if not pd.isna(row['region']) and row['region'] not in valid_regions:
            row_errors.append(f"第{row_num}行: region必须在允许列表中")

        valid_levels = ['A', 'B', 'C']
        if not pd.isna(row['cooperation_level']) and row['cooperation_level'] not in valid_levels:
            row_errors.append(f"第{row_num}行: cooperation_level必须是A/B/C")

        # 4. 业务逻辑验证
        if not pd.isna(row['cooperation_level']) and row['cooperation_level'] == 'A':
            if pd.isna(row['credit_limit']) or float(row['credit_limit']) < 1000000:
                row_errors.append(f"第{row_num}行: A级合作伙伴授信额度必须≥100万")

        if row_errors:
            errors.extend(row_errors)
        else:
            validated_data.append({
                'name': str(row['name']).strip(),
                'address': str(row['address']).strip(),
                'region': str(row['region']).strip(),
                'cooperation_level': str(row['cooperation_level']).strip(),
                'contact_person': str(row['contact_person']).strip() if not pd.isna(row['contact_person']) else None,
                'phone': str(row['phone']).strip() if not pd.isna(row['phone']) else None,
                'credit_limit': float(row['credit_limit']) if not pd.isna(row['credit_limit']) else None,
                'tags': str(row['tags']).split(',') if not pd.isna(row['tags']) else []
            })

    return {
        'valid_count': len(validated_data),
        'error_count': len(errors),
        'validated_data': validated_data,
        'errors': errors,
        'warnings': warnings
    }
```

#### 重复检测和数据归一化

```python
def check_duplicates(validated_data: list) -> dict:
    """检测数据中的重复记录"""

    duplicates = {
        'in_file': [],      # 导入文件中的重复
        'in_database': [],  # 与数据库中的重复
        'case_sensitive': [] # 大小写不同的重复
    }

    # 1. 检测文件内重复(按name)
    names = [item['name'] for item in validated_data]
    seen = set()
    for i, name in enumerate(names):
        if name in seen:
            duplicates['in_file'].append({
                'name': name,
                'line_numbers': [j+2 for j, n in enumerate(names) if n == name]
            })
        seen.add(name)

    # 2. 检测数据库中重复
    for item in validated_data:
        existing = Distributor.select().where(
            Distributor.name == item['name']
        ).first()
        if existing:
            duplicates['in_database'].append({
                'name': item['name'],
                'existing_id': existing.id,
                'existing_owner': existing.owner_user_id
            })

    # 3. 检测大小写不同的重复
    import difflib
    for item in validated_data:
        similar = Distributor.select().where(
            Distributor.name.ilike(f"%{item['name']}%")
        )
        if similar:
            duplicates['case_sensitive'].append({
                'input': item['name'],
                'similar': [s.name for s in similar]
            })

    return duplicates

def normalize_data(item: dict) -> dict:
    """数据归一化"""

    # 1. 字符串去除前后空格
    for key in ['name', 'address', 'region', 'contact_person', 'phone']:
        if key in item and item[key]:
            item[key] = item[key].strip()

    # 2. 电话号码格式统一
    if item.get('phone'):
        # 移除空格、横线、括号
        phone = item['phone'].replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if phone.startswith('+86'):
            phone = phone[3:]
        item['phone'] = phone

    # 3. 地区名称统一
    region_mapping = {
        '北京': '北京',
        'BJ': '北京',
        'beijing': '北京',
        '上海': '上海',
        'SH': '上海',
        'shanghai': '上海',
        '浙江': '浙江',
        'ZJ': '浙江',
        'zhejiang': '浙江'
    }
    if item.get('region') in region_mapping:
        item['region'] = region_mapping[item['region']]

    # 4. 合作等级转换为大写
    if item.get('cooperation_level'):
        item['cooperation_level'] = item['cooperation_level'].upper()

    # 5. 标签转换为小写
    if item.get('tags'):
        item['tags'] = [tag.lower().strip() for tag in item['tags']]

    return item
```

#### 审查流程和回滚机制

```python
def import_distributors(file_path: str, user_id: str) -> dict:
    """完整的导入流程(包含审查和回滚)"""

    # 1. 验证数据
    validation_result = validate_import_data(file_path)
    if validation_result['error_count'] > 0:
        return {
            'status': 'failed',
            'errors': validation_result['errors'],
            'message': f"数据验证失败，共{validation_result['error_count']}处错误"
        }

    # 2. 检测重复
    duplicate_result = check_duplicates(validation_result['validated_data'])
    if duplicate_result['in_file'] or duplicate_result['in_database']:
        # 询问用户是否继续
        return {
            'status': 'requires_review',
            'duplicates': duplicate_result,
            'message': "检测到重复记录，请确认处理方式",
            'options': ['skip_duplicates', 'overwrite', 'abort']
        }

    # 3. 数据归一化
    normalized_data = [
        normalize_data(item)
        for item in validation_result['validated_data']
    ]

    # 4. 事务化导入(支持回滚)
    try:
        with db.transaction():
            import_id = str(uuid.uuid4())
            imported_records = []

            for item in normalized_data:
                distributor = Distributor.create(
                    name=item['name'],
                    address=item['address'],
                    region=item['region'],
                    cooperation_level=item['cooperation_level'],
                    contact_person=item.get('contact_person'),
                    phone=item.get('phone'),
                    credit_limit=item.get('credit_limit'),
                    tags=item.get('tags', []),
                    owner_user_id=user_id,  # 导入者为owner
                    created_by=user_id,
                    import_id=import_id  # 记录属于同一批导入
                )

                # 记录导入事件
                Event.create(
                    event_type='distributor_imported',
                    entity_type='distributor',
                    entity_id=distributor.id,
                    user_id=user_id,
                    payload={
                        'import_id': import_id,
                        'source': 'excel_upload'
                    }
                )

                imported_records.append(distributor.id)

            return {
                'status': 'success',
                'import_id': import_id,
                'imported_count': len(imported_records),
                'message': f"成功导入{len(imported_records)}条分销商记录"
            }

    except Exception as e:
        # 事务自动回滚
        logger.error(f"Import failed: {str(e)}")
        return {
            'status': 'failed',
            'error': str(e),
            'message': "导入过程出错，所有操作已回滚"
        }

def rollback_import(import_id: str, user_id: str):
    """回滚导入(仅限导入者和管理员)"""

    # 权限检查
    import_records = Distributor.select().where(
        Distributor.import_id == import_id
    )

    if not import_records:
        raise NotFoundError("未找到该导入批次")

    first_record = import_records[0]
    if first_record.created_by != user_id:
        raise ForbiddenError("只有导入者或管理员可以回滚")

    # 删除该批次的所有记录
    try:
        with db.transaction():
            for record in import_records:
                # 先删除相关任务
                Task.delete().where(Task.distributor_id == record.id).execute()
                # 再删除分销商
                record.delete_instance()
                # 记录回滚事件
                Event.create(
                    event_type='distributor_import_rolled_back',
                    entity_type='distributor',
                    entity_id=record.id,
                    user_id=user_id,
                    payload={'import_id': import_id}
                )

            return {'status': 'success', 'rolled_back_count': len(import_records)}

    except Exception as e:
        logger.error(f"Rollback failed: {str(e)}")
        raise
```

---

### EP-006: 看板数据缺失和异常处理

**看板数据处理规范**:

#### 缓存失效和回源机制

```python
def get_dashboard_stats(use_cache=True, force_refresh=False):
    """获取看板统计数据(包含多层级缓存和容错)"""

    try:
        # 1. 强制刷新: 绕过缓存直接查询DB
        if force_refresh:
            return calculate_dashboard_stats_from_db()

        # 2. 尝试从Redis读取
        if use_cache:
            r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
            cached_stats = r.hgetall('dashboard:stats')

            if cached_stats:
                return {
                    'data': parse_redis_data(cached_stats),
                    'from_cache': True,
                    'cache_age_seconds': r.ttl('dashboard:stats')
                }

        # 3. 缓存miss或Redis故障: 回源数据库
        logger.warning("Cache miss or Redis unavailable, falling back to DB")
        stats = calculate_dashboard_stats_from_db()

        # 4. 尝试更新缓存(异步，失败不影响返回)
        try:
            update_cache_async(stats)
        except Exception as e:
            logger.warning(f"Failed to update cache: {str(e)}")

        return {
            'data': stats,
            'from_cache': False,
            'warning': 'Cache unavailable, using database'
        }

    except Exception as e:
        logger.error(f"Dashboard stats error: {str(e)}")
        return {
            'data': get_fallback_dashboard_stats(),
            'error': 'Failed to fetch stats, showing fallback data',
            'from_cache': False
        }
```

#### 零值和异常显示规则

```json
{
  "display_rules": {
    "zero_values": {
      "total_distributors": {
        "display": "0",
        "tooltip": "目前还没有分销商记录"
      },
      "new_distributors_this_month": {
        "display": "0",
        "tooltip": "本月暂无新增分销商"
      },
      "cooperation_rate": {
        "display": "0%",
        "tooltip": "暂无已合作分销商"
      }
    },
    "null_values": {
      "region_distribution": {
        "display": "暂无数据",
        "icon": "database-empty"
      },
      "monthly_trend": {
        "display": "数据不足",
        "message": "需要至少1个月的历史数据"
      }
    },
    "nan_values": {
      "cooperation_rate": {
        "display": "计算中",
        "fallback": "0%"
      }
    }
  }
}
```

#### 计算异常处理

```python
def calculate_cooperation_rate():
    """计算成交率(处理异常情况)"""

    try:
        # 查询总数
        total = Distributor.select().where(
            Distributor.status == 'active'
        ).count()

        # 边界情况: 没有分销商
        if total == 0:
            return {
                'value': 0,
                'display': '0%',
                'warning': 'No distributors found'
            }

        # 查询已合作数
        cooperated = Distributor.select().where(
            Distributor.status == 'active',
            Distributor.cooperation_level.in_(['A', 'B'])
        ).count()

        # 计算比率
        rate = cooperated / total

        # NaN/Infinity检查
        if math.isnan(rate) or math.isinf(rate):
            return {
                'value': 0,
                'display': '计算异常',
                'error': 'Invalid calculation result'
            }

        return {
            'value': rate,
            'display': f"{rate*100:.1f}%",
            'cooperated': cooperated,
            'total': total
        }

    except Exception as e:
        logger.error(f"Error calculating cooperation rate: {str(e)}")
        return {
            'value': None,
            'display': '计算失败',
            'error': str(e)
        }
```

#### 数据延迟说明

```python
def get_dashboard_with_metadata():
    """返回看板数据及其元数据(包含延迟说明)"""

    stats = get_dashboard_stats()

    # 获取缓存元数据
    cache_time = redis.REDIS.hget('dashboard:stats', 'last_updated')
    current_time = datetime.utcnow()

    if cache_time:
        cache_time = datetime.fromisoformat(cache_time)
        delay_seconds = (current_time - cache_time).total_seconds()
    else:
        delay_seconds = None

    return {
        'data': stats,
        'metadata': {
            'updated_at': cache_time.isoformat() if cache_time else None,
            'delay_seconds': delay_seconds,
            'delay_message': format_delay_message(delay_seconds),
            'data_freshness': 'fresh' if delay_seconds < 60 else 'stale',
            'source': 'cache' if cache_time else 'database'
        }
    }

def format_delay_message(delay_seconds):
    """格式化延迟说明"""

    if delay_seconds is None:
        return "数据来自数据库，未缓存"

    if delay_seconds < 60:
        return "数据实时性好(1分钟内更新)"
    elif delay_seconds < 300:  # 5分钟
        return f"数据延迟约{int(delay_seconds/60)}分钟"
    else:
        return "数据可能已过期，请刷新页面"
```

#### 异常告警机制

```python
def monitor_dashboard_data():
    """监控看板数据异常"""

    alerts = []

    try:
        stats = get_dashboard_stats()

        # 1. 检测缓存更新失败
        last_update = redis.TTL('dashboard:stats')
        if last_update == -2:  # key不存在
            alerts.append({
                'level': 'error',
                'code': 'CACHE_MISSING',
                'message': '看板缓存不存在，Cron Job可能未执行',
                'action': '检查Cron Job状态'
            })
        elif last_update > 300:  # 超过5分钟
            alerts.append({
                'level': 'warning',
                'code': 'CACHE_STALE',
                'message': f'看板缓存已过期{last_update}秒',
                'action': '手动触发数据更新'
            })

        # 2. 检测数据异常(如total_distributors突然下降)
        current_total = stats['data']['total_distributors']
        previous_total = redis.GET('dashboard:stats:previous_total')

        if previous_total and current_total < float(previous_total) * 0.9:
            alerts.append({
                'level': 'warning',
                'code': 'DATA_DROP',
                'message': f'分销商总数异常下降({previous_total} -> {current_total})',
                'action': '检查数据库或权限过滤'
            })

        # 3. 检测计算异常(如NaN)
        if stats['data'].get('cooperation_rate') == 'NaN':
            alerts.append({
                'level': 'error',
                'code': 'CALC_ERROR',
                'message': '成交率计算出错',
                'action': '检查数据库状态和计算逻辑'
            })

        # 4. 发送告警
        for alert in alerts:
            send_alert(alert)

    except Exception as e:
        logger.error(f"Error monitoring dashboard: {str(e)}")
        send_alert({
            'level': 'error',
            'code': 'MONITOR_ERROR',
            'message': f'看板监控出错: {str(e)}',
            'action': '检查监控脚本'
        })
```

#### 趋势数据不足处理

```python
def get_monthly_trend():
    """获取月度趋势(处理数据不足)"""

    # 查询最近12个月的数据
    cutoff_date = datetime.utcnow() - timedelta(days=365)

    trend_data = db.query("""
        SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
        FROM distributors
        WHERE created_at >= %s
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
    """, [cutoff_date])

    # 检查数据是否足够
    if len(trend_data) < 3:
        return {
            'status': 'insufficient_data',
            'data': trend_data,
            'message': '历史数据不足，至少需要3个月数据才能显示趋势',
            'tips': '继续使用系统，数据将逐月积累',
            'required_months': 3,
            'current_months': len(trend_data)
        }

    return {
        'status': 'success',
        'data': trend_data,
        'trend': calculate_trend_direction(trend_data)
    }

def calculate_trend_direction(data):
    """计算趋势方向"""

    if len(data) < 2:
        return 'insufficient'

    # 简单的线性趋势
    first_value = data[0]['count']
    last_value = data[-1]['count']

    if last_value > first_value * 1.1:
        return 'up'
    elif last_value < first_value * 0.9:
        return 'down'
    else:
        return 'stable'
```

#### 分母为零防护

```python
def safe_divide(numerator, denominator, default=0):
    """安全的除法操作"""

    if denominator is None or denominator == 0:
        logger.warning(f"Division by zero: {numerator}/{denominator}, returning {default}")
        return default

    try:
        result = numerator / denominator

        # 检查结果合理性
        if math.isnan(result) or math.isinf(result):
            logger.warning(f"Invalid division result: {result}, returning {default}")
            return default

        return result

    except Exception as e:
        logger.error(f"Division error: {str(e)}")
        return default

# 使用示例
cooperation_rate = safe_divide(
    cooperated_count,
    total_count,
    default=0
)
```

---

## 总结

本数据架构设计围绕以下核心原则:

1. **三层分离**: 应用层权限隔离、Redis缓存聚合、PostgreSQL业务数据
2. **事件溯源**: 独立的事件表支持完整的审计追溯，不影响业务查询性能
3. **准实时**: 定时聚合+缓存提供满足业务需求的准实时数据(1-5分钟延迟)
4. **灵活扩展**: JSONB字段和分区表支持未来业务迭代
5. **权限安全**: 应用层统一过滤，确保数据隔离和防止越权访问
6. **高可靠**: ACID事务、备份恢复、监控告警构成完整的可靠性保障
7. **完整规范**: API契约、表单验证、权限管理、数据迁移、异常处理的详细规范

**设计亮点**:
- ✓ 简单可靠: 单机架构，易于部署和维护
- ✓ 性能优化: 缓存策略和索引优化提供毫秒级响应
- ✓ 未来可扩展: 表分区、主从复制等升级路径已预留
- ✓ 数据安全: 多层权限控制和审计日志保证数据安全
- ✓ 开发指南: 完整的API、表单、权限、迁移、异常处理规范提供清晰的开发指导

