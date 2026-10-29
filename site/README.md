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

## 音乐与回忆

前端使用 Vite、React、Tailwind；原有 Python 构建继续生成静态 HTML 和旧文章网址。需要 Node.js 24，先运行 `npm ci --prefix site`。`python3 site/src/build.py`（在仓库根目录运行）会先构建前端资源。设计 token 在 `src/frontend/styles/tokens.css`。Inter 和 JetBrains Mono 随资源自托管，默认深色，可切换浅色。

音乐独立存入 Worker 的 `MUSIC` D1 数据库，与公开 `/config` 分离。默认关闭音乐名片；每段回忆单独预览、发布。保存修改会撤回该回忆，重新发布后才公开。公开接口 `/music/public` 只返回已发布回忆中的歌曲、时期、正文和主动填写的 Idea Platform 关联链接，不返回播放次数、播放时间、歌单、报告、登录凭据或账号资料；响应不缓存。公开开关不能收回访客此前已保存的副本。

后台新增「音乐与回忆」：导入同步文件、按月份和歌单选歌、编辑回忆、预览发布，以及关闭音乐名片。当前只关联 Idea Platform 的记录链接，不会自动同步该平台的私人想法或文章。个人 AI 和机会雷达尚未接入。

### 私人同步

登录凭据留在已授权的 `codex-agent` 私有目录。同步器 `tools/netease-export.cjs` 使用 `@neteasecloudmusicapienhanced/api@4.41.1`，只调用读取接口。运行示例（在装有该库的私有工作目录中）：

```sh
node netease-export.cjs --session session.json --months 2026-08,2026-09 --out library-export.json
```

同步文件只包含歌单、歌曲、最近播放与选定月份的统计，不保留账号、好友、Cookie、播放地址。原子写入，失败不会覆盖上次导出。在后台选择「导入音乐数据」即可导入；重复导入同一采集时间不会重复创建快照。文件上限 8 MB，单份快照上限 1.5 MB。手动同步不会自动发布内容。最近播放可能只保留每首歌最近一次出现，不能作为完整逐次播放日志。歌单中的部分失效歌曲可能无法返回，后台显示实际返回数与来源总数。

本地后台沿用 GitHub 登录，将音乐数据存在被忽略的 `.local/music/library.sqlite`；需安装 Node.js 24。私人资料不参与静态构建。本机后台只监听 `127.0.0.1:8787`。

### 后台部署

```sh
npm ci --prefix site
node site/cloudflare/build-assets.mjs
site/node_modules/.bin/wrangler d1 migrations apply MUSIC --remote --config site/cloudflare/wrangler.toml
site/node_modules/.bin/wrangler deploy --config site/cloudflare/wrangler.toml
```

测试：`sh site/test.sh`，涵盖身份验证、跨域写入拒绝、导入去重、字段过滤、公开开关、发布与撤回、修改后退回草稿。

### Docker 静态部署

从仓库根目录执行 `docker build -f site/Dockerfile -t cengsin-site .`，再运行 `docker run --rm -p 8080:80 cengsin-site`。最终镜像只含静态输出；线上音乐数据仍通过现有 Worker 提供。
