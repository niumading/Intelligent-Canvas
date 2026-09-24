shot-composer size (excl node_modules/.git/dist): 60.9 MB
removed third_party/shot-composer/.git
$ git add third_party/shot-composer -> rc=0
$ git commit -m -> rc=1
  out: On branch main
Your branch is based on 'origin/main', but the upstream is gone.
  (use "git branch --unset-upstream" to fixup)

Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	deleted:    _git_step1.md
	deleted:    _git_step2.md
	deleted:    _git_step2.py
	deleted:    _git_step3.md
	deleted:    _git_step3.py
	deleted:    _git_step4.md
	deleted:    _git_step4.py
	deleted:    _git_step5.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	_git_
$ git push origin -> rc=0
  err: Everything up-to-date
$ git ls-remote origin -> rc=0
  out: ea6599c417128ddcb9ddf9666608de4e4178567d	refs/heads/main