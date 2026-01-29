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
  const hero = heroBlock(fm);

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
            <h1 class="article-title title-gradient">${escapeHtml(fm.title)}</h1>
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
    extraCss: techCss(),
    extraScript: tocScript()
  });
}

export function articlesIndexHtml({ items }) {
  return items.map(p => `
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

function heroBlock(fm) {
  const type = fm.heroStyle || 'ai';
  const cls = {
    'ai': 'hero-bg hero-ai',
    'testing': 'hero-bg hero-testing',
    'clawdbot-hero': 'hero-bg hero-claw'
  }[type] || 'hero-bg hero-ai';

  const icon = {
    'ai': '<i class="fas fa-robot"></i>',
    'testing': '<i class="fas fa-vial"></i>',
    'clawdbot-hero': '<i class="fas fa-network-wired"></i>'
  }[type] || '<i class="fas fa-robot"></i>';

  return `
    <div class="${cls}">
      <div class="hero-glow"></div>
      <div class="hero-inner">
        <div class="hero-badge">${icon}<span>${escapeHtml(fm.category || '文章')}</span></div>
        <div class="hero-lines"></div>
      </div>
    </div>
  `;
}

function tocScript() {
  return `
    const tocList = document.getElementById('toc-list');
    const headings = Array.from(document.querySelectorAll('.article-content h2, .article-content h3'));

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

    // 目录高亮跟随滚动（IntersectionObserver）
    const tocLinks = Array.from(document.querySelectorAll('.toc-nav a'));
    const map = new Map(headings.map((h, i) => [h.id, tocLinks[i]]));
    const setActive = (id) => {
      tocLinks.forEach(l => l.classList.remove('active'));
      const link = map.get(id);
      if (link) link.classList.add('active');
    };

    const io = new IntersectionObserver((entries) => {
      // pick the entry closest to top and intersecting
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-20% 0px -75% 0px', threshold: [0, 1] });

    headings.filter(h => h.tagName.toLowerCase() === 'h2').forEach(h => io.observe(h));

    // initial active
    const first = headings.find(h => h.tagName.toLowerCase() === 'h2');
    if (first) setActive(first.id);

    // 代码块：行号 + 复制按钮
    document.querySelectorAll('pre > code').forEach((code) => {
      const pre = code.parentElement;
      if (!pre) return;

      // inject line wrappers for better visual rhythm
      const raw = code.innerText.replace(/\n$/, '');
      const esc = (s) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
      const html = raw.split('\\n').map(line => '<span class="line">' + esc(line) + '</span>').join('');
      code.innerHTML = html;

      const wrapper = document.createElement('div');
      wrapper.className = 'codeblock';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.type = 'button';
      btn.textContent = '复制';
      wrapper.appendChild(btn);

      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(raw);
          btn.textContent = '已复制';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 1200);
        } catch (e) {
          btn.textContent = '失败';
          setTimeout(() => { btn.textContent = '复制'; }, 1200);
        }
      });
    });
  `;
}

function baseInlineCss() {
  return `/* keep minimal here */`;
}

function techCss() {
  return `
    /* 更科技的 hero */
    .hero-bg {
      position: relative;
      min-height: 260px;
      border-radius: 14px;
      overflow: hidden;
      margin: 0 auto 2.4rem;
      border: 1px solid rgba(0, 212, 255, 0.22);
      background: radial-gradient(1200px 400px at 20% 10%, rgba(0, 212, 255, 0.20), transparent 60%),
                  radial-gradient(900px 380px at 80% 60%, rgba(124, 58, 237, 0.18), transparent 55%),
                  rgba(255, 255, 255, 0.04);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
    }
    .hero-glow {
      position: absolute;
      inset: -40px;
      background: conic-gradient(from 180deg, rgba(0,212,255,0.28), rgba(124,58,237,0.24), rgba(0,212,255,0.28));
      filter: blur(40px);
      opacity: 0.65;
    }
    .hero-inner {
      position: relative;
      height: 100%;
      padding: 1.4rem;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.55rem 0.9rem;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(0, 212, 255, 0.28);
      color: #eafcff;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .hero-badge i { color: #00d4ff; }
    .hero-lines {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(transparent 95%, rgba(0,212,255,0.10) 96%),
        repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 18px);
      mask-image: radial-gradient(500px 260px at 25% 30%, black 35%, transparent 70%);
      opacity: 0.9;
      pointer-events: none;
    }

    .hero-ai { border-color: rgba(0,212,255,0.22); }
    .hero-testing { border-color: rgba(240,147,251,0.22); }
    .hero-claw { border-color: rgba(79,172,254,0.24); }

    /* 标题渐变描边 */
    .title-gradient {
      display: inline-block;
      background: linear-gradient(90deg, #00d4ff 0%, #7c3aed 45%, #00f2fe 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 0 22px rgba(0, 212, 255, 0.16);
      -webkit-text-stroke: 1px rgba(0, 0, 0, 0.35);
    }

    /* 参考链接更像卡片（沿用 .references） */
    .references a { word-break: break-all; }
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
