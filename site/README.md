# CengSin 个人站

`cengsin.is-a.dev` 的静态站。唯一工作目录是本仓库。当前页面源文件在 `src/`，文章源文件在仓库根目录的 `content/posts/`，生成结果在 `dist/`。构建会将 Markdown 渲染为文章页，并保留旧 Hugo 的文章网址。GitHub Pages 从本仓库的 `gh-pages` 分支发布 `dist/`。

## 预览

```bash
python3 -m pip install -r requirements.txt
python3 src/build.py
python3 -m http.server 8765 --directory dist
```

浏览器打开 http://127.0.0.1:8765/

## 页面

- `/` 首页
- `/projects` 作品目录
- `/projects/idea-platform` 以及其他项目详情
- `/about` `/agent`
- `/posts/` 和原有 Hugo 文章详情、标签与分类网址
- `/llms.txt` `/agent/profile.json` `/agent/profile.md`

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

作品数据在 `src/projects.py` 的 `PROJECTS` 列表中。新增或更新作品时修改对应字典；删除作品时还要清理其他作品的 `related` 引用。目前首页固定展示四个 `selected` 作品，增删精选作品还需要调整 `src/build.py` 的首页布局。

公开站点不包含任职、求职城市、Now 和 Timeline。姓名、学校和手机号也没有写入 `dist/`。两篇旧日记中原有的一个未列入公开作品的项目名称在构建输出中替换为「一个实验项目」。
