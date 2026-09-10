"""评论相关 Pydantic 模型"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[int] = None


class CommentOut(BaseModel):
    id: int
    content: str
    author_name: str
    author_avatar: Optional[str] = None
    user_id: Optional[int] = None
    post_id: int
    parent_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CommentTreeNode(CommentOut):
    """带子回复的评论节点（楼中楼）"""
    replies: List["CommentTreeNode"] = Field(default_factory=list)
