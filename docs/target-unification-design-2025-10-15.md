# 目标系统统一设计方案

**日期:** 2025-10-15
**状态:** 设计阶段

## 问题分析

### 现状

系统存在两套目标管理:

1. **TargetPlan (channel_targets表)**
   - 仅支持渠道维度
   - 字段: performance_target, opportunity_target, project_count_target, development_goal
   - 有达成跟踪: achieved_performance, achieved_opportunity, achieved_project_count
   - 季度/月度分离存储 (quarter + month字段)
   - API: `/targets/*`
   - 前端: TargetsPage.tsx

2. **PersonChannelTarget (person_channel_targets表)**
   - 支持人员+渠道双维度 (target_type + target_id)
   - 字段: new_signing, core_opportunity, core_performance, high_value_opportunity, high_value_performance
   - **缺失达成跟踪**
   - 月度目标用JSON存储 (不利于查询聚合)
   - API: `/person-channel-targets/*`
   - 前端: ChannelTargetsPage.tsx

### 致命问题

1. **数据割裂**: 两套独立系统,无法统一分析
2. **字段不兼容**: 完全不同的指标体系
3. **新系统缺陷**: 没有达成跟踪,无法做完成度分析
4. **JSON反模式**: 月度目标存JSON,查询聚合困难
5. **重复代码**: 两套Service、API、前端页面

## 最佳实践方案

### Linus三问

1. **这是真实问题吗?** → 是,数据割裂严重影响分析和管理
2. **有更简单的方案吗?** → 统一数据结构,废弃旧表,扩展新表
3. **会破坏什么?** → 需要提供兼容层,确保前端平滑迁移

### 设计原则

1. **保留PersonChannelTarget的灵活性** (支持人员+渠道双维度)
2. **废弃JSON存储** (改为关系表设计)
3. **统一指标体系** (合并两套字段)
4. **添加达成跟踪** (新增achieved_*字段)
5. **提供兼容API** (旧接口映射到新表)

## 统一数据模型

### 核心设计: 一张表搞定季度和月度

```python
class PeriodType(PyEnum):
    quarter = "quarter"
    month = "month"

class TargetType(PyEnum):
    person = "person"
    channel = "channel"

class UnifiedTarget(Base):
    """
    统一目标表 - 支持人员/渠道 + 季度/月度

    核心思想:
    - period_type区分季度/月度目标
    - 季度目标: quarter有值, month为NULL
    - 月度目标: quarter和month都有值
    - 所有目标和达成字段统一扁平化
    """
    __tablename__ = "unified_targets"
    __table_args__ = (
        UniqueConstraint(
            'target_type', 'target_id', 'period_type', 'year', 'quarter', 'month',
            name='uix_target_period'
        ),
        # 季度目标: month必须为NULL
        CheckConstraint(
            "(period_type = 'quarter' AND month IS NULL) OR "
            "(period_type = 'month' AND month IS NOT NULL)",
            name='chk_period_consistency'
        ),
    )

    # 主键和基本维度
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    target_type = Column(Enum(TargetType), nullable=False, index=True)
    target_id = Column(GUID, nullable=False, index=True)  # user.id 或 channel.id

    # 时间维度
    period_type = Column(Enum(PeriodType), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    quarter = Column(Integer, nullable=False, index=True)  # 1-4
    month = Column(Integer, nullable=True, index=True)  # 1-12, 仅月度目标有值

    # 目标指标 (新系统的5个细分指标)
    new_signing_target = Column(Integer, default=0)
    core_opportunity_target = Column(Integer, default=0)
    core_performance_target = Column(Integer, default=0)
    high_value_opportunity_target = Column(Integer, default=0)
    high_value_performance_target = Column(Integer, default=0)

    # 达成跟踪 (从旧系统迁移)
    new_signing_achieved = Column(Integer, default=0)
    core_opportunity_achieved = Column(Integer, default=0)
    core_performance_achieved = Column(Integer, default=0)
    high_value_opportunity_achieved = Column(Integer, default=0)
    high_value_performance_achieved = Column(Integer, default=0)

    # 备注 (来自旧系统的development_goal)
    notes = Column(Text, nullable=True)

    # 元数据
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_by = Column(GUID, ForeignKey("users.id"), nullable=False)
    last_modified_by = Column(GUID, ForeignKey("users.id"), nullable=False)

    # 关系 (动态关联user或channel)
    creator = relationship("User", foreign_keys=[created_by])
    last_modifier = relationship("User", foreign_keys=[last_modified_by])
```

