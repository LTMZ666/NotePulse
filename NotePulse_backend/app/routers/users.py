"""用户中心路由（个人中心 / 设置）

- GET  /api/users/me/profile  个人中心综合信息（含聚合统计）
- PUT  /api/users/me           修改用户名 / 头像 / 简介
- PUT  /api/users/me/password  修改登录密码
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.deps import get_db, get_current_user
from app.models import User, Note, Post, Favorite
from app.schemas import UserOut, UserUpdate, UserPasswordChange, UserProfileOut

router = APIRouter(prefix="/api/users", tags=["用户中心"])


@router.get("/me/profile", response_model=UserProfileOut, summary="个人中心综合信息")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note_count = db.query(func.count(Note.id)).filter(Note.user_id == current_user.id).scalar() or 0
    post_count = db.query(func.count(Post.id)).filter(Post.user_id == current_user.id).scalar() or 0
    favorite_count = db.query(func.count(Favorite.id)).filter(Favorite.user_id == current_user.id).scalar() or 0
    return UserProfileOut(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        avatar=current_user.avatar or "",
        bio=current_user.bio or "",
        created_at=current_user.created_at,
        note_count=int(note_count),
        post_count=int(post_count),
        favorite_count=int(favorite_count),
    )


@router.put("/me", response_model=UserOut, summary="修改用户资料")
def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude_unset=True)
    # 用户名变更需查重
    if "username" in data and data["username"] != current_user.username:
        exists = db.query(User).filter(User.username == data["username"]).first()
        if exists:
            raise HTTPException(status_code=400, detail="该用户名已被使用")
    for k, v in data.items():
        setattr(current_user, k, v)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password", summary="修改登录密码")
def change_my_password(
    body: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 若传了旧密码则验证；未传则直接修改（已登录态视为可信）
    if body.old_password:
        if not verify_password(body.old_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="旧密码不正确")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "开卷之钥已更新，请用新密钥重新登录"}
