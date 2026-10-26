# 财经科技日报

Chaoshen News 的静态日报站，中文界面，发布在 GitHub Pages，自定义域名 `news.chaoshen.io`。

站点没有后端，也不嵌入统计脚本。页面由仓库里的 Markdown 生成后随 `main` 一起提交，GitHub Pages 直接提供这些 HTML。

当前仓库里的 `2026-10-26` 是**示例 / 占位**，标题都不是真实新闻。

## 目录

```text
content/YYYY-MM-DD.md     当日源稿。文件名即北京时间日期，一天一篇
index.html                首页，日报按日期从新到旧排列（构建生成）
YYYY/MM/DD/index.html     日报页，URL 为 /YYYY/MM/DD/（构建生成）
404.html                  未知地址（构建生成）
assets/                   样式与图标
CNAME                     内容必须是 news.chaoshen.io
.nojekyll                 告诉 Pages 不要跑 Jekyll
scripts/build.mjs         无依赖生成器
scripts/check.mjs         结构检查
```

Pages 的发布目录是仓库**根目录 `/`**，不是 `/docs`。`content/` 和 `scripts/` 也会出现在网站上，里面没有密钥。

## 新增一天的日报

只改一份源稿，再生成页面。不要手改 `index.html`、`404.html` 或 `YYYY/MM/DD/`，下次构建会覆盖它们。

1. 新增 `content/YYYY-MM-DD.md`。日期用 **Asia/Shanghai（北京时间）** 的日历日，文件名和文内 `date` 必须相同。
2. 运行 `node scripts/build.mjs`（Node.js 18 或更新，不需要 `npm install`）。
3. 提交源稿和生成结果：`content/YYYY-MM-DD.md`、`index.html`、`YYYY/MM/DD/index.html`。若构建改写了 `404.html`，一并提交。
4. 推到 `main`。Pages 会发布根目录。

自动化程序按同样的三步即可：写入一个 Markdown，运行构建，把源稿和生成的 HTML 一起提交。构建会按日期降序重写首页列表（`#digest-list`），并删掉已经没有源稿的日期目录。

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

尚未开启时，管理员可以执行：

```bash
gh api --method POST repos/yanleijava/news/pages --input - <<'EOF'
{"source":{"branch":"main","path":"/"}}
EOF
```

合并进 `main` 之后，Pages 会从根目录发布。自定义域名也可以在 Settings → Pages 填写，或等 `CNAME` 随 `main` 生效。

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
