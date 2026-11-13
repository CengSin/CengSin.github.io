# 单一工作目录

站点的唯一工作目录是本仓库 `/Users/cengsin/CengSin.github.io`。

| 路径 | 用途 |
| --- | --- |
| `site/src/` | 当前公开站点的源码 |
| `site/dist/` | 构建输出，已被 Git 忽略 |
| `content/posts/` | 文章 Markdown 源文件；构建时生成旧 `/posts/.../` 网址 |
| `public/` | 旧 Hugo 生成结果的历史归档；当前构建不读取它 |
| `.local/profile/` | 本地资料、私有仓库清单与设计稿，已被 Git 忽略；绝不发布 |
| `.local/weread/` | 微信读书候选清单，已被 Git 忽略；绝不发布 |

## 发布

`main` 上的 GitHub Actions 执行 `python3 site/src/build.py`，把 `site/dist` 推到 `gh-pages`。GitHub Pages 从 `gh-pages` 发布。构建不联网读取外部数据。

线上地址是 https://cengsin.github.io/ 和 https://cengsin.is-a.dev/ 。`cengsin.is-a.dev` 的 CNAME 指向 `cengsin.github.io`。

改公开入口时，改 `site/src/`，提交并推到 `main`。项目展示在 Idea Platform（`https://idea-platform.z-agent.ccwu.cc/`），城里的楼按其中的置顶项目手动维护，不自动同步；新文章在「今天的天气」发布。作品说明在 `site/content/projects.json`，楼型与位置在 `site/content/city.json`；旧文章内容在 `content/posts/` 中维护，由 `site/src/posts.py` 渲染。不要编辑 `public/` 的旧 HTML。

## 资料怎么进站点

没有管理后台，也没有线上配置；仓库里的文件就是全部内容。改法见 `site/README.md` 的「内容怎么改」。`.local/profile/` 用来核对事实。不要把 `.local/` 下的任何东西拷进 `public/`、`site/src/`、`site/content/` 或 `site/dist/`。

读书用 `python3 site/src/content.py`：`weread` 列出微信读书里读完且公开的候选，`add-book` 上架。微信读书里设为私密阅读的书绝不能上架，也不要在对话、提交信息或文件里写出它们的书名。书架上的感想必须是用户本人写的或确认过的，不要替用户编写感想。`WEREAD_API_KEY` 只放在本机环境变量，不要写进任何文件。

公开页目前是「想象之城」首页、城市名录与每栋楼的详情、书店（读过的书与旧文章 `/posts/`）、About、Agent 入口，以及 `/llms.txt`、`/agent/profile.json`、`/agent/profile.md`。城市数据在 `site/content/city.json`、`site/content/bookshop.json`。

不要写入公开页面或上述机器可读文件的内容：姓名、学校、手机号、公司任职、求职城市、私有仓库。Now 和 Timeline 还没有可公开的记录，不要为了补页面把资料核对或 Git 推送日期写成近况。

## 规则

1. 没有先问过，不要在产品界面上添加说明或注释。界面只放用户要求出现的内容和操作。
2. Web 前端源码不留注释。`python3 site/src/check_comments.py --check site/src` 用来检查，发现注释就失败。`python3 site/src/check_comments.py --fix site/src` 会把注释删掉。GitHub Actions 在构建前执行 `--fix`。完整检查是 `sh site/test.sh`。
