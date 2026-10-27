# 超神日报

基于 Hugo 的中文财经科技日报 / 周报站点。每期日报和周报都是一篇独立 Markdown 文章；Hugo 自动生成文章页、栏目归档、首页和 RSS。站点部署在 GitHub Pages，自定义域名为 `news.chaoshen.io`。

## 发布新一期

文章源文件按栏目保存在 `content/daily/` 和 `content/weekly/`。新文章一经发布，就通过 Git 历史和 Hugo 静态页面归档；后续发布只需新增 Markdown 文件。

创建日报：

```bash
hugo new content content/daily/2026-10-27.md --kind daily
```

创建周报：

```bash
hugo new content content/weekly/2026-10-30.md --kind weekly
```

将文件中的 `draft: true` 改为 `draft: false`，把 `date` 改成这期对应的北京时间日期，再填写标题、摘要（`description`）、标签和正文。日报 URL 自动按日期生成 `/年/月/日/`；周报 URL 为 `/weekly/年/月/日/`。同一天只发布一篇日报；如需同日多篇，可在 front matter 设置唯一 `slug` 并调整 `hugo.toml` 的 permalink 规则。

模板位于 `archetypes/daily.md` 和 `archetypes/weekly.md`。文章支持标准 Markdown，Front Matter 使用 YAML。

## 本地预览

需要 Hugo Extended（项目在 Hugo 0.165.0 上构建）：

```bash
hugo server --buildDrafts
```

Hugo 会显示本地预览地址。正式构建：

```bash
hugo --minify
```

生成文件写入 `public/`。GitHub Actions 在推送到 `main` 后构建并发布到 GitHub Pages，不要提交 `public/`。

## 目录

```text
archetypes/                 日报、周报新文章模板
assets/css/main.css         站点样式（构建时压缩并指纹化）
content/daily/              日报 Markdown
content/weekly/             周报 Markdown
content/posts/              全部文章归档页
layouts/                    Hugo 页面模板
static/                     favicon、CNAME、.nojekyll
.github/workflows/pages.yml GitHub Pages 构建与部署
hugo.toml                   站点设置、栏目导航、URL 规则
```

## GitHub Pages

仓库设置中将 Pages 的 Source 设为 **GitHub Actions**。`.github/workflows/pages.yml` 会负责构建和部署。自定义域名由 `static/CNAME` 发布；DNS 应有 `news` 指向 `yanleijava.github.io` 的 CNAME 记录。

## 编辑说明

`content/daily/` 中的文章是已发布日报。周报放在 `content/weekly/`，只整理对应周一至周日的日报，不另加事实。网站不加载第三方统计脚本；RSS 地址为 `/index.xml`。
