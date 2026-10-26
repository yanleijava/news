#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE = {
  name: "财经科技日报",
  kicker: "Chaoshen News",
  tagline: "每日财经与科技摘要",
  origin: "https://news.chaoshen.io",
  description: "按日归档的中文财经与科技摘要。首页保留全部历史，从新到旧，新的一天只追加。示例篇目标有「占位」，不是新闻。",
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

export function normalizeText(raw) {
  return String(raw).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function contentSha(raw) {
  return createHash("sha256").update(normalizeText(raw)).digest("hex");
}

export function parseDigest(filename, raw) {
  const text = normalizeText(raw);
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
    const digest = parseDigest(name, raw);
    digest.contentSha = contentSha(raw);
    digests.push(digest);
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

function shell({ title, description, canonical, home, depth, main, isHome, ogType }) {
  const prefix = depth === 0 ? "" : "../".repeat(depth);
  const type = ogType || (isHome ? "website" : "article");
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
  <meta property="og:type" content="${type}">
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
            <h4><a href="${digest.urlPath}">${escapeHtml(digest.title)}</a></h4>
            <p class="summary">${escapeHtml(digest.summary)}</p>
            <p class="more"><a href="${digest.urlPath}">阅读全文</a></p>
          </article>
        </li>`;
}

function groupByMonth(digests) {
  const groups = [];
  for (const digest of digests) {
    const key = digest.date.slice(0, 7);
    const label = `${Number(key.slice(0, 4))}年${Number(key.slice(5, 7))}月`;
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) groups.push({ key, label, items: [digest] });
    else last.items.push(digest);
  }
  return groups;
}

function groupByYear(digests) {
  const years = [];
  for (const digest of digests) {
    const year = digest.date.slice(0, 4);
    let yearGroup = years.find((item) => item.year === year);
    if (!yearGroup) {
      yearGroup = { year, months: [] };
      years.push(yearGroup);
    }
    const key = digest.date.slice(0, 7);
    let monthGroup = yearGroup.months.find((item) => item.key === key);
    if (!monthGroup) {
      monthGroup = { key, label: `${Number(key.slice(5, 7))}月`, items: [] };
      yearGroup.months.push(monthGroup);
    }
    monthGroup.items.push(digest);
  }
  return years;
}

function homeMain(digests) {
  if (!digests.length) {
    return `      <section aria-labelledby="latest-heading">
        <h2 id="latest-heading" class="section-label">全部日报</h2>
        <p class="empty">还没有日报。</p>
      </section>`;
  }
  const groups = groupByMonth(digests);
  const nav = groups
    .map(
      (group) =>
        `            <li><a href="#month-${group.key}">${escapeHtml(group.label)}</a> <span class="count">${group.items.length} 篇</span></li>`,
    )
    .join("\n");
  const sections = groups
    .map(
      (group) => `        <section class="month-group" id="month-${group.key}" aria-labelledby="month-${group.key}-title">
          <h3 id="month-${group.key}-title" class="month-heading">${escapeHtml(group.label)}</h3>
          <ol class="digest-list">
${group.items.map(digestCard).join("\n")}
          </ol>
        </section>`,
    )
    .join("\n");
  return `      <section aria-labelledby="latest-heading">
        <h2 id="latest-heading" class="section-label">全部日报</h2>
        <p class="archive-note">从新到旧列出全部历史。已发布的日期页会保留，发布时只追加新的一天。</p>
        <nav class="archive-nav" aria-label="按月浏览">
          <ol class="month-index">
${nav}
          </ol>
        </nav>
        <div id="digest-list">
${sections}
        </div>
        <p class="more"><a href="archive/">查看归档</a></p>
      </section>`;
}

function archiveItem(digest) {
  const badge = digest.sample ? ` <span class="badge">示例 / 占位</span>` : "";
  const day = `${Number(digest.date.slice(8, 10))}日`;
  return `              <li><time datetime="${digest.date}">${day}</time> <a href="../${digest.urlPath}">${escapeHtml(digest.title)}</a>${badge}</li>`;
}

function archiveMain(digests) {
  if (!digests.length) {
    return `      <article class="article">
        <h1>归档</h1>
        <p class="empty">还没有日报。</p>
        <p class="back"><a href="../">返回全部日报</a></p>
      </article>`;
  }
  const years = groupByYear(digests)
    .map((year) => {
      const months = year.months
        .map((month) => {
          const items = month.items.map(archiveItem).join("\n");
          return `          <section aria-labelledby="archive-${month.key}">
            <h3 id="archive-${month.key}">${escapeHtml(month.label)}</h3>
            <ul class="archive-list">
${items}
            </ul>
          </section>`;
        })
        .join("\n");
      return `        <section class="archive-year" aria-labelledby="year-${year.year}">
          <h2 id="year-${year.year}">${escapeHtml(year.year)}年</h2>
${months}
        </section>`;
    })
    .join("\n");
  return `      <article class="article">
        <header>
          <h1>归档</h1>
          <p class="archive-note">共 ${digests.length} 篇，从新到旧。每一天的页面发布后不再替换。</p>
        </header>
${years}
        <p class="back"><a href="../">返回全部日报</a></p>
      </article>`;
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
        <p>这个地址没有对应的日报。已发布的日报会一直留在 <code>/年/月/日/</code>，例如 <a href="/2026/10/26/">/2026/10/26/</a>。</p>
        <p class="back"><a href="/archive/">查看归档</a> · <a href="/">返回全部日报</a></p>
      </article>
    </main>
${footer("/")}
  </div>
</body>
</html>
`;
  fs.writeFileSync(path.join(root, "404.html"), html);
}

function manifestPath(root) {
  return path.join(root, "archive.json");
}

function readManifest(root) {
  const file = manifestPath(root);
  if (!fs.existsSync(file)) return { digests: [] };
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`archive.json 无法解析：${error.message}`);
  }
  if (!data || !Array.isArray(data.digests)) throw new Error("archive.json 的 digests 必须是数组");
  const seen = new Set();
  for (const entry of data.digests) {
    if (!entry || typeof entry !== "object") throw new Error("archive.json 含有无效条目");
    if (!assertValidDate(entry.date)) throw new Error(`archive.json 日期无效：${entry.date}`);
    if (seen.has(entry.date)) throw new Error(`archive.json 重复日期：${entry.date}`);
    seen.add(entry.date);
    if (typeof entry.title !== "string" || entry.title === "") throw new Error(`${entry.date}: archive.json 缺少 title`);
    if (typeof entry.summary !== "string" || entry.summary === "") throw new Error(`${entry.date}: archive.json 缺少 summary`);
    if (typeof entry.sample !== "boolean") throw new Error(`${entry.date}: archive.json 的 sample 必须是布尔值`);
    if (typeof entry.contentSha !== "string" || !/^[a-f0-9]{64}$/.test(entry.contentSha)) {
      throw new Error(`${entry.date}: archive.json 的 contentSha 无效`);
    }
  }
  return data;
}

