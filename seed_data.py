"""NotePulse 演示数据填充脚本

生成有质量的门面数据：用户、笔记、帖子、评论、点赞
用法: python seed_data.py
"""
import os
import sys
import random
from datetime import datetime, timedelta

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models import User, Note, Post, Comment, Like, Favorite

# ============================================
# 用户数据
# ============================================
USERS = [
    {
        "username": "墨涵",
        "email": "mohan@notepulse.cn",
        "password": "demo123456",
        "bio": "深究算理，以数观世。愿与同道共探算法之美。",
    },
    {
        "username": "青笺",
        "email": "qingjian@notepulse.cn",
        "password": "demo123456",
        "bio": "架构之学，如筑城郭。一砖一瓦，皆有章法。",
    },
    {
        "username": "观澜",
        "email": "guanlan@notepulse.cn",
        "password": "demo123456",
        "bio": "格物致知，观万物之理。天地有大美而不言。",
    },
    {
        "username": "临川",
        "email": "linchuan@notepulse.cn",
        "password": "demo123456",
        "bio": "文心雕龙，代码如诗。每一行皆是心意之所寄。",
    },
    {
        "username": "若谷",
        "email": "ruogu@notepulse.cn",
        "password": "demo123456",
        "bio": "虚怀若谷，广纳新知。学习是一场没有终点的旅程。",
    },
    {
        "username": "明远",
        "email": "mingyuan@notepulse.cn",
        "password": "demo123456",
        "bio": "明察秋毫，致远四方。于细节处见真章。",
    },
]

