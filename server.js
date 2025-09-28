const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises');

const DATA_PATH = path.join(__dirname, 'data', 'site.json');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';
const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

async function ensureDataFile() {
  try {
    await fs.access(DATA_PATH);
  } catch (error) {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify({}), 'utf8');
  }
}

async function readData() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch (error) {
    console.error('Failed to parse data file', error);
    throw new Error('Invalid site data file.');
  }
}

async function writeData(data) {
  await ensureDataFile();
  const formatted = JSON.stringify(data, null, 2);
  await fs.writeFile(DATA_PATH, formatted, 'utf8');
}

function deepMerge(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    return source.slice();
  }
  if (isObject(target) && isObject(source)) {
    const merged = { ...target };
    Object.keys(source).forEach((key) => {
      merged[key] = key in target ? deepMerge(target[key], source[key]) : source[key];
    });
    return merged;
  }
  return source;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.headers['authorization'];
  if (!token || token.replace('Bearer ', '') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

app.get('/api/site', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/site', requireAuth, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Body must be a JSON object.' });
    }
    await writeData(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/site', requireAuth, async (req, res) => {
  try {
    const current = await readData();
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Body must be a JSON object.' });
    }
    const merged = deepMerge(current, updates);
    await writeData(merged);
    res.json({ success: true, data: merged });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/pages/:slug', async (req, res) => {
  try {
    const data = await readData();
    const slug = req.params.slug;
    const page = (data.pages || []).find((entry) => entry.slug === slug);
    if (!page) {
      return res.status(404).sendFile(path.join(__dirname, '404.html'));
    }
    const html = renderCustomPage(page, data);
    res.send(html);
  } catch (error) {
    res.status(500).send('An error occurred while rendering the page.');
  }
});

app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function renderCustomPage(page, data) {
  const site = data.site || {};
  const design = data.design || {};
  const brand = site.brand || {};
  const navItems = buildNavigation(site.navigation, data.pages);
  const fontHeading = (design.fonts && design.fonts.heading) || "'Playfair Display', serif";
  const fontBody = (design.fonts && design.fonts.body) || "'Work Sans', sans-serif";

  const hero = page.hero || {};
  const sections = (page.sections || []).map(renderSection).join('\n');
  const customCss = design.customCss ? `<style>${design.customCss}</style>` : '';
  const title = `${page.title || site.name || 'Page'} | ${site.name || ''}`.trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(hero.description || site.meta?.description || '')}" />
  <link rel="stylesheet" href="/styles/main.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ${customCss}
  <style>
    body { font-family: ${fontBody}; }
    h1, h2, h3, h4 { font-family: ${fontHeading}; }
    .page-hero { padding: 6rem 0 3rem; background: var(--gradient-hero); }
    .page-hero__eyebrow { text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.85rem; color: var(--color-muted); }
    .page-content { padding: 3rem 0; }
    .page-section + .page-section { margin-top: 3rem; }
    .page-section ul { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container header-grid">
      <a class="brand" href="/" aria-label="${escapeHtml(site.name || 'Home')} home">
        <span class="brand__logo">${escapeHtml(brand.logoText || site.name || 'Home')}</span>
      </a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="primary-navigation">
        <span class="sr-only">Toggle navigation</span>
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav id="primary-navigation" class="site-nav" aria-label="Primary">
        <ul>
          ${navItems}
          ${site.cta ? `<li><a class="cta" href="${escapeAttribute(site.cta.href)}">${escapeHtml(site.cta.label)}</a></li>` : ''}
        </ul>
      </nav>
    </div>
  </header>
  <main>
    ${renderHeroSection(hero)}
    <section class="page-content">
      <div class="container">
        ${sections || '<p>Content coming soon.</p>'}
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <a class="brand" href="/">${escapeHtml(brand.logoText || site.name || '')}</a>
        <p>${escapeHtml(site.footer?.description || '')}</p>
      </div>
      <nav aria-label="Footer">
        <ul>
          ${(site.footer?.links || []).map((link) => `<li><a href="${escapeAttribute(link.href)}">${escapeHtml(link.label)}</a></li>`).join('')}
        </ul>
      </nav>
      <p class="footer__legal">&copy; <span id="year"></span> ${escapeHtml(site.name || '')}. All rights reserved.</p>
    </div>
  </footer>
  <script src="/scripts/main.js" defer></script>
  <script src="/scripts/content.js" defer></script>
</body>
</html>`;
}

function renderHeroSection(hero = {}) {
  if (!hero || Object.keys(hero).length === 0) {
    return '';
  }
  return `<section class="page-hero">
    <div class="container">
      ${hero.eyebrow ? `<p class="page-hero__eyebrow">${escapeHtml(hero.eyebrow)}</p>` : ''}
      ${hero.title ? `<h1>${escapeHtml(hero.title)}</h1>` : ''}
      ${hero.description ? `<p>${hero.description}</p>` : ''}
    </div>
  </section>`;
}

function renderSection(section) {
  if (section.html) {
    return section.html;
  }
  if (section.type === 'list') {
    const items = (section.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    return `<section class="page-section">
      ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
      <ul>${items}</ul>
    </section>`;
  }
  const body = section.body ? section.body : '';
  return `<section class="page-section">
    ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''}
    ${body}
  </section>`;
}

function buildNavigation(navigation = [], pages = []) {
  const pageLinks = pages.filter((page) => page && page.slug && page.title).map((page) => ({
    label: page.title,
    href: `/pages/${page.slug}`
  }));
  return [...navigation, ...pageLinks]
    .map((item) => `<li><a href="${escapeAttribute(item.href)}">${escapeHtml(item.label)}</a></li>`)
    .join('');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Vida Beauty Brow server running on port ${PORT}`);
});
