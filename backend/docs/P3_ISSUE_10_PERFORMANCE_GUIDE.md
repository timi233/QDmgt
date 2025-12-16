# 问题 #10 修复：性能监控和优化

## 修复概述

实现了全面的性能监控系统，包括HTTP请求监控、数据库查询性能监控、系统资源监控等。

## 实现内容

### 1. 性能监控中间件 (`src/middlewares/performanceMonitor.ts`)

#### HTTP性能监控 (`PerformanceMetrics`)

**功能**：
- 记录所有HTTP请求的响应时间
- 识别和记录慢请求（默认阈值: 100ms）
- 统计请求数量和路由访问频率
- 统计错误数量和错误路由

**指标**：
- 平均响应时间
- 最小/最大响应时间
- P95响应时间（95%的请求响应时间）
- P99响应时间（99%的请求响应时间）
- 慢请求列表
- 访问最多的路由Top 10
- 错误最多的路由Top 10

#### 数据库性能监控 (`DatabaseMetrics`)

**功能**：
- 记录所有数据库查询
- 识别和记录慢查询（默认阈值: 50ms）
- 统计查询数量和平均耗时

**指标**：
- 查询总数
- 平均查询时间
- 最小/最大查询时间
- 慢查询列表

#### 系统资源监控

**内存监控** (`getMemoryMetrics`)：
- 堆内存使用量（heapUsed）
- 堆内存总量（heapTotal）
- 常驻集大小（rss）
- 外部内存（external）
- ArrayBuffers内存

**CPU监控** (`getCpuMetrics`)：
- 用户CPU时间
- 系统CPU时间

**系统信息** (`getSystemMetrics`)：
- 运行时间（uptime）
- Node.js版本
- 平台信息
- 架构信息
- 进程ID

### 2. 性能监控控制器 (`src/controllers/performanceController.ts`)

提供HTTP API端点：
- GET `/api/performance/metrics` - 获取所有性能指标
- GET `/api/performance/http` - 获取HTTP性能指标
- GET `/api/performance/database` - 获取数据库性能指标
- GET `/api/performance/system` - 获取系统资源使用情况
- POST `/api/performance/reset` - 重置性能指标

### 3. 性能监控路由 (`src/routes/performanceRoutes.ts`)

- 所有端点需要认证（`authenticateToken`）
- 仅leader角色可访问（`requireRole('leader')`）

### 4. Prisma查询监控集成 (`src/utils/prisma.ts`)

- 自动记录所有数据库查询到性能监控系统
- 与现有的慢查询日志协同工作
- 提供统计数据支持

### 5. 应用集成 (`src/app.ts`)

- 添加性能监控中间件到请求处理流程
- 挂载性能监控路由

## 使用示例

### API调用

#### 获取所有性能指标
```bash
curl "http://localhost:4000/api/performance/metrics" \
  -H "Cookie: token=YOUR_TOKEN"
```

响应示例：
```json
{
  "http": {
    "responseTime": {
      "avg": 45,
      "min": 2,
      "max": 523,
      "p95": 120,
      "p99": 250
    },
    "requests": {
      "total": 1250,
      "topRoutes": [
        {"route": "GET /api/distributors", "count": 450},
        {"route": "GET /api/tasks", "count": 320},
        {"route": "POST /api/auth/login", "count": 85}
      ]
    },
    "slowRequests": {
      "count": 12,
      "threshold": 100,
      "recent": [
        {
          "method": "GET",
          "path": "/api/data/events",
          "duration": 250,
          "timestamp": "2025-12-03T10:30:00.000Z"
        }
      ]
    },
    "errors": {
      "total": 25,
      "topErrors": [
        {"route": "POST /api/auth/login", "count": 15},
        {"route": "GET /api/distributors/invalid-id", "count": 10}
      ]
    }
  },
  "database": {
    "totalQueries": 3500,
    "avgDuration": 12,
    "minDuration": 1,
    "maxDuration": 85,
    "slowQueries": {
      "count": 8,
      "threshold": 50,
      "recent": [
        {
          "query": "SELECT * FROM \"Distributor\" WHERE...",
          "duration": 75,
          "timestamp": "2025-12-03T10:25:00.000Z"
        }
      ]
    }
  },
  "memory": {
    "heapUsed": 45,
    "heapTotal": 75,
    "rss": 120,
    "external": 2,
    "arrayBuffers": 1
  },
  "cpu": {
    "user": 1234,
    "system": 567
  },
  "system": {
    "uptime": 86400,
    "nodeVersion": "v20.10.0",
    "platform": "linux",
    "arch": "x64",
    "pid": 12345
  },
  "timestamp": "2025-12-03T10:30:00.000Z"
}
```

