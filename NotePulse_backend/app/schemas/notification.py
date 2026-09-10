"""通知相关 Pydantic 模型"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    user_id: int
    actor_id: Optional[int] = None
    actor_name: str
    post_id: Optional[int] = None
    post_title: str
    comment_id: Optional[int] = None
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