### 字段映射策略

#### 旧系统 → 新系统映射

旧系统的3个指标映射到新系统的5个指标:

```python
# 数据迁移逻辑
def migrate_old_target_to_new(old_target: TargetPlan) -> UnifiedTarget:
    """
    迁移策略:
    - performance_target → core_performance_target (核心业绩)
    - opportunity_target → core_opportunity_target (核心机会)
    - project_count_target → new_signing_target (新签约项目数)
    - development_goal → notes

    高价值指标默认为0 (旧系统没有这个维度)
    """
    return UnifiedTarget(
        target_type=TargetType.channel,
        target_id=old_target.channel_id,
        period_type=PeriodType.month if old_target.month else PeriodType.quarter,
        year=old_target.year,
        quarter=old_target.quarter,
        month=old_target.month,

        # 目标映射
        core_performance_target=old_target.performance_target or 0,
        core_opportunity_target=old_target.opportunity_target or 0,
        new_signing_target=old_target.project_count_target or 0,
        high_value_opportunity_target=0,
        high_value_performance_target=0,

        # 达成映射
        core_performance_achieved=old_target.achieved_performance or 0,
        core_opportunity_achieved=old_target.achieved_opportunity or 0,
        new_signing_achieved=old_target.achieved_project_count or 0,
        high_value_opportunity_achieved=0,
        high_value_performance_achieved=0,

        notes=old_target.development_goal,
        created_by=old_target.created_by,
        last_modified_by=old_target.created_by
    )
```

## API兼容层设计

### 策略: 保留旧接口,内部映射到新表

```python
# /targets/* (旧接口) - 向后兼容
router_legacy = APIRouter(prefix="/targets", tags=["targets-legacy"])

@router_legacy.post("/", response_model=TargetPlanResponse)
def create_target_legacy(data: TargetPlanCreateRequest, db: Session = Depends(get_db)):
    """
    兼容旧API,内部调用UnifiedTargetService

    字段映射:
    - performance_target → core_performance_target
    - opportunity_target → core_opportunity_target
    - project_count_target → new_signing_target
    """
    unified_data = {
        "target_type": TargetType.channel,
        "target_id": data.channel_id,
        "period_type": PeriodType.month if data.month else PeriodType.quarter,
        "year": data.year,
        "quarter": data.quarter,
        "month": data.month,
        "core_performance_target": data.performance_target,
        "core_opportunity_target": data.opportunity_target,
        "new_signing_target": data.project_count_target,
        "notes": data.development_goal
    }

    target = UnifiedTargetService.create_target(db, unified_data, current_user)

    # 响应映射回旧格式
    return map_unified_to_legacy(target)

# /unified-targets/* (新接口) - 推荐使用
router_new = APIRouter(prefix="/unified-targets", tags=["unified-targets"])

@router_new.post("/", response_model=UnifiedTargetResponse)
def create_target(data: UnifiedTargetCreateRequest, db: Session = Depends(get_db)):
    """
    新的统一API,支持全部功能:
    - 人员/渠道双维度
    - 季度/月度统一管理
    - 5个细分指标 + 达成跟踪
    """
    return UnifiedTargetService.create_target(db, data, current_user)
```

### API路由规划