# ============================================
# 笔记数据（籍之库）
# ============================================
NOTES = [
    {
        "title": "动态规划之精髓：从最优子结构说起",
        "category": "算学深究",
        "content": """## 动态规划的本质

动态规划并非一种具体的算法，而是一种解决问题的思维方式。其核心在于：**将复杂问题分解为相互重叠的子问题，通过求解子问题来构造原问题的最优解**。

### 三个关键特征

1. **最优子结构**：问题的最优解包含子问题的最优解
2. **重叠子问题**：不同的递归路径会反复求解相同的子问题
3. **无后效性**：当前状态一旦确定，未来的决策不依赖于到达该状态的路径

### 经典案例：最长递增子序列

```python
def length_of_lis(nums):
    if not nums:
        return 0
    dp = [1] * len(nums)
    for i in range(1, len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)
```

这里 `dp[i]` 表示以 `nums[i]` 结尾的最长递增子序列长度。状态转移方程清晰体现了最优子结构。

### 思考

动态规划的难点不在于代码实现，而在于**状态定义**和**状态转移方程**的推导。一旦这两者明确，代码往往水到渠成。""",
        "is_pinned": True,
    },
    {
        "title": "微服务架构的权衡之道",
        "category": "典籍架构",
        "content": """## 架构的本质是权衡

微服务并非银弹，它用复杂度换取了独立性。在拆分服务时，需反复叩问自己：**拆分的边界在哪里？**

### 拆分原则

- **单一职责**：每个服务只做一件事，且做好它
- **独立部署**：服务的变更不应牵连其他服务
- **数据自治**：每个服务拥有自己的数据存储，不共享数据库

### 需要警惕的陷阱

1. **分布式事务**：跨服务的数据一致性是最大的挑战
2. **服务间调用链路过长**：导致延迟叠加和故障传播
3. **运维复杂度激增**：监控、日志、链路追踪缺一不可

### 我的建议

从小处着手。先做模块化单体，在真正需要时再拆分。过早拆分会让团队陷入基础设施的泥潭，而忘了业务本身。""",
        "is_pinned": True,
    },
    {
        "title": "理解 B+ 树索引：数据库查询的基石",
        "category": "典籍架构",
        "content": """## 为什么是 B+ 树

数据库索引选择 B+ 树而非二叉搜索树，核心原因在于**磁盘 I/O**。

### 关键洞察

- 磁盘读取以**页**为单位（通常 4KB-16KB），一次 I/O 读取一整页
- 树越矮，I/O 次数越少
- B+ 树每个节点可以有上百个子节点，树高通常只有 3-4 层

### B+ 树 vs B 树

B+ 树的非叶子节点不存储数据，只存储索引。这意味着：
- 每个节点能容纳更多索引项，树更矮
- 叶子节点通过链表相连，**范围查询**极其高效

### 聚簇索引 vs 二级索引

- **聚簇索引**：叶子节点存储完整数据行，按主键组织
- **二级索引**：叶子节点存储主键值，需要"回表"查询

理解了这些，再看 EXPLAIN 的执行计划，就不再是天书了。""",
    },
    {
        "title": "熵：理解世界的一把钥匙",
        "category": "博物格致",
        "content": """## 熵是什么

熵，本质上是对"混乱程度"的度量。热力学第二定律告诉我们：**孤立系统的熵总是趋向增大**。

这意味着什么？意味着宇宙趋向于无序，趋向于均匀，趋向于平淡。

### 信息熵

香农将这个概念引入信息论。一条消息包含的信息量，取决于它的**不确定性**。

- 确定的事件（太阳从东方升起）信息量为 0
- 不确定的事件（彩票号码）信息量极大

### 与编程的联系

- 墨菲定律本质上是熵增定律的体现：事情趋向于出错
- 代码会自然腐化，因为维护它的熵减需要持续投入能量
- 好的架构设计，本质是在对抗熵增

### 一点感悟

生命本身，就是对抗熵增的奇迹。我们摄入低熵的食物，排出高熵的热量，维持自身的有序结构。薛定谔说：**生命以负熵为食**。""",
    },
    {
        "title": "红黑树：平衡的二叉之舞",
        "category": "算学深究",
        "content": """## 红黑树的五条性质

1. 每个节点是红色或黑色
2. 根节点是黑色
3. 每个叶子节点（NIL）是黑色
4. 红色节点的子节点必须是黑色（不能有连续两个红色）
5. 从任一节点到其每个叶子的路径，包含相同数目的黑色节点

### 为什么是红黑树

AVL 树是完全平衡的，但插入删除时旋转次数多。红黑树是"近似平衡"的——**最长路径不超过最短路径的两倍**，这换来的是更少的调整操作。

### 实际应用

- Java 的 TreeMap、HashMap（链表转红黑树）
- Linux 内核的进程调度 CFS
- C++ STL 的 std::map

### 学习建议

不要死记硬背旋转规则。理解"着色"和"旋转"的本质：**着色是标记，旋转是重构**，两者配合维持平衡。""",
    },
    {
        "title": "CAP 定理的深层理解",
        "category": "典籍架构",
        "content": """## CAP 不是三选二那么简单

CAP 定理说：分布式系统无法同时满足一致性(C)、可用性(A)、分区容错性(P)。

但更准确的理解是：**在网络分区发生时，你只能在 C 和 A 之间选择**。因为分区是客观存在的，你无法选择不要 P。

### 常见误解

- "我的系统是 CA" —— 不，分布式系统必然面临分区，不存在 CA
- "CAP 是三选二" —— 实际上是 P 必选，然后 C 和 A 二选一
- "AP 就是一致性差" —— 最终一致性也是一致性的一种

### 现实选择

- **CP**：银行转账、库存扣减（宁可不可用，不能不一致）
- **AP**：社交信息流、搜索（宁可短暂不一致，也要可用）

### 超越 CAP

BASE 理论是对 CAP 的实践补充：Basically Available（基本可用）、Soft State（软状态）、Eventually Consistent（最终一致性）。""",
    },
    {
        "title": "量子纠缠：爱因斯坦的幽灵",
        "category": "博物格致",
        "content": """## 超距作用

爱因斯坦称量子纠缠为"幽灵般的超距作用"。两个纠缠粒子，无论相隔多远，对其中一个的测量会瞬间影响另一个。

### 贝尔不等式

1964 年，贝尔提出了一个可以用实验检验的不等式。实验结果证明：**量子力学的预言是对的**，世界确实是非定域的。

### 量子计算的意义

量子比特不是简单的 0 或 1，而是两者的叠加。n 个量子比特可以同时表示 2^n 个状态，这就是量子并行计算的基础。

### 思考

量子纠缠告诉我们，世界的本质比直觉更奇妙。我们以为是分离的，实则是关联的；我们以为是确定的，实则是概率的。

这不仅是物理学的发现，更是哲学的启示。""",
    },
    {
        "title": "写代码如同作文",
        "category": "文心笔谈",
        "content": """## 代码的文学性

好的代码如同好的文章：结构清晰、表达准确、读来流畅。

### 三重境界

1. **能用**：功能正确，能跑通 —— 这是及格线
2. **可读**：他人能读懂，能维护 —— 这是良好
3. **优雅**：简洁且有力，难以再删一字 —— 这是卓越

### 命名之道

> 变量名要能自我解释。如果需要注释来解释变量名，那名字就起得不好。

- `d` → `elapsed_time_days`
- `lst` → `active_users`
- `flag` → `is_valid`

### 函数之道

一个函数只做一件事。函数名是一句话的主语，函数体是谓语。

### 注释之道

注释不是用来解释"代码做了什么"的，而是解释"为什么这样做"。如果代码本身不能说明它在做什么，那是代码写得不够好。

### 结语

编程是表达的艺术。我们用代码表达思想，用结构组织逻辑，用命名传递意图。每一次重构，都是一次修辞的打磨。""",
        "is_pinned": True,
    },
    {
        "title": "Redis 持久化的两种哲学",
        "category": "典籍架构",
        "content": """## RDB vs AOF

Redis 提供两种持久化机制，代表了不同的哲学。

### RDB（快照）

- 定期将内存数据 dump 到磁盘
- 恢复速度快，但可能丢失最后一次快照后的数据
- 哲学：**以精度换速度**

### AOF（追加日志）

- 记录每一条写命令
- 数据更完整，但文件更大、恢复更慢
- 哲学：**以速度换精度**

### 实践建议

两者可以同时开启。用 AOF 保证数据安全，用 RDB 做定期备份和快速恢复。

### 注意事项

- AOF 重写会压缩历史命令，防止文件膨胀
- `appendfsync everysec` 是性能与安全的平衡点
- 恢复时优先加载 AOF（数据更完整）""",
    },
    {
        "title": "混沌理论：确定中的不确定",
        "category": "博物格致",
        "content": """## 蝴蝶效应

混沌系统对初始条件极其敏感。巴西的蝴蝶扇动翅膀，可能引起德州的龙卷风。这就是"蝴蝶效应"。

### 不是随机

混沌不等于随机。混沌系统是**确定性的**——给定相同的初始条件，结果必然相同。但因为初始条件无法无限精确测量，长期预测变得不可能。

### 吸引子

混沌系统虽然不可预测，但其轨迹会落入一个特定的区域——**奇异吸引子**。它既不是周期性的，也不是完全随机的。

### 对软件工程的启示

- 微小的 bug 可能引发重大故障（蝴蝶效应）
- 系统复杂性达到一定程度后，必然出现混沌行为
- 监控和容错比试图完全控制更重要

### 感悟

世界在确定与不确定之间。我们追求确定性，但要拥抱不确定性。这是混沌理论最深层的智慧。""",
    },
    {
        "title": "Git 的内部模型：一棵树的故事",
        "category": "典籍架构",
        "content": """## Git 的本质

Git 不是简单的版本管理工具，它本质上是一个**内容寻址的文件系统**。

### 三个核心对象

1. **Blob**：存储文件内容（不含文件名）
2. **Tree**：存储目录结构（文件名 + blob 引用）
3. **Commit**：存储一次提交（tree 引用 + 父提交 + 信息）

每个对象都通过 SHA-1 哈希寻址。相同内容必然产生相同哈希，天然去重。

### 分支的轻量

Git 分支只是一个指向某个 commit 的指针（文件里存着 40 字符的哈希）。这就是为什么创建分支如此之快。

### 理解之后

- `git reset` 只是移动指针
- `git rebase` 是重放 commit 序列
- `git merge` 是创建一个合并 commit

当你理解了对象模型，Git 的各种命令就不再是黑魔法了。""",
    },
    {
        "title": "学习的方法论：费曼技巧",
        "category": "随笔杂谈",
        "content": """## 费曼学习法

理查德·费曼说：**如果你不能用简单的话把一个概念解释清楚，说明你并没有真正理解它。**

### 四步法

1. **选择概念**：选定要学习的主题
2. **教给小孩**：用最简单的语言解释，假设对方是完全的外行
3. **发现盲区**：在解释过程中发现自己卡壳的地方
4. **简化语言**：用类比和故事，去除专业术语

### 为什么有效

- 教学是最好的学习
- 输出倒逼输入
- 简单化检验理解的深度

### 我的实践

每当学完一个新技术，我会写一篇笔记，假装在教一个初学者。如果我写不出，或者写得晦涩，我就知道自己还没真正懂。

### 记录与沉淀

这也是我做 NotePulse 的初衷——知识不是看来的，是写来的、讲来的、用来的。沉淀下来，它才真正属于你。""",
        "is_pinned": True,
    },
]

