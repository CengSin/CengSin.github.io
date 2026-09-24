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

修改文章请编辑仓库根目录的 `content/posts/`，在 `src/posts.py` 中为新文章添加网址映射。旧 `public/` 目录仅作历史归档，构建不会读取其中的 HTML。个人资料在仓库根目录 `.local/profile/`，已被 Git 忽略，不参与构建。

公开站点不包含任职、求职城市、Now 和 Timeline。姓名、学校和手机号也没有写入 `dist/`。两篇旧日记中原有的一个未列入公开作品的项目名称在构建输出中替换为「一个实验项目」。