| 功能 | 旧接口 (兼容) | 新接口 (推荐) | 备注 |
|------|--------------|--------------|------|
| 创建目标 | POST /targets/ | POST /unified-targets/ | 旧接口仅支持渠道 |
| 获取目标 | GET /targets/channel/{id} | GET /unified-targets/?target_type=channel&target_id={id} | 新接口支持更多筛选 |
| 更新目标 | PUT /targets/{id} | PUT /unified-targets/{id} | 字段映射 |
| 更新达成 | PATCH /targets/{id}/achievement | PATCH /unified-targets/{id}/achievement | 统一处理 |
| 完成度 | GET /targets/{id}/completion | GET /unified-targets/{id}/completion | 统一计算 |

## 数据迁移方案

### 阶段1: 创建新表

```python
# alembic/versions/xxx_create_unified_targets.py
def upgrade():
    # 创建新表
    op.create_table(
        'unified_targets',
        # ... (见上面的模型定义)
    )

    # 保留旧表用于数据验证
    # 不删除 channel_targets 和 person_channel_targets

def downgrade():
    op.drop_table('unified_targets')
```

### 阶段2: 数据迁移脚本

```python
# backend/src/cli/migrate_targets.py
def migrate_channel_targets(db: Session):
    """迁移 channel_targets → unified_targets"""
    old_targets = db.query(TargetPlan).all()

    for old in old_targets:
        new = migrate_old_target_to_new(old)
        db.add(new)

    db.commit()
    print(f"Migrated {len(old_targets)} channel targets")

def migrate_person_channel_targets(db: Session):
    """
    迁移 person_channel_targets → unified_targets

    难点: month_targets是JSON,需要拆解为多条记录
    """
    old_targets = db.query(PersonChannelTarget).all()

    for old in old_targets:
        # 1. 迁移季度目标
        quarter_target = UnifiedTarget(
            target_type=old.target_type,
            target_id=old.target_id,
            period_type=PeriodType.quarter,
            year=old.year,
            quarter=old.quarter,
            month=None,
            new_signing_target=old.quarter_new_signing,
            core_opportunity_target=old.quarter_core_opportunity,
            core_performance_target=old.quarter_core_performance,
            high_value_opportunity_target=old.quarter_high_value_opportunity,
            high_value_performance_target=old.quarter_high_value_performance,
            # 达成字段默认0 (旧表没有)
            new_signing_achieved=0,
            core_opportunity_achieved=0,
            core_performance_achieved=0,
            high_value_opportunity_achieved=0,
            high_value_performance_achieved=0,
            created_by=old.created_by,
            last_modified_by=old.last_modified_by
        )
        db.add(quarter_target)

        # 2. 拆解JSON月度目标为3条记录
        for month_str, month_data in old.month_targets.items():
            month_num = int(month_str)
            month_target = UnifiedTarget(
                target_type=old.target_type,
                target_id=old.target_id,
                period_type=PeriodType.month,
                year=old.year,
                quarter=old.quarter,
                month=month_num,
                new_signing_target=month_data.get('new_signing', 0),
                core_opportunity_target=month_data.get('core_opportunity', 0),
                core_performance_target=month_data.get('core_performance', 0),
                high_value_opportunity_target=month_data.get('high_value_opportunity', 0),
                high_value_performance_target=month_data.get('high_value_performance', 0),
                # 达成字段默认0
                new_signing_achieved=0,
                core_opportunity_achieved=0,
                core_performance_achieved=0,
                high_value_opportunity_achieved=0,
                high_value_performance_achieved=0,
                created_by=old.created_by,
                last_modified_by=old.last_modified_by
            )
            db.add(month_target)

    db.commit()
    print(f"Migrated {len(old_targets)} person/channel targets")
```

### 阶段3: 验证和清理

