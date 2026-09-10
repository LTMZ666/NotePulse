"""Schemas 统一导出"""
from app.schemas.user import (
    UserRegister, UserLogin, UserOut, Token,
    UserUpdate, UserPasswordChange, UserProfileOut,
)
from app.schemas.note import NoteCreate, NoteUpdate, NoteOut
from app.schemas.post import PostCreate, PostUpdate, PostOut
from app.schemas.comment import CommentCreate, CommentOut, CommentTreeNode
from app.schemas.favorite import FavoriteOut
from app.schemas.notification import NotificationOut
from app.schemas.admin import (
    AdminLogin, AdminToken, AdminOverviewStats, DailyTrend,
    CategoryStat, AdminStatsResponse, AdminPostOut, AdminUserOut,
)
from app.schemas.common import PaginatedResponse

__all__ = [
    "UserRegister", "UserLogin", "UserOut", "Token",
    "UserUpdate", "UserPasswordChange", "UserProfileOut",
    "NoteCreate", "NoteUpdate", "NoteOut",
    "PostCreate", "PostUpdate", "PostOut",
    "CommentCreate", "CommentOut", "CommentTreeNode",
    "FavoriteOut",
    "NotificationOut",
    "AdminLogin", "AdminToken", "AdminOverviewStats", "DailyTrend",
    "CategoryStat", "AdminStatsResponse", "AdminPostOut", "AdminUserOut",
    "PaginatedResponse",
]
