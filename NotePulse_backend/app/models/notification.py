"""通知模型"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="接收者（帖子作者）")
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True, comment="触发者ID")
    actor_name = Column(String(50), default="佚名", comment="触发者名快照")
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True, index=True, comment="相关帖子")
    post_title = Column(String(200), default="", comment="帖子标题快照")
    comment_id = Column(Integer, nullable=True, index=True, comment="评论ID（仅 comment 类型，用于跳转定位）")
    type = Column(String(20), nullable=False, comment="通知类型：comment/like/favorite")
    is_read = Column(Boolean, default=False, nullable=False, comment="是否已读")
    created_at = Column(DateTime, default=datetime.utcnow, index=True, comment="创建时间")

    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_id])
    post = relationship("Post")
