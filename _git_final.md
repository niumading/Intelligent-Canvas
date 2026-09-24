$ git ls-remote origin main -> rc=0
  out: ea6599c417128ddcb9ddf9666608de4e4178567d	refs/heads/main
$ git status -sb -> rc=0
  out: ## main...origin/main [gone]
 m third_party/shot-composer
?? _git_final.py
?? _git_step5.md
?? _git_step6.md
?? _git_step6.py
?? _git_step7.md
?? _git_step7.py
?? _git_step8.md
?? _git_step8.py
?? _git_step9.md
?? _git_step9.py
$ git show origin/main:README.md -> rc=128
  err: fatal: invalid object name 'origin/main'.
remote README head: 
removed temp: _git_final.py
removed temp: _git_step1.md
removed temp: _git_step2.md
removed temp: _git_step2.py
removed temp: _git_step3.md
removed temp: _git_step3.py
removed temp: _git_step4.md
removed temp: _git_step4.py
removed temp: _git_step5.md
removed temp: _git_step5.py
removed temp: _git_step6.md
removed temp: _git_step6.py
removed temp: _git_step7.md
removed temp: _git_step7.py
removed temp: _git_step8.md
removed temp: _git_step8.py
removed temp: _git_step9.md
removed temp: _git_step9.py