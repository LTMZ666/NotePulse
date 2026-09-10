"""笔记 CRUD 路由"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, get_current_user_optional
from app.models import User, Note
from app.schemas import NoteCreate, NoteUpdate, NoteOut

router = APIRouter(prefix="/api/notes", tags=["笔记"])


@router.get("", summary="获取笔记列表（支持分页、分类、搜索）")
def list_notes(
    category: str = Query("全部"),
    keyword: str = Query(""),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    q = db.query(Note)
    # 已登录：优先展示自己的笔记；未登录：展示所有笔记
    if current_user:
        q = q.filter(Note.user_id == current_user.id)
    if category != "全部":
        q = q.filter(Note.category == category)
    if keyword:
        q = q.filter(Note.title.contains(keyword) | Note.content.contains(keyword))
    q = q.order_by(Note.is_pinned.desc(), Note.updated_at.desc())
    total = q.count()
    items = q.offset((page - 1) * size).limit(size).all()
    return {"items": [NoteOut.model_validate(i) for i in items], "total": total, "page": page, "size": size}


@router.get("/{note_id}", response_model=NoteOut, summary="获取笔记详情")
def get_note(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    return note


@router.post("", response_model=NoteOut, summary="创建笔记")
def create_note(body: NoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = Note(**body.model_dump(), user_id=current_user.id)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.put("/{note_id}", response_model=NoteOut, summary="更新笔记")
def update_note(note_id: int, body: NoteUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(note, k, v)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", summary="删除笔记")
def delete_note(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    db.delete(note)
    db.commit()
    return {"message": "删除成功", "id": note_id}
