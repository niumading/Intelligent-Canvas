$ git rm --cached integrations/LocalMiniDrama/example_drama/衣服设计天才302.zip -> rc=0
  out: rm 'integrations/LocalMiniDrama/example_drama/衣服设计天才302.zip'
rm 'integrations/LocalMiniDrama/项目截图/1.mp4'
rm 'integrations/LocalMiniDrama/项目截图/2.mp4'
rm 'integrations/LocalMiniDrama/项目截图/3.mp4'
.gitignore updated
$ git commit -m chore: exclude LocalMiniDrama upstream sample media (missing LFS objects) -> rc=0
  out: [main bfdfa84] chore: exclude LocalMiniDrama upstream sample media (missing LFS objects)
 4 files changed, 12 deletions(-)
 delete mode 100644 "integrations/LocalMiniDrama/example_drama/\350\241\243\346\234\215\350\256\276\350\256\241\345\244\251\346\211\215302.zip"
 delete mode 100644 "integrations/LocalMiniDrama/\351\241\271\347\233\256\346\210\252\345\233\276/1.mp4"
 delete mode 100644 "integrations/LocalMiniDrama/\351\241\271\347\233\256\346\210\252\345\233\276/2.mp4"
 delete mode 100644 "integrations/LocalMiniDrama/\351\241\271\347\233\256\346\210\252\345\233\276/3.mp4"
$ git push -u origin -> rc=1
  out: Git LFS upload failed:
  (missing) integrations/LocalMiniDrama/example_drama/衣服设计天才302.zip (f2aa6ec793270761b295e5ccc1fa5adb367dd36937db99e0b064667d8bb592f9)
Uploading LFS objects:   0% (0/4), 0 B | 0 B/s, done.
hint: Your push was rejected due to missing or corrupt local objects.
hint: You can disable this check with: `git config lfs.allowincompletepush true`
  err: error: failed to push some refs to 'https://github.com/niumading/Intelligent-Canvas.git'