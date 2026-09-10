"""收藏路由（同道藏帖之珍）

- GET    /api/favorites              我的收藏列表（含被收藏帖子预览）
- POST   /api/favorites/posts/{id}   收藏帖子（幂等：已存在则返回现有）
- DELETE /api/favorites/posts/{id}   取消收藏
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models import User, Post, Favorite, Notification
from app.schemas import FavoriteOut

router = APIRouter(prefix="/api/favorites", tags=["收藏"])


@router.get("", summary="我的收藏列表")
def list_favorites(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Favorite).filter(Favorite.user_id == current_user.id).order_by(Favorite.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * size).limit(size).all()
    return {
        "items": [FavoriteOut.model_validate(f) for f in items],
        "total": total,
        "page": page,
        "size": size,
    }


@router.post("/posts/{post_id}", response_model=FavoriteOut, summary="收藏帖子（幂等）")
def favorite_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="藏帖不存在")
    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.post_id == post_id)
        .first()
    )
    if existing:
        return existing
    fav = Favorite(user_id=current_user.id, post_id=post_id)
    db.add(fav)
    # 通知帖主（不通知自己）
    if post.user_id and post.user_id != current_user.id:
        db.add(Notification(
            user_id=post.user_id,
            actor_id=current_user.id,
            actor_name=current_user.username,
            post_id=post.id,
            post_title=post.title,
            type="favorite",
        ))
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/posts/{post_id}", summary="取消收藏")
def unfavorite_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.post_id == post_id)
        .first()
    )
    if not fav:
        raise HTTPException(status_code=404, detail="尚未收藏此帖")
    db.delete(fav)
    db.commit()
    return {"message": "已取消收藏", "post_id": post_id}
