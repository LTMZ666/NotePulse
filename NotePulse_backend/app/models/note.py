"""笔记模型"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import relationship

from app.core.database import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False, comment="标题")
    content = Column(Text, default="", comment="内容")
    category = Column(String(50), default="随笔杂谈", comment="分类")
    is_pinned = Column(Boolean, default=False, comment="是否置顶")
    images = Column(LONGTEXT, nullable=True, comment="图片 base64 JSON 数组")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="作者ID")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    author = relationship("User", back_populates="notes")
