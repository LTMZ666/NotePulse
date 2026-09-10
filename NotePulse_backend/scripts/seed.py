"""种子数据：初始化示例帖子"""
from app.core.database import SessionLocal, Base, engine
from app.models import Post, Tag  # noqa: 导入所有模型确保建表

# 建表
Base.metadata.create_all(bind=engine)

db = SessionLocal()

seed_posts = [
    {
        "title": "明式家具榫卯「霸王枨」的受力分析：为什么不用钉子却能千年不摇",
        "excerpt": "从力学角度解析霸王枨如何将竖向荷载转化为斜向分力，实现「无钉而固」。",
        "content": "霸王枨是明式家具中极具代表性的榫卯结构之一。它不使用钉子，而是通过精妙的几何角度，将桌面的竖向荷载分解为沿枨方向的压力与水平方向的分力……",
        "category": "数学研究",
        "author_name": "匠木研究",
        "read_count": 328,
        "like_count": 47,
    },
    {
        "title": "高并发系统中的幂等性设计：从令牌桶到分布式锁",
        "excerpt": "在分布式环境下，如何保证同一次请求无论被重试多少次，结果都一致？",
        "content": "幂等性是分布式系统设计的基石。本文从业务幂等号、唯一索引、状态机、分布式锁四个层面展开讨论……",
        "category": "系统架构",
        "author_name": "架构笔记",
        "read_count": 512,
        "like_count": 89,
    },
    {
        "title": "用 CSS 实现毛笔字飞白效果的三种思路",
        "excerpt": "mask、background-clip 与 SVG filter，谁才是最佳方案？",
        "content": "飞白是书法艺术中的枯笔效果，在数字化实现中需要模拟笔触边缘的干涩感……",
        "category": "前端技术",
        "author_name": "前端工坊",
        "read_count": 267,
        "like_count": 31,
    },
    {
        "title": "动态规划中「区间 DP」的统一思维框架",
        "excerpt": "从石子合并到戳气球，区间 DP 为什么总是 O(n³)？",
        "content": "区间 DP 的核心是将大区间拆分为若干子区间，通过子区间的最优解合并得到大区间的最优解……",
        "category": "算法",
        "author_name": "算法拾遗",
        "read_count": 445,
        "like_count": 62,
    },
    {
        "title": "从用户旅程图看「注册即流失」的设计陷阱",
        "excerpt": "为什么 60% 的用户在注册步骤离开？我们做了一次完整的路径复盘。",
        "content": "注册是产品的第一道门槛。过长的表单、模糊的密码规则、不必要的邮箱验证都会导致用户流失……",
        "category": "产品设计",
        "author_name": "产品沉思录",
        "read_count": 189,
        "like_count": 28,
    },
    {
        "title": "欧拉公式 e^(iπ)+1=0 的五种证明方法",
        "excerpt": "从泰勒展开到复变函数，看数学之美的不同侧面。",
        "content": "欧拉公式被誉为「最美公式」，它将五个最重要的数学常数联系在一起……",
        "category": "数学",
        "author_name": "数学漫步",
        "read_count": 603,
        "like_count": 104,
    },
]

try:
    if db.query(Post).count() == 0:
        for p in seed_posts:
            db.add(Post(**p))
        db.commit()
        print(f"已播种 {len(seed_posts)} 条帖子")
    else:
        print("帖子表已有数据，跳过播种")

    seed_tags = ["数学", "架构", "前端", "算法", "产品", "古风", "生活"]
    for name in seed_tags:
        if not db.query(Tag).filter(Tag.name == name).first():
            db.add(Tag(name=name, count=1))
    db.commit()
    print("标签初始化完成")
finally:
    db.close()
