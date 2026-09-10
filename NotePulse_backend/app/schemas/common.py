"""通用 Pydantic 模型"""
from pydantic import BaseModel


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    size: int
