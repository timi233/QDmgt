# 渠道管理系统重构方案

> 基于代码审查反馈的全面修改方案
> 创建时间：2025-10-13
> 版本：1.0

---

## 📋 目录

1. [修改策略](#修改策略)
2. [阶段 0：紧急修复](#阶段-0紧急修复1-2天)
3. [阶段 1：测试基础设施](#阶段-1测试基础设施3-5天)
4. [阶段 2：认证系统完善](#阶段-2认证系统完善2-3天)
5. [阶段 3：数据库迁移](#阶段-3数据库迁移1-2天)
6. [阶段 4：代码重构](#阶段-4代码重构2-3天)
7. [验收标准](#验收标准)
8. [时间表](#时间表)

---

## 修改策略

**核心原则**：遵循宪章 TDD 要求 - **测试 → 实现 → 重构**

**执行方式**：分 4 个阶段，每个阶段完成后进行验证

**预计总时间**：9-15 个工作日

---

## 🔥 阶段 0：紧急修复（1-2天）

### 目标
修复阻塞性问题，使系统可运行

### 任务清单

#### 1. 修复 CLI 导入路径

**问题描述**：
- 文件：`backend/src/cli/main.py`
- 第 19-31 行使用了错误的相对路径
- 导致 CLI 模块完全无法运行

**修改方案**：
```python
# ❌ 错误的导入（当前）
from ..backend.src.database import get_db
from ..backend.src.models.user import User

# ✅ 正确的导入
from ..database import get_db
from ..models.user import User
from ..models.channel import Channel
from ..models.channel_target import ChannelTarget
from ..models.assignment import ChannelAssignment
from ..models.execution_plan import ExecutionPlan
from ..services.channel_service import ChannelService
from ..services.target_service import TargetService
from ..services.assignment_service import AssignmentService
from ..services.execution_service import ExecutionService
from ..config.settings import settings
from ..utils.logger import logger
```

**验证方法**：
```bash
python -m backend.src.cli.main health
python -m backend.src.cli.main --help
```

---

#### 2. 创建 .env.example 模板

**问题描述**：
- 缺少环境变量配置模板
- 新开发者不知道需要配置哪些环境变量

**创建文件**：`.env.example`
```bash
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/channel_management
# 开发环境可以使用 SQLite：sqlite:///./test.db

# JWT 配置
JWT_SECRET_KEY=CHANGE_THIS_TO_A_SECURE_RANDOM_KEY_AT_LEAST_32_CHARACTERS
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# 应用配置
APP_NAME=Channel Management System
VERSION=0.1.0
ENVIRONMENT=development
DEBUG=false

# 日志配置
LOG_LEVEL=INFO

# 安全配置
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8000"]
SECRET_KEY=CHANGE_THIS_TO_A_SECURE_RANDOM_SECRET_KEY

# Redis 配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

**同步更新**：
- `README.md` 添加环境配置说明
- `docs/README.md` 添加详细配置文档

---

#### 3. 修复数据库连接池配置

**问题描述**：
- 当前配置：`pool_size=20, max_overflow=40`（最多 60 个连接）
- 对于小型应用过于激进，可能导致资源浪费

**修改文件**：`backend/src/database.py:11-19`
```python
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,        # ✅ 从 20 降到 5
    max_overflow=10,    # ✅ 从 40 降到 10
    pool_recycle=3600,
    pool_pre_ping=True,
    pool_timeout=30,
    echo=settings.DEBUG,
)
```

**理由**：
- 5 个持久连接 + 10 个溢出 = 最多 15 个连接
- 适合中小型应用，减少数据库负载
- 后续可根据实际压力测试调整

---

#### 4. 修复 SQL 注入风险

**问题描述**：
- 文件：`backend/src/main.py:62`
- 使用原始 SQL 字符串，SQLAlchemy 2.0 要求使用 `text()`

**修改方案**：
```python
# 添加导入
from sqlalchemy import text

# 修改健康检查
@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))  # ✅ 使用 text()
            db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        db_status = "unhealthy"

    # ... 其余代码
```

---

### 阶段 0 验收标准

```bash
# 1. CLI 可以运行
python -m backend.src.cli.main health

# 2. 数据库连接正常
python -m backend.src.cli.main init-db

# 3. 环境配置正确
python -c "from backend.src.config.settings import settings; print(settings.DATABASE_URL)"

# 4. 健康检查通过
curl http://localhost:8000/health
```

---

## 🧪 阶段 1：测试基础设施（3-5天）

### 目标
建立测试框架，达到 80% 单元测试覆盖率

### 任务清单

#### 1. 创建测试配置文件

**新建文件**：`backend/src/tests/conftest.py`
```python
"""
测试配置和共享 fixtures
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from ..database import Base, get_db
from ..main import create_app


@pytest.fixture(scope="session")
def test_engine():
    """创建测试数据库引擎（内存数据库）"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def test_db(test_engine):
    """
    创建测试数据库会话
    每个测试函数执行后回滚
    """
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=test_engine
    )
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def test_client(test_db):
    """创建测试客户端"""
    app = create_app()

    # 覆盖数据库依赖
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    return TestClient(app)


@pytest.fixture
def test_user(test_db):
    """创建测试用户"""
    from ..models.user import User
    from uuid import uuid4

    user = User(
        id=uuid4(),
        username="testuser",
        email="test@example.com",
        hashed_password="hashed_password_123",
        role="user",
        is_active=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    return user


@pytest.fixture
def test_admin(test_db):
    """创建测试管理员"""
    from ..models.user import User
    from uuid import uuid4

    admin = User(
        id=uuid4(),
        username="admin",
        email="admin@example.com",
        hashed_password="hashed_password_456",
        role="admin",
        is_active=True
    )
    test_db.add(admin)
    test_db.commit()
    test_db.refresh(admin)

    return admin
```

---

#### 2. 编写单元测试

**测试目录结构**：
```
backend/src/tests/
├── conftest.py              # ✅ 测试配置
├── unit/                    # 单元测试
│   ├── __init__.py
│   ├── test_models.py       # ✅ 模型测试
│   ├── test_channel_service.py
│   ├── test_target_service.py
│   ├── test_assignment_service.py
│   ├── test_execution_service.py
│   └── test_auth_service.py
├── integration/             # 集成测试
│   ├── __init__.py
│   ├── test_channels_api.py
│   ├── test_auth_api.py
│   ├── test_targets_api.py
│   └── test_assignments_api.py
└── cli/                     # CLI 测试
    ├── __init__.py
    └── test_cli_commands.py
```

**示例测试文件**：`backend/src/tests/unit/test_channel_service.py`
```python
"""
ChannelService 单元测试
"""
import pytest
from uuid import uuid4

from ...services.channel_service import ChannelService
from ...models.channel import Channel, ChannelStatus, BusinessType
from ...utils.exceptions import ValidationError, ConflictError


class TestChannelService:
    """渠道服务测试类"""

    def test_create_channel_success(self, test_db, test_user):
        """测试成功创建渠道"""
        channel = ChannelService.create_channel(
            db=test_db,
            name="测试渠道",
            description="这是一个测试渠道",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            contact_email="channel@example.com",
            contact_phone="1234567890",
            created_by=test_user.id
        )

        assert channel.name == "测试渠道"
        assert channel.description == "这是一个测试渠道"
        assert channel.status == ChannelStatus.active
        assert channel.business_type == BusinessType.basic
        assert channel.created_by == test_user.id
        assert channel.last_modified_by == test_user.id

    def test_create_channel_duplicate_name(self, test_db, test_user):
        """测试创建重名渠道应抛出 ConflictError"""
        ChannelService.create_channel(
            db=test_db,
            name="重复渠道",
            description="第一个",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_user.id
        )

        with pytest.raises(ConflictError) as exc_info:
            ChannelService.create_channel(
                db=test_db,
                name="重复渠道",
                description="第二个",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                created_by=test_user.id
            )

        assert "already exists" in str(exc_info.value)

    def test_create_channel_invalid_email(self, test_db, test_user):
        """测试无效电子邮件应抛出 ValidationError"""
        with pytest.raises(ValidationError) as exc_info:
            ChannelService.create_channel(
                db=test_db,
                name="测试渠道",
                status=ChannelStatus.active,
                business_type=BusinessType.basic,
                contact_email="invalid-email",
                created_by=test_user.id
            )

        assert "Invalid email" in str(exc_info.value)

    def test_get_channel_by_id(self, test_db, test_user):
        """测试通过 ID 获取渠道"""
        created_channel = ChannelService.create_channel(
            db=test_db,
            name="测试获取渠道",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_user.id
        )

        retrieved_channel = ChannelService.get_channel_by_id(
            db=test_db,
            channel_id=created_channel.id
        )

        assert retrieved_channel is not None
        assert retrieved_channel.id == created_channel.id
        assert retrieved_channel.name == "测试获取渠道"

    def test_get_channels_with_filters(self, test_db, test_user):
        """测试带过滤条件的渠道列表"""
        # 创建多个测试渠道
        ChannelService.create_channel(
            db=test_db,
            name="Active Channel 1",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_user.id
        )

        ChannelService.create_channel(
            db=test_db,
            name="Inactive Channel",
            status=ChannelStatus.inactive,
            business_type=BusinessType.high_value,
            created_by=test_user.id
        )

        # 测试状态过滤
        result = ChannelService.get_channels(
            db=test_db,
            status=ChannelStatus.active
        )

        assert result["total"] >= 1
        assert all(ch.status == ChannelStatus.active for ch in result["channels"])

    def test_update_channel(self, test_db, test_user):
        """测试更新渠道"""
        channel = ChannelService.create_channel(
            db=test_db,
            name="原始名称",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_user.id
        )

        updated_channel = ChannelService.update_channel(
            db=test_db,
            channel_id=channel.id,
            name="更新后的名称",
            description="新的描述",
            last_modified_by=test_user.id
        )

        assert updated_channel.name == "更新后的名称"
        assert updated_channel.description == "新的描述"
        assert updated_channel.last_modified_by == test_user.id

    def test_delete_channel(self, test_db, test_user):
        """测试删除渠道"""
        channel = ChannelService.create_channel(
            db=test_db,
            name="待删除渠道",
            status=ChannelStatus.active,
            business_type=BusinessType.basic,
            created_by=test_user.id
        )

        success = ChannelService.delete_channel(
            db=test_db,
            channel_id=channel.id
        )

        assert success is True

        # 验证已删除
        deleted_channel = ChannelService.get_channel_by_id(
            db=test_db,
            channel_id=channel.id
        )
        assert deleted_channel is None
```

---

#### 3. 创建测试运行脚本

**新建文件**：`scripts/run_tests.sh`
```bash
#!/bin/bash
set -e

echo "================================"
echo "运行渠道管理系统测试套件"
echo "================================"
echo ""

# 进入项目根目录
cd "$(dirname "$0")/.."

echo "1. 运行单元测试..."
echo "--------------------------------"
pytest backend/src/tests/unit/ -v --cov=backend/src --cov-report=term-missing

echo ""
echo "2. 运行集成测试..."
echo "--------------------------------"
pytest backend/src/tests/integration/ -v

echo ""
echo "3. 运行 CLI 测试..."
echo "--------------------------------"
pytest backend/src/tests/cli/ -v

echo ""
echo "4. 生成完整覆盖率报告..."
echo "--------------------------------"
pytest backend/src/tests/ \
    --cov=backend/src \
    --cov-report=html \
    --cov-report=term \
    --cov-report=xml

echo ""
echo "5. 检查覆盖率阈值（80%）..."
echo "--------------------------------"
pytest backend/src/tests/ \
    --cov=backend/src \
    --cov-fail-under=80 \
    || echo "⚠️  警告：测试覆盖率低于 80%"

echo ""
echo "================================"
echo "✅ 测试完成！"
echo "HTML 报告位置: htmlcov/index.html"
echo "================================"
```

**设置执行权限**：
```bash
chmod +x scripts/run_tests.sh
```

---

#### 4. 更新 requirements.txt

**添加测试依赖**：
```txt
# 测试依赖
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
pytest-mock==3.12.0
coverage[toml]==7.3.2
```

---

### 阶段 1 验收标准

```bash
# 1. 运行所有测试
./scripts/run_tests.sh

# 2. 检查覆盖率
pytest backend/src/tests/ --cov=backend/src --cov-report=term | grep "TOTAL"

# 3. 验证覆盖率 ≥ 80%
pytest backend/src/tests/ --cov=backend/src --cov-fail-under=80

# 4. 查看 HTML 报告
open htmlcov/index.html
```

**必须通过**：
- ✅ 所有测试通过（0 failures）
- ✅ 单元测试覆盖率 ≥ 80%
- ✅ 集成测试覆盖率 ≥ 70%

---

## 🔐 阶段 2：认证系统完善（2-3天）

### 目标
实现完整的认证流程，支持用户注册、登录、令牌刷新

### 任务清单

#### 1. 创建认证 API 端点

**新建文件**：`backend/src/api/auth.py`
```python
"""
认证 API 端点
提供用户注册、登录、令牌刷新等功能
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from ..database import get_db
from ..auth.auth_service import auth_service
from ..utils.logger import logger


router = APIRouter(prefix="/auth", tags=["authentication"])


# Pydantic 模型
class UserRegisterRequest(BaseModel):
    """用户注册请求"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = Field(None, max_length=255)


class UserLoginRequest(BaseModel):
    """用户登录请求"""
    username: str
    password: str


class TokenResponse(BaseModel):
    """令牌响应"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """刷新令牌请求"""
    refresh_token: str


# API 端点
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    用户注册

    创建新用户账户。密码必须满足安全要求：
    - 至少 8 个字符
    - 包含大小写字母
    - 包含数字
    - 包含特殊字符
    """
    try:
        user = auth_service.create_user(
            db=db,
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            role="user"
        )

        logger.info(f"User registered successfully: {user.username}", extra={
            "user_id": str(user.id),
            "username": user.username
        })

        return {
            "message": "用户注册成功",
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User registration failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册失败，请稍后重试"
        )


@router.post("/login", response_model=TokenResponse)
def login(
    credentials: UserLoginRequest,
    db: Session = Depends(get_db)
):
    """
    用户登录

    使用用户名和密码进行身份验证，成功后返回访问令牌和刷新令牌。
    """
    try:
        result = auth_service.login_user(
            db=db,
            username=credentials.username,
            password=credentials.password
        )

        logger.info(f"User logged in successfully: {credentials.username}")

        return TokenResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录失败，请稍后重试"
        )


@router.post("/refresh")
def refresh_token(
    token_data: RefreshTokenRequest
):
    """
    刷新访问令牌

    使用刷新令牌获取新的访问令牌。
    """
    try:
        result = auth_service.refresh_access_token(
            refresh_token=token_data.refresh_token
        )

        logger.info("Access token refreshed successfully")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="令牌刷新失败"
        )


@router.post("/logout")
def logout():
    """
    用户登出

    由于使用 JWT，登出操作在客户端完成（删除令牌）。
    服务器端可以在此记录登出事件。
    """
    logger.info("User logout endpoint called")

    return {
        "message": "登出成功，请在客户端删除令牌"
    }


@router.get("/me")
def get_current_user_info(
    current_user: dict = Depends(auth_service.auth_manager.get_current_user)
):
    """
    获取当前用户信息

    需要有效的访问令牌。
    """
    return {
        "user_id": current_user.get("sub"),
        "username": current_user.get("username"),
        "email": current_user.get("email"),
        "role": current_user.get("role")
    }
```

---

#### 2. 注册认证路由

**修改文件**：`backend/src/main.py`

在导入部分添加：
```python
from .api import channels, targets, assignments, execution_plans, auth
```

在 `create_app()` 函数中添加：
```python
# Include API routes with version prefix
api_v1_router.include_router(auth.router, prefix="", tags=["auth"])
api_v1_router.include_router(channels.router, prefix="", tags=["channels"])
# ... 其他路由
```

---

#### 3. 改进密码哈希实现

**修改文件**：`backend/src/auth/auth_service.py`

```python
# 修改导入部分
from passlib.hash import pbkdf2_sha256

class AuthManager:
    """认证和授权管理器"""

    # ... 其他代码 ...

    def hash_password(self, password: str) -> str:
        """
        使用 passlib 的 PBKDF2 哈希密码

        Args:
            password: 明文密码

        Returns:
            哈希后的密码字符串
        """
        return pbkdf2_sha256.hash(password)

    def verify_password(self, password: str, hashed: str) -> bool:
        """
        验证密码是否匹配哈希值

        Args:
            password: 明文密码
            hashed: 哈希后的密码

        Returns:
            密码匹配返回 True，否则返回 False
        """
        try:
            return pbkdf2_sha256.verify(password, hashed)
        except Exception as e:
            logger.error(f"Password verification error: {str(e)}")
            return False
```

---

#### 4. 添加生产环境密钥强制验证

**修改文件**：`backend/src/config/settings.py`

修改 `validate_settings()` 函数（约在第 266 行）：
```python
def validate_settings():
    """
    验证关键配置设置

    生产环境下对安全配置进行严格检查

    Raises:
        ValueError: 如果关键设置无效（生产环境）
    """
    issues = []
    critical_issues = []

    # 生产环境严格检查
    if is_production():
        # 检查 JWT 密钥
        if settings.JWT_SECRET_KEY == "your-super-secret-jwt-key-change-in-production":
            critical_issues.append("生产环境使用默认 JWT 密钥")

        if len(settings.JWT_SECRET_KEY) < 32:
            critical_issues.append(f"JWT 密钥长度不足（当前 {len(settings.JWT_SECRET_KEY)} 字符，建议 ≥32）")

        # 检查应用密钥
        if settings.SECRET_KEY == "your-secret-key-here-change-in-production":
            critical_issues.append("生产环境使用默认 SECRET_KEY")

        # 检查数据库
        if not settings.DATABASE_URL.startswith("postgresql://"):
            issues.append("生产环境建议使用 PostgreSQL 数据库")

        # 检查 DEBUG 模式
        if settings.DEBUG:
            critical_issues.append("生产环境不应启用 DEBUG 模式")

    # 检查密码策略
    if settings.PASSWORD_MIN_LENGTH < 8:
        issues.append(f"密码最小长度（{settings.PASSWORD_MIN_LENGTH}）低于推荐值（8）")

    # 检查 CORS 设置
    if "*" in settings.ALLOWED_ORIGINS and not is_development():
        issues.append("非开发环境不建议使用通配符 (*) 作为允许的源")

    # 打印问题
    if critical_issues:
        print("\n" + "="*60)
        print("❌ 严重配置错误（CRITICAL）:")
        print("="*60)
        for issue in critical_issues:
            print(f"  • {issue}")
        print("="*60 + "\n")

        # 生产环境严格失败
        if is_production():
            raise ValueError(
                "生产环境配置验证失败。请修复上述严重错误后重试。"
            )

    if issues:
        print("\n" + "="*60)
        print("⚠️  配置警告（WARNING）:")
        print("="*60)
        for issue in issues:
            print(f"  • {issue}")
        print("="*60 + "\n")

    if not critical_issues and not issues:
        print("✅ 配置验证通过")

    return len(critical_issues) == 0
```

---

### 阶段 2 验收标准

```bash
# 1. 启动服务器
uvicorn backend.src.main:app --reload

# 2. 测试注册接口
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!@#",
    "full_name": "测试用户"
  }'

# 3. 测试登录接口
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!@#"
  }'

# 4. 测试刷新令牌接口
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'

# 5. 测试获取当前用户信息
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 6. 查看 API 文档
open http://localhost:8000/api/docs
```

**必须通过**：
- ✅ 注册接口返回 201 Created
- ✅ 登录接口返回访问令牌和刷新令牌
- ✅ 刷新令牌接口返回新的访问令牌
- ✅ 使用令牌可以访问受保护的端点
- ✅ 弱密码被拒绝

---

## 🗄️ 阶段 3：数据库迁移（1-2天）

### 目标
建立数据库版本控制，实现平滑的数据库结构变更

### 任务清单

#### 1. 初始化 Alembic

**执行命令**：
```bash
cd backend
alembic init alembic
```

这将创建：
```
backend/
├── alembic/
│   ├── env.py              # Alembic 环境配置
│   ├── script.py.mako      # 迁移脚本模板
│   └── versions/           # 迁移版本目录
└── alembic.ini             # Alembic 配置文件
```

---

#### 2. 配置 Alembic

**修改文件**：`backend/alembic.ini`

注释掉静态数据库 URL：
```ini
# sqlalchemy.url = driver://user:pass@localhost/dbname
```

**修改文件**：`backend/alembic/env.py`

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# 导入项目配置和模型
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config.settings import settings
from src.database import Base

# 导入所有模型（确保它们被注册到 Base.metadata）
from src.models.user import User
from src.models.channel import Channel
from src.models.assignment import ChannelAssignment
from src.models.channel_target import TargetPlan
from src.models.execution_plan import ExecutionPlan

# Alembic Config 对象
config = context.config

# 从环境变量设置数据库 URL
config.set_main_option('sqlalchemy.url', settings.DATABASE_URL)

# 配置日志
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 设置目标元数据
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线模式运行迁移"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在线模式运行迁移"""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

#### 3. 创建初始迁移

**执行命令**：
```bash
cd backend

# 创建初始迁移脚本
alembic revision --autogenerate -m "Initial migration: create all tables"

# 查看生成的迁移脚本
ls -l alembic/versions/

# 执行迁移
alembic upgrade head

# 查看当前数据库版本
alembic current

# 查看迁移历史
alembic history --verbose
```

---

#### 4. 创建迁移管理脚本

**新建文件**：`scripts/migrate.sh`
```bash
#!/bin/bash

# 数据库迁移管理脚本
# 用法: ./migrate.sh {create|upgrade|downgrade|history|current}

set -e

cd "$(dirname "$0")/../backend"

case "$1" in
    create)
        if [ -z "$2" ]; then
            echo "错误: 请提供迁移描述"
            echo "用法: ./migrate.sh create '迁移描述'"
            exit 1
        fi
        echo "创建新迁移: $2"
        alembic revision --autogenerate -m "$2"
        ;;

    upgrade)
        echo "升级数据库到最新版本..."
        alembic upgrade head
        echo "✅ 数据库已升级到最新版本"
        ;;

    downgrade)
        if [ -z "$2" ]; then
            echo "降级一个版本..."
            alembic downgrade -1
        else
            echo "降级到版本: $2"
            alembic downgrade "$2"
        fi
        echo "✅ 数据库已降级"
        ;;

    history)
        echo "迁移历史:"
        alembic history --verbose
        ;;

    current)
        echo "当前数据库版本:"
        alembic current --verbose
        ;;

    stamp)
        if [ -z "$2" ]; then
            echo "错误: 请提供目标版本"
            echo "用法: ./migrate.sh stamp <version>"
            exit 1
        fi
        echo "标记数据库版本为: $2"
        alembic stamp "$2"
        ;;

    *)
        echo "数据库迁移管理工具"
        echo ""
        echo "用法: $0 {create|upgrade|downgrade|history|current|stamp}"
        echo ""
        echo "命令说明:"
        echo "  create <描述>    创建新的迁移脚本"
        echo "  upgrade          升级到最新版本"
        echo "  downgrade [版本]  降级（默认降级一个版本）"
        echo "  history          显示迁移历史"
        echo "  current          显示当前数据库版本"
        echo "  stamp <版本>      标记数据库版本（不执行迁移）"
        echo ""
        echo "示例:"
        echo "  $0 create 'Add user preferences table'"
        echo "  $0 upgrade"
        echo "  $0 downgrade"
        echo "  $0 history"
        exit 1
        ;;
