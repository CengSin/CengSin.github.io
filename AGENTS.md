# 单一工作目录

站点的唯一工作目录是本仓库 `/Users/cengsin/CengSin.github.io`。

| 路径 | 用途 |
| --- | --- |
| `site/src/` | 当前公开站点的源码 |
| `site/dist/` | 构建输出，已被 Git 忽略 |
| `content/posts/` | 文章 Markdown 源文件；构建时生成旧 `/posts/.../` 网址 |
| `public/` | 旧 Hugo 生成结果的历史归档；当前构建不读取它 |
| `.local/profile/` | 本地资料、私有仓库清单与设计稿，已被 Git 忽略；绝不发布 |

## 发布

`main` 上的 GitHub Actions 执行 `python3 site/src/build.py`，把 `site/dist` 推到 `gh-pages`。GitHub Pages 从 `gh-pages` 发布。

线上地址是 https://cengsin.github.io/ 和 https://cengsin.is-a.dev/ 。`cengsin.is-a.dev` 的 CNAME 指向 `cengsin.github.io`。

改公开页面时，改 `site/src/`，提交并推到 `main`。旧文章内容在 `content/posts/` 中维护，由 `site/src/posts.py` 渲染；不要编辑 `public/` 的旧 HTML。

## 资料怎么进站点

`.local/profile/` 用来核对事实。页面文案写在 `site/src/projects.py` 和 `site/src/build.py`，由生成器输出。不要把 `.local/profile/` 拷进 `public/`、`site/src/` 或 `site/dist/`。

公开页目前是首页、作品目录、项目详情、About、Agent 入口、旧文章 `/posts/` 与历史详情，以及 `/llms.txt`、`/agent/profile.json`、`/agent/profile.md`。

不要写入公开页面或上述机器可读文件的内容：姓名、学校、手机号、公司任职、求职城市、私有仓库。Now 和 Timeline 还没有可公开的记录，不要为了补页面把资料核对或 Git 推送日期写成近况。
