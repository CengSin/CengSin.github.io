# CengSin 网站

这个仓库是 `cengsin.is-a.dev` 的唯一工作目录。

- `site/src/`：当前站点源码
- `content/posts/`：文章 Markdown 源文件，构建时生成旧 `/posts/` 网址
- `public/`：旧 Hugo HTML 的历史归档，当前构建不读取
- `.local/profile/`：本地私人资料，已被 Git 忽略，不会部署

在仓库根目录安装 `site/requirements.txt` 并运行 `python3 site/src/build.py`，预览 `site/dist/`。`main` 的 GitHub Actions 将该输出部署到 `gh-pages`。

具体页面和预览命令见 [site/README.md](site/README.md)。
