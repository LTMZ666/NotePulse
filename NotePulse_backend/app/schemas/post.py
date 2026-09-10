"""帖子相关 Pydantic 模型"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    excerpt: str = ""
    content: str = ""
    category: str = "随笔杂谈"
    images: Optional[str] = None


class PostUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    images: Optional[str] = None


class PostOut(BaseModel):
    id: int
    title: str
    excerpt: str
    content: str
    category: str
    author_name: str
    read_count: int
    like_count: int
    comment_count: int = 0
    status: str = "approved"
    user_id: Optional[int] = None
    images: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    has_liked: bool = False
    has_favorited: bool = False

    class Config:
        from_attributes = True
