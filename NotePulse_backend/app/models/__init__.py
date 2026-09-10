"""ORM 模型统一导出

导入所有模型以确保 Base.metadata 包含全部表定义。
"""
from app.models.user import User
from app.models.note import Note
from app.models.post import Post
from app.models.tag import Tag
from app.models.favorite import Favorite
from app.models.like import Like
from app.models.comment import Comment
from app.models.notification import Notification

__all__ = ["User", "Note", "Post", "Tag", "Favorite", "Like", "Comment", "Notification"]
