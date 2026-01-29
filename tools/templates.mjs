export function layoutHtml({ title, content, extraHead = "", extraCss = "", extraScript = "" }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - 壹零壹玖</title>
  <link rel="stylesheet" href="../styles.css" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
  <link rel="stylesheet" href="article-common.css" />
  ${extraHead}
  <style>
  ${baseInlineCss()}
  ${extraCss}
  </style>
  <script>
    var _hmt = _hmt || [];
    (function () {
      var hm = document.createElement("script");
      hm.src = "https://hm.baidu.com/hm.js?013df7fb2265b625683fcd8b2d7ac17b";
      var s = document.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(hm, s);
    })();
  </script>
</head>
<body>
  <div class="container">
    <nav class="navbar">
      <div class="container">
        <div class="nav-brand"><i class="fas fa-bug"></i><span>壹零壹玖</span></div>
        <ul class="nav-menu">
          <li><a href="../index.html#home" class="nav-link">首页</a></li>
          <li><a href="../index.html#articles" class="nav-link">文章</a></li>
          <li><a href="../index.html#about" class="nav-link">关于</a></li>
          <li><a href="../index.html#contact" class="nav-link">联系</a></li>
        </ul>
        <div class="hamburger"><span class="bar"></span><span class="bar"></span><span class="bar"></span></div>
      </div>
    </nav>

    ${content}
  </div>

  <script>
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
      });
      document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      }));
    }
    ${extraScript}
  </script>
</body>
</html>`;
}

export function articleHtml({ fm, html, prev, next }) {
  const hero = fm.heroStyle === 'clawdbot-hero'
    ? `<div class="image-placeholder clawdbot-hero-bg" style="min-height: 280px; margin: 0 auto 2.2rem;"></div>`
    : '';

  const nav = `
  <div class="article-navigation">
    ${prev ? `<a class="nav-link" href="${prev.href}">← 上一篇：${escapeHtml(prev.title)}</a>` : `<span></span>`}
    ${next ? `<a class="nav-link" href="${next.href}">下一篇：${escapeHtml(next.title)} →</a>` : `<span></span>`}
  </div>`;

  const content = `
  <section class="article-page">
    <div class="container">
      <div class="article-layout">
        <aside class="article-toc">
          <div class="toc-header"><h3>目录</h3></div>
          <nav class="toc-nav"><ul id="toc-list"></ul></nav>
        </aside>

        <main class="article-main">
          <header class="article-header">
            <h1 class="article-title">${escapeHtml(fm.title)}</h1>
            <div class="article-meta">
              <span class="article-category">${escapeHtml(fm.category || '文章')}</span>
              <span class="article-date">${escapeHtml(fm.date || '')}</span>
              ${fm.readTime ? `<span class="article-date">${escapeHtml(fm.readTime)}</span>` : ''}
            </div>
            ${fm.description ? `<p class="article-excerpt">${escapeHtml(fm.description)}</p>` : ''}
          </header>

          <article class="article-content">
            ${hero}
            ${html}

            ${fm.referencesHtml ? fm.referencesHtml : ''}
          </article>

          ${nav}
        </main>
      </div>
    </div>
  </section>

  <a href="index.html" class="back-to-articles"><i class="fas fa-arrow-left"></i> 返回目录</a>
  `;

  return layoutHtml({
    title: fm.title,
    content,
    extraCss: heroCss(),
    extraScript: tocScript()
  });
}

export function articlesIndexHtml({ items }) {
  const cards = items.map(p => `
    <article class="article-item" data-category="${escapeHtml(p.category || '文章')}">
      <div class="article-meta">
        <div class="article-category">${escapeHtml(p.category || '文章')}</div>
        <div class="article-date">${escapeHtml(p.date || '')}</div>
      </div>
      <div class="article-content">
        <h3 class="article-title">${escapeHtml(p.title)}</h3>
        <p class="article-excerpt">${escapeHtml(p.description || '')}</p>
        <a href="${escapeHtml(p.href)}" class="article-read-more">阅读全文 →</a>
      </div>
    </article>`).join('\n');

  // 用现有的 articles/index.html 外壳更安全：这里输出 body 内核心列表，build 脚本会把它注入。
  return cards;
}

export function homepageCardsHtml({ items }) {
  return items.map(p => `
    <article class="article-card">
      <a href="${escapeHtml(p.href)}" class="article-link">
        <div class="article-image">
          <div class="image-placeholder ${escapeHtml(p.heroClass || 'ai-bg')}"></div>
          <div class="article-category">${escapeHtml(p.category || '文章')}</div>
        </div>
        <div class="article-content">
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description || '')}</p>
          <div class="article-meta">
            <span class="date">${escapeHtml(p.date || '')}</span>
            <span class="read-time">${escapeHtml(p.readTime || '')}</span>
          </div>
        </div>
      </a>
    </article>`).join('\n');
}

function tocScript() {
  return `
    const tocList = document.getElementById('toc-list');
    const headings = document.querySelectorAll('.article-content h2, .article-content h3');
    headings.forEach((h, i) => {
      if (!h.id) h.id = 'section-' + i;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      a.className = (h.tagName.toLowerCase() === 'h3') ? 'toc-h3' : '';
      li.appendChild(a);
      tocList.appendChild(li);
    });
  `;
}

function baseInlineCss() {
  return `/* keep minimal here */`;
}

function heroCss() {
  return `
    .clawdbot-hero-bg {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      border-radius: 12px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    .clawdbot-hero-bg::before {
      content: '';
      position: absolute;
      inset: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/></pattern></defs><rect width="120" height="120" fill="url(%23grid)"/><path d="M20 78 C40 40, 70 110, 100 60" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/></svg>');
      opacity: 0.9;
    }
  `;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
