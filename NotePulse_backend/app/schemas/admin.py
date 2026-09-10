"""管理员端 Pydantic 模型"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AdminLogin(BaseModel):
    """管理员登录请求"""
    username: str = Field(..., description="主笔之号")
    password: str = Field(..., description="开卷之钥")


class AdminToken(BaseModel):
    """管理员登录返回"""
    access_token: str
    token_type: str = "bearer"
    username: str


class AdminOverviewStats(BaseModel):
    """藏鉴概览统计"""
    user_count: int
    note_count: int
    post_count: int
    pending_count: int
    total_reads: int
    total_likes: int


class DailyTrend(BaseModel):
    """七日趋势"""
    date: str
    label: str
    value: int


class CategoryStat(BaseModel):
    """分类统计（环形图）"""
    category: str
    count: int


class AdminStatsResponse(BaseModel):
    """藏鉴概览综合响应"""
    overview: AdminOverviewStats
    daily_trend: List[DailyTrend]
    categories: List[CategoryStat]


class AdminPostOut(BaseModel):
    """管理员视角帖子"""
    id: int
    title: str
    excerpt: str = ""
    content: str = ""
    category: str
    author_name: str
    read_count: int
    like_count: int
    status: str
    images: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminUserOut(BaseModel):
    """管理员视角用户（同道名册）"""
    id: int
    username: str
    email: str
    avatar: str = ""
    is_active: bool = True
    created_at: datetime
    post_count: int = 0
    total_likes: int = 0
    total_reads: int = 0

    class Config:
        from_attributes = True