esac
```

**设置执行权限**：
```bash
chmod +x scripts/migrate.sh
```

---

#### 5. 更新文档

**修改文件**：`docs/README.md`

添加数据库迁移章节：
```markdown
## 数据库迁移

项目使用 Alembic 进行数据库迁移管理。

### 常用命令

```bash
# 创建新迁移
./scripts/migrate.sh create "添加用户偏好设置表"

# 升级到最新版本
./scripts/migrate.sh upgrade

# 降级一个版本
./scripts/migrate.sh downgrade

# 查看迁移历史
./scripts/migrate.sh history

# 查看当前版本
./scripts/migrate.sh current
```

### 迁移工作流

1. 修改模型文件（例如 `backend/src/models/user.py`）
2. 创建迁移脚本：`./scripts/migrate.sh create "描述变更"`
3. 检查生成的迁移脚本（`backend/alembic/versions/`）
4. 执行迁移：`./scripts/migrate.sh upgrade`
5. 如有问题，回滚：`./scripts/migrate.sh downgrade`

### 注意事项

- 每次模型变更后必须创建迁移
- 提交代码时包含迁移脚本
- 生产环境部署前先在测试环境验证迁移
- 重要数据变更前务必备份数据库
```

---

### 阶段 3 验收标准

```bash
# 1. 查看迁移历史
./scripts/migrate.sh history

