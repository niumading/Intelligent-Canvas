# -*- coding: utf-8 -*-
import io, os, subprocess

ROOT = r"D:\桌面\wuxianhuabu2"
log = []

def G(args, timeout=300):
    r = subprocess.run(["git"] + args, cwd=ROOT, capture_output=True, text=True,
                       timeout=timeout, env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
    log.append("$ git %s -> rc=%d" % (" ".join(args[:2]), r.returncode))
    if r.stdout: log.append("  out: " + r.stdout.strip()[:1500])
    if r.stderr: log.append("  err: " + r.stderr.strip()[:300])
    return r.stdout or ""

G(["ls-files", "-s", "third_party/shot-composer"])
G(["status", "--porcelain", "third_party/shot-composer"])

with io.open(os.path.join(ROOT, "_git_step11.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(log))
print("done")
