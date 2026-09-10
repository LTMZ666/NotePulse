"""检查服务器文件结构"""
import paramiko

HOST = "47.99.42.230"
USER = "root"
PASSWORD = "Zbdxwf5201314:"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=15)

def run(cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

print("=== /opt/notepulse 目录 ===")
out, _ = run("ls -la /opt/notepulse/ 2>/dev/null || echo 'NOT FOUND'")
print(out)

print("=== 查找 config.py ===")
out, _ = run("find /opt/notepulse -name config.py 2>/dev/null")
print(out)

print("=== 查找 notepulse 相关目录 ===")
out, _ = run("find / -maxdepth 4 -name 'config.py' -path '*notepulse*' 2>/dev/null; find / -maxdepth 4 -name 'config.py' -path '*core*' 2>/dev/null | head -5")
print(out)

print("=== systemd service ===")
out, _ = run("cat /etc/systemd/system/notepulse.service 2>/dev/null || systemctl cat notepulse 2>/dev/null | head -30")
print(out)

client.close()