# 2. 查看当前版本
./scripts/migrate.sh current

# 3. 测试升级
./scripts/migrate.sh upgrade

# 4. 测试降级
./scripts/migrate.sh downgrade

# 5. 再次升级
./scripts/migrate.sh upgrade

# 6. 测试创建新迁移
./scripts/migrate.sh create "Test migration"
ls backend/alembic/versions/
```

**必须通过**：
- ✅ 初始迁移已创建
- ✅ 升级/降级命令正常工作
- ✅ 迁移历史可查看
- ✅ 数据库表结构与模型一致

---

## 🧹 阶段 4：代码重构（2-3天）

### 目标
消除重复代码，提高代码质量和可维护性

### 任务清单

#### 1. 删除重复的服务方法

**修改文件**：`backend/src/services/channel_service.py`

**删除重复方法**：
```python
# ❌ 删除以下方法（与 get_channels 功能重复）

# 第 196-241 行
@staticmethod
def list_channels(...):
    """此方法与 get_channels 完全重复"""
    # 删除整个方法

# 第 392-433 行
@staticmethod
def search_channels(...):
    """此方法也与 get_channels 重复"""
    # 删除整个方法
```

**更新调用处**：
```bash
# 搜索所有使用这些方法的地方
grep -r "list_channels" backend/src/
grep -r "search_channels" backend/src/