# ============================================
# 帖子数据（同之帖）
# ============================================
POSTS = [
    {
        "title": "从0到1：我用FastAPI搭建了一个知识管理平台",
        "category": "典籍架构",
        "excerpt": "分享我用FastAPI + SQLAlchemy + Redis搭建NotePulse的全过程，从技术选型到架构设计，踩过的坑和收获的思考。",
        "content": """## 缘起

一直想有一个属于自己的知识沉淀之所。Notion太重，博客太轻，我需要的是介于两者之间的东西——既有结构化的整理，又有随手记录的自由。

于是有了 NotePulse。

## 技术栈选择

### 后端：FastAPI

选择 FastAPI 有几个理由：
- 异步支持好，性能优异
- 自动生成 API 文档，开发体验极佳
- 类型提示让代码自文档化
- 学习曲线平缓，上手快

### 数据库：MySQL + SQLAlchemy

虽然 PostgreSQL 更强大，但 MySQL 的运维生态更成熟。SQLAlchemy 2.0 的新风格 API 也很优雅。

### 缓存：Redis

用于评论缓存、AI推荐缓存、计数缓存。TTL策略让热点数据快速响应。

## 架构要点

1. **轻量级迁移**：不用 Alembic，而是启动时检查并自动补齐列（适合个人项目）
2. **游标分页**：评论系统用 ISO时间:ID 格式的游标，避免 OFFSET 的性能问题
3. **同域部署**：FastAPI 直接挂载静态文件，Nginx 做反向代理，一套搞定

## 收获

这个项目让我深刻体会到：
- 好的架构是**演化**出来的，不是设计出来的
- 缓存是性能的银弹，但也是一致性的地雷
- 代码风格即工程文化

后续会继续分享更多技术细节，欢迎交流。""",
        "author_name": "青笺",
        "category_idx": 1,
        "read_count": 2847,
        "like_count": 186,
    },
    {
        "title": "动态规划入门：爬楼梯问题的三种解法",
        "category": "算学深究",
        "excerpt": "从最简单的爬楼梯问题出发，讲透动态规划的核心思想。从递归到记忆化再到DP，每一步都讲清楚。",
        "content": """## 问题描述

你正在爬楼梯，每次可以走1步或2步。问到第n阶有多少种不同的走法？

## 解法一：递归

```python
def climb_stairs(n):
    if n <= 2:
        return n
    return climb_stairs(n-1) + climb_stairs(n-2)
```

直观但效率极低——时间复杂度 O(2^n)，大量重复计算。

## 解法二：记忆化递归

```python
memo = {}
def climb_stairs(n):
    if n <= 2:
        return n
    if n in memo:
        return memo[n]
    memo[n] = climb_stairs(n-1) + climb_stairs(n-2)
    return memo[n]
```

时间复杂度降至 O(n)。这就是动态规划的雏形。

## 解法三：迭代DP

```python
def climb_stairs(n):
    if n <= 2:
        return n
    a, b = 1, 2
    for _ in range(3, n+1):
        a, b = b, a + b
    return b
```

空间优化到 O(1)。从递归到迭代，从O(2^n)到O(n)，这就是动态规划的魅力。

## 小结

- 递归 → 发现子问题
- 记忆化 → 消除重复计算
- 迭代 → 优化空间

动态规划的核心就是：**记住已经求解过的子问题的答案**。""",
        "author_name": "墨涵",
        "category_idx": 0,
        "read_count": 4521,
        "like_count": 312,
    },
    {
        "title": "我读《代码整洁之道》的十点感悟",
        "category": "文心笔谈",
        "excerpt": "重读Bob大叔的经典之作，结合几年工程实践，写下十点最深的感悟。关于命名、函数、注释、错误处理的重新思考。",
        "content": """## 关于命名

> 取好名字要花时间，但磨刀不误砍柴工。

名字应该回答"是什么"而非"怎么做"。`getDaysInCurrentMonth()` 比 `calc()` 好一万倍。

## 关于函数

函数应该短小。**再短一些**。一个函数只做一件事，一个抽象层级。

判断标准：能否提取出另一个函数？如果能，就提取。

## 关于注释

最好的注释是没有注释——代码本身就能说明一切。

注释是失败的设计的补救。当你需要注释来解释代码时，先想想能否重构代码。

当然，有些注释是有价值的：法律声明、意图说明、警告、TODO。

## 关于错误处理

错误处理不是事后的补丁，而是设计的一部分。

用异常而非错误码。先写 try-catch，再写正常逻辑。这能帮你定义事务边界。

## 关于类

类应该短小。用**职责**而非行数衡量。

单一职责原则听起来简单，做起来难。一个类只应有一个改动的理由。

## 结语

整洁代码不是一朝一夕的事。它是一种习惯，一种修养，一种对 craftsmanship 的追求。

写下这篇，也是对自己的提醒。""",
        "author_name": "临川",
        "category_idx": 3,
        "read_count": 3184,
        "like_count": 245,
    },
    {
        "title": "深入理解MySQL索引：从B+树到执行计划",
        "category": "典籍架构",
        "excerpt": "MySQL索引是面试重点也是工程必备。从B+树结构讲到聚簇索引、覆盖索引、最左前缀，最后看懂EXPLAIN。",
        "content": """## B+树基础

MySQL索引采用B+树。为什么不是二叉树？因为磁盘I/O。

- 每次I/O读取一页（16KB）
- B+树每个节点可存上百个索引，3层就能存千万级数据
- 叶子节点链表相连，范围查询高效

## 聚簇索引 vs 二级索引

- **聚簇索引**：叶子节点存完整数据行，一张表只有一个
- **二级索引**：叶子节点存主键，需要"回表"

## 覆盖索引

如果查询的列都在索引里，就不需要回表。这就是覆盖索引。

```sql
-- 假设有联合索引 (a, b, c)
SELECT a, b FROM t WHERE a = 1;  -- 覆盖索引，无需回表
SELECT * FROM t WHERE a = 1;      -- 需要回表
```

## 最左前缀原则

联合索引 (a, b, c) 可以用于：
- `WHERE a = 1`
- `WHERE a = 1 AND b = 2`
- `WHERE a = 1 AND b = 2 AND c = 3`

但不能用于：
- `WHERE b = 2`（跳过了a）
- `WHERE c = 3`（跳过了a和b）

## 看懂EXPLAIN

关键字段：
- `type`：访问类型，从好到差 system > const > ref > range > index > ALL
- `key`：实际使用的索引
- `rows`：预估扫描行数
- `Extra`：Using index（覆盖索引）、Using filesort、Using temporary

掌握这些，慢查询就不再神秘。""",
        "author_name": "青笺",
        "category_idx": 1,
        "read_count": 5832,
        "like_count": 428,
    },
    {
        "title": "费曼学习法：最好的学习方式就是教",
        "category": "随笔杂谈",
        "excerpt": "费曼说如果你不能简单解释一个概念，说明你没真正懂它。分享我用费曼技巧学习新技术的实践心得。",
        "content": """## 费曼其人

理查德·费曼，诺贝尔物理学奖得主，以深入浅出地讲解复杂概念著称。他的学习方法影响深远。

## 四步法

1. **选定概念**：明确要学什么
2. **假装在教**：用最朴素的语言解释，假设对方是外行
3. **发现盲区**：卡壳的地方就是没懂的
4. **简化再简化**：用类比、用故事、去除术语

## 为什么有效

- **输出倒逼输入**：教的过程中发现自己不懂的地方
- **简单化检验深度**：能用大白话讲清楚的，才是真懂
- **记忆更牢**：主动构建比被动接收记得久

## 我的实践

学完一个技术，我会：
1. 写一篇笔记，假装教初学者
2. 给同事做技术分享
3. 在社区回答相关问题

这三步下来，知识就真的长在脑子里了。

## 一点感悟

我们常常误以为"看过"等于"学会"。但费曼提醒我们：**真正的理解，是能重新创造出来的**。当你能从零开始讲清楚一个概念，它才真正属于你。

这也是我做这个平台的初衷——记录、沉淀、分享。知识不是看来的，是写来的。""",
        "author_name": "若谷",
        "category_idx": 4,
        "read_count": 2156,
        "like_count": 178,
    },
    {
        "title": "熵增定律与代码腐化：为什么系统会越来越乱",
        "category": "随笔杂谈",
        "excerpt": "热力学第二定律告诉我们孤立系统熵总是增大。代码也一样。如何对抗代码腐化？这是一个工程哲学问题。",
        "content": """## 熵增定律

孤立系统的熵总是趋向增大。简单说：**事物总是趋向混乱**。

你的房间会越来越乱，除非你打扫。代码也一样，会自然腐化，除非持续重构。

## 代码腐化的表现

- 函数越来越长，职责越来越多
- 依赖越来越乱，循环依赖出现
- 命名越来越随意，技术债堆积
- 新人越来越难上手

## 为什么会腐化

1. **紧急需求**：deadline 压力下妥协了质量
2. **人员流动**：不同人有不同风格
3. **需求变化**：原设计无法承载新场景
4. **知识遗忘**：没人记得当初为什么这么设计

本质上都是熵增——**对抗有序需要持续投入能量**。

## 对抗之道

- **持续重构**：不是等坏了再修，而是日常打磨
- **编码规范**：用制度对抗个人随意性
- **Code Review**：引入外部视角
- **自动化测试**：给重构提供安全网
- **文档沉淀**：对抗知识遗忘

## 感悟

代码腐化是必然的，但腐化的速度是可以控制的。好的团队文化、好的工程实践，就是在对抗这个熵增的过程。

写到这里，突然觉得软件工程也是一门"对抗无序"的学问。""",
        "author_name": "临川",
        "category_idx": 4,
        "read_count": 3472,
        "like_count": 267,
    },
    {
        "title": "量子计算入门：从叠加态到Shor算法",
        "category": "博物格致",
        "excerpt": "量子计算不是科幻。从叠加态、纠缠讲到量子门，最后浅析Shor算法如何威胁RSA加密。",
        "content": """## 量子比特

经典比特是0或1。量子比特是两者的**叠加**——同时处于0和1的状态。

n个量子比特可以同时表示2^n个状态。这就是量子并行的基础。

## 量子纠缠

两个纠缠的量子比特，无论相隔多远，对其中一个的测量会瞬间影响另一个。爱因斯坦称之为"幽灵般的超距作用"。

## 量子门

类似经典计算的逻辑门，量子门操作量子比特：
- **H门**（Hadamard）：创建叠加态
- **CNOT门**：创建纠缠态
- **Pauli门**：X/Y/Z旋转

## Shor算法

1994年，Peter Shor提出了一个量子算法，能在多项式时间内分解大整数。

这意味着什么？RSA加密的安全性基于"大整数分解很困难"。如果量子计算机成熟，RSA将被破解。

## 现状与展望

目前量子计算还处于NISQ（含噪声中等规模量子）时代。真正实用的容错量子计算还有很长的路要走。

但作为程序员，了解这个前沿方向，能让我们对计算的边界有更深的思考。

## 结语

量子计算让我意识到：**我们以为的计算边界，可能只是经典物理的边界**。换一个物理基底，整个计算理论都会改变。""",
        "author_name": "观澜",
        "category_idx": 2,
        "read_count": 2893,
        "like_count": 201,
    },
    {
        "title": "Redis实战：如何用缓存把接口响应从3秒降到30毫秒",
        "category": "典籍架构",
        "excerpt": "一个真实案例：AI推荐接口响应31秒，加Redis缓存后降到30毫秒。分享缓存设计的三层策略和踩过的坑。",
        "content": """## 问题背景

我们的AI推荐接口，每次请求要调用大模型，平均响应时间31秒。用户根本等不了。

## 方案：Redis缓存

### 第一层：结果缓存

```python
cache_key = f"ai:recommend:{user_id}"
cached = redis.get(cache_key)
if cached:
    return json.loads(cached)
# 调用大模型...
result = call_llm(user_id)
redis.setex(cache_key, 300, json.dumps(result))  # 5分钟TTL
return result
```

效果：缓存命中时响应30毫秒，从31秒降到30毫秒，提升1000倍。

### 第二层：计数缓存

统计数据（帖子数、点赞总数）也缓存，TTL 1小时。避免每次查库。

### 第三层：列表首页缓存

评论列表第一页缓存，TTL 5分钟。创建/删除评论时失效。

## 缓存策略

- **TTL选择**：热点数据短TTL（5分钟），统计数据长TTL（1小时）
- **失效策略**：写操作时主动失效
- **降级方案**：Redis挂了就回源查库

## 踩过的坑

1. **缓存雪崩**：大量key同时过期 → TTL加随机抖动
2. **缓存穿透**：查不存在的key → 空值缓存或布隆过滤器
3. **数据不一致**：先更新库再删缓存，不是删缓存再更新库

## 效果

优化前后对比：
- 响应时间：31s → 30ms（缓存命中）/ 31s（缓存未命中）
- QPS：从 0.03 提升到 300+
- 用户留存率显著提升

## 结语

缓存不是银弹，但用好了确实立竿见影。关键是理解你的数据特征，选择合适的策略。""",
        "author_name": "青笺",
        "category_idx": 1,
        "read_count": 6241,
        "like_count": 489,
    },
    {
        "title": "递归的边界：什么时候该用，什么时候不该用",
        "category": "算学深究",
        "excerpt": "递归是优雅的，但也有代价。从斐波那契讲到树遍历，讨论递归的适用边界和转换为迭代的技巧。",
        "content": """## 递归的代价

递归的代价在于**函数调用栈**。每次递归调用都要压栈，有内存和性能开销。

看这个经典的反面教材：

```python
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)
```

`fib(50)` 基本跑不出来——时间复杂度 O(2^n)，因为有大量重复计算。

## 什么时候用递归

递归适合的场景：
1. **问题本身就是递归定义的**（树的遍历、分治）
2. **子问题重叠可记忆化**（带记忆化的递归=动态规划）
3. **深度可控**（树通常深度有限）

## 什么时候不用

1. **深度可能很大**：递归会爆栈
2. **有大量重复子问题**：但没记忆化
3. **简单的线性迭代**：用循环更直接

## 尾递归优化

有些语言支持尾递归优化——递归调用在函数最后一步时，不压栈。

```python
def fib(n, a=0, b=1):
    if n == 0:
        return a
    return fib(n-1, b, a+b)  # 尾递归
```

遗憾的是，**Python不支持尾递归优化**。所以深递归在Python里要格外小心。

## 转换为迭代

任何递归都能用栈转为迭代：

```python
def tree_traversal(root):
    stack = [root]
    while stack:
        node = stack.pop()
        process(node)
        if node.right: stack.append(node.right)
        if node.left: stack.append(node.left)
```

## 小结

递归是一种思考方式，不是实现方式。**先用递归想清楚问题，再决定用递归还是迭代来实现**。""",
        "author_name": "墨涵",
        "category_idx": 0,
        "read_count": 3127,
        "like_count": 234,
    },
    {
        "title": "我的2026技术阅读清单",
        "category": "随笔杂谈",
        "excerpt": "分享我今年读过的10本技术好书和技术文章。从《Designing Data-Intensive Applications》到《深度学习》，附简评。",
        "content": """## 重磅推荐

### 《Designing Data-Intensive Applications》
分布式系统必读。从数据模型到一致性，讲透现代后端架构的方方面面。读完后看Kafka、Redis的设计会豁然开朗。

### 《Clean Architecture》
Bob大叔的架构哲学。核心思想：**依赖指向抽象，不指向具体**。对我做项目架构影响很大。

### 《Database Internals》
从存储引擎到分布式共识，讲透数据库内部原理。配合《DDIA》食用更佳。

## 算法方向

### 《算法导论》（CLRS）
经典中的经典。不必从头读到尾，挑感兴趣的章节精读。

### 《算法图解》
入门友好，配图清晰。适合算法初学者。

## 前沿方向

### 《深度学习》（花书）
Ian Goodfellow著。理论扎实，但数学要求较高。

### 《Life 3.0》
关于AI未来的科普。不是技术书，但能拓展视野。

## 技术文章

- Stripe的工程博客：支付系统的设计实战
- Uber的工程博客：地理数据处理
- Netflix的工程博客：微服务治理

## 阅读方法

- **不要贪多**：一周一本胜过一天十本
- **做笔记**：读时记录要点，读后写感悟
- **实践**：书里的知识要落到代码里
- **讨论**：找人聊，输出倒逼输入

## 结语

读书是最廉价的高贵。技术书虽然贵，但一本好书可能改变你的职业轨迹。

你今年读了什么好书？欢迎评论区交流。""",
        "author_name": "若谷",
        "category_idx": 4,
        "read_count": 1893,
        "like_count": 156,
    },
    {
        "title": "混沌理论对软件工程的启示",
        "category": "博物格致",
        "excerpt": "混沌系统对初始条件极度敏感。微服务架构也是混沌系统。从混沌理论看分布式系统的监控与容错。",
        "content": """## 混沌系统特征

1. **确定性**：规则确定，不是随机的
2. **敏感初值**：微小差异被指数放大
3. **不可预测**：长期行为无法预测

## 微服务就是混沌系统

一个微服务架构：
- 上百个服务相互调用
- 网络延迟波动
- 部分服务随时可能挂掉
- 流量模式不断变化

这完全符合混沌系统的特征。

## 启示一：拥抱不确定性

不要试图完全控制系统，而要设计**能容忍混乱**的系统：
- 熔断、降级、限流
- 超时重试、幂等设计
- 健康检查、自动扩容

## 启示二：监控是必需品

混沌系统不可预测，但可以**观察**。没有监控的微服务等于盲人开车。

关键指标：
- 黄金信号：延迟、流量、错误、饱和度
- 链路追踪：一次请求经过哪些服务
- 日志聚合：能搜索能告警

## 启示三：混沌工程

Netflix 的 Chaos Monkey 主动在生产环境制造故障，验证系统的容错能力。

这就是主动对抗混沌——**与其等故障发生，不如主动演练**。

## 结语

软件系统越来越复杂，我们正进入一个"混沌纪元"。理解混沌理论，不是要让系统不混乱（不可能），而是让系统**在混乱中依然可用**。""",
        "author_name": "观澜",
        "category_idx": 2,
        "read_count": 2047,
        "like_count": 143,
    },
    {
        "title": "从单体到微服务：我经历的一次架构演进",
        "category": "典籍架构",
        "excerpt": "真实案例：我们的系统从单体演进到微服务的过程。什么时候该拆，怎么拆，拆完踩了什么坑。",
        "content": """## 起始：单体

三年前，我们的系统是一个 Django 单体。3万行代码，10个开发者，部署一个容器。

优点明显：开发快、部署简单、没有分布式问题。

## 痛点出现

- **部署耦合**：改一个小功能要发整个系统
- **团队协作**：多人改同一代码库，频繁冲突
- **技术栈受限**：想用Go写一个服务？做不到

## 拆分决策

我们没有一次性拆完，而是**渐进式拆分**：

### 第一步：抽取独立服务
先把边界最清晰的两个模块拆出来：通知服务、文件服务。

### 第二步：数据库分离
每个服务有自己的数据库。通过事件总线同步数据。

### 第三步：引入API网关
统一入口，做认证、限流、路由。

## 踩过的坑

### 分布式事务
拆分后跨服务的数据一致性是大问题。最终采用**Saga模式** + 补偿事务。

### 数据冗余
订单服务需要商品信息。方案：订单服务存商品快照，事件总线同步更新。

### 链路追踪
排查问题变难了。引入 Jaeger 做分布式追踪。

### 运维成本
K8s、监控、CI/CD都要跟上。团队需要专门的运维角色。

## 反思

- **不要过早拆分**：单体能撑住就别拆，拆了就回不去了
- **边界最重要**：拆分的关键是找到正确的边界
- **基础设施先行**：没有监控和CI/CD，不要拆微服务

## 结语

架构演进没有终点。关键是**在正确的时间做正确的事**。""",
        "author_name": "青笺",
        "category_idx": 1,
        "read_count": 4582,
        "like_count": 367,
    },
]

