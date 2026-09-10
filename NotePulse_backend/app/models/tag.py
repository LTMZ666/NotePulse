"""标签模型"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime

from app.core.database import Base


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, comment="标签名")
    count = Column(Integer, default=0, comment="使用次数")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
