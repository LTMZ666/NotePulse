"""修复 config.py（添加 settings 实例）+ 推送 GitHub"""
import paramiko
import time

HOST = "47.99.42.230"
USER = "root"
PASSWORD = "Zbdxwf5201314:"

CONFIG_PATH = "/opt/notepulse/NotePulse_backend/app/core/config.py"

NEW_CONFIG = '''"""应用配置

所有敏感配置从环境变量读取，本地开发请创建 .env 文件或在 run.py 中设置。
Docker 部署时通过 docker-compose.yml 的 environment 传入。
"""
import os


class Settings:
    """集中管理配置项"""

    # 数据库
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")  # 请通过环境变量设置
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "maiji")

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")  # 生产环境必须修改
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 2  # 2 小时

    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")

    # DeepSeek AI（Anthropic 兼容接口）
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")  # 请通过环境变量设置
    DEEPSEEK_BASE_URL: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/anthropic")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro")

    # 管理员账号（典枢院主笔）
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")  # 请通过环境变量设置


settings = Settings()
'''

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

def run(cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

# 1. 修复 config.py
print("=== 修复 config.py（添加 settings 实例）===")
sftp = client.open_sftp()
with sftp.file(CONFIG_PATH, "w") as f:
    f.write(NEW_CONFIG)
sftp.close()
print("config.py 已修复")

# 2. 重启服务
print("\n=== 重启服务 ===")
run("systemctl restart notepulse")
time.sleep(5)
out, _ = run("systemctl status notepulse --no-pager | head -8")
print(out)

# 3. 验证 API
print("\n=== 验证 API ===")
out, _ = run("curl -s --connect-timeout 5 http://127.0.0.1:3000/api/health")
print(f"health: {out.strip()}")
out, _ = run("curl -s --connect-timeout 5 http://127.0.0.1:3000/api/stats")
print(f"stats: {out.strip()[:200]}")

# 4. 推送 GitHub
print("\n=== 推送 GitHub ===")
out, _ = run("cd /opt/notepulse && git push -u origin main 2>&1")
print(out[:500])

client.close()
print("\n完成！")
