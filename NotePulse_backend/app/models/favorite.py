"""收藏模型（同道藏帖之珍）"""
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_user_post"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="收藏者")
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False, comment="被收藏的帖子")
    created_at = Column(DateTime, default=datetime.utcnow, comment="收藏时间")

    user = relationship("User", back_populates="favorites")
    post = relationship("Post", back_populates="favorited_by")