# 将调用替换为 get_channels
```

---

#### 2. 提取验证工具

**新建文件**：`backend/src/utils/validators.py`
```python
"""
通用验证工具
"""
import re
from typing import Tuple


# 常量
EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
PHONE_PATTERN = r'^[\d\s\-\+\(\)]+$'


def validate_email(email: str) -> Tuple[bool, str]:
    """
    验证电子邮件格式

    Args:
        email: 电子邮件地址

    Returns:
        (是否有效, 错误消息)
    """
    if not email:
        return True, ""  # 空值被视为有效（可选字段）

    if not isinstance(email, str):
        return False, "电子邮件必须是字符串"

    if len(email) > 255:
        return False, "电子邮件长度不能超过 255 个字符"

    if not re.match(EMAIL_PATTERN, email):
        return False, "无效的电子邮件格式"

    return True, ""


def validate_phone(phone: str) -> Tuple[bool, str]:
    """
    验证电话号码格式

    Args:
        phone: 电话号码

    Returns:
        (是否有效, 错误消息)
    """
    if not phone:
        return True, ""  # 空值被视为有效

    if not isinstance(phone, str):
        return False, "电话号码必须是字符串"

    if len(phone) > 50:
        return False, "电话号码长度不能超过 50 个字符"

    if not re.match(PHONE_PATTERN, phone):
        return False, "电话号码只能包含数字、空格和 -+() 字符"

    return True, ""


