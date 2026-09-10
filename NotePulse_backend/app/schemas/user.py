"""用户相关 Pydantic 模型"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

EMAIL_PATTERN = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50, description="用户名")
    email: str = Field(..., pattern=EMAIL_PATTERN, description="邮箱")
    password: str = Field(..., min_length=6, max_length=100, description="密码")


class UserLogin(BaseModel):
    account: str = Field(..., description="用户名或邮箱")
    password: str = Field(..., description="密码")


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    avatar: Optional[str] = ""
    bio: Optional[str] = ""
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    """用户资料修改（仅传需要改的字段）"""
    username: Optional[str] = Field(None, min_length=2, max_length=50, description="用户名")
    avatar: Optional[str] = Field(None, max_length=700000, description="头像 URL 或 base64 数据")
    bio: Optional[str] = Field(None, max_length=500, description="个人简介")


class UserPasswordChange(BaseModel):
    """修改密码"""
    old_password: Optional[str] = Field(None, description="旧密码（可选，不传则直接修改）")
    new_password: str = Field(..., min_length=6, max_length=100, description="新密码")


class UserProfileOut(BaseModel):
    """个人中心综合信息"""
    id: int
    username: str
    email: str
    avatar: Optional[str] = ""
    bio: Optional[str] = ""
    created_at: datetime
    note_count: int = 0
    post_count: int = 0
    favorite_count: int = 0

    class Config:
        from_attributes = True
