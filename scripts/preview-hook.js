(function () {
  if (window === window.top) {
    return;
  }

  const PAGE = document.body?.classList?.contains('order-page') ? 'order' : 'home';
  const HIGHLIGHT_CLASS = 'preview-highlight';
  const TARGET_CLASS = 'preview-target';
  const regionTargets = new Map();
  const primaryTargets = new Map();
  const state = {
    activeRegion: null,
  };

  document.documentElement.setAttribute('data-preview-mode', 'true');

  const style = document.createElement('style');
  style.textContent = `
    :root[data-preview-mode="true"] .${TARGET_CLASS} {
      position: relative;
      transition: outline 0.2s ease, box-shadow 0.2s ease;
    }
    :root[data-preview-mode="true"] .${HIGHLIGHT_CLASS} {
      outline: 3px solid rgba(124, 58, 237, 0.65);
      outline-offset: 4px;
      box-shadow: 0 0 0 6px rgba(124, 58, 237, 0.18);
      border-radius: 18px;
    }
    :root[data-preview-mode="true"] .${HIGHLIGHT_CLASS}::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  const REGION_CONFIG = PAGE === 'order' ? getOrderRegions() : getHomeRegions();
  Object.entries(REGION_CONFIG).forEach(([region, selectors]) => {
    const nodes = new Set();
    selectors.forEach((selector) => {
      const matches = document.querySelectorAll(selector);
      matches.forEach((node) => {
        if (!node) return;
        node.classList.add(TARGET_CLASS);
        if (!node.hasAttribute('tabindex')) {
          node.setAttribute('tabindex', '-1');
        }
        node.dataset.previewRegionTarget = region;
        node.addEventListener('mouseenter', () => notifyFocus(region, false));
        node.addEventListener('focusin', () => notifyFocus(region, false));
        node.addEventListener('click', (event) => {
          event.preventDefault();
          notifyFocus(region, true);
        });
        nodes.add(node);
      });
    });
    if (nodes.size) {
      const list = Array.from(nodes);
      regionTargets.set(region, list);
      primaryTargets.set(region, list[0]);
    }
  });

  const observer = new IntersectionObserver((entries) => {
    let bestEntry = null;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
        bestEntry = entry;
      }
    });
    if (!bestEntry) return;
    const region = bestEntry.target.dataset.previewRegionTarget;
    if (!region || region === state.activeRegion) return;
    notifySectionChange(region);
  }, { threshold: [0.35, 0.5, 0.75] });

  primaryTargets.forEach((node) => observer.observe(node));

  window.addEventListener('message', (event) => {
    const message = event?.data;
    if (!message || typeof message !== 'object') return;
    switch (message.type) {
      case 'site:highlight':
        if (message.page && message.page !== PAGE) return;
        highlightRegion(message.region, { scroll: Boolean(message.scroll) });
        break;
      case 'site:update':
        if (message.data && window.SiteContent?.apply) {
          window.SiteContent.apply(message.data);
        }
        break;
      case 'site:request-snapshot':
        notifyReady();
        break;
      default:
        break;
    }
  });

  notifyReady();

  function getHomeRegions() {
    return {
      'site.identity': ['.site-header'],
      'site.navigation': ['.site-header nav'],
      design: ['body'],
      'homepage.hero': ['.hero'],
      'homepage.sections': ['.badges', '.services', '.experience', '.results', '.reviews', '.cta-banner', '.contact'],
      integrations: ['.site-footer'],
      pages: ['.site-footer'],
      advanced: ['.site-footer'],
    };
  }

  function getOrderRegions() {
    return {
      order: ['.order-hero', '.service-menu', '.cart'],
      integrations: ['.cart__integrations', '.site-footer'],
    };
  }

  function highlightRegion(region, options = {}) {
    if (!regionTargets.has(region)) {
      return false;
    }
    clearHighlights();
    const nodes = regionTargets.get(region) || [];
    nodes.forEach((node) => node.classList.add(HIGHLIGHT_CLASS));
    if (options.scroll) {
      const primary = primaryTargets.get(region) || nodes[0];
      if (primary) {
        primary.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    state.activeRegion = region;
    notifyFocus(region, false, { passive: true });
    return true;
  }

  function clearHighlights() {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((node) => {
      node.classList.remove(HIGHLIGHT_CLASS);
    });
  }

  function notifyReady() {
    try {
      window.parent?.postMessage({
        type: 'site:ready',
        page: PAGE,
        regions: Array.from(regionTargets.keys()),
      }, '*');
    } catch (error) {
      // ignore
    }
  }

  function notifyFocus(region, userInitiated, meta = {}) {
    if (!region) return;
    try {
      window.parent?.postMessage({
        type: 'site:focus-request',
        page: PAGE,
        region,
        userInitiated: Boolean(userInitiated),
        passive: Boolean(meta.passive),
      }, '*');
    } catch (error) {
      // ignore
    }
  }

  function notifySectionChange(region) {
    try {
      window.parent?.postMessage({
        type: 'site:section-change',
        page: PAGE,
        region,
      }, '*');
    } catch (error) {
      // ignore
    }
  }
})();