function writeManifest(root, manifest) {
  fs.writeFileSync(manifestPath(root), `${JSON.stringify(manifest, null, 2)}\n`);
}

function entryFromDigest(digest) {
  return {
    date: digest.date,
    title: digest.title,
    summary: digest.summary,
    sample: digest.sample,
    path: digest.urlPath,
    contentSha: digest.contentSha,
  };
}

function decorateEntry(entry) {
  return {
    date: entry.date,
    title: entry.title,
    summary: entry.summary,
    sample: entry.sample,
    contentSha: entry.contentSha,
    html: "",
    ...formatDate(entry.date),
  };
}

function newestFirst(a, b) {
  if (a.date === b.date) return 0;
  return a.date < b.date ? 1 : -1;
}

function pagePath(root, digest) {
  return path.join(root, digest.urlPath, "index.html");
}

function writeDigestPage(root, digest) {
  const file = pagePath(root, digest);
  if (fs.existsSync(file)) {
    throw new Error(`拒绝覆盖已发布的 ${digest.date}。${digest.urlPath}index.html 已存在，构建不会替换它。`);
  }
  const page = shell({
    title: `${digest.title} · ${SITE.name}`,
    description: digest.summary,
    canonical: `${SITE.origin}/${digest.urlPath}`,
    home: "../../../",
    depth: 3,
    isHome: false,
    main: articleMain(digest, "../../../"),
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `<!-- Published digest ${digest.date}. Do not overwrite. -->\n${page}`);
}

function writeIndexes(root, digests) {
  const index = shell({
    title: SITE.name,
    description: SITE.description,
    canonical: `${SITE.origin}/`,
    home: "./",
    depth: 0,
    isHome: true,
    main: homeMain(digests),
  });
  fs.writeFileSync(
    path.join(root, "index.html"),
    `<!-- Generated by scripts/build.mjs from archive.json. Dated pages are append-only. -->\n${index}`,
  );

  const archive = shell({
    title: `归档 · ${SITE.name}`,
    description: `财经科技日报归档，共 ${digests.length} 篇，从新到旧。`,
    canonical: `${SITE.origin}/archive/`,
    home: "../",
    depth: 1,
    isHome: false,
    ogType: "website",
    main: archiveMain(digests),
  });
  fs.mkdirSync(path.join(root, "archive"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "archive", "index.html"),
    `<!-- Generated by scripts/build.mjs from archive.json. Dated pages are append-only. -->\n${archive}`,
  );
}

export function build(rootDir) {
  const root = path.resolve(rootDir);
  const fromFiles = loadDigests(path.join(root, "content"));
  const manifest = readManifest(root);
  const known = new Map();
  for (const entry of manifest.digests) {
    if (known.has(entry.date)) throw new Error(`archive.json 重复日期：${entry.date}`);
    known.set(entry.date, entry);
  }

  for (const digest of fromFiles) {
    const existing = known.get(digest.date);
    if (existing && existing.contentSha !== digest.contentSha) {
      throw new Error(
        `拒绝覆盖已发布的 ${digest.date}。这一天的日报已经固定，请不要修改 content/${digest.date}.md；新内容请写成新的日期文件。`,
      );
    }
  }

  const toCreate = [];
  const incoming = [...fromFiles].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const digest of incoming) {
    const existing = known.get(digest.date);
    const file = pagePath(root, digest);
    if (existing) {
      if (!fs.existsSync(file)) toCreate.push(digest);
      continue;
    }
    const entry = entryFromDigest(digest);
    manifest.digests.push(entry);
    known.set(digest.date, entry);
    if (!fs.existsSync(file)) toCreate.push(digest);
  }

  for (const digest of toCreate) writeDigestPage(root, digest);
  writeManifest(root, manifest);

  const published = manifest.digests.map(decorateEntry).sort(newestFirst);
  writeIndexes(root, published);
  write404(root);
  return published;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const digests = build(root);
  console.log(`history ${digests.length} digest${digests.length === 1 ? "" : "s"}, newest first`);
  for (const digest of digests) console.log(`  ${digest.date}  /${digest.urlPath}`);
}