#### 获取HTTP性能指标
```bash
curl "http://localhost:4000/api/performance/http" \
  -H "Cookie: token=YOUR_TOKEN"
```

#### 获取数据库性能指标
```bash
curl "http://localhost:4000/api/performance/database" \
  -H "Cookie: token=YOUR_TOKEN"
```

#### 获取系统资源使用情况
```bash
curl "http://localhost:4000/api/performance/system" \
  -H "Cookie: token=YOUR_TOKEN"
```

#### 重置性能指标
```bash
curl -X POST "http://localhost:4000/api/performance/reset" \
  -H "Cookie: token=YOUR_TOKEN"
```

响应：
```json
{
  "message": "Performance metrics reset successfully"
}
```

## 性能指标说明

### HTTP响应时间

**平均响应时间 (avg)**
- 所有请求的平均响应时间
- 用于评估整体性能

**P95响应时间**
- 95%的请求响应时间低于此值
- 代表大多数用户的体验

**P99响应时间**
- 99%的请求响应时间低于此值
- 用于识别异常情况

**最大响应时间 (max)**
- 最慢的请求响应时间
- 用于识别性能瓶颈

### 慢请求阈值

**默认值**：
- HTTP请求：100ms
- 数据库查询：50ms

**调整方法**：
```typescript
import { performanceMetrics, databaseMetrics } from './middlewares/performanceMonitor'

// 设置慢请求阈值为200ms
performanceMetrics.setSlowQueryThreshold(200)

// 设置慢查询阈值为100ms
databaseMetrics.setSlowQueryThreshold(100)
```

### 内存指标说明

**heapUsed**
- V8引擎实际使用的堆内存
- 持续增长可能表示内存泄漏

**heapTotal**
- V8引擎分配的总堆内存
- 包括已使用和未使用的部分

**rss (Resident Set Size)**
- 进程实际占用的物理内存
- 包括堆、栈、代码段等

**external**
- V8管理的JavaScript对象绑定的C++对象占用的内存

## 性能优化建议

### 基于监控数据优化

#### 1. 识别慢请求
```bash
# 查看慢请求列表
curl "http://localhost:4000/api/performance/http" | jq '.slowRequests'
```

常见原因和解决方案：
- **大量数据返回**：添加分页
- **复杂查询**：优化数据库查询
- **外部API调用**：添加缓存或异步处理
- **同步计算**：移到后台任务

#### 2. 识别慢查询
```bash
# 查看慢查询列表
curl "http://localhost:4000/api/performance/database" | jq '.slowQueries'
```

优化策略：
- 添加数据库索引
- 优化查询语句
- 使用查询缓存
- 限制返回字段

示例 - 添加索引：
```prisma
model Distributor {
  id String @id @default(uuid())
  name String
  region String
  ownerUserId String

  @@index([ownerUserId])  // 添加索引
  @@index([region])       // 添加索引
}
```

#### 3. 监控内存使用
```bash
# 定期检查内存使用
curl "http://localhost:4000/api/performance/system" | jq '.memory'
```

内存优化：
- 及时清理不需要的对象
- 避免全局变量累积
- 使用流式处理大数据
- 定期重启应用

### 性能基准

**良好的性能指标**：
- 平均响应时间 < 100ms
- P95响应时间 < 200ms
- P99响应时间 < 500ms
- 平均查询时间 < 20ms
- 内存使用增长稳定

**需要优化的指标**：
- 平均响应时间 > 200ms
- P95响应时间 > 500ms
- 慢请求数量 > 总请求的5%
- 内存持续增长
- CPU使用率持续高于80%

## 监控集成

### Grafana仪表板

可以将指标导出到Grafana进行可视化：