# ============================================
# 评论数据
# ============================================
COMMENTS = [
    {"post_idx": 1, "author_name": "若谷", "content": "讲得太清楚了！递归→记忆化→DP这个递进让我豁然开朗。以前一直不懂为什么记忆化就是DP，现在懂了。"},
    {"post_idx": 1, "author_name": "明远", "content": "想补充一点：空间优化的解法其实用的是滚动数组思想。两个变量就够了，因为只需要前两个状态。"},
    {"post_idx": 0, "author_name": "若谷", "content": "FastAPI确实好用！同域部署这个思路很巧妙，省去了CORS配置的麻烦。"},
    {"post_idx": 0, "author_name": "墨涵", "content": "轻量级迁移这个设计挺有意思。不过生产环境还是建议用Alembic，可回滚更安全。"},
    {"post_idx": 3, "author_name": "临川", "content": "覆盖索引那段讲得好。以前一直不理解为什么SELECT *会慢，原来是回表的开销。"},
    {"post_idx": 3, "author_name": "墨涵", "content": "最左前缀原则可以再补充一点：范围查询会导致后续索引失效。比如 WHERE a > 1 AND b = 2，b是用不到索引的。"},
    {"post_idx": 7, "author_name": "临川", "content": "缓存雪崩那段深有体会。有一次大雪崩直接打挂了数据库，之后学了加随机TTL。"},
    {"post_idx": 7, "author_name": "若谷", "content": "先更新库再删缓存，这个顺序很重要。我之前搞反了，导致数据不一致查了半天。"},
    {"post_idx": 2, "author_name": "若谷", "content": "函数应该短小——这句话受用。我见过2000行的函数，至今是心理阴影。"},
    {"post_idx": 2, "author_name": "明远", "content": "关于注释那段我有不同看法。有些业务逻辑复杂的场景，注释还是必要的。代码本身无法表达业务背景。"},
    {"post_idx": 4, "author_name": "临川", "content": "费曼学习法确实有效。我学完一个技术就去给同事做分享，教的过程中发现自己很多盲区。"},
    {"post_idx": 4, "author_name": "墨涵", "content": "输出倒逼输入，这句话精辟。光看教程觉得自己会了，一写就发现全是坑。"},
    {"post_idx": 5, "author_name": "明远", "content": "代码腐化是必然的——这个观点很犀利。好的团队文化确实是对抗熵增的关键。"},
    {"post_idx": 5, "author_name": "观澜", "content": "持续重构这个概念很重要。不要等烂了再重构，那是重写不是重构。"},
    {"post_idx": 9, "author_name": "观澜", "content": "《DDIA》确实神书。读完对Kafka、Redis的设计原理有了全新理解。"},
    {"post_idx": 9, "author_name": "明远", "content": "算法图解入门确实友好。我是从这本入坑算法的，后来才敢啃CLRS。"},
    {"post_idx": 11, "author_name": "临川", "content": "渐进式拆分这个策略很对。一次性大拆容易翻车，分步走风险可控。"},
    {"post_idx": 11, "author_name": "墨涵", "content": "Saga模式处理分布式事务确实是主流方案。不过实现复杂度不低，建议有需要再上。"},
    {"post_idx": 8, "author_name": "若谷", "content": "递归是一种思考方式，不是实现方式——这句总结太到位了。先想清楚再决定怎么写。"},
    {"post_idx": 8, "author_name": "明远", "content": "Python不支持尾递归优化这点要注意。深递归记得改写成迭代+栈。"},
]


