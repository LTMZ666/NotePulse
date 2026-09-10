"""统计路由（藏之数）"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import User, Note, Post, Tag

router = APIRouter(prefix="/api/stats", tags=["统计"])


@router.get("", summary="全站统计概览")
def get_overview(db: Session = Depends(get_db)):
    return {
        "user_count": db.query(func.count(User.id)).scalar(),
        "note_count": db.query(func.count(Note.id)).scalar(),
        "post_count": db.query(func.count(Post.id)).scalar(),
        "total_reads": int(db.query(func.coalesce(func.sum(Post.read_count), 0)).scalar()),
        "total_likes": int(db.query(func.coalesce(func.sum(Post.like_count), 0)).scalar()),
    }


@router.get("/categories", summary="帖子分类统计")
def category_stats(db: Session = Depends(get_db)):
    rows = db.query(Post.category, func.count(Post.id)).group_by(Post.category).all()
    return [{"category": r[0], "count": r[1]} for r in rows]


@router.get("/note-categories", summary="笔记分类统计")
def note_category_stats(db: Session = Depends(get_db)):
    rows = db.query(Note.category, func.count(Note.id)).group_by(Note.category).all()
    return [{"category": r[0], "count": r[1]} for r in rows]


@router.get("/recent", summary="最近动态（最新笔记和帖子）")
def recent_activity(db: Session = Depends(get_db)):
    notes = db.query(Note).order_by(Note.updated_at.desc()).limit(5).all()
    posts = db.query(Post).order_by(Post.created_at.desc()).limit(5).all()
    items = []
    for n in notes:
        items.append({
            "type": "note",
            "title": n.title,
            "category": n.category,
            "time": n.updated_at.isoformat(),
        })
    for p in posts:
        items.append({
            "type": "post",
            "title": p.title,
            "category": p.category,
            "time": p.created_at.isoformat(),
        })
    items.sort(key=lambda x: x["time"], reverse=True)
    return items[:10]


@router.get("/tags", summary="标签统计")
def tag_stats(db: Session = Depends(get_db)):
    tags = db.query(Tag).order_by(Tag.count.desc()).limit(20).all()
    return [{"name": t.name, "count": t.count} for t in tags]
