"""DeepSeek AI 客户端（脉鉴灵）"""
import logging
from typing import Optional, List, Dict

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---- 系统提示词 ----
SYSTEM_PROMPT = """你是「脉鉴灵」，脉记平台的知识管理助手。

【角色设定】
- 你是一位古风文人气质的智鉴者，说话雅致但不晦涩，用现代中文回答。
- 你服务于「脉记」——一个以笔记为纸、以思考为墨、以 AI 为鉴的知识管理平台。

【核心能力】
1. 基于用户的知识笔记回答问题——用户的笔记内容会在「参考笔记」中提供。
2. 发现笔记之间的潜在关联，帮用户串联知识脉络。
3. 根据笔记内容建议学习方向和知识盲区。
4. 对用户提出的问题给出有深度、有见解的回答。

【约束】
- 如果参考笔记中没有相关内容，可以结合通用知识回答，但需说明「此为通用知识，非来自你的笔记」。
- 不编造笔记中不存在的内容。
- 回答简洁有料，一般不超过 300 字。
- 保持古风文人语气，但不影响信息传达的清晰度。

【平台背景】
脉记有四大板块：
- 脉之卷：首页概览
- 籍之库：个人知识笔记库
- 同之帖：社区论坛，可发帖、评论、点赞
- 智之鉴：AI 对话（即你所在的面板）
"""