def validate_uuid(uuid_str: str) -> Tuple[bool, str]:
    """
    验证 UUID 格式

    Args:
        uuid_str: UUID 字符串

    Returns:
        (是否有效, 错误消息)
    """
    if not uuid_str:
        return False, "UUID 不能为空"

    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

    if not re.match(uuid_pattern, str(uuid_str).lower()):
        return False, "无效的 UUID 格式"

    return True, ""


def validate_string_length(
    value: str,
    min_length: int = None,
    max_length: int = None,
    field_name: str = "字段"
) -> Tuple[bool, str]:
    """
    验证字符串长度

    Args:
        value: 要验证的字符串
        min_length: 最小长度
        max_length: 最大长度
        field_name: 字段名称（用于错误消息）

    Returns:
        (是否有效, 错误消息)
    """
    if value is None:
        return True, ""

    if not isinstance(value, str):
        return False, f"{field_name}必须是字符串"

    length = len(value)

    if min_length is not None and length < min_length:
        return False, f"{field_name}长度不能少于 {min_length} 个字符"

    if max_length is not None and length > max_length:
        return False, f"{field_name}长度不能超过 {max_length} 个字符"

    return True, ""
```

**修改文件**：`backend/src/services/channel_service.py`

替换电子邮件验证逻辑：
```python
# 添加导入
from ..utils.validators import validate_email, validate_phone

