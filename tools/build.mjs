#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { articleHtml, homepageCardsHtml, articlesIndexHtml } from './templates.mjs';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content', 'posts');
const OUT_ARTICLES_DIR = path.join(ROOT, 'articles');

const args = process.argv.slice(2);
const WATCH = args.includes('--watch');

function readPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(CONTENT_DIR, f));

  const posts = files.map(fp => {
    const raw = fs.readFileSync(fp, 'utf-8');
    const { data, content } = matter(raw);
    const slug = data.slug || slugFromFilename(fp);
    const href = `${slug}.html`;
    const date = data.date || '';
    return {
      fm: { ...data, slug, date },
      md: content,
      href,
      source: fp
    };
  });

  posts.sort((a, b) => (b.fm.date || '').localeCompare(a.fm.date || ''));
  return posts;
}

function slugFromFilename(fp) {
  const base = path.basename(fp, '.md');
  // allow YYYY-MM-DD-title
  const m = base.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  return (m ? m[1] : base)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

function ensureDirs() {
  fs.mkdirSync(OUT_ARTICLES_DIR, { recursive: true });
}

function buildOnce() {
  ensureDirs();
  const posts = readPosts();

  // build articles html
  posts.forEach((p, idx) => {
    const prev = posts[idx + 1] ? toNav(posts[idx + 1]) : null;
    const next = posts[idx - 1] ? toNav(posts[idx - 1]) : null;

    // remove duplicated references from markdown (we render references as a card)
    const mdWithoutRefs = stripReferencesSection(p.md);

    const htmlBody = marked.parse(mdWithoutRefs);

    // transform a markdown "参考链接/参考文献" into references card
    const referencesHtml = buildReferencesFromMarkdown(p.md);

    const full = articleHtml({
      fm: { ...p.fm, referencesHtml },
      html: htmlBody,
      prev,
      next
    });
    fs.writeFileSync(path.join(OUT_ARTICLES_DIR, `${p.fm.slug}.html`), full, 'utf-8');
  });

  // update homepage latest articles section (replace inner HTML of .articles-grid)
  const homepagePath = path.join(ROOT, 'index.html');
  if (fs.existsSync(homepagePath)) {
    const homepage = fs.readFileSync(homepagePath, 'utf-8');
    const latest = posts.slice(0, 3).map(p => ({
      href: `articles/${p.fm.slug}.html`,
      title: p.fm.title,
      description: p.fm.description || '',
      date: p.fm.date || '',
      readTime: p.fm.readTime || '',
      category: p.fm.category || '文章',
      heroClass: heroClassFromCategory(p.fm.category)
    }));

    const cardsHtml = homepageCardsHtml({ items: latest });
    const updated = replaceBetween(homepage, '<!-- AUTO:ARTICLES_GRID_START -->', '<!-- AUTO:ARTICLES_GRID_END -->', `\n${cardsHtml}\n`);
    fs.writeFileSync(homepagePath, updated, 'utf-8');
  }

  // update articles/index.html list
  const articlesIndexPath = path.join(ROOT, 'articles', 'index.html');
  if (fs.existsSync(articlesIndexPath)) {
    const idxHtml = fs.readFileSync(articlesIndexPath, 'utf-8');
    const items = posts.map(p => ({
      href: `${p.fm.slug}.html`,
      title: p.fm.title,
      description: p.fm.description || '',
      date: p.fm.date || '',
      category: p.fm.category || '文章'
    }));
    const listHtml = articlesIndexHtml({ items });
    const updated = replaceBetween(idxHtml, '<!-- AUTO:ARTICLES_LIST_START -->', '<!-- AUTO:ARTICLES_LIST_END -->', `\n${listHtml}\n`);
    fs.writeFileSync(articlesIndexPath, updated, 'utf-8');
  }

  console.log(`[build] posts=${posts.length} done`);
}

function toNav(p) {
  return { href: `${p.fm.slug}.html`, title: p.fm.title };
}

function replaceBetween(src, startMark, endMark, replacement) {
  const a = src.indexOf(startMark);
  const b = src.indexOf(endMark);
  if (a === -1 || b === -1 || b < a) return src;
  const head = src.slice(0, a + startMark.length);
  const tail = src.slice(b);
  return head + replacement + tail;
}

function heroClassFromCategory(cat) {
  if (!cat) return 'ai-bg';
  if (cat.includes('AI')) return 'ai-bg';
  if (cat.includes('自动化')) return 'automation-bg';
  if (cat.includes('性能')) return 'performance-bg';
  if (cat.includes('安全')) return 'security-bg';
  if (cat.includes('API')) return 'api-bg';
  if (cat.includes('测试设计')) return 'testing-bg';
  return 'ai-bg';
}

function buildReferencesFromMarkdown(md) {
  // If user includes a section "## 参考链接" or "## 参考文献" with bare links,
  // we wrap it into a references card. Keep it simple: detect the heading and extract following bullet list.
  const lines = md.split(/\r?\n/);
  const idx = lines.findIndex(l => /^##\s+(参考链接|参考文献)\s*$/.test(l.trim()));
  if (idx === -1) return '';
  const items = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) break;
    const m = line.match(/^-\s+(.+)$/);
    if (m) items.push(m[1]);
  }
  if (!items.length) return '';
  const lis = items.map(it => {
    const urlm = it.match(/<([^>]+)>/);
    if (urlm) {
      const url = urlm[1];
      const text = it.replace(urlm[0], '').trim().replace(/[:：]?\s*$/, '') || url;
      return `<li>${escapeHtml(text)}： <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a></li>`;
    }
    return `<li>${escapeHtml(it)}</li>`;
  }).join('');

  return `
    <h2 id="references">参考链接</h2>
    <div class="references">
      <ul>${lis}</ul>
    </div>
  `;
}

function stripReferencesSection(md) {
  const lines = md.split(/\r?\n/);
  const idx = lines.findIndex(l => /^##\s+(参考链接|参考文献)\s*$/.test(l.trim()));
  if (idx === -1) return md;

  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === idx) {
      // skip until next H2 (## ...)
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('## ')) i++;
      i--;
      continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n').trim() + '\n';
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function watch() {
  console.log('[watch] watching content/posts ...');
  buildOnce();
  fs.watch(CONTENT_DIR, { recursive: true }, (_e, filename) => {
    if (!filename || !filename.endsWith('.md')) return;
    try { buildOnce(); } catch (e) { console.error(e); }
  });
}

if (WATCH) watch();
else buildOnce();
