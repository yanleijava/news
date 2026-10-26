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

test("build lists digests newest first and drops removed days", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "digest-"));
  fs.mkdirSync(path.join(root, "content"));
  fs.mkdirSync(path.join(root, "assets"));
  fs.copyFileSync(path.join(repoRoot, "assets", "style.css"), path.join(root, "assets", "style.css"));
  fs.writeFileSync(
    path.join(root, "content", "2026-10-26.md"),
    "---\ndate: 2026-10-26\ntitle: 较早的一篇 <script>\nsummary: 占位摘要\nsample: true\n---\n\n## 财经\n\n- **【占位】** 旧\n",
  );
  fs.writeFileSync(
    path.join(root, "content", "2026-12-01.md"),
    "---\ndate: 2026-12-01\ntitle: 较新的一篇\nsummary: 应该排在最前\n---\n\n正文\n",
  );

  build(root);
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const newer = index.indexOf('href="2026/12/01/"');
  const older = index.indexOf('href="2026/10/26/"');
  assert.ok(newer !== -1 && older !== -1 && newer < older);
  assert.match(index, /id="digest-list"/);
  const sample = fs.readFileSync(path.join(root, "2026/10/26/index.html"), "utf8");
  assert.match(sample, /示例 \/ 占位/);
  assert.match(sample, /&lt;script&gt;/);
  assert.doesNotMatch(sample, /<script/);
  assert.match(sample, /href="\.\.\/\.\.\/\.\.\/assets\/style\.css"/);

  fs.unlinkSync(path.join(root, "content", "2026-10-26.md"));
  build(root);
  assert.equal(fs.existsSync(path.join(root, "2026/10/26/index.html")), false);
  assert.equal(fs.existsSync(path.join(root, "2026/12/01/index.html")), true);
  const rebuilt = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(rebuilt, /2026\/10\/26\//);
  assert.match(rebuilt, /2026\/12\/01\//);
});

test("published site contains the sample digest, CNAME, and no analytics", () => {
  const digests = build(repoRoot);
  assert.deepEqual(
    digests.map((digest) => digest.date),
    ["2026-10-26"],
  );
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