class ChannelService:
    @staticmethod
    def create_channel(...):
        # ... 其他代码 ...

        # ✅ 使用工具函数验证邮箱
        if contact_email:
            is_valid, error = validate_email(contact_email)
            if not is_valid:
                logger.warning(f"Invalid email: {contact_email}")
                raise ValidationError(error)

        # ✅ 验证电话号码
        if contact_phone:
            is_valid, error = validate_phone(contact_phone)
            if not is_valid:
                logger.warning(f"Invalid phone: {contact_phone}")
                raise ValidationError(error)

        # ... 其他代码 ...

    @staticmethod
    def update_channel(...):
        # ... 其他代码 ...

        # ✅ 使用相同的验证逻辑
        if contact_email:
            is_valid, error = validate_email(contact_email)
            if not is_valid:
                logger.warning(f"Invalid email: {contact_email}")
                raise ValidationError(error)

        # ... 其他代码 ...
```

---

#### 3. 统一错误处理模式

**选择策略**：
- **服务层**：抛出自定义异常（`ValidationError`, `NotFoundError`, `ConflictError`）
- **API 层**：统一捕获并转换为 HTTP 异常

**修改文件**：`backend/src/api/channels.py`

统一所有端点的错误处理：
```python
from ..utils.exceptions import ValidationError, NotFoundError, ConflictError

@router.get("/{channel_id}", response_model=ChannelResponse)
def get_channel(
    channel_id: UUID,
    db: Session = Depends(get_db)
):
    """获取单个渠道"""
    try:
        channel = ChannelService.get_channel_by_id(db, channel_id)
        if not channel:
            raise NotFoundError(f"渠道 {channel_id} 未找到")
        return channel
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"获取渠道失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")


@router.delete("/{channel_id}")
def delete_channel(
    channel_id: UUID,
    db: Session = Depends(get_db)
):
    """删除渠道"""
    try:
        success = ChannelService.delete_channel(db, channel_id)
        if not success:
            raise NotFoundError(f"渠道 {channel_id} 未找到")
        return {"message": "渠道删除成功"}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"删除渠道失败: {e}")
        raise HTTPException(status_code=500, detail="内部服务器错误")