```typescript
// 定期发送指标到时序数据库
import { performanceMetrics } from './middlewares/performanceMonitor'

setInterval(async () => {
  const metrics = performanceMetrics.getMetrics()

  // 发送到InfluxDB/Prometheus等
  await sendMetrics({
    avgResponseTime: metrics.responseTime.avg,
    p95ResponseTime: metrics.responseTime.p95,
    totalRequests: metrics.requests.total,
    slowRequests: metrics.slowRequests.count,
  })
}, 60000) // 每分钟
```

### 告警设置

基于阈值的告警：

```typescript
import { performanceMetrics } from './middlewares/performanceMonitor'
import logger from './utils/logger'

setInterval(() => {
  const metrics = performanceMetrics.getMetrics()

  // P95响应时间告警
  if (metrics.responseTime.p95 > 500) {
    logger.error('Performance alert: P95 response time exceeds 500ms', {
      p95: metrics.responseTime.p95,
      p99: metrics.responseTime.p99,
    })
  }

  // 慢请求比例告警
  const slowRequestRatio = metrics.slowRequests.count / metrics.requests.total
  if (slowRequestRatio > 0.1) {
    logger.error('Performance alert: Slow request ratio exceeds 10%', {
      slowRequests: metrics.slowRequests.count,
      totalRequests: metrics.requests.total,
      ratio: `${(slowRequestRatio * 100).toFixed(2)}%`,
    })
  }
}, 60000) // 每分钟检查
```

## 性能测试

### 基准测试

使用Apache Bench测试：
```bash
# 测试登录端点
ab -n 1000 -c 10 -p login.json -T application/json http://localhost:4000/api/auth/login

# 测试列表端点
ab -n 1000 -c 10 -H "Cookie: token=YOUR_TOKEN" http://localhost:4000/api/distributors
```

### 负载测试

使用Artillery进行负载测试：

```yaml
# artillery.yml
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "API workflow"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "TestPassword123!"
      - get:
          url: "/api/distributors"
      - get:
          url: "/api/tasks"
```

运行测试：
```bash
artillery run artillery.yml
```

### 压力测试

使用k6进行压力测试：

```javascript
// k6-test.js
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
}

export default function () {
  let response = http.get('http://localhost:4000/api/distributors')

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  })
}
```

运行测试：
```bash
k6 run k6-test.js
```

## 最佳实践

### 1. 定期检查性能指标
```bash
# 创建监控脚本
cat > monitor-performance.sh << 'EOF'
#!/bin/bash
while true; do
  echo "=== Performance Metrics @ $(date) ==="
  curl -s "http://localhost:4000/api/performance/metrics" \
    -H "Cookie: token=$TOKEN" | jq '
    {
      http: {
        avg: .http.responseTime.avg,
        p95: .http.responseTime.p95,
        total: .http.requests.total
      },
      database: {
        avg: .database.avgDuration,
        total: .database.totalQueries
      },
      memory: .memory.heapUsed
    }'
  sleep 60
done
EOF

chmod +x monitor-performance.sh
./monitor-performance.sh
```

### 2. 性能回归测试
每次部署前运行性能测试并比较结果

### 3. 生产环境监控
- 设置告警阈值
- 定期导出指标到时序数据库
- 创建可视化仪表板
- 保留历史数据用于趋势分析

### 4. 持续优化
- 识别瓶颈
- 实施优化
- 测试验证
- 监控效果

## 限制和注意事项

1. **内存限制**
   - 指标保存在内存中
   - 保留最近1000个请求数据
   - 应用重启后指标清空

2. **精度限制**
   - 毫秒级精度
   - 统计样本有限

3. **性能开销**
   - 监控本身有小量开销
   - 建议生产环境启用

## 未来改进

1. **持久化指标**
   - 将指标保存到时序数据库
   - 长期趋势分析

2. **更多指标**
   - 网络I/O
   - 磁盘I/O
   - 并发连接数

3. **分布式追踪**
   - 请求链路追踪
   - 跨服务性能分析

4. **自动优化建议**
   - 基于ML的性能分析
   - 自动优化建议

## 总结

问题 #10 已完成：

✅ 实现HTTP性能监控
✅ 实现数据库查询监控
✅ 实现系统资源监控
✅ 提供性能指标API
✅ 集成Prisma查询监控
✅ 识别慢请求和慢查询
✅ 提供详细文档和最佳实践

系统现在具有全面的性能可观测性，可以及时发现和解决性能问题。
