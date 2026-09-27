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

改公开入口时，改 `site/src/`，提交并推到 `main`。新作品在 Idea Platform 中管理，公开列表位于 `https://idea-platform.z-agent.ccwu.cc/works?user=user_38c0e310a872`；新文章在「今天的天气」发布。本站的 `site/src/projects.py` 仅保留原有项目说明；旧文章内容在 `content/posts/` 中维护，由 `site/src/posts.py` 渲染。不要编辑 `public/` 的旧 HTML。

## 资料怎么进站点

`.local/profile/` 用来核对事实。页面文案在 `site/content/site.json`，旧作品在 `site/content/projects.json`，由 `site/src/build.py` 生成。本地管理后台运行 `python3 site/src/admin_server.py`，只监听 `127.0.0.1:8787`，并且只允许 GitHub 账号 CengSin 登录；后台页面不会进入 `site/dist/`。不要把 `.local/profile/` 拷进 `public/`、`site/src/` 或 `site/dist/`。

公开页目前是入口首页、原有作品说明与项目详情、About、Agent 入口、旧文章 `/posts/` 与历史详情，以及 `/llms.txt`、`/agent/profile.json`、`/agent/profile.md`。

不要写入公开页面或上述机器可读文件的内容：姓名、学校、手机号、公司任职、求职城市、私有仓库。Now 和 Timeline 还没有可公开的记录，不要为了补页面把资料核对或 Git 推送日期写成近况。

## 规则

1. 没有先问过，不要在产品界面上添加说明或注释。界面只放用户要求出现的内容和操作。
2. Web 前端源码不留注释。`python3 site/src/check_comments.py --check site/src` 用来检查，发现注释就失败。`python3 site/src/check_comments.py --fix site/src` 会把注释删掉。GitHub Actions 在构建前执行 `--fix`。完整检查是 `sh site/test.sh`。
