# 三个目录

这三处不要当成同一个项目。公开站点只从本仓库的 `site/` 发布。

| 目录 | 是什么 |
| --- | --- |
| `/Users/cengsin/cengsin-profile` | 本地资料。简历、项目笔记、设计稿在这里。不是 git 仓库，不发布。 |
| `/Users/cengsin/cengsin-site` | 更早的本地站点工程。`src/build.py` 生成 `dist/`。不会自动同步到本仓库。 |
| `/Users/cengsin/CengSin.github.io` | 本仓库。要上线的源码在 `site/`。 |

## 发布

`main` 上的 GitHub Actions 执行 `python3 site/src/build.py`，把 `site/dist` 推到 `gh-pages`。GitHub Pages 从 `gh-pages` 发布。

线上地址是 https://cengsin.github.io/ 和 https://cengsin.is-a.dev/ 。`cengsin.is-a.dev` 的 CNAME 指向 `cengsin.github.io`。

改公开页面时，改 `site/src/`，提交并推到 `main`。只改 `/Users/cengsin/cengsin-site` 不会更新线上。

## 资料怎么进站点

`cengsin-profile` 用来核对事实。页面文案写在 `site/src/projects.py` 和 `site/src/build.py`，由生成器输出。不要把 `cengsin-profile` 整目录拷进本仓库或 `dist/`。

公开页目前是首页、作品目录、项目详情、About、Agent 入口，以及 `/llms.txt`、`/agent/profile.json`、`/agent/profile.md`。

不要写入公开页面或上述机器可读文件的内容：姓名、学校、手机号、公司任职、求职城市、私有仓库。Now 和 Timeline 还没有可公开的记录，不要为了补页面把资料核对或 Git 推送日期写成近况。
