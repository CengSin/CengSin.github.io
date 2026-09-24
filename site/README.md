# CengSin 个人站

`cengsin.is-a.dev` 的静态站。源文件在 `src/`，生成结果在 `dist/`。GitHub Pages 从 `CengSin.github.io` 的 `gh-pages` 分支发布这份生成结果。

## 预览

```bash
python3 src/build.py
python3 -m http.server 8765 --directory dist
```

浏览器打开 http://127.0.0.1:8765/

## 页面

- `/` 首页
- `/projects` 作品目录
- `/projects/idea-platform` 以及其他项目详情
- `/about` `/agent`
- `/llms.txt` `/agent/profile.json` `/agent/profile.md`

公开站点不包含任职、求职城市、Now 和 Timeline。姓名、学校和手机号也没有写入 `dist/`。
