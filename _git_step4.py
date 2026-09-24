# -*- coding: utf-8 -*-
import io, os, subprocess

ROOT = r"D:\桌面\wuxianhuabu2"
log = []

def G(args, timeout=1200):
    r = subprocess.run(["git"] + args, cwd=ROOT, capture_output=True, text=True,
                       timeout=timeout, env={**os.environ, "GIT_TERMINAL_PROMPT": "0",
                                             "GCM_INTERACTIVE": "Never"})
    log.append("$ git %s -> rc=%d" % (" ".join(args[:3]), r.returncode))
    if r.stdout: log.append("  out: " + r.stdout.strip()[:800])
    if r.stderr: log.append("  err: " + r.stderr.strip()[:800])
    return r.returncode

# 1) 取消跟踪 4 个上游样例媒体
G(["rm", "--cached",
   "integrations/LocalMiniDrama/example_drama/衣服设计天才302.zip",
   "integrations/LocalMiniDrama/项目截图/1.mp4",
   "integrations/LocalMiniDrama/项目截图/2.mp4",
   "integrations/LocalMiniDrama/项目截图/3.mp4"])

# 2) .gitignore 追加
gi = os.path.join(ROOT, ".gitignore")
with io.open(gi, encoding="utf-8") as f:
    t = f.read()
if "example_drama" not in t:
    t = t.rstrip("\n") + ("\n\n# Upstream sample media of LocalMiniDrama (LFS objects not available)\n"
                          "integrations/LocalMiniDrama/example_drama/\n"
                          "integrations/LocalMiniDrama/项目截图/\n")
    with io.open(gi, "w", encoding="utf-8", newline="") as f:
        f.write(t)
    log.append(".gitignore updated")

# 3) 提交 + 推送
G(["commit", "-m", "chore: exclude LocalMiniDrama upstream sample media (missing LFS objects)"])
G(["push", "-u", "origin", "main"])

with io.open(os.path.join(ROOT, "_git_step4.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(log))
print("done")
