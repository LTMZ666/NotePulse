"""评论 CRUD 路由（帖子的评论 + 楼中楼回复）— 游标分页 + Redis 缓存"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.redis import (
    cache_first_page,
    get_cached_first_page,
    invalidate_comment_cache,
    get_comment_count,
    set_comment_count,
    incr_comment_count,
)
from app.deps import get_db, get_current_user, get_current_user_optional
from app.models import User, Post, Comment, Notification
from app.schemas import CommentCreate, CommentOut, CommentTreeNode

router = APIRouter(prefix="/api/posts/{post_id}/comments", tags=["评论"])

PAGE_SIZE = 20  # 每页评论数


def _to_out(c: Comment) -> CommentOut:
    return CommentOut.model_validate(c)


def _build_tree(comments: List[Comment]) -> List[CommentTreeNode]:
    """把扁平评论列表组织成楼中楼树：顶层评论（parent_id is None）放在第一层，
    其余按 parent_id 归到对应父评论的 replies 中。
    评论按创建时间升序（旧→新）排列，便于自然阅读。"""
    nodes: dict[int, CommentTreeNode] = {}
    for c in comments:
        base = CommentOut.model_validate(c).model_dump()
        node = CommentTreeNode(**base, replies=[])
        nodes[c.id] = node
    roots: List[CommentTreeNode] = []
    for c in sorted(comments, key=lambda x: x.created_at):
        node = nodes[c.id]
        if c.parent_id is None:
            roots.append(node)
        else:
            parent_node = nodes.get(c.parent_id)
            if parent_node:
                parent_node.replies.append(node)
            else:
                roots.append(node)
    return roots


def _parse_cursor(cursor: Optional[str]) -> Optional[tuple[datetime, int]]:
    """解析游标 'ISO_TIMESTAMP:ID' → (datetime, id)"""
    if not cursor:
        return None
    try:
        ts_str, cid_str = cursor.rsplit(":", 1)
        return datetime.fromisoformat(ts_str), int(cid_str)
    except (ValueError, TypeError):
        return None


def _make_cursor(c: Comment) -> str:
    """生成游标"""
    return f"{c.created_at.isoformat()}:{c.id}"


@router.get("", summary="获取帖子评论（游标分页 + Redis 缓存）")
def list_comments(
    post_id: int,
    cursor: Optional[str] = Query(None, description="游标：ISO时间:评论ID"),
    size: int = Query(PAGE_SIZE, ge=1, le=50, description="每页条数"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    # 帖子是否存在
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    # 第一页且无游标时尝试 Redis 缓存
    if cursor is None:
        cached = get_cached_first_page(post_id)
        if cached is not None:
            cached["current_user_id"] = current_user.id if current_user else None
            return cached

    # 查询评论总数
    total = get_comment_count(post_id)
    if total is None:
        total = db.query(Comment).filter(Comment.post_id == post_id).count()
        set_comment_count(post_id, total)

    # 查询评论（游标分页）
    query = db.query(Comment).filter(Comment.post_id == post_id)
    parsed = _parse_cursor(cursor)
    if parsed:
        ts, cid = parsed
        from sqlalchemy import or_, and_
        query = query.filter(
            or_(
                Comment.created_at > ts,
                and_(Comment.created_at == ts, Comment.id > cid),
            )
        )
    comments = query.order_by(Comment.created_at.asc(), Comment.id.asc()).limit(size + 1).all()

    has_more = len(comments) > size
    comments = comments[:size]
    next_cursor = _make_cursor(comments[-1]) if has_more and comments else None

    tree = _build_tree(comments)
    result = {
        "items": tree,
        "total": total,
        "has_more": has_more,
        "next_cursor": next_cursor,
        "current_user_id": current_user.id if current_user else None,
    }

    # 仅缓存第一页（无游标）
    if cursor is None:
        cache_first_page(post_id, result)

    return result


@router.post("", response_model=CommentOut, summary="发表评论（需登录）")
def create_comment(
    post_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    # 如指定 parent_id，校验父评论存在且属于同一帖子
    if body.parent_id is not None:
        parent = db.query(Comment).filter(
            Comment.id == body.parent_id,
            Comment.post_id == post_id,
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="父评论不存在")
    c = Comment(
        content=body.content,
        user_id=current_user.id,
        author_name=current_user.username,
        author_avatar=getattr(current_user, "avatar", None),
        post_id=post_id,
        parent_id=body.parent_id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    # 通知帖主（不通知自己）
    if post.user_id and post.user_id != current_user.id:
        db.add(Notification(
            user_id=post.user_id,
            actor_id=current_user.id,
            actor_name=current_user.username,
            post_id=post.id,
            post_title=post.title,
            comment_id=c.id,
            type="comment",
        ))
        db.commit()
    # 如果是回复（parent_id），通知被回复的评论作者（不通知自己，且避免与帖主重复）
    if body.parent_id is not None:
        parent_comment = db.query(Comment).filter(Comment.id == body.parent_id).first()
        if parent_comment and parent_comment.user_id and parent_comment.user_id != current_user.id:
            if parent_comment.user_id != post.user_id:
                db.add(Notification(
                    user_id=parent_comment.user_id,
                    actor_id=current_user.id,
                    actor_name=current_user.username,
                    post_id=post.id,
                    post_title=post.title,
                    comment_id=c.id,
                    type="reply",
                ))
                db.commit()
    # 清除 Redis 缓存 + 计数更新
    invalidate_comment_cache(post_id)
    incr_comment_count(post_id, 1)
    return c


@router.delete("/{comment_id}", summary="删除评论（需作者本人）")
def delete_comment(
    post_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.post_id == post_id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="评论不存在")
    if c.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权限删除此评论")
    db.delete(c)
    db.commit()
    # 清除 Redis 缓存 + 计数更新
    invalidate_comment_cache(post_id)
    incr_comment_count(post_id, -1)
    return {"message": "删除成功", "id": comment_id}
