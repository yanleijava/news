#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE = {
  name: "财经科技日报",
  kicker: "Chaoshen News",
  tagline: "每日财经与科技摘要",
  origin: "https://news.chaoshen.io",
  description: "按日归档的中文财经与科技摘要。示例篇目标有「占位」，不是新闻。",
};

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const DATE_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function safeUrl(url) {
  const value = url.trim();
  if (value === "" || /[\s"'<>`]/.test(value) || value.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("#") || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) {
    return value;
  }
  if (/^[A-Za-z0-9._~/-]+$/.test(value)) return value;
  return null;
}

export function renderInline(source) {
  let html = "";
  let i = 0;
  while (i < source.length) {
    if (source.startsWith("**", i)) {
      const end = source.indexOf("**", i + 2);
      if (end !== -1) {
        html += `<strong>${renderInline(source.slice(i + 2, end))}</strong>`;
        i = end + 2;
        continue;
      }
    }
    if (source[i] === "`") {
      const end = source.indexOf("`", i + 1);
      if (end !== -1) {
        html += `<code>${escapeHtml(source.slice(i + 1, end))}</code>`;
        i = end + 1;
        continue;
      }
    }
    if (source[i] === "*" && !source.startsWith("**", i)) {
      const end = source.indexOf("*", i + 1);
      if (end !== -1) {
        html += `<em>${renderInline(source.slice(i + 1, end))}</em>`;
        i = end + 1;
        continue;
      }
    }
    if (source[i] === "[") {
      const close = source.indexOf("]", i + 1);
      if (close !== -1 && source[close + 1] === "(") {
        const urlEnd = source.indexOf(")", close + 2);
        if (urlEnd !== -1) {
          const label = source.slice(i + 1, close);
          const safe = safeUrl(source.slice(close + 2, urlEnd));
          if (safe) {
            const rel = /^https?:\/\//i.test(safe) ? ` rel="noreferrer"` : "";
            html += `<a href="${escapeHtml(safe)}"${rel}>${renderInline(label)}</a>`;
            i = urlEnd + 1;
            continue;
          }
        }
      }
    }
    html += escapeHtml(source[i]);
    i += 1;
  }
  return html;
}

function isBlockStart(line) {
  return line.startsWith("## ") || line.startsWith("### ") || line.startsWith("> ") || line.startsWith("- ");
}

export function renderMarkdown(source) {
  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(`<h3>${renderInline(line.slice(4).trim())}</h3>`);
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(`<h2>${renderInline(line.slice(3).trim())}</h2>`);
      i += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote.push(lines[i].slice(2).trim());
        i += 1;
      }
      blocks.push(`<blockquote><p>${renderInline(quote.join(" "))}</p></blockquote>`);
      continue;
    }
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`<li>${renderInline(lines[i].slice(2).trim())}</li>`);
        i += 1;
      }
      blocks.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push(`<p>${renderInline(para.join(" "))}</p>`);
  }
  return blocks.join("\n");
}

export function assertValidDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return {
    label: `${year}年${month}月${day}日`,
    weekday: WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()],
    urlPath: `${match[1]}/${match[2]}/${match[3]}/`,
  };
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseDigest(filename, raw) {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.startsWith("---\n")) {
    throw new Error(`${filename}: 缺少开头的 front matter（必须以 --- 开始）`);
  }
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) throw new Error(`${filename}: front matter 未闭合`);
  const data = {};
  for (const line of text.slice(4, end).split("\n")) {
    if (line.trim() === "") continue;
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) throw new Error(`${filename}: 无法解析 front matter 行：${line}`);
    data[match[1]] = stripQuotes(match[2].trim());
  }
  for (const key of ["date", "title", "summary"]) {
    if (!data[key]) throw new Error(`${filename}: front matter 缺少 ${key}`);
  }
  if (!assertValidDate(data.date)) throw new Error(`${filename}: date 不是有效的 YYYY-MM-DD：${data.date}`);
  const fileDate = DATE_FILE.exec(filename);
  if (!fileDate) throw new Error(`${filename}: 文件名必须是 YYYY-MM-DD.md`);
  if (fileDate[1] !== data.date) {
    throw new Error(`${filename}: 文件名日期必须与 date 一致（${data.date}）`);
  }
  let sample = false;
  if (data.sample !== undefined && data.sample !== "") {
    if (data.sample !== "true" && data.sample !== "false") {
      throw new Error(`${filename}: sample 只能是 true 或 false`);
    }
    sample = data.sample === "true";
  }
  const formatted = formatDate(data.date);
  return {
    date: data.date,
    title: data.title,
    summary: data.summary,
    sample,
    ...formatted,
    html: renderMarkdown(text.slice(end + 5).trim()),
  };
}

