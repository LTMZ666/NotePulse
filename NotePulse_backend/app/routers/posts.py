"""帖子 CRUD 路由（同之帖）"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.deps import get_db, get_current_user, get_current_user_optional
from app.models import User, Post, Comment, Notification, Like, Favorite
from app.schemas import PostCreate, PostUpdate, PostOut

router = APIRouter(prefix="/api/posts", tags=["帖子"])


def _to_post_out(post: Post, comment_count: int = 0) -> PostOut:
    """构造 PostOut 并注入 comment_count（Post 表无该列，路由层补齐）"""
    data = {c: getattr(post, c) for c in PostOut.model_fields.keys() if hasattr(post, c)}
    data["comment_count"] = comment_count
    return PostOut(**data)


@router.get("", summary="获取帖子列表（支持分页、分类、搜索、按当前用户过滤）")
def list_posts(
    category: str = Query("全部"),
    keyword: str = Query(""),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    mine: bool = Query(False, description="仅返回当前登录用户的帖子"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    q = db.query(Post)
    if mine and current_user:
        q = q.filter(Post.user_id == current_user.id)
    if category != "全部":
        q = q.filter(Post.category == category)
    if keyword:
        q = q.filter(Post.title.contains(keyword) | Post.excerpt.contains(keyword))
    q = q.order_by(Post.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * size).limit(size).all()
    # 批量查询每条帖子的评论数，避免 N+1
    if items:
        ids = [p.id for p in items]
        cc_rows = (
            db.query(Comment.post_id, func.count(Comment.id))
            .filter(Comment.post_id.in_(ids))
            .group_by(Comment.post_id)
            .all()
        )
        cc_map = {pid: cnt for pid, cnt in cc_rows}
    else:
        cc_map = {}
    return {
        "items": [_to_post_out(p, cc_map.get(p.id, 0)) for p in items],
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/{post_id}", summary="获取帖子详情")
def get_post(
    post_id: int,
    inc: bool = Query(True, description="是否累加阅读数"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if inc:
        post.read_count += 1
        db.commit()
        db.refresh(post)
    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post_id).scalar() or 0
    data = _to_post_out(post, comment_count)
    # 注入当前用户的点赞/收藏状态
    if current_user:
        data.has_liked = db.query(Like).filter(Like.user_id == current_user.id, Like.post_id == post_id).first() is not None
        data.has_favorited = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.post_id == post_id).first() is not None
    else:
        data.has_liked = False
        data.has_favorited = False
    return data


@router.post("", response_model=PostOut, summary="创建帖子（需登录）")
def create_post(body: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = Post(**body.model_dump(), user_id=current_user.id, author_name=current_user.username)
    db.add(post)
    db.commit()
    db.refresh(post)
    return _to_post_out(post, 0)


@router.put("/{post_id}", response_model=PostOut, summary="更新帖子（需作者）")
def update_post(post_id: int, body: PostUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权限修改此帖子")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(post, k, v)
    db.commit()
    db.refresh(post)
    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post_id).scalar() or 0
    return _to_post_out(post, comment_count)


@router.post("/{post_id}/like", summary="点赞帖子（toggle：已点赞则取消）")
def like_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    existing = db.query(Like).filter(Like.user_id == current_user.id, Like.post_id == post_id).first()
    if existing:
        # 已点赞 → 取消
        db.delete(existing)
        post.like_count = max(0, post.like_count - 1)
        db.commit()
        db.refresh(post)
        return {"message": "已取消点赞", "like_count": post.like_count, "has_liked": False}
    # 未点赞 → 点赞
    db.add(Like(user_id=current_user.id, post_id=post_id))
    post.like_count += 1
    db.commit()
    db.refresh(post)
    # 通知帖主（不通知自己）
    if post.user_id and post.user_id != current_user.id:
        exists = db.query(Notification).filter(
            Notification.user_id == post.user_id,
            Notification.actor_id == current_user.id,
            Notification.post_id == post.id,
            Notification.type == "like",
            Notification.is_read == False,
        ).first()
        if not exists:
            db.add(Notification(
                user_id=post.user_id,
                actor_id=current_user.id,
                actor_name=current_user.username,
                post_id=post.id,
                post_title=post.title,
                type="like",
            ))
            db.commit()
    return {"message": "点赞成功", "like_count": post.like_count, "has_liked": True}


@router.delete("/{post_id}", summary="删除帖子（需作者）")
def delete_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权限删除此帖子")
    db.delete(post)
    db.commit()
    return {"message": "删除成功", "id": post_id}
