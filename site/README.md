# CengSin 个人站

`cengsin.is-a.dev` 是个人网站，名字叫「想象之城」：每件作品是一栋楼，已经做出来的落在地上，还没做的是天上的图纸。唯一工作目录是本仓库，源文件在 `src/`，内容在 `content/` 和仓库根目录的 `content/posts/`，生成结果在 `dist/`。GitHub Pages 从 `gh-pages` 分支发布 `dist/`。

没有管理后台。内容都是仓库里的文件，改完推到 `main`，GitHub Actions 会检查、构建并发布；它每天 09:00（北京时间）还会自动重建一次，把 Idea Platform 上的新状态带进城里。

## 预览

```bash
npm ci --prefix site
python3 -m pip install -r site/requirements.txt
python3 site/src/build.py
python3 -m http.server 8765 --directory site/dist
```

在仓库根目录执行。需要 Node.js 24。浏览器打开 http://127.0.0.1:8765/ 。设置 `CITY_OFFLINE=1` 可以跳过联网，使用 `content/idea_platform.json` 里的缓存。

## 页面

- `/` 首页：蓝图天空随滚动下沉成一座等距小城，下面是城市导览图、书店和「放一张图纸」
- `/projects` 城市导览图；`/projects/<slug>` 单栋楼的详情
- `/posts/` 书店：读过的书和写下的文章；原有 Hugo 文章、标签与分类网址不变
- `/about` `/agent`
- `/llms.txt` `/agent/profile.json` `/agent/profile.md`

底部的 Touch Bar 是全站导航，右侧「人 / Agent」开关会把页面切成蓝图，并显示 `/agent/profile.md`。

## 内容怎么改

| 要改什么 | 改哪里 |
| --- | --- |
| 新作品 | 在 Idea Platform 发布。构建时从 `/api/v1/ideas` 拉取：新落地的想法会自动分到 `content/city.json` 的 `generic_plots` 空地，`待承接` 进天空，`搁置` 挂在吊绳上 |
| 某件作品的说明 | `content/projects.json` |
| 某栋楼的楼型、颜色、附注 | `content/city.json` 的 `buildings`；楼型的画法在 `src/frontend/city/iso.js` |
| 首屏文案、导览图标题 | `content/city.json` 的 `hero`、`registry` |
| 读过的书 | 用下面的命令，不要手改尺寸 |
| 文章 | `content/posts/` 下的 Markdown；书脊上的短标题和简介在 `content/bookshop.json` 的 `spines` |
| 关于、智能体页、导航、页脚 | `content/site.json` |

### 读书

```bash
python3 site/src/content.py books
export WEREAD_API_KEY=wrk-…
python3 site/src/content.py weread --reviews
python3 site/src/content.py add-book --title 明朝那些事儿 --line "一句你自己写的感想"
python3 site/src/content.py remove-book --title 明朝那些事儿
```

`weread` 读取微信读书书架，只列出「读完」且没有设为私密阅读的书，并跳过已经上架的。候选清单写在仓库根目录的 `.local/weread/`，不会进 Git。`--reviews` 会附上你在这本书上写过的整本书评，只作为参考：书架上那句感想要由人确认后再用 `add-book` 放上去。`WEREAD_API_KEY` 只放在本机环境变量里，不要写进任何文件。

### 新文章

在 `content/posts/` 新建 `.md` 文件，至少写入以下文件头部，再写正文。`slug` 是网址的一部分，发布后尽量不要修改。

```yaml
---
title: "文章标题"
date: 2026-09-24T12:00:00+08:00
slug: article-slug
draft: false
---
```

`draft: true` 的正文不会进入发布结果。删除旧文章时，同时从 `src/posts.py` 的网址映射中移除。

## 检查

`sh site/test.sh` 检查前端源码没有注释，并校验 `site.json`、`projects.json`、`bookshop.json`。构建时还会扫描整个 `dist/`，发现私密词表里的内容就失败，私密词表在 `src/content_store.py`。

## Docker 静态部署

从仓库根目录执行 `docker build -f site/Dockerfile -t cengsin-site .`，再运行 `docker run --rm -p 8080:80 cengsin-site`。最终镜像只含静态输出。
