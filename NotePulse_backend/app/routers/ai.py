"""AI 对话路由（智之鉴 · 脉鉴灵）"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.ai import chat_with_ai, retrieve_relevant_content, recommend_posts
from app.core.redis import get_cached_ai_recommend, cache_ai_recommend
from app.deps import get_db, get_current_user, get_current_user_optional
from app.models import User

router = APIRouter(prefix="/api/ai", tags=["智鉴"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    reply: str
    context_used: bool = False


@router.post("/chat", response_model=ChatResponse, summary="脉鉴灵对话（需登录）")
async def ai_chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """与脉鉴灵对话，基于用户笔记和帖子进行 RAG 增强"""
    # RAG：检索用户相关笔记 + 全站帖子
    context = retrieve_relevant_content(current_user.id, body.message, db)

    # 转换历史记录格式
    history = None
    if body.history:
        history = [{"role": m.role, "content": m.content} for m in body.history]

    # 调用 DeepSeek
    reply = await chat_with_ai(
        user_message=body.message,
        note_context=context,
        history=history,
    )

    return ChatResponse(
        reply=reply,
        context_used=bool(context),
    )


@router.get("/recommend", summary="AI 推荐帖子（需登录）")
async def ai_recommend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """根据用户笔记内容，AI 推荐最相关的帖子（5分钟缓存）"""
    # 先查缓存
    cached = get_cached_ai_recommend(current_user.id)
    if cached is not None:
        return cached
    # 缓存未命中，调用 AI 生成
    result = await recommend_posts(current_user.id, db)
    cache_ai_recommend(current_user.id, result, ttl=300)
    return result
