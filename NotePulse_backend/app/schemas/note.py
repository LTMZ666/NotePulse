"""笔记相关 Pydantic 模型"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = ""
    category: str = "随笔杂谈"
    is_pinned: bool = False
    images: Optional[str] = None  # JSON 数组字符串，存 base64 图片


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_pinned: Optional[bool] = None
    images: Optional[str] = None


class NoteOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    is_pinned: bool
    images: Optional[str] = None
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
