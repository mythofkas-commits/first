const state = {
  page: 'home',
  ready: {
    home: false,
    order: false,
  },
  frames: {},
  region: null,
  initialized: false,
};

const REGION_LABELS = {
  'site.overview': 'Administrator access',
  'site.identity': 'Site identity & contact',
  'site.navigation': 'Navigation & links',
  design: 'Design studio',
  'homepage.hero': 'Homepage hero',
  'homepage.sections': 'Homepage sections',
  order: 'Booking & services',
  integrations: 'Integrations',
  pages: 'Custom pages',
  advanced: 'Advanced JSON editor',
};

const PAGE_LABELS = {
  home: 'Homepage preview',
  order: 'Order page preview',
};

const REGION_TO_PAGE = {
  order: 'order',
  integrations: 'order',
};

const tabs = Array.from(document.querySelectorAll('[data-preview-tab]'));
const panes = Array.from(document.querySelectorAll('[data-preview-pane]'));
const cover = document.querySelector('[data-preview-cover]');
const regionBadge = document.querySelector('[data-preview-region]');
const regionLabel = document.querySelector('[data-region-label]');
const statusLabel = document.querySelector('[data-preview-status]');

state.frames.home = panes.find((pane) => pane.dataset.previewPane === 'home');
state.frames.order = panes.find((pane) => pane.dataset.previewPane === 'order');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const page = tab.dataset.previewTab;
    if (!page) return;
    setActivePage(page, { reason: 'manual' });
  });
});

window.addEventListener('message', (event) => {
  const message = event?.data;
  if (!message || typeof message !== 'object') return;
  if (event.source === window.parent) {
    handleAdminMessage(message);
    return;
  }
  const page = getPageForSource(event.source);
  if (page) {
    handleSiteMessage(page, message);
  }
});

function handleAdminMessage(message) {
  switch (message.type) {
    case 'preview:update':
      forwardToAll({ type: 'site:update', data: message.data });
      break;
    case 'preview:highlight': {
      const targetPage = resolvePageForRegion(message.region) || state.page;
      setActivePage(targetPage, { reason: 'highlight', silent: true });
      forwardToPage(targetPage, {
        type: 'site:highlight',
        region: message.region,
        scroll: Boolean(message.scroll),
        page: targetPage,
      });
      updateRegionLabel(message.region);
      break;
    }
    case 'preview:resize':
      if (typeof message.width === 'number') {
        document.body.style.setProperty('--preview-width', `${message.width}px`);
      }
      break;
    case 'preview:request-state':
      emitReady();
      break;
    case 'preview:set-page':
      if (message.page) {
        setActivePage(message.page, { reason: 'admin' });
      }
      break;
    default:
      break;
  }
}

function handleSiteMessage(page, message) {
  switch (message.type) {
    case 'site:ready':
      state.ready[page] = true;
      updateStatus();
      if (state.page === page) {
        hideCover();
      }
      if (!state.initialized && state.ready.home) {
        state.initialized = true;
        emitReady();
      }
      break;
    case 'site:focus-request':
      if (!message.region) return;
      window.parent?.postMessage({
        type: 'preview:focus',
        region: message.region,
        page,
        userInitiated: Boolean(message.userInitiated),
      }, '*');
      break;
    case 'site:section-change':
      if (!message.region) return;
      updateRegionLabel(message.region);
      window.parent?.postMessage({
        type: 'preview:region-change',
        region: message.region,
        page,
      }, '*');
      break;
    default:
      break;
  }
}

function forwardToAll(payload) {
  forwardToPage('home', payload);
  forwardToPage('order', payload);
}

function forwardToPage(page, payload) {
  const frame = state.frames[page];
  if (!frame || !frame.contentWindow) return;
  frame.contentWindow.postMessage(payload, '*');
}

function getPageForSource(source) {
  if (state.frames.home?.contentWindow === source) return 'home';
  if (state.frames.order?.contentWindow === source) return 'order';
  return null;
}

function resolvePageForRegion(region) {
  if (!region) return null;
  if (region.startsWith('order')) return 'order';
  if (REGION_TO_PAGE[region]) return REGION_TO_PAGE[region];
  return 'home';
}

function setActivePage(page, options = {}) {
  if (!state.frames[page]) return;
  if (state.page === page && options.silent) {
    updateTabs(page);
    showPane(page);
    return;
  }
  state.page = page;
  document.body.dataset.activePage = page;
  updateTabs(page);
  showPane(page);
  updateStatus();
  if (!state.ready[page]) {
    showCover();
    forwardToPage(page, { type: 'site:request-snapshot' });
  } else {
    hideCover();
  }
  if (!options.silent) {
    window.parent?.postMessage({ type: 'preview:page-change', page, reason: options.reason || 'manual' }, '*');
  }
}

function updateTabs(activePage) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.previewTab === activePage;
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function showPane(activePage) {
  panes.forEach((pane) => {
    const isActive = pane.dataset.previewPane === activePage;
    pane.dataset.active = isActive ? 'true' : 'false';
  });
}

function showCover() {
  if (cover) {
    cover.hidden = false;
  }
}

function hideCover() {
  if (cover) {
    cover.hidden = true;
  }
}

function updateRegionLabel(region) {
  state.region = region;
  if (!region || !regionBadge || !regionLabel) {
    if (regionBadge) {
      regionBadge.hidden = true;
    }
    return;
  }
  const label = REGION_LABELS[region] || 'Live site preview';
  regionLabel.textContent = label;
  regionBadge.hidden = false;
}

function updateStatus() {
  if (!statusLabel) return;
  const pageLabel = PAGE_LABELS[state.page] || 'Live preview';
  const readiness = state.ready[state.page] ? 'synced' : 'loading…';
  statusLabel.textContent = `${pageLabel} · ${readiness}`;
}

function emitReady() {
  window.parent?.postMessage({
    type: 'preview:ready',
    ready: { ...state.ready },
  }, '*');
  updateStatus();
}

setActivePage('home', { reason: 'init', silent: true });
updateStatus();
showCover();