export function loadDigests(contentDir) {
  if (!fs.existsSync(contentDir)) throw new Error(`找不到内容目录：${contentDir}`);
  const digests = [];
  for (const name of fs.readdirSync(contentDir)) {
    if (!name.endsWith(".md")) continue;
    if (!DATE_FILE.test(name)) throw new Error(`${name}: 内容文件名必须是 YYYY-MM-DD.md`);
    const raw = fs.readFileSync(path.join(contentDir, name), "utf8");
    digests.push(parseDigest(name, raw));
  }
  digests.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return digests;
}

function indent(text, spaces) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length ? pad + line : line))
    .join("\n");
}

function header(home, isHome) {
  const brand = isHome
    ? `<h1>${escapeHtml(SITE.name)}</h1>`
    : `<p class="brand"><a href="${home}">${escapeHtml(SITE.name)}</a></p>`;
  return `    <header class="masthead">
      <div class="masthead-top">
        <p class="kicker">${escapeHtml(SITE.kicker)}</p>
        <p class="edition">日期按北京时间</p>
      </div>
      ${brand}
      <p class="tagline">${escapeHtml(SITE.tagline)}</p>
    </header>`;
}

function footer(home) {
  return `    <footer class="colophon">
      <p><a href="${home}">${escapeHtml(SITE.name)}</a> · ${escapeHtml(SITE.kicker)}</p>
      <p>静态页面，由 GitHub Pages 发布。标有「示例 / 占位」的篇目不是新闻，也不构成投资建议。</p>
    </footer>`;
}

