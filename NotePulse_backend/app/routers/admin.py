"""管理员端路由（典枢院）

对应前端管理端三个面板：
- 藏鉴概览：全站统计 + 七日趋势 + 分类分布
- 藏帖审校：帖子列表（按状态筛选） + 入藏 / 退回
- 同道名册：用户列表 + 各自发帖/获赞/阅读统计
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.deps import get_db, get_current_admin
from app.models import User, Note, Post, Tag
from app.schemas import (
    AdminLogin, AdminToken, AdminStatsResponse, AdminOverviewStats,
    DailyTrend, CategoryStat, AdminPostOut, AdminUserOut,
)

router = APIRouter(prefix="/api/admin", tags=["典枢院·管理端"])


# ==================== 登录 ====================

@router.post("/login", response_model=AdminToken, summary="管理员登录（主笔入枢）")
def admin_login(body: AdminLogin):
    """管理员账号独立校验，签发带 role=admin 的 JWT"""
    if body.username != settings.ADMIN_USERNAME or body.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="主笔之号或开卷之钥有误，请再审慎赐下")
    token = create_access_token({"sub": body.username, "role": "admin"})
    return {"access_token": token, "token_type": "bearer", "username": body.username}


# ==================== 藏鉴概览 ====================

CN_DAY_LABELS = ["初一", "初二", "初三", "初四", "初五", "初六", "今日"]


@router.get("/stats", response_model=AdminStatsResponse, summary="藏鉴概览（统计 + 七日趋势 + 分类）")
def admin_stats(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    user_count = db.query(func.count(User.id)).scalar() or 0
    note_count = db.query(func.count(Note.id)).scalar() or 0
    post_count = db.query(func.count(Post.id)).scalar() or 0
    pending_count = db.query(func.count(Post.id)).filter(Post.status == "pending").scalar() or 0
    total_reads = int(db.query(func.coalesce(func.sum(Post.read_count), 0)).scalar() or 0)
    total_likes = int(db.query(func.coalesce(func.sum(Post.like_count), 0)).scalar() or 0)

    overview = AdminOverviewStats(
        user_count=user_count,
        note_count=note_count,
        post_count=post_count,
        pending_count=pending_count,
        total_reads=total_reads,
        total_likes=total_likes,
    )

    # 七日趋势：最近 7 天每日新增帖子数
    today = datetime.utcnow().date()
    start = today - timedelta(days=6)
    rows = (
        db.query(func.date(Post.created_at).label("d"), func.count(Post.id))
        .filter(Post.created_at >= datetime.combine(start, datetime.min.time()))
        .group_by(func.date(Post.created_at))
        .all()
    )
    count_map = {r[0]: r[1] for r in rows}
    daily_trend: list[DailyTrend] = []
    for i in range(7):
        day = start + timedelta(days=i)
        daily_trend.append(DailyTrend(
            date=day.isoformat(),
            label=CN_DAY_LABELS[i],
            value=count_map.get(day, 0),
        ))

    # 分类分布（环形图）
    cat_rows = (
        db.query(Post.category, func.count(Post.id))
        .group_by(Post.category)
        .order_by(func.count(Post.id).desc())
        .all()
    )
    categories = [CategoryStat(category=r[0] or "未分类", count=r[1]) for r in cat_rows]

    return AdminStatsResponse(
        overview=overview,
        daily_trend=daily_trend,
        categories=categories,
    )


# ==================== 藏帖审校 ====================

@router.get("/posts", summary="藏帖列表（按状态筛选）")
def admin_list_posts(
    status: str = Query("all", description="all / pending / approved / rejected"),
    keyword: str = Query("", description="标题关键词"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    q = db.query(Post)
    if status != "all":
        q = q.filter(Post.status == status)
    if keyword:
        q = q.filter(Post.title.contains(keyword) | Post.excerpt.contains(keyword))
    q = q.order_by(Post.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * size).limit(size).all()
    return {
        "items": [AdminPostOut.model_validate(i) for i in items],
        "total": total,
        "page": page,
        "size": size,
    }


@router.post("/posts/{post_id}/approve", summary="入藏（批准帖子）")
def admin_approve_post(
    post_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="藏帖不存在")
    post.status = "approved"
    db.commit()
    db.refresh(post)
    return {"message": "朱批已下 · 该帖已入藏", "id": post_id, "status": post.status}


@router.post("/posts/{post_id}/reject", summary="退回（驳回帖子）")
def admin_reject_post(
    post_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="藏帖不存在")
    post.status = "rejected"
    db.commit()
    db.refresh(post)
    return {"message": "帖已退回 · 批点附后", "id": post_id, "status": post.status}


@router.post("/posts/{post_id}/unpublish", summary="下架（从已入藏改为待审稿）")
def admin_unpublish_post(
    post_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="藏帖不存在")
    post.status = "pending"
    db.commit()
    db.refresh(post)
    return {"message": "该帖已下架待审", "id": post_id, "status": post.status}


@router.delete("/posts/{post_id}", summary="删除藏帖")
def admin_delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="藏帖不存在")
    db.delete(post)
    db.commit()
    return {"message": "藏帖已从典籍中除名", "id": post_id}


# ==================== 同道名册 ====================

@router.get("/users", summary="同道名册（用户列表 + 发帖统计）")
def admin_list_users(
    keyword: str = Query("", description="用户名关键词"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    q = db.query(User)
    if keyword:
        q = q.filter(User.username.contains(keyword))
    q = q.order_by(User.created_at.desc())
    total = q.count()
    users = q.offset((page - 1) * size).limit(size).all()

    # 聚合每个用户的发帖数、总点赞、总阅读
    items: list[AdminUserOut] = []
    for u in users:
        agg = (
            db.query(
                func.count(Post.id).label("post_count"),
                func.coalesce(func.sum(Post.like_count), 0).label("total_likes"),
                func.coalesce(func.sum(Post.read_count), 0).label("total_reads"),
            )
            .filter(Post.user_id == u.id)
            .first()
        )
        items.append(AdminUserOut(
            id=u.id,
            username=u.username,
            email=u.email,
            avatar=u.avatar or "",
            is_active=u.is_active,
            created_at=u.created_at,
            post_count=int(agg.post_count or 0),
            total_likes=int(agg.total_likes or 0),
            total_reads=int(agg.total_reads or 0),
        ))

    return {"items": items, "total": total, "page": page, "size": size}


@router.post("/users/{user_id}/toggle-active", summary="启用/禁用同道")
def admin_toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="同道不存在")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return {
        "message": "已启用该同道" if user.is_active else "已禁用该同道",
        "id": user_id,
        "is_active": user.is_active,
    }
