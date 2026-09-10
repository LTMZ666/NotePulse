"""帖子模型"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import relationship

from app.core.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False, comment="标题")
    excerpt = Column(String(500), default="", comment="摘要")
    content = Column(Text, default="", comment="正文")
    category = Column(String(50), default="随笔杂谈", comment="分类")
    author_name = Column(String(50), default="佚名", comment="作者名")
    read_count = Column(Integer, default=0, comment="阅读数")
    like_count = Column(Integer, default=0, comment="点赞数")
    status = Column(String(20), default="approved", comment="审校状态：pending/approved/rejected")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="作者ID")
    images = Column(LONGTEXT, nullable=True, comment="图片 base64 JSON 数组")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    author = relationship("User", back_populates="posts")
    favorited_by = relationship("Favorite", back_populates="post", cascade="all, delete-orphan")
    liked_by = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
