"""通知路由（风信）

- GET    /api/notifications               我的通知列表（分页，未读优先）
- GET    /api/notifications/unread-count   未读通知数
- PUT    /api/notifications/{id}/read      标记单条已读
- PUT    /api/notifications/read-all       全部标记已读
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.deps import get_db, get_current_user
from app.models import User, Notification
from app.schemas import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["通知"])


@router.get("", summary="我的通知列表（分页，未读优先）")
def list_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
    )
    total = q.count()
    unread = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .scalar()
        or 0
    )
    items = q.offset((page - 1) * size).limit(size).all()
    return {
        "items": [NotificationOut.model_validate(n) for n in items],
        "total": total,
        "page": page,
        "size": size,
        "unread": unread,
    }


@router.get("/unread-count", summary="未读通知数")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cnt = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .scalar()
        or 0
    )
    return {"unread": cnt}


@router.put("/{notification_id}/read", summary="标记单条已读")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="通知不存在")
    if n.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权限操作此通知")
    if not n.is_read:
        n.is_read = True
        db.commit()
    return {"message": "已标记已读", "id": notification_id}


@router.put("/read-all", summary="全部标记已读")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .all()
    )
    for n in rows:
        n.is_read = True
    db.commit()
    return {"message": "全部已读", "count": len(rows)}
