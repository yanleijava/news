import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build, parseDigest, renderMarkdown, safeUrl } from "./build.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("safeUrl rejects scriptable schemes", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("//evil.example/phish"), null);
  assert.equal(safeUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(safeUrl("../index.html"), "../index.html");
});

test("markdown renders the digest subset and escapes HTML", () => {
  const html = renderMarkdown(
    "## 财经\n\n一段 <script>alert(1)</script>\n\n- **【占位】** 文字与 [链接](https://example.com/x)\n\n[坏链接](javascript:alert(1))\n",
  );
  assert.match(html, /<h2>财经<\/h2>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /<li><strong>【占位】<\/strong> 文字与 <a href="https:\/\/example.com\/x" rel="noreferrer">链接<\/a><\/li>/);
  assert.doesNotMatch(html, /<a [^>]*javascript:/i);
});

test("front matter date must match the filename", () => {
  assert.throws(() =>
    parseDigest(
      "2026-10-26.md",
      "---\ndate: 2026-10-25\ntitle: 标题\nsummary: 摘要\n---\n\n正文\n",
    ),
  );
  assert.throws(() =>
    parseDigest(
      "2026-02-31.md",
      "---\ndate: 2026-02-31\ntitle: 标题\nsummary: 摘要\n---\n\n正文\n",
    ),
  );
});

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "digest-"));
  fs.mkdirSync(path.join(root, "content"));
  fs.mkdirSync(path.join(root, "assets"));
  fs.copyFileSync(path.join(repoRoot, "assets", "style.css"), path.join(root, "assets", "style.css"));
  return root;
}

const olderMarkdown = "---\ndate: 2026-10-26\ntitle: 较早的一篇 <script>\nsummary: 占位摘要\nsample: true\n---\n\n## 财经\n\n- **【占位】** 旧\n";
const newerMarkdown = "---\ndate: 2026-12-01\ntitle: 较新的一篇\nsummary: 应该排在最前\n---\n\n正文\n";

test("publishing appends history and never drops or overwrites older digests", () => {
  const root = fixtureRoot();
  fs.writeFileSync(path.join(root, "content", "2026-10-26.md"), olderMarkdown);
  fs.writeFileSync(path.join(root, "content", "2026-12-01.md"), newerMarkdown);

  const listed = build(root).map((digest) => digest.date);
  assert.deepEqual(listed, ["2026-12-01", "2026-10-26"]);
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const newer = index.indexOf('href="2026/12/01/"');
  const older = index.indexOf('href="2026/10/26/"');
  assert.ok(newer !== -1 && older !== -1 && newer < older);
  assert.match(index, /id="digest-list"/);
  assert.match(index, /按月浏览/);
  assert.ok(index.indexOf("2026年12月") < index.indexOf("2026年10月"));
  assert.match(index, /href="archive\/"/);
  const archive = fs.readFileSync(path.join(root, "archive", "index.html"), "utf8");
  assert.ok(archive.indexOf('href="../2026/12/01/"') < archive.indexOf('href="../2026/10/26/"'));
  const sample = fs.readFileSync(path.join(root, "2026/10/26/index.html"), "utf8");
  const december = fs.readFileSync(path.join(root, "2026/12/01/index.html"), "utf8");
  assert.match(sample, /示例 \/ 占位/);
  assert.match(sample, /&lt;script&gt;/);
  assert.doesNotMatch(sample, /<script/);
  assert.match(sample, /href="\.\.\/\.\.\/\.\.\/assets\/style\.css"/);

  fs.unlinkSync(path.join(root, "content", "2026-10-26.md"));
  build(root);
  assert.equal(fs.readFileSync(path.join(root, "2026/10/26/index.html"), "utf8"), sample);
  assert.equal(fs.readFileSync(path.join(root, "2026/12/01/index.html"), "utf8"), december);
  const kept = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(kept, /2026\/10\/26\//);
  assert.match(kept, /2026\/12\/01\//);
  assert.ok(kept.indexOf('href="2026/12/01/"') < kept.indexOf('href="2026/10/26/"'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "archive.json"), "utf8"));
  assert.deepEqual(
    manifest.digests.map((entry) => entry.date),
    ["2026-10-26", "2026-12-01"],
  );

  fs.writeFileSync(path.join(root, "content", "2026-10-26.md"), olderMarkdown.replace("占位摘要", "被改写的摘要"));
  const indexBeforeRefusal = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const manifestBeforeRefusal = fs.readFileSync(path.join(root, "archive.json"), "utf8");
  assert.throws(() => build(root), /拒绝覆盖已发布的 2026-10-26/);
  assert.equal(fs.readFileSync(path.join(root, "2026/10/26/index.html"), "utf8"), sample);
  assert.equal(fs.readFileSync(path.join(root, "index.html"), "utf8"), indexBeforeRefusal);
  assert.equal(fs.readFileSync(path.join(root, "archive.json"), "utf8"), manifestBeforeRefusal);

  fs.writeFileSync(path.join(root, "content", "2026-10-26.md"), olderMarkdown);
  fs.writeFileSync(
    path.join(root, "content", "2026-12-02.md"),
    "---\ndate: 2026-12-02\ntitle: 最新的一篇\nsummary: 追加在最前\n---\n\n新的一天\n",
  );
  build(root);
  assert.equal(fs.readFileSync(path.join(root, "2026/10/26/index.html"), "utf8"), sample);
  assert.equal(fs.readFileSync(path.join(root, "2026/12/01/index.html"), "utf8"), december);
  const appended = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const first = appended.indexOf('href="2026/12/02/"');
  const second = appended.indexOf('href="2026/12/01/"');
  const third = appended.indexOf('href="2026/10/26/"');
  assert.ok(first !== -1 && first < second && second < third);
});

test("published site contains the sample digest, CNAME, and no analytics", () => {
  const samplePage = path.join(repoRoot, "2026/10/26/index.html");
  const before = fs.readFileSync(samplePage);
  const digests = build(repoRoot);
  assert.deepEqual(
    digests.map((digest) => digest.date),
    ["2026-10-26"],
  );
  assert.deepEqual(fs.readFileSync(samplePage), before);
  build(repoRoot);
  assert.deepEqual(fs.readFileSync(samplePage), before);
  const cname = fs.readFileSync(path.join(repoRoot, "CNAME"), "utf8").trim();
  assert.equal(cname, "news.chaoshen.io");
  assert.equal(fs.existsSync(path.join(repoRoot, ".nojekyll")), true);
  const index = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
  const page = fs.readFileSync(path.join(repoRoot, "2026/10/26/index.html"), "utf8");
  assert.match(index, /财经科技日报/);
  assert.match(index, /href="2026\/10\/26\/"/);
  assert.match(index, /示例 \/ 占位/);
  assert.match(page, /不是真实新闻/);
  assert.match(page, /<h2>财经<\/h2>/);
  assert.match(page, /<h2>科技<\/h2>/);
  assert.match(page, /【占位】/);
  const published = [index, page, fs.readFileSync(path.join(repoRoot, "404.html"), "utf8")].join("\n");
  assert.doesNotMatch(published, /gtag|google-analytics|googletagmanager/i);
});