function shell({ title, description, canonical, home, depth, main, isHome }) {
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${isHome ? "website" : "article"}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:locale" content="zh_CN">
  <meta name="theme-color" content="#fbf8f2">
  <link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body>
  <a class="skip" href="#main">跳到内容</a>
  <div class="sheet">
${header(home, isHome)}
    <main id="main">
${main}
    </main>
${footer(home)}
  </div>
</body>
</html>
`;
}

function digestCard(digest) {
  const badge = digest.sample ? `\n            <p class="badge">示例 / 占位</p>` : "";
  return `        <li>
          <article class="digest-card" data-date="${digest.date}">
            <p class="meta"><time datetime="${digest.date}">${escapeHtml(digest.label)}</time> · ${escapeHtml(digest.weekday)}</p>${badge}
            <h3><a href="${digest.urlPath}">${escapeHtml(digest.title)}</a></h3>
            <p class="summary">${escapeHtml(digest.summary)}</p>
            <p class="more"><a href="${digest.urlPath}">阅读全文</a></p>
          </article>
        </li>`;
}

function homeMain(digests) {
  const list = digests.length
    ? `        <ol class="digest-list" id="digest-list">\n${digests.map(digestCard).join("\n")}\n        </ol>`
    : `        <p class="empty">还没有日报。</p>`;
  return `      <section aria-labelledby="latest-heading">
        <h2 id="latest-heading" class="section-label">最新日报</h2>
${list}
      </section>`;
}

function articleMain(digest, home) {
  const notice = digest.sample
    ? `\n        <p class="notice" role="note">示例 / 占位：本篇不是真实新闻，只用来展示版式，请勿引用。</p>`
    : "";
  const prose = digest.html ? `\n${indent(digest.html, 10)}\n        ` : "";
  return `      <article class="article">
        <header>
          <p class="article-kicker"><time datetime="${digest.date}">${escapeHtml(digest.label)}</time> · ${escapeHtml(digest.weekday)}</p>
          <h1>${escapeHtml(digest.title)}</h1>
        </header>${notice}
        <div class="prose">${prose}</div>
        <p class="back"><a href="${home}">返回全部日报</a></p>
      </article>`;
}

function cleanStaleDigests(root, keep) {
  if (!fs.existsSync(root)) return;
  for (const year of fs.readdirSync(root, { withFileTypes: true })) {
    if (!year.isDirectory() || !/^\d{4}$/.test(year.name)) continue;
    const yearPath = path.join(root, year.name);
    for (const month of fs.readdirSync(yearPath, { withFileTypes: true })) {
      if (!month.isDirectory() || !/^\d{2}$/.test(month.name)) continue;
      const monthPath = path.join(yearPath, month.name);
      for (const day of fs.readdirSync(monthPath, { withFileTypes: true })) {
        if (!day.isDirectory() || !/^\d{2}$/.test(day.name)) continue;
        const rel = `${year.name}/${month.name}/${day.name}/index.html`;
        const dayPath = path.join(monthPath, day.name);
        if (!keep.has(rel)) {
          const indexPath = path.join(dayPath, "index.html");
          if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath);
          if (fs.readdirSync(dayPath).length === 0) fs.rmdirSync(dayPath);
        }
      }
      if (fs.readdirSync(monthPath).length === 0) fs.rmdirSync(monthPath);
    }
    if (fs.readdirSync(yearPath).length === 0) fs.rmdirSync(yearPath);
  }
}

function write404(root) {
  const cssPath = path.join(root, "assets", "style.css");
  if (!fs.existsSync(cssPath)) throw new Error("找不到 assets/style.css，无法生成 404 页");
  const css = fs.readFileSync(cssPath, "utf8").replaceAll("</style", "<\\/style");
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>找不到这一页 · ${escapeHtml(SITE.name)}</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <style>
${css}
  </style>
</head>
<body>
  <a class="skip" href="#main">跳到内容</a>
  <div class="sheet">
${header("/", false)}
    <main id="main">
      <article class="article">
        <h1>找不到这一页</h1>
        <p>这个地址没有对应的日报。已发布的日报在 <code>/年/月/日/</code>，例如 <a href="/2026/10/26/">/2026/10/26/</a>。</p>
        <p class="back"><a href="/">返回全部日报</a></p>
      </article>
    </main>
${footer("/")}
  </div>
</body>
</html>
`;
  fs.writeFileSync(path.join(root, "404.html"), html);
}

export function build(rootDir) {
  const root = path.resolve(rootDir);
  const digests = loadDigests(path.join(root, "content"));
  const keep = new Set(digests.map((digest) => `${digest.urlPath}index.html`));
  cleanStaleDigests(root, keep);

  const index = shell({
    title: SITE.name,
    description: SITE.description,
    canonical: `${SITE.origin}/`,
    home: "./",
    depth: 0,
    isHome: true,
    main: homeMain(digests),
  });
  fs.writeFileSync(path.join(root, "index.html"), `<!-- Generated by scripts/build.mjs. Edit content/*.md and rebuild. -->\n${index}`);

  for (const digest of digests) {
    const page = shell({
      title: `${digest.title} · ${SITE.name}`,
      description: digest.summary,
      canonical: `${SITE.origin}/${digest.urlPath}`,
      home: "../../../",
      depth: 3,
      isHome: false,
      main: articleMain(digest, "../../../"),
    });
    const dir = path.join(root, digest.urlPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), `<!-- Generated by scripts/build.mjs. Edit content/*.md and rebuild. -->\n${page}`);
  }

  write404(root);
  return digests;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const digests = build(root);
  console.log(`built ${digests.length} digest${digests.length === 1 ? "" : "s"}`);
  for (const digest of digests) console.log(`  ${digest.date}  /${digest.urlPath}`);
}
