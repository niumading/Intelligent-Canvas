# -*- coding: utf-8 -*-
import io, os, subprocess, shutil

ROOT = r"D:\桌面\wuxianhuabu2"
log = []

# 1) 删掉刚建的 .git（今天新建，远端无任何内容，无历史可损失）
gitdir = os.path.join(ROOT, ".git")
shutil.rmtree(gitdir, ignore_errors=False)
log.append(".git removed and re-initialized")

def G(args, timeout=1200):
    r = subprocess.run(["git"] + args, cwd=ROOT, capture_output=True, text=True,
                       timeout=timeout, env={**os.environ, "GIT_TERMINAL_PROMPT": "0",
                                             "GCM_INTERACTIVE": "Never"})
    log.append("$ git %s -> rc=%d" % (" ".join(args[:2]), r.returncode))
    if r.stdout: log.append("  out: " + r.stdout.strip()[:600])
    if r.stderr: log.append("  err: " + r.stderr.strip()[:600])
    return r.returncode

G(["init", "-b", "main"])
G(["config", "user.name", "niumading"])
G(["config", "user.email", "niumading@users.noreply.github.com"])
G(["add", "-A"])
out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, timeout=120).stdout or ""
n_lfs = sum(1 for l in out.splitlines() if "example_drama" in l or "项目截图" in l)
log.append("tracked sample media files: %d (must be 0)" % n_lfs)
assert n_lfs == 0, "sample media still tracked"

G(["commit", "-m", "Intelligent Canvas: initial commit\n\nLocal AI creation canvas for company use.\nRenamed from the original project; original author references removed."])
G(["remote", "add", "origin", "https://github.com/niumading/Intelligent-Canvas.git"])
G(["push", "-u", "origin", "main"])

with io.open(os.path.join(ROOT, "_git_step5.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(log))
print("done")
