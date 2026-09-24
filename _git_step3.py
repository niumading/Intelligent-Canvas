# -*- coding: utf-8 -*-
import io, os, subprocess

ROOT = r"D:\桌面\wuxianhuabu2"
log = []

def G(args, timeout=300):
    r = subprocess.run(["git"] + args, cwd=ROOT, capture_output=True, text=True,
                       timeout=timeout, env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
    log.append("$ git %s -> rc=%d" % (" ".join(args), r.returncode))
    if r.stdout: log.append("  out: " + r.stdout.strip()[:1200])
    if r.stderr: log.append("  err: " + r.stderr.strip()[:600])
    return r.stdout or ""

G(["lfs", "ls-files"])

# example_drama 样例数据检查
d = os.path.join(ROOT, "integrations", "LocalMiniDrama", "example_drama")
if os.path.isdir(d):
    for fn in os.listdir(d):
        fp = os.path.join(d, fn)
        if os.path.isfile(fp):
            log.append("example_drama/%s: %.1f MB" % (fn, os.path.getsize(fp) / 1048576))

with io.open(os.path.join(ROOT, "_git_step3.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(log))
print("done")
