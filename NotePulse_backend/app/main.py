"""FastAPI 主入口"""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.database import engine, Base
from app.routers import auth, notes, posts, stats, admin, users, favorites, comments, notifications, ai

# 建表
Base.metadata.create_all(bind=engine)

# 轻量级迁移：为已有 posts 表补齐 status 列（create_all 不会修改已存在的表）
def _ensure_post_status_column() -> None:
    with engine.connect() as conn:
        cols = [r[0] for r in conn.exec_driver_sql(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'"
        )]
        if "status" not in cols:
            conn.exec_driver_sql(
                "ALTER TABLE posts ADD COLUMN status VARCHAR(20) "
                "NOT NULL DEFAULT 'approved' COMMENT '审校状态：pending/approved/rejected'"
            )
            conn.commit()


# 轻量级迁移：为已有 users 表补齐 bio 列
def _ensure_user_bio_column() -> None:
    with engine.connect() as conn:
        cols = [r[0] for r in conn.exec_driver_sql(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
        )]
        if "bio" not in cols:
            conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN bio TEXT NULL DEFAULT NULL COMMENT '个人简介'"
            )
            conn.commit()


# 轻量级迁移：将 users.avatar 改为 LONGTEXT（支持大 base64 头像存储，4GB 上限）
def _ensure_user_avatar_text() -> None:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'"
        ).fetchall()
        if rows and rows[0][0].lower() != "longtext":
            conn.exec_driver_sql(
                "ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL DEFAULT NULL "
                "COMMENT '头像 URL 或 base64 数据'"
            )
            conn.commit()


# 轻量级迁移：给 users 表加 is_admin 列（管理员标志）
def _ensure_user_is_admin_column() -> None:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'"
        ).fetchall()
        if not rows:
            conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE "
                "COMMENT '是否管理员'"
            )
            conn.commit()


# 轻量级迁移：给 users 表加 is_active 列（账号启用标志）
def _ensure_user_is_active_column() -> None:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'"
        ).fetchall()
        if not rows:
            conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE "
                "COMMENT '是否启用'"
            )
            conn.commit()


_ensure_post_status_column()
_ensure_user_bio_column()
_ensure_user_avatar_text()
_ensure_user_is_admin_column()
_ensure_user_is_active_column()


# 轻量级迁移：给 notes 表加 images 列（LONGTEXT，存 base64 图片 JSON 数组）
def _ensure_note_images_column() -> None:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'images'"
        ).fetchall()
        if not rows:
            conn.exec_driver_sql(
                "ALTER TABLE notes ADD COLUMN images LONGTEXT NULL DEFAULT NULL "
                "COMMENT '图片 base64 JSON 数组'"
            )
            conn.commit()
        elif rows[0][0].lower() != "longtext":
            conn.exec_driver_sql(
                "ALTER TABLE notes MODIFY COLUMN images LONGTEXT NULL DEFAULT NULL "
                "COMMENT '图片 base64 JSON 数组'"
            )
            conn.commit()


_ensure_note_images_column()


# 轻量级迁移：给 comments 表加 author_avatar 列（LONGTEXT，存头像 URL 或 base64）
def _ensure_comment_avatar_column() -> None:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'author_avatar'"
        ).fetchall()
        if not rows:
            conn.exec_driver_sql(
                "ALTER TABLE comments ADD COLUMN author_avatar LONGTEXT NULL DEFAULT NULL "
                "COMMENT '评论者头像快照（URL 或 base64）'"
            )
            conn.commit()
        elif rows[0][0].lower() != "longtext":
            conn.exec_driver_sql(
                "ALTER TABLE comments MODIFY COLUMN author_avatar LONGTEXT NULL DEFAULT NULL "
                "COMMENT '评论者头像快照（URL 或 base64）'"
            )
            conn.commit()


_ensure_comment_avatar_column()


# 轻量级迁移：为已有 notifications 表补齐 comment_id 列
def _ensure_notification_comment_id_column() -> None:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'comment_id'"
        ).fetchall()
        if not rows:
            conn.exec_driver_sql(
                "ALTER TABLE notifications ADD COLUMN comment_id INT NULL DEFAULT NULL "
                "COMMENT '评论ID（仅 comment 类型，用于跳转定位）'"
            )
            conn.commit()


_ensure_notification_comment_id_column()


# 轻量级迁移：给 posts 表加 images 列（LONGTEXT，存 base64 图片 JSON 数组）
def _ensure_post_images_column() -> None:
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'images'"
        ).fetchall()
        if not rows:
            conn.exec_driver_sql(
                "ALTER TABLE posts ADD COLUMN images LONGTEXT NULL DEFAULT NULL "
                "COMMENT '图片 base64 JSON 数组'"
            )
            conn.commit()


_ensure_post_images_column()


app = FastAPI(
    title="脉记 NotePulse API",
    description="脉记笔记知识典藏后端服务",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(posts.router)
app.include_router(stats.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(favorites.router)
app.include_router(comments.router)
app.include_router(notifications.router)
app.include_router(ai.router)


@app.get("/api/health", tags=["根"])
def health():
    return {"status": "ok"}


# ============================================
# 静态前端挂载：一跑全通
# 后端根目录 = NotePulse_backend/，其同级即 NotePulse_frontend / NotePulse_admin
# ============================================
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # D:\NotePulse
FRONTEND_DIR = _PROJECT_ROOT / "NotePulse_frontend"
ADMIN_DIR = _PROJECT_ROOT / "NotePulse_admin"

# 管理端：/admin/ -> NotePulse_admin/  （挂在前缀路径上，html=True 自动处理目录首页）
if ADMIN_DIR.is_dir():
    app.mount(
        "/admin",
        StaticFiles(directory=str(ADMIN_DIR), html=True),
        name="admin_static",
    )

# 用户前台：/ -> NotePulse_frontend/
#   根路径单独返回 index.html，其他静态资源（script.js/styles.css/...）走 mount
if FRONTEND_DIR.is_dir():
    @app.get("/", include_in_schema=False)
    def _frontend_index():
        return FileResponse(str(FRONTEND_DIR / "index.html"))

    app.mount(
        "",
        StaticFiles(directory=str(FRONTEND_DIR), html=True),
        name="frontend_static",
    )
