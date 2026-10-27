# 超神日报

基于 Hugo 的中文财经科技日报 / 周报站点。每期日报和周报都是一篇独立 Markdown；Hugo 用结构化 front matter 渲染成白底卡片，并生成文章页、栏目归档、首页和 RSS。站点部署在 GitHub Pages，自定义域名为 `news.chaoshen.io`。

## 发布新一期

文章源文件按栏目保存在 `content/daily/` 和 `content/weekly/`。新文章一经发布，就通过 Git 历史和 Hugo 静态页面归档；后续发布只需新增一个 Markdown 文件。

创建日报：

```bash
hugo new content content/daily/2026-10-27.md --kind daily
```

创建周报：

```bash
hugo new content content/weekly/2026-11-01.md --kind weekly
```

将 `draft: true` 改为 `draft: false`，把 `date` 改成这期对应的北京时间日期，再改标题、摘要和 `card`。日报 URL 按日期生成 `/年/月/日/`，周报 URL 为 `/weekly/年/月/日/`。不要改文件名里的日期，也不要另设 `slug`，否则链接会变。

标题格式：

- 日报：`日报：<核心主题>`
- 周报：`周报：<核心主题>`

核心主题大约 12–22 个字，从当期内容里抽出最重要的一件事。`description` 用一两句已核实的事实配合标题。日期留在 front matter 的 `date`，不要写进标题。

## 日报 / 周报文件格式

自动化只需要新增一个 Markdown 文件。正文数据全部放在 front matter 的 `card` 里，正文只留一行 shortcode，让 RSS 输出同一张卡片：

```markdown
---
title: "日报：油价与融资成本双压，风险资产先缩仓"
date: 2026-10-26T08:00:00+08:00
description: "周五美股齐跌、布油一周涨超6%，油价与融资成本同时加压，风险资产先缩仓。"
tags: ["财经", "科技"]
draft: false
card:
  market:
    - title: 美股与大宗
      kicker: 油价扰动
      bullets:
        - "三大指数齐跌：标普 {down}-0.52%{/down}、道指 {down}-1.23%{/down}、纳指 {down}-0.21%{/down}"
        - "布油约 {num}116.7{/num} 美元一周涨超 {up}6%{/up}，十年期美债收益率约 {num}4.99%{/num}"
  tech:
    - name: 亚马逊
      text: "AWS 今明年算力基本售罄，AI 年化收入超 250 亿美元"
  judgment:
    lead: "油价与融资成本同时加压，风险资产先缩仓。"
    body: "周五美股齐跌、布油创阶段新高，BTC 仍在 8 万美元一带拉锯。"
  watch:
    - when: 10月28日
      text: 美联储议息与沃什记者会
---

{{< brief >}}
```

正文只有最后这一行 shortcode。页面本身由 `card` 渲染；这一行让 RSS 得到同一张卡片。

`layouts/partials/brief-card.html` 读取 `card`。日报固定四个栏目；周报用同一结构，模板按 `weekly` 栏目改标题：

| 字段 | 日报栏目 | 周报栏目 |
| --- | --- | --- |
| `market` | 01 市场观察 | 01 本周市场 |
| `tech` | 02 AI 与科技 | 02 本周 AI 与科技 |
| `judgment` | 03 今日核心判断 | 03 本周核心判断 |
| `watch` | 04 接下来关注 | 04 下周关注 |

字段约定：

- `market`：若干组。每组有 `title`、`kicker`（渲染成 `美股与大宗 | 油价扰动`）和 `bullets`。
- `tech`：若干行，`name` 与 `text` 渲染成 `名称 | 一句话`。
- `judgment`：`lead` 加粗，`body` 为紧随的一段。
- `watch`：`when | text`。没有明确日期或事件时，删掉整个 `watch`，页面不渲染第 04 节。
- 周报只汇总这一周已经发布的日报，不补日报里没有的数字。

不要在 Markdown 里写 HTML。涨跌和数字用记号，模板会转成带颜色的文字：

- `{up}6%{/up}`：上涨，红色
- `{down}-1.23%{/down}`：下跌，绿色
- `{num}116.7{/num}`：关键数字，加粗

卡片样式在 `assets/css/main.css` 的 `.brief` 一段。模板见 `archetypes/daily.md` 和 `archetypes/weekly.md`。

## 本地预览

需要 Hugo Extended（GitHub Actions 使用 0.150.0）：

```bash
hugo server --buildDrafts
```

正式构建：

```bash
hugo --minify
```

生成文件写入 `public/`。GitHub Actions 在推送到 `main` 后构建并发布到 GitHub Pages，不要提交 `public/`。

## 目录

```text
archetypes/                 日报、周报新文章模板
assets/css/main.css         站点样式（含卡片版式，构建时压缩并指纹化）
content/daily/              日报 Markdown
content/weekly/             周报 Markdown
content/posts/              全部文章归档页
layouts/partials/brief-card.html
layouts/shortcodes/brief.html
layouts/                    Hugo 页面模板
static/                     favicon、CNAME、.nojekyll
.github/workflows/pages.yml GitHub Pages 构建与部署
hugo.toml                   站点设置、栏目导航、URL 规则
```

## GitHub Pages

仓库设置中将 Pages 的 Source 设为 **GitHub Actions**。`.github/workflows/pages.yml` 会负责构建和部署。自定义域名由 `static/CNAME` 发布；DNS 应有 `news` 指向 `yanleijava.github.io` 的 CNAME 记录。

## 编辑说明

网站不加载第三方统计脚本；RSS 地址为 `/index.xml`。文章页只供信息参考，不构成投资建议。