async def chat_with_ai(
    user_message: str,
    note_context: str = "",
    history: Optional[List[Dict]] = None,
) -> str:
    """调用 DeepSeek API（Anthropic 兼容格式）进行对话

    Args:
        user_message: 用户当前提问
        note_context: 从用户笔记中检索到的相关内容（RAG 上下文）
        history: 历史对话记录 [{"role": "user/assistant", "content": "..."}]
    Returns:
        AI 回复文本
    """
    # Anthropic 格式：system 是顶层字段，不在 messages 中
    system_text = SYSTEM_PROMPT
    if note_context:
        system_text += f"\n\n以下是用户的知识笔记，回答问题时请参考这些内容：\n\n{note_context}"

    # 构建 messages（Anthropic 要求交替 user/assistant）
    messages: List[Dict] = []
    if history:
        messages.extend(history[-6:])
    messages.append({"role": "user", "content": user_message})

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{settings.DEEPSEEK_BASE_URL}/v1/messages",
                headers={
                    "x-api-key": settings.DEEPSEEK_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "max_tokens": 800,
                    "system": system_text,
                    "messages": messages,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("content", [])
            # 优先取 text block，没有则取 thinking block
            text = ""
            for block in content:
                if block.get("type") == "text":
                    text = block.get("text", "")
                    break
            if not text:
                for block in content:
                    if block.get("type") == "thinking":
                        text = block.get("thinking", "") or block.get("text", "")
                        break
            if not text and content:
                text = content[0].get("text", "") or content[0].get("thinking", "")
            return text
    except httpx.TimeoutException:
        logger.error("DeepSeek API 超时")
        return "脉鉴灵思考良久，未能及时回复。请稍后再试。"
    except httpx.HTTPStatusError as e:
        logger.error("DeepSeek API 错误: %s", e.response.text)
        return f"脉鉴灵遇到了一些困扰（API 返回 {e.response.status_code}），请稍后再试。"
    except Exception as e:
        logger.error("DeepSeek 调用异常: %s", e)
        return "脉鉴灵暂时无法回应，请稍后再试。"


def retrieve_relevant_content(user_id: int, query: str, db) -> str:
    """RAG：从用户的笔记和帖子中检索与提问相关的内容

    采用关键词匹配 + 内容截取的方式。
    """
    from app.models import Note, Post

    query_lower = query.lower()
    scored = []

    # 检索笔记
    notes = db.query(Note).filter(Note.user_id == user_id).order_by(Note.updated_at.desc()).limit(50).all()
    for n in notes:
        score = _keyword_score(query_lower, n.title, n.content)
        if score == 0:
            score = 0.1
        scored.append(("note", n, score))

    # 检索帖子（全站帖子，不限本人）
    posts = db.query(Post).order_by(Post.created_at.desc()).limit(50).all()
    for p in posts:
        score = _keyword_score(query_lower, p.title, p.content)
        if score == 0:
            score = 0.1
        scored.append(("post", p, score))

    if not scored:
        return ""

    scored.sort(key=lambda x: x[2], reverse=True)
    top = scored[:5]

    context_parts = []
    for kind, item, _ in top:
        excerpt = (item.content or "")[:200]
        label = "笔记" if kind == "note" else "帖子"
        context_parts.append(f"【{label}·{item.category}】{item.title}\n{excerpt}")
    return "\n\n---\n\n".join(context_parts) if context_parts else ""


def _keyword_score(query_lower: str, title: str, content: str) -> int:
    """关键词匹配打分：标题命中权重3，内容命中权重1"""
    score = 0
    title_lower = (title or "").lower()
    content_lower = (content or "").lower()
    for word in query_lower.split():
        if len(word) < 2:
            continue
        if word in title_lower:
            score += 3
        if word in content_lower:
            score += 1
    return score


async def recommend_posts(user_id: int, db) -> list:
    """AI 推荐帖子：根据用户笔记和帖子内容，用 AI 选出最相关的帖子

    流程：取用户最近的笔记 → 取热门帖子 → 让 AI 从中选出推荐
    """
    from app.models import Note, Post

    # 取用户最近的笔记标题和分类
    notes = db.query(Note).filter(Note.user_id == user_id).order_by(Note.updated_at.desc()).limit(10).all()
    note_titles = [{"title": n.title, "category": n.category} for n in notes]

    # 取热门帖子（按阅读数+点赞数排序）
    posts = db.query(Post).order_by(
        (Post.read_count + Post.like_count * 3).desc()
    ).limit(20).all()
    if not posts:
        return []

    # 如果用户没有笔记，直接返回热门帖子
    if not note_titles:
        return [{"id": p.id, "title": p.title, "excerpt": p.excerpt, "category": p.category,
                 "read_count": p.read_count, "like_count": p.like_count} for p in posts[:5]]

    # 让 AI 从热门帖子中选出与用户笔记最相关的
    post_list = [{"id": p.id, "title": p.title, "category": p.category, "excerpt": (p.excerpt or "")[:100]} for p in posts]

    import json as _json2
    prompt = (
        "任务：从候选帖子中选出与用户笔记最相关的5篇，按相关性排序。\n\n"
        f"用户最近的笔记：\n{_json2.dumps(note_titles, ensure_ascii=False)}\n\n"
        f"候选帖子列表（每条有id和title）：\n{_json2.dumps(post_list, ensure_ascii=False)}\n\n"
        '请只返回JSON数组，格式为 [{"id": 帖子的id数字, "reason": "推荐理由"}]，'
        "不要包含任何其他文字或解释。"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.DEEPSEEK_BASE_URL}/v1/messages",
                headers={
                    "x-api-key": settings.DEEPSEEK_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "max_tokens": 4096,
                    "system": "你是脉记的推荐引擎。只返回JSON，不要其他文字。",
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("content", [])
            text = ""
            # 优先取 text block
            for block in content:
                if block.get("type") == "text":
                    text = block.get("text", "")
                    break
            # 如果没有 text block，从 thinking 中提取
            if not text:
                for block in content:
                    if block.get("type") == "thinking":
                        text = block.get("thinking", "")
                        break

            import json as _json
            import re
            # 提取 JSON 数组（兼容 markdown 代码块）
            json_match = re.search(r'\[.*\]', text, re.DOTALL)
            if json_match:
                text = json_match.group(0)
            recommendations = _json.loads(text)
            # 匹配回帖子对象
            post_map = {p.id: p for p in posts}
            result = []
            for rec in recommendations:
                pid = rec.get("id")
                # AI 可能返回字符串或整数类型的 id
                try:
                    pid = int(pid)
                except (TypeError, ValueError):
                    pass
                p = post_map.get(pid)
                if p:
                    result.append({
                        "id": p.id,
                        "title": p.title,
                        "excerpt": p.excerpt,
                        "category": p.category,
                        "author_name": p.author_name,
                        "read_count": p.read_count,
                        "like_count": p.like_count,
                        "reason": rec.get("reason", ""),
                    })
            # 如果 AI 推荐的帖子都匹配不到，降级返回热门帖子
            if not result:
                logger.warning("AI 推荐匹配失败，降级返回热门帖子。AI返回: %s", recommendations)
                return [{"id": p.id, "title": p.title, "excerpt": p.excerpt, "category": p.category,
                         "author_name": p.author_name, "read_count": p.read_count,
                         "like_count": p.like_count, "reason": ""} for p in posts[:5]]
            return result[:5]
    except Exception as e:
        logger.error("AI 推荐帖子失败: %s | text=%s", e, text[:200] if 'text' in dir() else 'N/A')
        # 降级：返回热门帖子
        return [{"id": p.id, "title": p.title, "excerpt": p.excerpt, "category": p.category,
                 "author_name": p.author_name, "read_count": p.read_count,
                 "like_count": p.like_count, "reason": ""} for p in posts[:5]]
