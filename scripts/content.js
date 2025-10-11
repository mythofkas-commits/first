(function () {
  const STATE = {
    data: null,
    fetched: false,
  };

  async function loadSiteContent() {
    try {
      const response = await fetch('/api/site', { headers: { 'Accept': 'application/json' } });
      if (!response.ok) {
        throw new Error(`Failed to fetch site content: ${response.status}`);
      }
      const data = await response.json();
      STATE.data = data;
      STATE.fetched = true;
      window.__SITE_CONTENT__ = data;
      applySiteData(data);
      document.dispatchEvent(new CustomEvent('site:content-loaded', { detail: data }));
    } catch (error) {
      console.warn('[content] Unable to load site content.', error);
    }
  }

  function applySiteData(data) {
    if (!data || typeof data !== 'object') return;
    applyMetadata(data);
    applyDesign(data.design);
    applyBranding(data.site);
    applyNavigation(data.site, data.pages);
    applyFooter(data.site);
    applyHomepage(data.homepage, data.site);
    applyOrderPage(data.orderPage, data.site);
  }

  function applyMetadata(data = {}) {
    const site = data.site || {};
    const homepage = data.homepage || {};
    const orderPage = data.orderPage || {};

    const isOrderPage = document.body?.classList.contains('order-page');
    const baseTitle = site.name || document.title;
    if (isOrderPage && orderPage.hero?.title && site.name) {
      document.title = `${orderPage.hero.title} | ${site.name}`;
    } else if (!isOrderPage && homepage.hero?.title && site.name) {
      document.title = `${homepage.hero.title} | ${site.name}`;
    } else if (site.name) {
      document.title = `${site.name}${site.tagline ? ` | ${site.tagline}` : ''}`;
    } else if (baseTitle) {
      document.title = baseTitle;
    }

    const descriptionSource = isOrderPage
      ? orderPage.meta?.description || orderPage.hero?.description || site.meta?.description
      : homepage.hero?.description || site.meta?.description;
    const description = descriptionSource ? stripHtml(descriptionSource) : '';
    const keywords = site.meta?.keywords;
    const canonical = isOrderPage ? orderPage.meta?.canonicalUrl : site.meta?.canonicalUrl;

    setMeta('description', description);
    setMeta('keywords', keywords);
    setMeta('canonical', canonical, true);
  }

  function setMeta(name, value, isLink = false) {
    if (!value) return;
    if (isLink) {
      const node = document.querySelector(`link[data-meta="${name}"]`);
      if (node) {
        node.setAttribute('href', value);
      }
      return;
    }
    const meta = document.querySelector(`meta[data-meta="${name}"]`);
    if (meta) {
      meta.setAttribute('content', value);
    }
  }

  function applyDesign(design = {}) {
    const root = document.documentElement;
    if (!root) return;
    const { colors = {}, shadows = {}, radii = {}, gradients = {}, fonts = {}, customCss } = design;

    Object.entries(colors).forEach(([key, value]) => {
      if (value) {
        const varName = `--color-${toKebab(key)}`;
        root.style.setProperty(varName, value);
      }
    });

    Object.entries(shadows).forEach(([key, value]) => {
      if (value) {
        const varName = `--shadow-${toKebab(key)}`;
        root.style.setProperty(varName, value);
      }
    });

    if (radii.base) {
      root.style.setProperty('--radius', radii.base);
    }

    if (gradients.hero) {
      root.style.setProperty('--gradient-hero', gradients.hero);
    }
    if (gradients.card) {
      root.style.setProperty('--gradient-card', gradients.card);
    }

    if (fonts.heading) {
      root.style.setProperty('--font-serif', fonts.heading);
    }
    if (fonts.body) {
      root.style.setProperty('--font-sans', fonts.body);
    }

    let customStyle = document.getElementById('site-custom-css');
    if (!customStyle) {
      customStyle = document.createElement('style');
      customStyle.id = 'site-custom-css';
      document.head.appendChild(customStyle);
    }
    customStyle.textContent = customCss || '';
  }

  function applyBranding(site = {}) {
    const logoText = site.brand?.logoText || site.name;
    setContent('brand.logo', logoText);
  }

  function applyNavigation(site = {}, pages = []) {
    const navLists = document.querySelectorAll('[data-navigation]');
    if (!navLists.length) return;
    const baseNav = Array.isArray(site.navigation) ? site.navigation : [];
    const pageLinks = (pages || [])
      .filter((page) => page && page.slug && page.title)
      .map((page) => ({ label: page.title, href: `/pages/${page.slug}` }));
    const items = [...baseNav, ...pageLinks];
    const cta = site.cta;

    navLists.forEach((list) => {
      list.innerHTML = '';
      items.forEach((item) => {
        const li = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.href = item.href || '#';
        anchor.textContent = item.label || '';
        li.appendChild(anchor);
        list.appendChild(li);
      });
      if (cta && cta.label && cta.href) {
        const li = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.className = 'cta';
        anchor.href = cta.href;
        anchor.textContent = cta.label;
        li.appendChild(anchor);
        list.appendChild(li);
      }
    });
  }

  function applyFooter(site = {}) {
    setContent('footer.description', site.footer?.description);
    const footerLists = document.querySelectorAll('[data-footer-navigation]');
    const links = Array.isArray(site.footer?.links) ? site.footer.links : [];
    footerLists.forEach((list) => {
      list.innerHTML = '';
      links.forEach((link) => {
        const li = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.href = link.href || '#';
        anchor.textContent = link.label || '';
        li.appendChild(anchor);
        list.appendChild(li);
      });
    });
  }

  function applyHomepage(homepage = {}, site = {}) {
    if (!homepage || !document.body || !document.querySelector('.hero')) return;
    const hero = homepage.hero || {};
    setContent('hero.eyebrow', hero.eyebrow);
    setContent('hero.title', hero.title);
    setContent('hero.description', hero.description, { html: true });
    setContent('hero.rating.score', hero.rating?.score);
    setContent('hero.rating.details', hero.rating?.details);
    setCta('hero.primary', hero.primaryCta);
    setCta('hero.secondary', hero.secondaryCta);
    setImage('hero.image', hero.image);

    renderBadgeGrid(homepage.badges);
    renderServices(homepage.services);
    renderExperience(homepage.experience);
    renderResults(homepage.results);
    renderReviews(homepage.reviews);
    renderCtaBanner(homepage.ctaBanner);
    renderContact(homepage.contact, site);
  }

  function renderBadgeGrid(items = []) {
    const containers = document.querySelectorAll('[data-list="badges"]');
    containers.forEach((container) => {
      container.innerHTML = '';
      items.forEach((item) => {
        const article = document.createElement('article');
        article.innerHTML = `
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.description)}</p>
        `;
        container.appendChild(article);
      });
    });
  }

  function renderServices(services = {}) {
    if (!services) return;
    setContent('services.eyebrow', services.eyebrow);
    setContent('services.title', services.title);
    setContent('services.description', services.description);
    const cards = Array.isArray(services.cards) ? services.cards : [];
    const containers = document.querySelectorAll('[data-list="services.cards"]');
    containers.forEach((container) => {
      container.innerHTML = '';
      cards.forEach((card) => {
        const article = document.createElement('article');
        article.className = 'service-card';
        const listItems = Array.isArray(card.items)
          ? card.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
          : '';
        const ctaMarkup = card.cta && card.cta.label && card.cta.href
          ? `<a class="text-link" href="${escapeAttribute(card.cta.href)}">${escapeHtml(card.cta.label)}</a>`
          : '';
        article.innerHTML = `
          <h3>${escapeHtml(card.title)}</h3>
          <p>${escapeHtml(card.description)}</p>
          ${listItems ? `<ul>${listItems}</ul>` : ''}
          ${ctaMarkup}
        `;
        container.appendChild(article);
      });
    });
  }

  function renderExperience(experience = {}) {
    if (!experience) return;
    setContent('experience.eyebrow', experience.eyebrow);
    setContent('experience.title', experience.title);
    const highlightContainers = document.querySelectorAll('[data-list="experience.highlights"]');
    highlightContainers.forEach((container) => {
      container.innerHTML = '';
      (experience.highlights || []).forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.description)}`;
        container.appendChild(li);
      });
    });
    setCta('experience.cta', experience.cta);
    setImage('experience.image', experience.image);
  }

  function renderResults(results = {}) {
    if (!results) return;
    setContent('results.eyebrow', results.eyebrow);
    setContent('results.title', results.title);
    setContent('results.description', results.description);
    const containers = document.querySelectorAll('[data-list="results.gallery"]');
    containers.forEach((container) => {
      container.innerHTML = '';
      (results.gallery || []).forEach((item) => {
        const figure = document.createElement('figure');
        const img = document.createElement('img');
        img.src = item.image || '';
        img.alt = item.alt || '';
        const caption = document.createElement('figcaption');
        caption.textContent = item.caption || '';
        figure.appendChild(img);
        figure.appendChild(caption);
        container.appendChild(figure);
      });
    });
  }

  function renderReviews(reviews = {}) {
    if (!reviews) return;
    setContent('reviews.eyebrow', reviews.eyebrow);
    setContent('reviews.title', reviews.title);
    const containers = document.querySelectorAll('[data-list="reviews.testimonials"]');
    containers.forEach((container) => {
      container.innerHTML = '';
      (reviews.testimonials || []).forEach((item) => {
        const blockquote = document.createElement('blockquote');
        const quote = document.createElement('p');
        quote.textContent = `“${item.quote || ''}”`;
        const cite = document.createElement('cite');
        cite.textContent = item.author ? `— ${item.author}` : '';
        blockquote.appendChild(quote);
        blockquote.appendChild(cite);
        container.appendChild(blockquote);
      });
    });
  }

  function renderCtaBanner(ctaBanner = {}) {
    if (!ctaBanner) return;
    setContent('ctaBanner.title', ctaBanner.title);
    setContent('ctaBanner.description', ctaBanner.description);
    setCta('ctaBanner.cta', ctaBanner.cta);
  }

  function renderContact(contact = {}, site = {}) {
    if (!contact) return;
    setContent('contact.eyebrow', contact.eyebrow);
    setContent('contact.title', contact.title);
    setContent('contact.description', contact.description);
    const detailContainers = document.querySelectorAll('[data-list="contact.details"]');
    detailContainers.forEach((container) => {
      container.innerHTML = '';
      (contact.details || []).forEach((item) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = `${item.label || ''}:`;
        li.appendChild(strong);
        if (item.href) {
          const anchor = document.createElement('a');
          anchor.href = item.href;
          anchor.textContent = item.value || '';
          li.appendChild(document.createTextNode(' '));
          li.appendChild(anchor);
        } else {
          li.appendChild(document.createTextNode(` ${item.value || ''}`));
        }
        container.appendChild(li);
      });
    });
    const socialContainers = document.querySelectorAll('[data-list="site.social"]');
    const socialLinks = Array.isArray(site.social) ? site.social : [];
    socialContainers.forEach((container) => {
      container.innerHTML = '';
      socialLinks.forEach((link) => {
        const anchor = document.createElement('a');
        anchor.href = link.href || '#';
        anchor.textContent = link.label || '';
        container.appendChild(anchor);
      });
    });
    const map = document.querySelector('[data-map]');
    if (map && contact.mapEmbed) {
      map.src = contact.mapEmbed;
    }
  }

  function applyOrderPage(orderPage = {}, site = {}) {
    if (!document.body || !document.body.classList.contains('order-page')) return;
    if (!orderPage) return;
    setContent('order.hero.eyebrow', orderPage.hero?.eyebrow);
    setContent('order.hero.title', orderPage.hero?.title);
    setContent('order.hero.description', orderPage.hero?.description, { html: true });
    setContent('order.hero.hours', orderPage.hero?.hours);
    setContent('order.checkout.instructions', orderPage.checkout?.instructions);
    setContent('order.checkout.cta', orderPage.checkout?.cta);
    updateOptionalContent('order.checkout.paymentNote', orderPage.checkout?.paymentNote, { html: true });
    updateOptionalContent('order.checkout.cms.note', orderPage.checkout?.cms?.note, { html: true });
    setContent('order.footer.note', orderPage.footer?.note, { html: true });

    renderOrderFilters(orderPage.filters);
    renderOrderServiceMenu(orderPage.serviceMenu);
  }

  function renderOrderFilters(filters = []) {
    const containers = document.querySelectorAll('[data-list="order.filters"]');
    if (!containers.length) return;
    const list = Array.isArray(filters) && filters.length ? filters : [
      { label: 'All', value: 'all' },
    ];
    containers.forEach((container) => {
      container.innerHTML = '';
      list.forEach((filter, index) => {
        const button = document.createElement('button');
        button.className = `filter-button${index === 0 ? ' is-active' : ''}`;
        button.dataset.filter = filter.value || 'all';
        button.textContent = filter.label || '';
        container.appendChild(button);
      });
    });
  }

  function renderOrderServiceMenu(groups = []) {
    const containers = document.querySelectorAll('[data-list="order.serviceMenu"]');
    if (!containers.length) return;
    const list = Array.isArray(groups) && groups.length ? groups : [];
    containers.forEach((container) => {
      container.innerHTML = '';
      list.forEach((group) => {
        const section = document.createElement('div');
        section.className = 'service-group';
        if (group.id) {
          section.id = group.id;
        }
        const header = document.createElement('header');
        header.className = 'service-group__header';
        header.innerHTML = `
          <h2>${escapeHtml(group.title)}</h2>
          <p>${escapeHtml(group.description || '')}</p>
        `;
        section.appendChild(header);
        const listEl = document.createElement('div');
        listEl.className = 'service-list';
        (group.services || []).forEach((service) => {
          const article = document.createElement('article');
          article.className = 'service-item';
          const categories = Array.isArray(service.categories) ? service.categories.join(' ') : '';
          article.dataset.category = categories;
          article.dataset.price = Number(service.price) || 0;
          article.dataset.duration = Number(service.duration) || 0;
          const details = Array.isArray(service.details)
            ? service.details.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
            : '';
          article.innerHTML = `
            <div>
              <h3>${escapeHtml(service.name)}</h3>
              <p>${escapeHtml(service.description || '')}</p>
              ${details ? `<ul>${details}</ul>` : ''}
            </div>
            <div class="service-item__meta">
              <span class="service-item__price">${formatPrice(service.price)}</span>
              <button class="service-item__add" data-service="${escapeAttribute(service.name)}">Add</button>
            </div>
          `;
          listEl.appendChild(article);
        });
        section.appendChild(listEl);
        container.appendChild(section);
      });
    });
  }

  function setContent(key, value, { html = false } = {}) {
    if (value == null) return;
    const nodes = document.querySelectorAll(`[data-content="${key}"]`);
    nodes.forEach((node) => {
      if (html) {
        node.innerHTML = value;
      } else {
        node.textContent = value;
      }
    });
  }

  function updateOptionalContent(key, value, { html = false } = {}) {
    const nodes = document.querySelectorAll(`[data-content="${key}"]`);
    nodes.forEach((node) => {
      if (value == null || value === '') {
        node.hidden = true;
        if (html) {
          node.innerHTML = '';
        } else {
          node.textContent = '';
        }
      } else {
        node.hidden = false;
        if (html) {
          node.innerHTML = value;
        } else {
          node.textContent = value;
        }
      }
    });
  }

  function setCta(key, cta = {}) {
    if (!cta) return;
    const nodes = document.querySelectorAll(`[data-cta="${key}"]`);
    nodes.forEach((node) => {
      if (cta.label) node.textContent = cta.label;
      if (cta.href) node.setAttribute('href', cta.href);
    });
  }

  function setImage(key, image = {}) {
    if (!image) return;
    const nodes = document.querySelectorAll(`[data-image="${key}"]`);
    nodes.forEach((node) => {
      if (image.src) node.setAttribute('src', image.src);
      if (image.alt) node.setAttribute('alt', image.alt);
    });
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(number);
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

  function stripHtml(value = '') {
    const temp = document.createElement('div');
    temp.innerHTML = value;
    return temp.textContent || temp.innerText || '';
  }

  function toKebab(value = '') {
    return String(value)
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[_\s]+/g, '-')
      .toLowerCase();
  }

  function handleIncomingMessage(event) {
    const message = event?.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'site:update' && message.data) {
      applySiteData(message.data);
    }
    if (message.type === 'site:request-state') {
      notifyParentReady();
    }
  }

  function notifyParentReady() {
    if (window === window.top) return;
    try {
      window.parent?.postMessage({ type: 'site:ready', page: getPageType() }, '*');
    } catch (error) {
      // noop
    }
  }

  function getPageType() {
    return document.body?.classList?.contains('order-page') ? 'order' : 'home';
  }

  window.SiteContent = window.SiteContent || {};
  window.SiteContent.apply = applySiteData;
  window.SiteContent.load = loadSiteContent;
  window.SiteContent.state = STATE;

  window.addEventListener('message', handleIncomingMessage);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadSiteContent();
      notifyParentReady();
    }, { once: true });
  } else {
    loadSiteContent();
    notifyParentReady();
  }
})();