```

---

#### 4. 实现数据库索引

**修改文件**：`backend/src/database/indexes.py`

完善索引定义：
```python
"""
数据库索引定义和创建
"""
from sqlalchemy import Index, create_engine

from ..models.channel import Channel
from ..models.assignment import ChannelAssignment
from ..models.channel_target import TargetPlan
from ..models.user import User


# 渠道表索引
idx_channel_name = Index('idx_channel_name', Channel.name)
idx_channel_status = Index('idx_channel_status', Channel.status)
idx_channel_business_type = Index('idx_channel_business_type', Channel.business_type)
idx_channel_created_at = Index('idx_channel_created_at', Channel.created_at.desc())
idx_channel_created_by = Index('idx_channel_created_by', Channel.created_by)

# 用户表索引（已有 unique 索引，但可以添加复合索引）
idx_user_role = Index('idx_user_role', User.role)
idx_user_active = Index('idx_user_active', User.is_active)

# 分配表索引
idx_assignment_user = Index('idx_assignment_user', ChannelAssignment.user_id)
idx_assignment_channel = Index('idx_assignment_channel', ChannelAssignment.channel_id)
idx_assignment_permission = Index('idx_assignment_permission', ChannelAssignment.permission_level)

# 目标表索引
idx_target_channel = Index('idx_target_channel', TargetPlan.channel_id)
idx_target_period = Index(
    'idx_target_period',
    TargetPlan.year,
    TargetPlan.quarter,
    TargetPlan.month
)
idx_target_channel_period = Index(
    'idx_target_channel_period',
    TargetPlan.channel_id,
    TargetPlan.year,
    TargetPlan.quarter
)


def create_all_indexes(engine):
    """
    创建所有自定义索引

    Args:
        engine: SQLAlchemy 引擎
    """
    indexes = [
        # 渠道索引
        idx_channel_name,
        idx_channel_status,
        idx_channel_business_type,
        idx_channel_created_at,
        idx_channel_created_by,

        # 用户索引
        idx_user_role,
        idx_user_active,

        # 分配索引
        idx_assignment_user,
        idx_assignment_channel,
        idx_assignment_permission,

        # 目标索引
        idx_target_channel,
        idx_target_period,
        idx_target_channel_period,
    ]

    for index in indexes:
        try:
            index.create(engine, checkfirst=True)
            print(f"✅ 创建索引: {index.name}")
        except Exception as e:
            print(f"⚠️  索引 {index.name} 创建失败: {e}")


def drop_all_indexes(engine):
    """
    删除所有自定义索引

    Args:
        engine: SQLAlchemy 引擎
    """
    indexes = [
        idx_channel_name,
        idx_channel_status,
        idx_channel_business_type,
        idx_channel_created_at,
        idx_channel_created_by,
        idx_user_role,
        idx_user_active,
        idx_assignment_user,
        idx_assignment_channel,
        idx_assignment_permission,
        idx_target_channel,
        idx_target_period,
        idx_target_channel_period,
    ]

    for index in indexes:
        try:
            index.drop(engine, checkfirst=True)
            print(f"✅ 删除索引: {index.name}")
        except Exception as e:
            print(f"⚠️  索引 {index.name} 删除失败: {e}")


if __name__ == "__main__":
    from ..config.settings import settings

    engine = create_engine(settings.DATABASE_URL)

    print("创建数据库索引...")
    create_all_indexes(engine)
    print("✅ 索引创建完成")
```

**创建索引管理脚本**：`scripts/manage_indexes.sh`
```bash
#!/bin/bash

case "$1" in
    create)
        echo "创建数据库索引..."
        python -m backend.src.database.indexes
        ;;
    *)
        echo "用法: $0 create"
        exit 1
        ;;
esac
```

---

#### 5. 添加预提交钩子

**新建文件**：`.pre-commit-config.yaml`
```yaml
repos:
  # Python 代码格式化
  - repo: https://github.com/psf/black
    rev: 23.12.0
    hooks:
      - id: black
        language_version: python3.11
        args: ['--line-length=120']

  # Python 代码检查
  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: [
          '--max-line-length=120',
          '--ignore=E203,W503,E501',
          '--exclude=alembic/versions/*'
        ]

  # Import 排序
  - repo: https://github.com/PyCQA/isort
    rev: 5.13.2
    hooks:
      - id: isort
        args: ['--profile', 'black', '--line-length', '120']

  # 通用检查
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: ['--maxkb=1000']
      - id: check-json
      - id: check-merge-conflict
      - id: check-toml
      - id: mixed-line-ending

  # Python 安全检查
  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.6
    hooks:
      - id: bandit
        args: ['-c', 'pyproject.toml']
        additional_dependencies: ['bandit[toml]']
```

**创建 pyproject.toml**：`pyproject.toml`
```toml
[tool.black]
line-length = 120
target-version = ['py311']
include = '\.pyi?$'
exclude = '''
/(
    \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | _build
  | buck-out
  | build
  | dist
  | alembic/versions
)/
'''

[tool.isort]
profile = "black"
line_length = 120
skip_gitignore = true

[tool.bandit]
exclude_dirs = ["tests", "test", "alembic/versions"]
skips = ["B101", "B601"]
```

**安装预提交钩子**：
```bash
pip install pre-commit
pre-commit install
```

---

#### 6. 运行代码格式化和检查

**新建文件**：`scripts/format_code.sh`
```bash
#!/bin/bash

