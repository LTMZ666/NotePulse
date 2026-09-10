"""Redis 客户端（评论缓存 + 计数器）"""
import json
import logging
from typing import Optional, Any

import redis
from app.core.config import settings

logger = logging.getLogger(__name__)

_pool = redis.ConnectionPool(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    password=settings.REDIS_PASSWORD or None,
    decode_responses=True,
    max_connections=20,
)


def get_redis() -> redis.Redis:
    """获取 Redis 连接（连接池复用）"""
    return redis.Redis(connection_pool=_pool)


# ---- 缓存键名约定 ----
def _key_first_page(post_id: int) -> str:
    return f"post:{post_id}:comments:first_page"


def _key_comment_count(post_id: int) -> str:
    return f"post:{post_id}:comment_count"


# ---- 评论缓存 ----
def cache_first_page(post_id: int, data: dict, ttl: int = 300) -> None:
    """缓存第一页评论（JSON 序列化），TTL 默认 5 分钟"""
    try:
        r = get_redis()
        r.setex(_key_first_page(post_id), ttl, json.dumps(data, default=str))
    except Exception as e:
        logger.warning("Redis 缓存写入失败: %s", e)


def get_cached_first_page(post_id: int) -> Optional[dict]:
    """读取缓存的第一页评论"""
    try:
        r = get_redis()
        raw = r.get(_key_first_page(post_id))
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.warning("Redis 缓存读取失败: %s", e)
    return None


def invalidate_comment_cache(post_id: int) -> None:
    """评论变更时清除缓存"""
    try:
        r = get_redis()
        r.delete(_key_first_page(post_id))
        r.delete(_key_comment_count(post_id))
    except Exception as e:
        logger.warning("Redis 缓存失效失败: %s", e)


# ---- 评论计数 ----
def get_comment_count(post_id: int) -> Optional[int]:
    """从 Redis 获取评论数（未命中返回 None）"""
    try:
        r = get_redis()
        val = r.get(_key_comment_count(post_id))
        if val is not None:
            return int(val)
    except Exception as e:
        logger.warning("Redis 计数读取失败: %s", e)
    return None


def set_comment_count(post_id: int, count: int, ttl: int = 3600) -> None:
    """设置评论数缓存，TTL 默认 1 小时"""
    try:
        r = get_redis()
        r.setex(_key_comment_count(post_id), ttl, str(count))
    except Exception as e:
        logger.warning("Redis 计数写入失败: %s", e)


def incr_comment_count(post_id: int, delta: int = 1) -> None:
    """评论数增减"""
    try:
        r = get_redis()
        r.incrby(_key_comment_count(post_id), delta)
    except Exception as e:
        logger.warning("Redis 计数更新失败: %s", e)


# ---- AI 推荐缓存 ----
def _key_ai_recommend(user_id: int) -> str:
    return f"ai:recommend:{user_id}"


def cache_ai_recommend(user_id: int, data: list, ttl: int = 300) -> None:
    """缓存 AI 推荐结果，TTL 默认 5 分钟"""
    try:
        r = get_redis()
        r.setex(_key_ai_recommend(user_id), ttl, json.dumps(data, default=str))
    except Exception as e:
        logger.warning("AI 推荐缓存写入失败: %s", e)


def get_cached_ai_recommend(user_id: int) -> Optional[list]:
    """读取缓存的 AI 推荐"""
    try:
        r = get_redis()
        raw = r.get(_key_ai_recommend(user_id))
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.warning("AI 推荐缓存读取失败: %s", e)
    return None


def invalidate_ai_recommend(user_id: int) -> None:
    """清除 AI 推荐缓存"""
    try:
        r = get_redis()
        r.delete(_key_ai_recommend(user_id))
    except Exception as e:
        logger.warning("AI 推荐缓存失效失败: %s", e)