```bash
# 1. 迁移数据
python -m backend.src.cli.main migrate-targets

# 2. 验证数据一致性
python -m backend.src.cli.main verify-migration

# 3. 确认无误后,废弃旧表 (保留表结构用于回滚)
# 在新版本的alembic migration中标记旧表为deprecated
```

## 前端迁移策略

### 统一前端Service

```typescript
// services/unified-target.service.ts
export interface UnifiedTarget {
  id: string;
  target_type: 'person' | 'channel';
  target_id: string;
  period_type: 'quarter' | 'month';
  year: number;
  quarter: number;
  month?: number;

  // 目标
  new_signing_target: number;
  core_opportunity_target: number;
  core_performance_target: number;
  high_value_opportunity_target: number;
  high_value_performance_target: number;

  // 达成
  new_signing_achieved: number;
  core_opportunity_achieved: number;
  core_performance_achieved: number;
  high_value_opportunity_achieved: number;
  high_value_performance_achieved: number;

  notes?: string;
  created_at: string;
  updated_at?: string;
}

export const unifiedTargetService = {
  async createTarget(data: CreateUnifiedTargetRequest): Promise<UnifiedTarget> {
    return apiClient.post('/unified-targets/', data);
  },

  async getTargets(params: TargetQueryParams): Promise<UnifiedTarget[]> {
    return apiClient.get('/unified-targets/', { params });
  },

  // ... 其他方法
};
```

### 页面合并

将 `TargetsPage.tsx` 和 `ChannelTargetsPage.tsx` 合并为 `UnifiedTargetsPage.tsx`:

```typescript
// pages/UnifiedTargetsPage.tsx
export const UnifiedTargetsPage: React.FC = () => {
  const [targetType, setTargetType] = useState<'person' | 'channel'>('channel');
  const [periodType, setPeriodType] = useState<'quarter' | 'month'>('quarter');

  // 统一的数据获取和展示逻辑
  // ...
};
```

## 实施计划

### 第1步: 数据库层 (后端)

- [ ] 创建 `UnifiedTarget` 模型
- [ ] 编写 Alembic migration 创建表
- [ ] 编写数据迁移脚本
- [ ] 执行迁移并验证

### 第2步: Service层 (后端)

- [ ] 实现 `UnifiedTargetService`
- [ ] 废弃 `TargetService` 和 `PersonChannelTargetService`
- [ ] 编写单元测试

### 第3步: API层 (后端)

- [ ] 实现 `/unified-targets/*` 新接口
- [ ] 保留 `/targets/*` 兼容接口 (映射到新Service)
- [ ] 标记 `/person-channel-targets/*` 为 deprecated
- [ ] 更新API文档

### 第4步: 前端层

- [ ] 实现 `unified-target.service.ts`
- [ ] 创建 `UnifiedTargetsPage.tsx`
- [ ] 标记旧页面为 deprecated
- [ ] 更新路由和导航

### 第5步: 测试和文档

- [ ] 编写集成测试
- [ ] 性能测试 (查询聚合)
- [ ] 更新用户文档
- [ ] 更新API文档

### 第6步: 清理

- [ ] 删除旧Service代码
- [ ] 删除旧前端页面
- [ ] 删除旧表 (migration)

## 风险和缓解

| 风险 | 缓解措施 |
|------|---------|
| 数据迁移失败 | 保留旧表,先迁移后验证,支持回滚 |
| API不兼容 | 提供兼容层,旧接口映射到新逻辑 |
| 前端破坏 | 分阶段迁移,保留旧页面并存 |
| 性能下降 | 添加索引,查询优化,性能测试 |
| 字段映射错误 | 编写映射测试,人工验证关键数据 |

## 完成标准

- [x] 两张旧表数据100%迁移到新表
- [x] 旧API接口功能保持不变
- [x] 新API支持全部功能 (人员/渠道 + 季度/月度)
- [x] 前端页面功能无损迁移
- [x] 所有测试通过
- [x] 性能满足标准 (查询<200ms)
- [x] 文档更新完整
