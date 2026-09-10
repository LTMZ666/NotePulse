"""评论模型"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import relationship

from app.core.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    content = Column(Text, nullable=False, comment="评论正文")
    author_name = Column(String(50), default="佚名", comment="评论者名")
    author_avatar = Column(LONGTEXT, nullable=True, comment="评论者头像快照（URL 或 base64）")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="评论者ID")
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True, comment="所属帖子ID")
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True, comment="父评论ID（楼中楼）")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")

    post = relationship("Post", back_populates="comments")
    author = relationship("User")
    # 楼中楼：父评论 → 子回复（单向关系）
    # 级联删除依赖数据库层 ForeignKey(ondelete="CASCADE")，不用 ORM cascade
    replies = relationship(
        "Comment",
        primaryjoin="Comment.id == foreign(Comment.parent_id)",
        collection_class=list,
    )
