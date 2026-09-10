# 脉记 NotePulse

> 全栈知识管理平台 —— 个人笔记典藏 · 帖子社区互动 · AI 智能推荐 · 管理后台审校

脉记是一个面向学习者和内容创作者的全栈应用，支持个人笔记管理、帖子社区互动、AI 智能推荐和管理后台审校。后端基于 FastAPI 分层架构，前端采用原生 JavaScript（古风博学主题），通过 Docker Compose 一键部署。

## 在线演示

- **用户端**：[http://www.fanqieltmz.dpdns.org/](http://www.fanqieltmz.dpdns.org/)
- **管理端**：[http://www.fanqieltmz.dpdns.org/admin/](http://www.fanqieltmz.dpdns.org/admin/)

### 演示账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 普通用户 | 墨涵 | demo123456 |

> 演示数据包含 6 个用户、12 篇笔记、12 篇帖子、20 条评论

---

## 功能特性

### 用户端

- **用户认证**：JWT + RBAC 鉴权，2 小过期自动登出，支持注册/登录/个人信息修改/头像上传
- **笔记管理（籍之库）**：多章节长图文笔记，支持图片上传压缩、置顶、分类标签
- **帖子社区（同之帖）**：发帖（含图片）、评论（游标分页 + 扁平化回复展示）、点赞（防重复）、收藏、消息通知
- **AI 智能推荐**：集成 DeepSeek AI，基于帖子内容语义匹配生成推荐，Redis 缓存 5 分钟 TTL（首次 ~31s → 缓存命中 0.02s）
- **数据面板**：七日趋势柱状图、分类分布环形图、个人统计概览

### 管理端（典枢院）

- **藏鉴概览**：全站统计（用户/笔记/帖子/阅读/点赞）、七日趋势、分类分布
- **藏帖审校**：帖子列表（按状态筛选）、预览、入藏/退回/下架/删除
- **同道名册**：用户列表、启用/禁用、发帖/获赞/阅读统计

### 后端工程

- **分层架构**：core（配置/数据库/安全/Redis/AI）/ models / routers / schemas
- **缓存策略**：Redis 缓存评论首页（TTL 5分钟）、评论计数（TTL 1小时）、AI 推荐（TTL 5分钟），写操作自动失效
- **游标分页**：评论系统采用 `ISO时间:ID` 游标格式，默认 20 条/页，支持展开折叠回复
- **轻量级迁移**：启动时自动检测并补齐数据库列，无需 Alembic

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Python 3.12、FastAPI、Pydantic、SQLAlchemy、Uvicorn |
| **数据库** | MySQL 8.4（utf8mb4）、Redis 8 |
| **前端** | 原生 JavaScript、CSS3（古风博学主题） |
| **AI** | DeepSeek API（Anthropic 兼容接口） |
| **部署** | Docker Compose、Nginx、systemd、阿里云 ECS |
| **工具** | Git、pip、paramiko |

---

## 项目结构

```
NotePulse/
├── docker-compose.yml              # Docker 编排配置
├── .env.example                      # 环境变量示例
├── .gitignore
├── nginx/
│   └── nginx.conf                    # Nginx 反向代理配置
├── NotePulse_backend/                # 后端（FastAPI）
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                  # FastAPI 入口 + 轻量级迁移
│   │   ├── deps.py                  # 依赖注入（DB/认证/管理员）
│   │   ├── core/                    # 核心模块
│   │   │   ├── config.py            # 配置（环境变量读取）
│   │   │   ├── database.py          # SQLAlchemy 引擎
│   │   │   ├── security.py          # JWT 生成/校验
│   │   │   ├── redis.py             # Redis 连接 + 缓存工具
│   │   │   └── ai.py                # DeepSeek AI 集成
│   │   ├── models/                  # SQLAlchemy 模型
│   │   │   ├── user.py / note.py / post.py
│   │   │   ├── comment.py / like.py / favorite.py
│   │   │   ├── tag.py / notification.py
│   │   ├── routers/                 # API 路由
│   │   │   ├── auth.py              # 认证
│   │   │   ├── notes.py             # 笔记
│   │   │   ├── posts.py             # 帖子
│   │   │   ├── comments.py          # 评论
│   │   │   ├── favorites.py         # 收藏
│   │   │   ├── notifications.py     # 通知
│   │   │   ├── users.py             # 用户
│   │   │   ├── stats.py             # 统计
│   │   │   ├── ai.py                # AI 推荐
│   │   │   └── admin.py             # 管理端
│   │   └── schemas/                 # Pydantic 模型
│   └── run.py
├── NotePulse_frontend/               # 用户端前端
│   ├── index.html
│   ├── script.js
│   └── styles.css
└── NotePulse_admin/                  # 管理端前端
    ├── index.html
    ├── admin.js
    └── admin.css
```

---

## 快速开始

### 环境要求

- Docker 24+
- Docker Compose 2.20+

### 一键部署

```bash
# 1. 克隆仓库
git clone https://github.com/LTMZ666/NotePulse.git
cd NotePulse

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填写实际密码和 API Key
vi .env

# 3. 一键启动（MySQL + Redis + Backend + Nginx）
docker-compose up -d --build

# 4. 访问应用
# 用户端: http://localhost/
# 管理端: http://localhost/admin/
# API 文档: http://localhost/api/docs
```

### 环境变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `DB_PASSWORD` | MySQL root 密码 | `your_password` |
| `SECRET_KEY` | JWT 签名密钥 | `random_string` |
| `DEEPSEEK_API_KEY` | DeepSeek AI API Key | `sk-xxxxx` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `your_password` |

### 常用运维命令

```bash
# 查看服务状态
docker-compose ps

# 查看后端日志
docker-compose logs -f backend

# 停止服务
docker-compose down

# 代码更新后重新构建
docker-compose up -d --build

# 清空所有数据（重新开始）
docker-compose down -v
```

---

## API 概览

| 模块 | 路径前缀 | 主要功能 |
|------|---------|---------|
| 认证 | `/api/auth` | 注册、登录、获取当前用户 |
| 笔记 | `/api/notes` | 增删改查、置顶、图片上传 |
| 帖子 | `/api/posts` | 增删改查、点赞、状态筛选 |
| 评论 | `/api/comments` | 游标分页、回复、删除 |
| 收藏 | `/api/favorites` | 收藏/取消收藏、列表 |
| 通知 | `/api/notifications` | 通知列表、已读标记 |
| 用户 | `/api/users` | 个人信息、头像、简介 |
| 统计 | `/api/stats` | 全站统计、趋势、分类 |
| AI | `/api/ai` | 智能推荐 |
| 管理端 | `/api/admin` | 登录、概览、帖子审校、用户管理 |

完整 API 文档访问 `/api/docs`（Swagger UI）。

---

## 架构设计

### 请求链路

```
浏览器 → Nginx :80 →  静态文件 (前端/admin)
                   →  /api/ 反向代理 → Uvicorn :3000 (FastAPI)
                                          ↓
                                   MySQL 8.4 (maiji 数据库)
                                   Redis 8 (缓存)
                                   DeepSeek API (AI 推荐)
```

### 缓存策略

| 缓存项 | TTL | 失效策略 |
|--------|-----|---------|
| 评论首页 | 5 分钟 | 评论创建/删除时自动失效 |
| 评论计数 | 1 小时 | 评论创建/删除时自动失效 |
| AI 推荐 | 5 分钟 | 自然过期 |

### 数据模型

- **User**：用户（含 is_admin、is_active、avatar、bio）
- **Note**：笔记（含 images、is_pinned）
- **Post**：帖子（含 status: pending/approved/rejected、images）
- **Comment**：评论（含 author_avatar 快照、游标分页）
- **Like / Favorite**：点赞/收藏（防重复）
- **Notification**：消息通知（含 comment_id 跳转定位）
- **Tag**：标签

---

## 开发者

**王帆** - 中北大学 · 软件工程（本科）

- GitHub: [LTMZ666](https://github.com/LTMZ666)
- 项目演示: [http://www.fanqieltmz.dpdns.org/](http://www.fanqieltmz.dpdns.org/)

---

## License

MIT License - 本项目仅供学习和个人作品展示使用。
