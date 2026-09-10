"""验证 API + 推送 GitHub"""
import paramiko
import time

HOST = "47.99.42.230"
USER = "root"
PASSWORD = "Zbdxwf5201314:"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

def run(cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

# 等服务启动
time.sleep(3)

print("=== 验证 API ===")
out, _ = run("curl -s --connect-timeout 5 http://127.0.0.1:3000/api/health")
print(f"health: {out.strip()}")

out, _ = run("curl -s --connect-timeout 5 http://127.0.0.1:3000/api/stats")
print(f"stats: {out.strip()[:300]}")

# 查看后端日志确认无报错
print("\n=== 后端日志（最近10行）===")
out, _ = run("journalctl -u notepulse -n 10 --no-pager")
print(out)

# 配置 git 并推送
print("\n=== 配置 git 并推送 GitHub ===")
# 在 /opt/notepulse 下初始化 git 仓库（包含三个子目录）
out, _ = run("cd /opt/notepulse && git status 2>/dev/null | head -2 || echo 'NO_REPO'")
print(f"repo status: {out.strip()}")

if "NO_REPO" in out or not out.strip():
    # 初始化仓库
    run("cd /opt/notepulse && git init")
    run('cd /opt/notepulse && git config user.email "ltmz666@github.com"')
    run('cd /opt/notepulse && git config user.name "LTMZ666"')
    print("git 仓库已初始化")

# 添加远程
run("cd /opt/notepulse && git remote remove origin 2>/dev/null; git remote add origin https://github.com/LTMZ666/NotePulse.git")
print("remote 已设置")

# 添加所有文件
run("cd /opt/notepulse && git add -A")
out, _ = run("cd /opt/notepulse && git status --short | wc -l")
print(f"暂存文件数: {out.strip()}")

# 提交
run('cd /opt/notepulse && git commit -m "NotePulse 全栈知识管理平台 - FastAPI+MySQL+Redis+Docker" 2>&1 | tail -3')
out, _ = run("cd /opt/notepulse && git log --oneline -2")
print(f"提交记录: {out.strip()}")

# 推送到 GitHub（使用 token 方式，需要用户提供 token，先用空尝试看是否需要认证）
print("\n=== 推送到 GitHub ===")
# 先测试 GitHub 连通性
out, _ = run("curl -s --connect-timeout 5 https://github.com 2>&1 | head -c 100")
if out:
    print("GitHub 可达")
else:
    print("GitHub 不可达")

client.close()
print("\n完成！")