def seed():
    print("开始填充演示数据...")
    db = SessionLocal()

    try:
        # 清空旧数据（演示数据重置）
        print("清空旧数据...")
        db.query(Comment).delete()
        db.query(Like).delete()
        db.query(Favorite).delete()
        db.query(Post).delete()
        db.query(Note).delete()
        db.query(User).delete()
        db.commit()

        # 1. 创建用户
        print("创建用户...")
        users = []
        now = datetime.utcnow()
        for i, u in enumerate(USERS):
            user = User(
                username=u["username"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                bio=u["bio"],
                is_active=True,
                created_at=now - timedelta(days=30-i*3)
            )
            db.add(user)
            users.append(user)
        db.commit()
        print(f"  创建了 {len(users)} 个用户")

        # 2. 创建笔记
        print("创建笔记...")
        notes_created = 0
        for i, n in enumerate(NOTES):
            author = users[i % len(users)]
            note = Note(
                title=n["title"],
                content=n["content"],
                category=n["category"],
                is_pinned=n.get("is_pinned", False),
                user_id=author.id,
                created_at=now - timedelta(days=25-i*2, hours=random.randint(0, 23)),
                updated_at=now - timedelta(days=i),
            )
            db.add(note)
            notes_created += 1
        db.commit()
        print(f"  创建了 {notes_created} 篇笔记")

        # 3. 创建帖子
        print("创建帖子...")
        posts = []
        for i, p in enumerate(POSTS):
            author = users[p["category_idx"] % len(users)]
            post = Post(
                title=p["title"],
                excerpt=p["excerpt"],
                content=p["content"],
                category=p["category"],
                author_name=p["author_name"],
                user_id=author.id,
                read_count=p["read_count"],
                like_count=p["like_count"],
                status="approved",
                created_at=now - timedelta(days=20-i, hours=random.randint(0, 23)),
            )
            db.add(post)
            posts.append(post)
        db.commit()
        print(f"  创建了 {len(posts)} 篇帖子")

        # 4. 创建评论
        print("创建评论...")
        comments_created = 0
        for c in COMMENTS:
            post = posts[c["post_idx"]]
            # 找到对应作者
            author = None
            for u in users:
                if u.username == c["author_name"]:
                    author = u
                    break
            comment = Comment(
                content=c["content"],
                author_name=c["author_name"],
                user_id=author.id if author else None,
                post_id=post.id,
                created_at=now - timedelta(days=15, hours=random.randint(0, 23)),
            )
            db.add(comment)
            comments_created += 1
        db.commit()
        print(f"  创建了 {comments_created} 条评论")

        # 5. 创建点赞记录
        print("创建点赞...")
        likes_created = 0
        for post in posts:
            target_likes = min(post.like_count, 15)  # 实际创建少量点赞记录
            liked_users = random.sample(users, min(target_likes, len(users)))
            for u in liked_users:
                try:
                    like = Like(user_id=u.id, post_id=post.id)
                    db.add(like)
                    likes_created += 1
                except Exception:
                    pass
        db.commit()
        print(f"  创建了 {likes_created} 条点赞记录")

        # 6. 创建收藏
        print("创建收藏...")
        favs_created = 0
        for post in posts[:8]:
            for u in random.sample(users, 2):
                try:
                    fav = Favorite(user_id=u.id, post_id=post.id)
                    db.add(fav)
                    favs_created += 1
                except Exception:
                    pass
        db.commit()
        print(f"  创建了 {favs_created} 条收藏记录")

        print("\n========================================")
        print("演示数据填充完成！")
        print(f"  用户: {len(users)} 个")
        print(f"  笔记: {notes_created} 篇")
        print(f"  帖子: {len(posts)} 篇")
        print(f"  评论: {comments_created} 条")
        print(f"  点赞: {likes_created} 条")
        print(f"  收藏: {favs_created} 条")
        print("========================================")
        print("\n演示账号（密码均为 demo123456）:")
        for u in USERS:
            print(f"  {u['username']} ({u['email']})")

    except Exception as e:
        db.rollback()
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
