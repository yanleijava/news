# 财经科技日报

Chaoshen News 的静态日报站，中文界面，发布在 GitHub Pages，自定义域名 `news.chaoshen.io`。

站点没有后端，也不嵌入统计脚本。页面由仓库里的 Markdown 生成后随 `main` 一起提交，GitHub Pages 直接提供这些 HTML。

当前仓库里的 `2026-10-26` 是**示例 / 占位**，标题都不是真实新闻。

## 目录

```text
content/YYYY-MM-DD.md     当日源稿。文件名即北京时间日期，一天一篇，发布后不要改
archive.json              追加式历史清单。只有新日期会加在末尾，旧条目不删不改
index.html                首页。全部日报从新到旧，并带按月浏览（索引，可重写）
archive/index.html        归档页。按年、月浏览全部历史（索引，可重写）
YYYY/MM/DD/index.html     日报页，URL 为 /YYYY/MM/DD/。一旦发布就永久保留，构建不会覆盖
404.html                  未知地址（索引，可重写）
assets/                   样式与图标
CNAME                     内容必须是 news.chaoshen.io
.nojekyll                 告诉 Pages 不要跑 Jekyll
scripts/build.mjs         无依赖生成器
scripts/check.mjs         结构检查
```

Pages 的发布目录是仓库**根目录 `/`**，不是 `/docs`。`content/` 和 `scripts/` 也会出现在网站上，里面没有密钥。

## 新增一天的日报

历史是追加的。每一天对应一个永久的日期页，构建**不会覆盖、替换或删除**已发布的 `YYYY/MM/DD/index.html`，也不会从首页或归档里拿掉旧日期。

1. **只新增** `content/YYYY-MM-DD.md`。日期用 **Asia/Shanghai（北京时间）** 的日历日，文件名和文内 `date` 必须相同。不要修改、覆盖或删除已有的 `content/*.md` 和 `YYYY/MM/DD/`。
2. 运行 `node scripts/build.mjs`（Node.js 18 或更新，不需要 `npm install`）。
3. 提交这次新增的文件：`content/YYYY-MM-DD.md`、`YYYY/MM/DD/index.html`、`archive.json`，以及重写后的索引 `index.html` 和 `archive/index.html`。若 `404.html` 有变化，一并提交。
4. 推到 `main`。Pages 会发布根目录。

脚本的行为：

- 这一天还没有页面：写入 `YYYY/MM/DD/index.html`，并在 `archive.json` 末尾追加一条。
- 这一天已经发布，且源稿与当初完全一致：跳过该日期页，不改文件内容。
- 源稿和已发布内容不一致：构建失败并退出，已发布的日期页、`archive.json` 和索引都保持原样。
- 首页 `#digest-list` 和 `/archive/` 按 `archive.json` 里的**全部**条目从新到旧重写。月份导航用来浏览历史。删掉一份旧源稿也不会删掉对应的日期页或清单条目。

`archive.json` 的每条记录有 `date`、`title`、`summary`、`sample`、`path`、`contentSha`。`contentSha` 是源稿规范化后的 SHA-256，构建用它判断旧稿有没有被改写。不要手改这个文件。

自动化程序按同样的方式只追加新日期，不要回写旧日期。

### Front matter

```markdown
---
date: 2026-10-27
title: 2026年10月27日
summary: 给首页用的一两句话。
sample: false
---

正文从这里开始。
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `date` | 是 | `YYYY-MM-DD`，与文件名一致 |
| `title` | 是 | 日报标题 |
| `summary` | 是 | 首页摘要，单独一行 |
| `sample` | 否 | 只有占位稿写 `true`，页面会标「示例 / 占位」。正式日报省略或写 `false` |

正文只用下面这种子集：

- 段落：空行分隔
- 标题：`## ` 与 `### `
- 列表：一行一条，以 `- ` 开头
- 强调：`**粗体**`、`*斜体*`、`` `代码` ``
- 链接：`[文字](https://example.com/)`，也允许站内相对路径
- 引用：`> `

不支持嵌套列表、图片和原始 HTML。文内的 `<` 会转义。

本地预览：

```bash
node scripts/build.mjs
node scripts/check.mjs
python3 -m http.server 4173
```

打开 `http://127.0.0.1:4173/`，再点进 `/2026/10/26/`。

## GitHub Pages

- 仓库：<https://github.com/yanleijava/news>
- 发布分支：`main`
- 发布目录：`/`（仓库根）
- 构建方式：静态文件。根目录有 `.nojekyll`，Pages 不会用 Jekyll 处理
- 自定义域名：`news.chaoshen.io`，写在根目录 `CNAME` 中

Pages 需要仓库管理员打开。这次改动的自动化账号没有 `pages` / `administration` 写权限，直接调接口会返回 403，所以**合并本身不会自动打开 Pages**。合并后请在 Settings → Pages 选择 Branch `main`、Folder `/ (root)`，或由管理员执行：

```bash
gh api --method POST repos/yanleijava/news/pages --input - <<'EOF'
{"source":{"branch":"main","path":"/"}}
EOF
```

`CNAME` 在进入 `main` 之后才会被 Pages 读到。自定义域名也可以在 Settings → Pages 里再填一次 `news.chaoshen.io`。

自定义域名生效之前，站点会出现在 `https://yanleijava.github.io/news/`。样式和日报链接是相对路径，这个地址和 `news.chaoshen.io` 都能用。

## DNS

在域名 **chaoshen.io** 添加这一条记录：

| 类型 | 主机记录 / Name | 目标 / Value |
| --- | --- | --- |
| CNAME | `news` | `yanleijava.github.io` |

这是子域名 `news.chaoshen.io`。指向 GitHub Pages 用这条 CNAME 就够了。

GitHub 文档里的 apex（根域，例如直接使用 `chaoshen.io`）才需要 A 记录或 ALIAS。本站不用 apex，**不要**为了 `news` 去改根域的 A 记录。

DNS 传播、GitHub 完成域名检查并签发证书之后，在仓库 Settings → Pages 打开 **Enforce HTTPS**。证书还没就绪时先不要强制 HTTPS，否则可能暂时打不开。也可以在检查通过后执行：

```bash
gh api --method PUT repos/yanleijava/news/pages -F https_enforced=true
```
