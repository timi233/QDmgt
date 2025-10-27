from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from ..config.settings import settings

# 使用SQLite作为示例，如果需要PostgreSQL，需要先安装psycopg2
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}  # 仅适用于SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    """Initialize the database by creating all tables."""
    # 导入所有模型以确保它们被注册到metadata中
    from ..models.channel import Channel  # noqa: F401
    from ..models.user import User  # noqa: F401
    from ..models.assignment import ChannelAssignment  # noqa: F401
    from ..models.channel_target import ChannelTarget  # noqa: F401
    from ..models.execution_plan import ExecutionPlan  # noqa: F401
    
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()