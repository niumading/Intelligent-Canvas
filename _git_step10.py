# -*- coding: utf-8 -*-
import io, os, subprocess, shutil

ROOT = r"D:\桌面\wuxianhuabu2"
log = []

# 1) 估算 shot-composer 纳入后的大小（排除 node_modules/dist 由 gitignore 管）
total = 0
for dp, dn, fn in os.walk(os.path.join(ROOT, "third_party", "shot-composer")):
    dn[:] = [d for d in dn if d not in ("node_modules", ".git", "__pycache__")]
    for f in fn:
        try:
            total += os.path.getsize(os.path.join(dp, f))
        except OSError:
            pass
log.append("shot-composer size (excl node_modules/.git/dist): %.1f MB" % (total / 1048576))

# 2) 移除内嵌 .git
gd = os.path.join(ROOT, "third_party", "shot-composer", ".git")
if os.path.isdir(gd):
    shutil.rmtree(gd)
    log.append("removed third_party/shot-composer/.git")

def G(args, timeout=1200):
    r = subprocess.run(["git"] + args, cwd=ROOT, capture_output=True, text=True,
                       timeout=timeout, env={**os.environ, "GIT_TERMINAL_PROMPT": "0",
                                             "GCM_INTERACTIVE": "Never"})
    log.append("$ git %s -> rc=%d" % (" ".join(args[:2]), r.returncode))
    if r.stdout: log.append("  out: " + r.stdout.strip()[:600])
    if r.stderr: log.append("  err: " + r.stderr.strip()[:400])
    return r.returncode

# 3) 纳入并推送
G(["add", "third_party/shot-composer"])
G(["commit", "-m", "vendor: track shot-composer sources fully (remove embedded .git)"])
G(["push", "origin", "main"])
G(["ls-remote", "origin", "main"])

with io.open(os.path.join(ROOT, "_git_step10.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(log))
print("done")
