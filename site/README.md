# CengSin 个人站

`cengsin.is-a.dev` 是个人网站入口：公开作品展示在 [Idea Platform 个人作品页](https://idea-platform.z-agent.ccwu.cc/works?user=user_38c0e310a872)，新文章在「今天的天气」发布。本站保留原有项目说明及 Hugo 文章网址。唯一工作目录是本仓库，源文件在 `src/`，旧文章 Markdown 在仓库根目录的 `content/posts/`，生成结果在 `dist/`。GitHub Pages 从本仓库的 `gh-pages` 分支发布 `dist/`。

## 预览

```bash
python3 -m pip install -r requirements.txt
python3 src/build.py
python3 -m http.server 8765 --directory dist
```

浏览器打开 http://127.0.0.1:8765/

## 本地管理后台

管理后台只在本机运行，不会放进公开的 `dist/`。只有 GitHub 账号 CengSin 可以登录，其他账号会被拒绝。

```bash
python3 src/admin_server.py
```

浏览器打开 http://127.0.0.1:8787/admin/ 。首次使用时，在 GitHub 创建一个 OAuth App：首页地址填 `http://127.0.0.1:8787`，回调地址填 `http://127.0.0.1:8787/admin/oauth/callback`。Client Secret 只保存在本机的 `.local/`，不会进入仓库。

保存后会重新生成本地预览。确认页面没问题之前，不要推送。

## 页面

- `/` 首页
- `/projects` Idea Platform 作品入口及本站原有项目说明
- `/projects/idea-platform` 以及其他旧项目详情
- `/about` `/agent`
- `/posts/` 和原有 Hugo 文章详情、标签与分类网址
- `/llms.txt` `/agent/profile.json` `/agent/profile.md`

首页直接链接到 Idea Platform 的公开个人作品页和「今天的天气」；`/projects` 同时提供个人作品页与 Idea Platform 平台入口，并折叠保留本站原有作品说明；`/posts/` 保留本站旧文章。导航栏使用中文，浏览器标签图标由 `src/favicon.svg` 生成。首页头像直接加载 GitHub 账号 `CengSin` 的当前头像，若外部图片不可用则显示 `CS` 字样。

修改文章请编辑仓库根目录的 `content/posts/`。旧文章的网址映射保存在 `src/posts.py`，新文章在 Markdown 文件头部写 `slug` 即可。旧 `public/` 目录仅作历史归档，构建不会读取其中的 HTML。个人资料在仓库根目录 `.local/profile/`，已被 Git 忽略，不参与构建。

## 内容管理

新建文章：在 `content/posts/` 新建 `.md` 文件，至少写入以下文件头部，再写正文。`slug` 是网址的一部分，发布后尽量不要修改。

```yaml
---
title: "文章标题"
date: 2026-09-24T12:00:00+08:00
slug: article-slug
draft: false
---
```

更新文章：修改 Markdown 后重新构建和推送。删除文章：删除对应 Markdown；旧文章同时从 `src/posts.py` 的网址映射中移除。`draft: true` 的正文不会进入发布结果。

新作品在 Idea Platform 中维护。`src/projects.py` 的 `PROJECTS` 列表只用于本站原有项目说明和旧详情页；不再控制首页展示。修改旧说明时编辑对应字典，删除旧详情时还要清理其他项目的 `related` 引用。

公开站点不包含任职、求职城市、Now 和 Timeline。姓名、学校和手机号也没有写入 `dist/`。两篇旧日记中原有的一个未列入公开作品的项目名称在构建输出中替换为「一个实验项目」。