echo "================================"
echo "代码格式化和检查"
echo "================================"
echo ""

cd "$(dirname "$0")/.."

echo "1. 运行 Black 格式化..."
black backend/src/ --line-length=120

echo ""
echo "2. 运行 isort 排序导入..."
isort backend/src/ --profile black --line-length 120

echo ""
echo "3. 运行 Flake8 检查..."
flake8 backend/src/ --max-line-length=120 --ignore=E203,W503 --exclude=alembic/versions

echo ""
echo "4. 运行 Bandit 安全检查..."
bandit -r backend/src/ -c pyproject.toml

echo ""
echo "================================"
echo "✅ 完成！"
echo "================================"
```

---

### 阶段 4 验收标准

```bash
# 1. 运行代码格式化
./scripts/format_code.sh

# 2. 运行所有测试
./scripts/run_tests.sh

# 3. 检查预提交钩子
pre-commit run --all-files

# 4. 创建索引
./scripts/manage_indexes.sh create

# 5. 验证没有重复代码
grep -r "list_channels" backend/src/services/
grep -r "search_channels" backend/src/services/
# 应该没有找到

# 6. 验证验证工具被使用
grep -r "validate_email" backend/src/
# 应该看到多处使用
```

**必须通过**：
- ✅ 所有代码通过格式化检查
- ✅ Flake8 检查无错误
- ✅ 重复代码已删除
- ✅ 验证工具已提取并使用
- ✅ 所有测试仍然通过

---

## 📊 验收标准总览

### 阶段 0：紧急修复
- ✅ CLI 可运行
- ✅ 环境配置模板已创建
- ✅ 数据库连接池调整
- ✅ SQL 注入风险已修复

### 阶段 1：测试基础设施
- ✅ 测试覆盖率 ≥ 80%
- ✅ 所有单元测试通过
- ✅ 所有集成测试通过

### 阶段 2：认证系统
- ✅ 注册/登录/刷新接口可用
- ✅ 密码哈希使用 passlib
- ✅ 生产环境密钥强制验证

### 阶段 3：数据库迁移
- ✅ Alembic 已初始化
- ✅ 初始迁移已创建
- ✅ 升级/降级正常工作

### 阶段 4：代码重构
- ✅ 重复代码已删除
- ✅ 验证工具已提取
- ✅ 错误处理已统一
- ✅ 数据库索引已创建
- ✅ 代码格式化通过

---

## 📅 时间表

| 阶段 | 任务 | 预计时间 | 累计时间 |
|------|------|---------|---------|
| 0 | 紧急修复 | 1-2天 | 1-2天 |
| 1 | 测试基础设施 | 3-5天 | 4-7天 |
| 2 | 认证系统完善 | 2-3天 | 6-10天 |
| 3 | 数据库迁移 | 1-2天 | 7-12天 |
| 4 | 代码重构 | 2-3天 | 9-15天 |

**总计**：9-15 个工作日（约 2-3 周）

---

## 🎯 优先级矩阵

```
┌─────────────────────────────────┬──────────────────────────────────┐
│   紧急且重要（立即执行）          │   重要但不紧急（计划执行）         │
├─────────────────────────────────┼──────────────────────────────────┤
│ • 修复 CLI 导入路径              │ • 完善测试覆盖率到 80%           │
│ • 创建认证 API 端点              │ • 添加性能监控                   │
│ • 修复 SQL 注入风险              │ • 实现缓存层                     │
│ • 创建 .env.example             │ • 完善文档                       │
├─────────────────────────────────┼──────────────────────────────────┤
│   紧急但不重要（快速处理）        │   不紧急不重要（稍后考虑）         │
├─────────────────────────────────┼──────────────────────────────────┤
│ • 调整连接池配置                 │ • 前端组件优化                   │
│ • 添加预提交钩子                 │ • 文档美化                       │
│ • 删除重复代码                   │ • 添加更多示例                   │
└─────────────────────────────────┴──────────────────────────────────┘
```

---

## 📝 后续建议

### 短期（1个月内）
1. 实现执行计划功能（`execution_service.py` 完善）
2. 添加用户管理 API（CRUD 操作）
3. 实现前端与后端 API 集成
4. 添加 Redis 缓存层
5. 性能测试和优化

### 中期（3个月内）
1. 添加 WebSocket 实时通知
2. 实现高级搜索和过滤
3. 添加数据导出功能（Excel, CSV, PDF）
4. 实现批量操作
5. 添加审计日志查看界面

### 长期（6个月内）
1. 微服务架构迁移
2. 实现多租户支持
3. 添加高级分析和报表
4. 移动端应用开发
5. 国际化支持

---

## 🔍 质量保证清单

- [ ] 所有测试通过
- [ ] 测试覆盖率 ≥ 80%
- [ ] 代码格式化通过
- [ ] 无 Flake8 警告
- [ ] 无安全漏洞
- [ ] API 文档完整
- [ ] 数据库迁移可回滚
- [ ] 环境配置文档完整
- [ ] 部署文档完整
- [ ] 性能符合要求（< 200ms）

---

**文档版本**：1.0
**最后更新**：2025-10-13
**维护者**：开发团队
