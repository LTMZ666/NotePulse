"""修复 GitHub 推送分支名"""
import paramiko

HOST = "47.99.42.230"
USER = "root"
PASSWORD = "Zbdxwf5201314:"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

def run(cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

# 检查当前分支
print("=== 当前分支 ===")
out, _ = run("cd /opt/notepulse && git branch")
print(out.strip())

# 重命名为 main 并推送
print("\n=== 重命名为 main 并推送 ===")
run("cd /opt/notepulse && git branch -M main")
out, _ = run("cd /opt/notepulse && git push -u origin main 2>&1")
print(out[:800])

# 验证
print("\n=== 验证远程 ===")
out, _ = run("cd /opt/notepulse && git remote -v")
print(out.strip())

client.close()
