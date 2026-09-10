"""收藏相关 Pydantic 模型"""
from datetime import datetime
from pydantic import BaseModel

from app.schemas.post import PostOut


class FavoriteOut(BaseModel):
    """收藏项（含被收藏帖子的预览）"""
    id: int
    user_id: int
    post_id: int
    created_at: datetime
    post: PostOut

    class Config:
        from_attributes = True
