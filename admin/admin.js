const DEFAULT_DATA = {
  site: {
    name: '',
    tagline: '',
    meta: {
      description: '',
      keywords: '',
      canonicalUrl: '',
    },
    brand: {
      logoText: '',
      logoImage: '',
    },
    contact: {
      phone: '',
      phoneDisplay: '',
      email: '',
      address: '',
      hours: '',
    },
    navigation: [],
    social: [],
    cta: {
      label: '',
      href: '',
    },
    footer: {
      description: '',
      links: [],
    },
  },
  design: {
    colors: {},
    shadows: {},
    radii: {},
    gradients: {},
    fonts: {
      heading: '',
      body: '',
    },
    customCss: '',
  },
  homepage: {
    hero: {
      eyebrow: '',
      title: '',
      description: '',
      rating: {
        score: '',
        details: '',
      },
      primaryCta: {
        label: '',
        href: '',
      },
      secondaryCta: {
        label: '',
        href: '',
      },
      image: {
        src: '',
        alt: '',
      },
    },
    badges: [],
    services: {
      eyebrow: '',
      title: '',
      description: '',
      cards: [],
    },
    experience: {
      eyebrow: '',
      title: '',
      description: '',
      cta: {
        label: '',
        href: '',
      },
      image: {
        src: '',
        alt: '',
      },
      highlights: [],
    },
    results: {
      eyebrow: '',
      title: '',
      description: '',
      gallery: [],
    },
    reviews: {
      eyebrow: '',
      title: '',
      description: '',
      testimonials: [],
    },
    ctaBanner: {
      title: '',
      description: '',
      cta: {
        label: '',
        href: '',
      },
    },
    contact: {
      eyebrow: '',
      title: '',
      description: '',
      mapEmbed: '',
      details: [],
    },
    footer: {
      note: '',
    },
    meta: {
      canonicalUrl: '',
      description: '',
    },
  },
  orderPage: {
    hero: {
      eyebrow: '',
      title: '',
      description: '',
      hours: '',
    },
    filters: [],
    serviceMenu: [],
    checkout: {
      mode: 'form',
      cta: '',
      instructions: '',
      submitMessage: '',
      paymentNote: '',
      stripe: {
        enabled: false,
        publishableKey: '',
        priceId: '',
        checkoutLink: '',
        successUrl: '',
        cancelUrl: '',
        buttonLabel: '',
        supportEmail: '',
      },
      cms: {
        note: '',
        dashboardUrl: '',
        buttonLabel: '',
      },
    },
    footer: {
      note: '',
    },
  },
  integrations: {
    stripe: {
      enabled: false,
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      priceIds: '',
      dashboardUrl: '',
      notes: '',
    },
    cms: {
      enabled: false,
      provider: '',
      baseUrl: '',
      apiKey: '',
      previewUrl: '',
      notes: '',
    },
  },
  pages: [],
};

const state = {
  data: null,
  snapshot: null,
  token: localStorage.getItem('adminToken') || '',
  dirty: false,
  saving: false,
  publishLabel: 'Publish changes',
  activePreviewRegion: 'site.identity',
  previewScale: localStorage.getItem('adminPreviewScale') || 'desktop',
};

const elements = {
  tokenInput: document.getElementById('admin-token'),
  saveToken: document.getElementById('save-token'),
  clearToken: document.getElementById('clear-token'),
  tokenStatus: document.getElementById('token-status'),
  reloadContent: document.getElementById('reload-content'),
  discardChanges: document.getElementById('discard-changes'),
  publishChanges: document.getElementById('publish-changes'),
  unsavedIndicator: document.getElementById('unsaved-indicator'),
  designPreview: document.getElementById('design-preview'),
  designMockup: document.getElementById('design-mockup'),
  livePreview: document.getElementById('live-preview'),
  previewViewport: document.querySelector('[data-preview-viewport]'),
  previewStatus: document.getElementById('preview-status'),
  previewScaleButtons: Array.from(document.querySelectorAll('[data-preview-scale]')),
  jsonEditor: document.getElementById('json-editor'),
  jsonStatus: document.getElementById('json-status'),
  formatJson: document.getElementById('format-json'),
  resetJson: document.getElementById('reset-json'),
  saveJson: document.getElementById('save-json'),
};

const PREVIEW_REGION_LABELS = {
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

const PREVIEW_SCALES = ['desktop', 'tablet', 'mobile'];

let sectionObserver;

function getDefaultData() {
  if (typeof structuredClone === 'function') {
    return structuredClone(DEFAULT_DATA);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function mergeWithDefaults(data) {
  const base = getDefaultData();
  if (!isPlainObject(data)) {
    return base;
  }
  return deepAssign(base, data);
}

function deepAssign(target, source) {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return target;
  }
  Object.keys(source).forEach((key) => {
    const value = source[key];
    if (Array.isArray(value)) {
      target[key] = value.map((item) => (isPlainObject(item) ? deepAssign({}, item) : item));
    } else if (isPlainObject(value)) {
      target[key] = deepAssign(isPlainObject(target[key]) ? target[key] : {}, value);
    } else {
      target[key] = value;
    }
  });
  return target;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function previewText(value, placeholder) {
  if (value === null || value === undefined) {
    return `<span class="admin-live__placeholder">${escapeHtml(placeholder)}</span>`;
  }
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (typeof normalized === 'number') {
    return escapeHtml(String(normalized));
  }
  if (typeof normalized === 'string' && normalized) {
    return escapeHtml(normalized);
  }
  return `<span class="admin-live__placeholder">${escapeHtml(placeholder)}</span>`;
}

function countSummary(items, noun) {
  const list = Array.isArray(items) ? items : [];
  const count = list.length;
  if (!count) {
    return `<span class="admin-live__placeholder">Add ${escapeHtml(noun)}</span>`;
  }
  const plural = count === 1 ? noun : `${noun}s`;
  return `<strong>${count}</strong> ${escapeHtml(plural)}`;
}

function escapeSelector(value) {
  if (typeof value !== 'string') return '';
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/([\\ #;?%&,.+*~':"!^$\[\]()=>|\/])/g, '\\$1');
}

function renderLivePreview() {
  if (!elements.livePreview) return;
  const data = state.data || getDefaultData();
  const site = data.site || {};
  const homepage = data.homepage || {};
  const orderPage = data.orderPage || {};
  const integrations = data.integrations || {};
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const designFonts = (data.design && data.design.fonts) || {};

  const siteContact = site.contact || {};
  const siteCta = site.cta || {};
  const hero = homepage.hero || {};
  const services = homepage.services || {};
  const experience = homepage.experience || {};
  const results = homepage.results || {};
  const reviews = homepage.reviews || {};
  const ctaBanner = homepage.ctaBanner || {};
  const contactSection = homepage.contact || {};
  const orderHero = orderPage.hero || {};
  const checkout = orderPage.checkout || {};

  const navItems = Array.isArray(site.navigation) ? site.navigation.slice(0, 6) : [];
  const navList = navItems.length
    ? navItems
        .map((item, index) => `<li>${previewText(item?.label, `Menu item ${index + 1}`)}</li>`)
        .join('')
    : '<li class="admin-live__empty">Add navigation links</li>';

  const socialCount = Array.isArray(site.social) ? site.social.length : 0;
  const socialSummary = socialCount
    ? `<p class="admin-live__meta"><strong>${socialCount}</strong> social link${socialCount === 1 ? '' : 's'} configured</p>`
    : '<p class="admin-live__meta admin-live__meta--muted">No social links yet</p>';

  const footerDescription = previewText(site.footer?.description, 'Footer description appears here');

  const serviceCards = Array.isArray(services.cards) ? services.cards.slice(0, 3) : [];
  const servicesList = serviceCards.length
    ? serviceCards
        .map((card, index) => `<li>${previewText(card?.title || card?.label, `Service ${index + 1}`)}</li>`)
        .join('')
    : '<li class="admin-live__empty">Add service cards</li>';

  const experienceHighlights = Array.isArray(experience.highlights) ? experience.highlights.slice(0, 3) : [];
  const experienceList = experienceHighlights.length
    ? experienceHighlights
        .map((item, index) => {
          if (typeof item === 'string') {
            return `<li>${previewText(item, `Highlight ${index + 1}`)}</li>`;
          }
          return `<li>${previewText(item?.title, `Highlight ${index + 1}`)}</li>`;
        })
        .join('')
    : '<li class="admin-live__empty">Add experience highlights</li>';

  const galleryCount = Array.isArray(results.gallery) ? results.gallery.length : 0;
  const testimonials = Array.isArray(reviews.testimonials) ? reviews.testimonials : [];
  const primaryTestimonial = testimonials[0];
  const testimonialHtml = primaryTestimonial
    ? `<p class="admin-live__blockquote">“${previewText(primaryTestimonial.quote, 'Testimonial quote')}”<strong>${previewText(primaryTestimonial.name, 'Client name')}</strong></p>`
    : '<p class="admin-live__meta admin-live__meta--muted">Add testimonials to highlight guest feedback.</p>';

  const filterCount = Array.isArray(orderPage.filters) ? orderPage.filters.length : 0;
  const menuCount = Array.isArray(orderPage.serviceMenu) ? orderPage.serviceMenu.length : 0;
  const stripe = integrations.stripe || {};
  const cms = integrations.cms || {};

  elements.livePreview.innerHTML = `
    <div class="admin-live__block" data-preview-block="site.overview" data-preview-primary="site.overview" tabindex="0">
      <span class="admin-live__label">Admin workflow</span>
      <p class="admin-live__stage-note">Use your secure admin token to publish updates to the live storefront.</p>
      <div class="admin-live__toolbar">
        <span><strong>${previewText(site.name, 'Your brand')}</strong> is in editing mode.</span>
        <span>Unsaved changes stay local until you press <strong>Publish changes</strong>.</span>
        <span>Configuration lives in <code>data/site.json</code>.</span>
      </div>
    </div>

    <div class="admin-live__block" data-preview-block="site.identity site.navigation" data-preview-primary="site.identity" tabindex="0">
      <span class="admin-live__label">Brand & navigation</span>
      <h4 class="admin-live__heading">${previewText(site.name, 'Business name')}</h4>
      <p class="admin-live__muted">${previewText(site.tagline, 'Tagline appears here to set the tone')}</p>
      <div class="admin-live__buttons">
        <span class="admin-live__button admin-live__button--primary">${previewText(siteCta.label, 'Primary CTA')}</span>
        <span class="admin-live__button">${previewText(siteCta.href, 'Destination link')}</span>
      </div>
      <div class="admin-live__contact">
        <span><strong>${previewText(siteContact.phoneDisplay || siteContact.phone, 'Phone number')}</strong></span>
        <span>${previewText(siteContact.email, 'Email address')}</span>
        <span>${previewText(siteContact.address, 'Studio address')}</span>
        <span>${previewText(siteContact.hours, 'Business hours')}</span>
      </div>
      <ul class="admin-live__nav">${navList}</ul>
      ${socialSummary}
      <p class="admin-live__meta">${footerDescription}</p>
    </div>

    <div class="admin-live__block" data-preview-block="design" data-preview-primary="design" tabindex="0">
      <span class="admin-live__label">Design system</span>
      <p class="admin-live__summary">Custom CSS, typography, and colors cascade across this preview canvas.</p>
      <p class="admin-live__meta">Heading font: <strong>${previewText(designFonts.heading, 'Heading font')}</strong> • Body font: <strong>${previewText(designFonts.body, 'Body font')}</strong></p>
      <p class="admin-live__meta">Shadows, gradients, and radii render automatically as you tweak tokens.</p>
    </div>

    <div class="admin-live__block" data-preview-block="homepage.hero" data-preview-primary="homepage.hero" tabindex="0">
      <span class="admin-live__label">Homepage hero</span>
      <span class="admin-live__eyebrow">${previewText(hero.eyebrow, 'Hero eyebrow')}</span>
      <h4 class="admin-live__heading">${previewText(hero.title, 'Hero headline')}</h4>
      <p class="admin-live__muted">${previewText(hero.description, 'Tell guests what makes your studio special')}</p>
      <p class="admin-live__meta">Rating: <strong>${previewText(hero.rating?.score, 'Score')}</strong> • ${previewText(hero.rating?.details, 'Explain the rating source')}</p>
      <div class="admin-live__buttons">
        <span class="admin-live__button admin-live__button--primary">${previewText(hero.primaryCta?.label, 'Primary action')}</span>
        <span class="admin-live__button">${previewText(hero.secondaryCta?.label, 'Secondary action')}</span>
      </div>
      <p class="admin-live__status">Image: ${previewText(hero.image?.alt || hero.image?.src, 'Describe or link the hero image')}</p>
    </div>

    <div class="admin-live__block" data-preview-block="homepage.sections" data-preview-primary="homepage.sections" tabindex="0">
      <span class="admin-live__label">Homepage sections</span>
      <div class="admin-live__grid">
        <div class="admin-live__card">
          <h5>${previewText(services.title, 'Services title')}</h5>
          <p class="admin-live__summary">${previewText(services.description, 'Introduce your core offerings')}</p>
          <ul class="admin-live__list">${servicesList}</ul>
        </div>
        <div class="admin-live__card">
          <h5>${previewText(experience.title, 'Experience title')}</h5>
          <p class="admin-live__summary">${previewText(experience.description, 'Share the studio experience')}</p>
          <ul class="admin-live__list">${experienceList}</ul>
          <p class="admin-live__meta">CTA: <strong>${previewText(experience.cta?.label, 'Button label')}</strong> → ${previewText(experience.cta?.href, 'Link')}</p>
        </div>
        <div class="admin-live__card">
          <h5>${previewText(results.title, 'Results title')}</h5>
          <p class="admin-live__summary">${previewText(results.description, 'Describe the transformations you deliver')}</p>
          <p class="admin-live__meta">${galleryCount ? `<strong>${galleryCount}</strong> gallery item${galleryCount === 1 ? '' : 's'} configured` : '<span class="admin-live__placeholder">Add gallery items</span>'}</p>
        </div>
        <div class="admin-live__card">
          <h5>${previewText(reviews.title, 'Reviews title')}</h5>
          <p class="admin-live__summary">${previewText(reviews.description, 'Summarize your social proof')}</p>
          ${testimonialHtml}
        </div>
        <div class="admin-live__card">
          <h5>${previewText(ctaBanner.title, 'CTA banner title')}</h5>
          <p class="admin-live__summary">${previewText(ctaBanner.description, 'Motivate visitors to take action')}</p>
          <span class="admin-live__button admin-live__button--primary">${previewText(ctaBanner.cta?.label, 'Banner CTA')}</span>
        </div>
        <div class="admin-live__card">
          <h5>${previewText(contactSection.title, 'Contact title')}</h5>
          <p class="admin-live__summary">${previewText(contactSection.description, 'Explain how to get in touch')}</p>
          <p class="admin-live__meta">${countSummary(contactSection.details, 'contact detail')}</p>
        </div>
      </div>
    </div>

    <div class="admin-live__block" data-preview-block="order" data-preview-primary="order" tabindex="0">
      <span class="admin-live__label">Booking & services</span>
      <h4 class="admin-live__heading">${previewText(orderHero.title, 'Order page headline')}</h4>
      <p class="admin-live__muted">${previewText(orderHero.description, 'Set expectations for online booking')}</p>
      <p class="admin-live__meta">Hours: ${previewText(orderHero.hours, 'Add availability or pickup times')}</p>
      <p class="admin-live__meta">Filters: ${filterCount ? `<strong>${filterCount}</strong> configured` : '<span class="admin-live__placeholder">Add filters</span>'} • Service groups: ${menuCount ? `<strong>${menuCount}</strong>` : '<span class="admin-live__placeholder">Add service groups</span>'}</p>
      <p class="admin-live__summary">Checkout mode: <strong>${escapeHtml(checkout.mode || 'form')}</strong> • ${previewText(checkout.instructions, 'Explain the booking flow')}</p>
      <p class="admin-live__meta">Stripe: ${stripe.enabled ? '<strong>Enabled</strong>' : '<span class="admin-live__placeholder">Disabled</span>'} • CMS sync: ${cms.enabled ? '<strong>Enabled</strong>' : '<span class="admin-live__placeholder">Disabled</span>'}</p>
    </div>

    <div class="admin-live__block" data-preview-block="integrations" data-preview-primary="integrations" tabindex="0">
      <span class="admin-live__label">Integrations</span>
      <p class="admin-live__summary">Connect Stripe, your CMS, and other services so the storefront stays in sync.</p>
      <p class="admin-live__meta">Stripe dashboard: ${previewText(stripe.dashboardUrl, 'Link to Stripe dashboard')}</p>
      <p class="admin-live__meta">CMS provider: ${previewText(cms.provider, 'Provider name')} • Preview URL: ${previewText(cms.previewUrl, 'Preview URL')}</p>
      <p class="admin-live__meta">Notes: ${previewText(cms.notes || stripe.notes, 'Document integration steps')}</p>
    </div>

    <div class="admin-live__block" data-preview-block="pages" data-preview-primary="pages" tabindex="0">
      <span class="admin-live__label">Custom pages</span>
      <p class="admin-live__summary">${countSummary(pages, 'custom page')} ready to publish.</p>
      <p class="admin-live__meta">Define slugs, heroes, and HTML sections without leaving the builder.</p>
    </div>

    <div class="admin-live__block" data-preview-block="advanced" data-preview-primary="advanced" tabindex="0">
      <span class="admin-live__label">Advanced JSON</span>
      <p class="admin-live__summary">Power users can edit the raw configuration for edge cases.</p>
      <p class="admin-live__meta">Format, reset, or paste structured data directly into the editor.</p>
    </div>
  `;

  const region = state.activePreviewRegion || 'site.identity';
  highlightPreviewRegion(region, { persist: true });
}

function highlightPreviewRegion(region, options = {}) {
  if (!elements.livePreview) return;
  const { persist = false, preserveStatus = false } = options;
  const blocks = elements.livePreview.querySelectorAll('[data-preview-block]');
  let matched = false;
  blocks.forEach((block) => {
    const tokens = String(block.dataset.previewBlock || '')
      .split(/\s+/)
      .filter(Boolean);
    const isActive = region && tokens.some((token) => token === region || token.startsWith(region) || region.startsWith(token));
    block.classList.toggle('admin-live__block--active', isActive);
    block.setAttribute('aria-current', isActive ? 'true' : 'false');
    if (isActive && !matched) {
      matched = true;
    }
  });
  if (persist && region) {
    state.activePreviewRegion = region;
  }
  if (elements.previewStatus && !preserveStatus) {
    const label = PREVIEW_REGION_LABELS[region] || 'Live site preview';
    elements.previewStatus.textContent = label;
  }
  if (!matched && region && persist) {
    state.activePreviewRegion = region;
  }
}

function findSectionForRegion(region) {
  if (!region) return null;
  const selector = escapeSelector(region);
  if (!selector) return null;
  return document.querySelector(`.admin-card[data-preview-region="${selector}"]`);
}

function focusPreviewRegion(region) {
  const target = findSectionForRegion(region);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  requestAnimationFrame(() => {
    target.focus({ preventScroll: true });
  });
}

function setupPreviewInteractions() {
  const sections = document.querySelectorAll('.admin-card[data-preview-region]');
  sections.forEach((section) => {
    section.addEventListener('focusin', () => {
      const region = section.dataset.previewRegion;
      if (region) {
        highlightPreviewRegion(region, { persist: true });
      }
    });
    section.addEventListener('mouseenter', () => {
      const region = section.dataset.previewRegion;
      if (region) {
        highlightPreviewRegion(region, { persist: false });
      }
    });
    section.addEventListener('mouseleave', () => {
      if (state.activePreviewRegion) {
        highlightPreviewRegion(state.activePreviewRegion, { persist: true });
      }
    });
  });

  if (!elements.livePreview) return;

  elements.livePreview.addEventListener('mouseover', (event) => {
    const block = event.target.closest('[data-preview-block]');
    if (!block) return;
    const region = block.dataset.previewPrimary || (block.dataset.previewBlock || '').split(/\s+/)[0];
    if (region) {
      highlightPreviewRegion(region, { persist: false });
    }
  });

  elements.livePreview.addEventListener('focusin', (event) => {
    const block = event.target.closest('[data-preview-block]');
    if (!block) return;
    const region = block.dataset.previewPrimary || (block.dataset.previewBlock || '').split(/\s+/)[0];
    if (region) {
      highlightPreviewRegion(region, { persist: true });
    }
  });

  elements.livePreview.addEventListener('mouseleave', () => {
    if (state.activePreviewRegion) {
      highlightPreviewRegion(state.activePreviewRegion, { persist: true });
    }
  });

  elements.livePreview.addEventListener('click', (event) => {
    const block = event.target.closest('[data-preview-block]');
    if (!block) return;
    const region = block.dataset.previewPrimary || (block.dataset.previewBlock || '').split(/\s+/)[0];
    if (region) {
      highlightPreviewRegion(region, { persist: true });
      focusPreviewRegion(region);
    }
  });

  elements.livePreview.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const block = event.target.closest('[data-preview-block]');
    if (!block) return;
    event.preventDefault();
    block.click();
  });
}

function setPreviewScale(scale, options = {}) {
  if (!elements.previewViewport) return;
  const nextScale = PREVIEW_SCALES.includes(scale) ? scale : 'desktop';
  elements.previewViewport.dataset.scale = nextScale;
  elements.previewScaleButtons?.forEach((button) => {
    const isActive = button.dataset.previewScale === nextScale;
    button.dataset.active = isActive ? 'true' : 'false';
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  if (options.persist !== false) {
    state.previewScale = nextScale;
    localStorage.setItem('adminPreviewScale', nextScale);
  }
}
function enhanceFields() {
  document.querySelectorAll('[data-path]').forEach((field) => {
    if (!field || field.dataset.enhanced === 'true') {
      updateFieldUi(field);
      return;
    }
    const container = field.closest('.admin-field');
    if (!container) return;

    const control = document.createElement('div');
    control.className = 'admin-field__control';
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'admin-field__input';

    inputWrapper.appendChild(field);
    control.appendChild(inputWrapper);

    if (field.type === 'color') {
      const swatch = document.createElement('span');
      swatch.className = 'admin-field__swatch';
      swatch.dataset.fieldSwatch = 'true';
      inputWrapper.appendChild(swatch);
    }

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'admin-chip admin-field__reset';
    resetButton.textContent = 'Reset';
    resetButton.title = 'Reset to saved value';
    resetButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetField(field);
    });

    control.appendChild(resetButton);
    container.appendChild(control);
    field.dataset.enhanced = 'true';
    updateFieldUi(field);
  });
}

async function init() {
  if (elements.tokenInput) {
    elements.tokenInput.value = state.token;
  }
  if (elements.publishChanges) {
    state.publishLabel = elements.publishChanges.textContent.trim() || state.publishLabel;
  }
  enhanceFields();
  attachEventListeners();
  setupCollections();
  setupSectionObserver();
  setupPreviewInteractions();
  setPreviewScale(state.previewScale || 'desktop', { persist: false });
  await loadContent();
}

function attachEventListeners() {
  elements.saveToken?.addEventListener('click', () => {
    state.token = elements.tokenInput?.value.trim() || '';
    if (!state.token) {
      elements.tokenStatus.textContent = 'Token cleared. You will be prompted on the next save.';
      elements.tokenStatus.className = 'admin-status';
      localStorage.removeItem('adminToken');
      return;
    }
    localStorage.setItem('adminToken', state.token);
    elements.tokenStatus.textContent = 'Token saved locally.';
    elements.tokenStatus.className = 'admin-status admin-status--success';
  });

  elements.clearToken?.addEventListener('click', () => {
    state.token = '';
    if (elements.tokenInput) {
      elements.tokenInput.value = '';
    }
    localStorage.removeItem('adminToken');
    elements.tokenStatus.textContent = 'Token removed. Enter it again before publishing.';
    elements.tokenStatus.className = 'admin-status';
  });

  elements.reloadContent?.addEventListener('click', () => {
    loadContent();
  });

  elements.discardChanges?.addEventListener('click', () => {
    restoreSnapshot();
  });

  elements.publishChanges?.addEventListener('click', async () => {
    if (!state.data) return;
    await saveData(clone(state.data));
  });

  const fields = document.querySelectorAll('[data-path]');
  fields.forEach((field) => {
    field.addEventListener('input', (event) => handleFieldChange(event.target));
    field.addEventListener('change', (event) => handleFieldChange(event.target));
  });

  elements.previewScaleButtons?.forEach((button) => {
    button.addEventListener('click', () => {
      const scale = button.dataset.previewScale || 'desktop';
      setPreviewScale(scale);
    });
  });

  elements.jsonEditor?.addEventListener('input', () => {
    setDirty(true);
    if (elements.jsonStatus) {
      elements.jsonStatus.textContent = 'Unsaved changes in JSON editor.';
      elements.jsonStatus.className = 'admin-status';
    }
  });

  elements.formatJson?.addEventListener('click', () => {
    formatJsonEditor();
  });

  elements.resetJson?.addEventListener('click', () => {
    restoreSnapshot();
  });

  elements.saveJson?.addEventListener('click', () => {
    saveFromJsonEditor();
  });

  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

function setupCollections() {
  document.querySelectorAll('[data-collection]').forEach((collection) => {
    if (collection.dataset.collectionInit) return;
    collection.dataset.collectionInit = 'true';
    collection.addEventListener('click', handleCollectionClick);
    collection.addEventListener('input', handleCollectionInput);
    collection.addEventListener('change', handleCollectionInput);
  });
}

function setupSectionObserver() {
  if (sectionObserver) {
    sectionObserver.disconnect();
  }
  const sections = Array.from(document.querySelectorAll('.admin-main .admin-card[id]'));
  if (!sections.length) return;
  elements.sectionLinks = Array.from(document.querySelectorAll('.admin-sidebar__nav a[href^="#"]'));
  if (!elements.sectionLinks?.length) return;

  sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActiveSection(entry.target.id);
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  sections.forEach((section) => sectionObserver.observe(section));
  if (sections[0]) {
    setActiveSection(sections[0].id);
  }
}

function setActiveSection(id) {
  if (!elements.sectionLinks) return;
  elements.sectionLinks.forEach((link) => {
    if (link.getAttribute('href') === `#${id}`) {
      link.setAttribute('aria-current', 'true');
    } else {
      link.removeAttribute('aria-current');
    }
  });
  const section = document.getElementById(id);
  const region = section?.dataset?.previewRegion;
  if (region) {
    highlightPreviewRegion(region, { persist: true });
  }
}

async function loadContent() {
  let statusMessage = 'Content loaded successfully.';
  let statusClass = 'admin-status admin-status--success';
  try {
    const response = await fetch('/api/site', { cache: 'no-store' });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const message = payload.error ? `${payload.error} (${response.status})` : `Failed to load site content (${response.status})`;
      throw new Error(message);
    }
    const data = await response.json();
    applyData(data, { snapshotSource: data });
  } catch (error) {
    console.error(error);
    const fallback = await loadFallbackData();
    if (fallback) {
      applyData(fallback, { snapshotSource: fallback });
      statusMessage = 'Loaded content from local site.json. Publishing will sync to the server API when available.';
      statusClass = 'admin-status admin-status--warning';
    } else {
      const blank = getDefaultData();
      applyData(blank, { snapshotSource: blank });
      statusMessage = 'Started with blank defaults. Fill out the form, then publish when your server is ready.';
      statusClass = 'admin-status admin-status--warning';
    }
  }
  if (elements.jsonStatus) {
    elements.jsonStatus.textContent = statusMessage;
    elements.jsonStatus.className = statusClass;
  }
}

async function loadFallbackData() {
  try {
    const response = await fetch('/data/site.json', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('Fallback data unavailable', error);
    return null;
  }
}

function applyData(data, options = {}) {
  const merged = mergeWithDefaults(data);
  state.data = merged;
  const snapshotSource = options.snapshotSource && isPlainObject(options.snapshotSource)
    ? options.snapshotSource
    : (isPlainObject(data) ? data : merged);
  state.snapshot = JSON.stringify(clone(snapshotSource));
  populateForm();
  setDirty(false);
}

function populateForm() {
  if (!state.data) return;
  document.querySelectorAll('[data-path]').forEach((field) => {
    const path = field.dataset.path;
    if (!path) return;
    const value = getValue(path);
    if (field.matches('[data-json]')) {
      field.value = value ? JSON.stringify(value, null, 2) : '';
    } else if (field.type === 'color') {
      field.value = toColorValue(value);
    } else if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else if (field.tagName === 'TEXTAREA') {
      field.value = value ?? '';
    } else {
      field.value = value ?? '';
    }
    field.setCustomValidity('');
    updateFieldUi(field);
  });
  renderCollections();
  updateDesignPreview();
  updateJsonEditor();
  renderLivePreview();
}

function resetField(field) {
  if (!field) return;
  const path = field.dataset?.path;
  if (!path) return;
  const baseline = getBaselineValue(path);
  if (field.matches('[data-json]')) {
    if (baseline == null) {
      field.value = '';
    } else {
      field.value = JSON.stringify(baseline, null, 2);
    }
    field.setCustomValidity('');
  } else if (field.type === 'checkbox') {
    field.checked = Boolean(baseline);
  } else if (field.type === 'color') {
    const fallback = typeof baseline === 'string' && baseline ? baseline : '#000000';
    field.value = toColorValue(fallback);
  } else if (field.type === 'number') {
    field.value = baseline === null || baseline === undefined ? '' : baseline;
  } else {
    field.value = baseline ?? '';
  }
  handleFieldChange(field);
}

function getBaselineValue(path) {
  if (!path) return undefined;
  const snapshotValue = state.snapshot ? getDeepValue(state.snapshot, path) : undefined;
  if (snapshotValue !== undefined) {
    return snapshotValue;
  }
  return getDeepValue(DEFAULT_DATA, path);
}

function normalizeFieldValue(field, value) {
  if (!field) return value;
  if (field.matches('[data-json]')) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      try {
        return JSON.stringify(JSON.parse(trimmed));
      } catch (error) {
        return trimmed;
      }
    }
    if (value == null) return '';
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '';
    }
  }
  if (field.type === 'checkbox') {
    return value ? 'true' : 'false';
  }
  if (field.type === 'number') {
    if (value === '' || value === null || value === undefined) return '';
    const numeric = Number(value);
    return Number.isNaN(numeric) ? '' : numeric;
  }
  if (field.type === 'color') {
    if (typeof value !== 'string' || !value.trim()) {
      return '#000000';
    }
    return toColorValue(value).toLowerCase();
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

function updateFieldUi(field) {
  if (!field) return;
  const container = field.closest('.admin-field');
  if (!container) return;

  if (field.type === 'color') {
    const swatch = container.querySelector('[data-field-swatch]');
    if (swatch) {
      const color = toColorValue(field.value || '#000000');
      swatch.textContent = color.toUpperCase();
      swatch.style.background = color;
      swatch.style.color = getReadableTextColor(color);
    }
  }

  const resetButton = container.querySelector('.admin-field__reset');
  if (resetButton) {
    const path = field.dataset?.path;
    if (!path) {
      resetButton.disabled = false;
      resetButton.setAttribute('aria-disabled', 'false');
      return;
    }
    const baseline = getBaselineValue(path);
    const normalizedBaseline = normalizeFieldValue(field, baseline);
    const normalizedCurrent = normalizeFieldValue(field, field.type === 'checkbox' ? field.checked : field.value);
    const unchanged = normalizedBaseline === normalizedCurrent;
    resetButton.disabled = unchanged;
    resetButton.setAttribute('aria-disabled', unchanged ? 'true' : 'false');
  }
}

function refreshDirtyState() {
  if (!state.snapshot) {
    setDirty(true);
    return;
  }
  setDirty(!isEqual(state.data, state.snapshot));
}

function isEqual(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (error) {
    return false;
  }
}

function handleFieldChange(field) {
  const path = field?.dataset?.path;
  if (!path || !state.data) return;
  let value = field.type === 'checkbox' ? field.checked : field.value;
  if (field.matches('[data-json]')) {
    if (!String(field.value).trim()) {
      setValue(path, []);
      field.setCustomValidity('');
    } else {
      try {
        const parsed = JSON.parse(field.value);
        setValue(path, parsed);
        field.setCustomValidity('');
      } catch (error) {
        field.setCustomValidity('Invalid JSON');
        field.reportValidity();
        return;
      }
    }
  } else if (field.type === 'color') {
    setValue(path, value || '#000000');
  } else if (field.type === 'number') {
    const numeric = field.value.trim();
    setValue(path, numeric === '' ? null : Number(numeric));
  } else {
    setValue(path, value);
  }
  updateFieldUi(field);
  refreshDirtyState();
  updateJsonEditor({ silent: true });
  if (path.startsWith('design.colors') || path.startsWith('design.fonts') || path.startsWith('design.customCss')) {
    updateDesignPreview();
  }
  renderLivePreview();
}

function renderCollections() {
  if (!state.data) return;
  document.querySelectorAll('[data-collection]').forEach((collection) => {
    const path = collection.dataset.collection;
    if (!path) return;
    const itemsContainer = collection.querySelector('[data-collection-items]');
    const template = collection.querySelector('template[data-collection-template]');
    if (!itemsContainer || !template) return;

    const items = getValue(path);
    const list = Array.isArray(items) ? items : [];
    itemsContainer.innerHTML = '';
    list.forEach((item, index) => {
      const fragment = template.content.cloneNode(true);
      const root = fragment.querySelector('[data-collection-item]') || fragment.firstElementChild;
      if (!root) return;
      root.dataset.index = index;
      fillCollectionItem(root, item);
      itemsContainer.appendChild(fragment);
    });

    const emptyState = collection.querySelector('[data-collection-empty]');
    if (emptyState) {
      emptyState.hidden = list.length > 0;
    }

    if (collection.dataset.focusIndex != null) {
      const focusIndex = Number(collection.dataset.focusIndex);
      requestAnimationFrame(() => {
        const focusTarget = collection.querySelector(`[data-collection-item][data-index="${focusIndex}"] input, [data-collection-item][data-index="${focusIndex}"] textarea`);
        focusTarget?.focus();
        delete collection.dataset.focusIndex;
      });
    }
  });
}

function fillCollectionItem(root, item) {
  root.querySelectorAll('[data-field]').forEach((field) => {
    const key = field.dataset.field;
    const value = getDeepValue(item, key);
    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else {
      field.value = value ?? '';
    }
  });
}

function handleCollectionClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const collection = event.currentTarget;
  const action = button.dataset.action;
  const path = collection.dataset.collection;
  if (!path) return;

  if (action === 'add-item') {
    const defaults = parseCollectionDefault(collection);
    const list = getCollectionList(path);
    list.push(defaults);
    setValue(path, list);
    collection.dataset.focusIndex = String(list.length - 1);
    refreshDirtyState();
    updateJsonEditor({ silent: true });
    renderCollections();
    renderLivePreview();
  }

  if (action === 'remove-item') {
    const item = button.closest('[data-collection-item]');
    if (!item) return;
    const index = Number(item.dataset.index);
    const list = getCollectionList(path);
    list.splice(index, 1);
    setValue(path, list);
    refreshDirtyState();
    updateJsonEditor({ silent: true });
    renderCollections();
    renderLivePreview();
  }
}

function handleCollectionInput(event) {
  const field = event.target;
  if (!field.dataset.field) return;
  const collection = event.currentTarget;
  const path = collection.dataset.collection;
  if (!path) return;
  const itemRoot = field.closest('[data-collection-item]');
  if (!itemRoot) return;
  const index = Number(itemRoot.dataset.index);
  const list = getCollectionList(path);
  const item = list[index] || {};
  setDeepValue(item, field.dataset.field, parseFieldValue(field));
  list[index] = item;
  setValue(path, list);
  refreshDirtyState();
  updateJsonEditor({ silent: true });
  renderLivePreview();
}

function parseCollectionDefault(collection) {
  const raw = collection.dataset.default;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Invalid collection default', error);
    return {};
  }
}

function getCollectionList(path) {
  const value = getValue(path);
  const list = Array.isArray(value) ? value : [];
  return clone(list);
}

function parseFieldValue(field) {
  if (field.type === 'checkbox') {
    return field.checked;
  }
  if (field.type === 'number') {
    const numeric = field.value.trim();
    return numeric === '' ? null : Number(numeric);
  }
  return field.value;
}

function updateJsonEditor(options = {}) {
  if (!elements.jsonEditor || !state.data) return;
  const { silent } = options;
  const previousSelectionStart = elements.jsonEditor.selectionStart;
  const previousSelectionEnd = elements.jsonEditor.selectionEnd;
  elements.jsonEditor.value = JSON.stringify(state.data, null, 2);
  if (silent) {
    elements.jsonEditor.selectionStart = previousSelectionStart;
    elements.jsonEditor.selectionEnd = previousSelectionEnd;
  }
}

function formatJsonEditor() {
  if (!elements.jsonEditor) return;
  try {
    const parsed = JSON.parse(elements.jsonEditor.value);
    elements.jsonEditor.value = JSON.stringify(parsed, null, 2);
    if (elements.jsonStatus) {
      elements.jsonStatus.textContent = 'JSON formatted.';
      elements.jsonStatus.className = 'admin-status';
    }
  } catch (error) {
    if (elements.jsonStatus) {
      elements.jsonStatus.textContent = 'Cannot format invalid JSON.';
      elements.jsonStatus.className = 'admin-status admin-status--error';
    }
  }
}

function updateDesignPreview() {
  const colors = state.data?.design?.colors || {};
  const palette = {
    primary: colors.primary || '#7c3aed',
    primaryDark: colors.primaryDark || colors.primary || '#5b21b6',
    accent: colors.accent || '#f472b6',
    background: colors.background || '#f5f5fb',
    surface: colors.surface || '#ffffff',
    text: colors.text || '#0f172a',
    muted: colors.muted || '#64748b',
    border: colors.border || 'rgba(15, 23, 42, 0.14)',
  };

  if (elements.designMockup) {
    const headingFont = (state.data?.design?.fonts?.heading || '').trim();
    const bodyFont = (state.data?.design?.fonts?.body || '').trim();
    const customProperties = {
      '--preview-primary': palette.primary,
      '--preview-accent': palette.accent,
      '--preview-text': palette.text,
      '--preview-muted': palette.muted,
      '--preview-surface': palette.surface,
      '--preview-background': palette.background,
      '--preview-border': palette.border,
      '--preview-heading-font': headingFont || 'inherit',
      '--preview-body-font': bodyFont || 'inherit',
    };
    Object.entries(customProperties).forEach(([property, value]) => {
      elements.designMockup.style.setProperty(property, value);
    });
  }

  if (!elements.designPreview) return;
  const order = ['primary', 'primaryDark', 'accent', 'background', 'surface', 'text', 'muted', 'border'];
  let customCount = 0;
  const swatches = order
    .map((token) => {
      const hex = palette[token];
      if (!hex) return '';
      const readable = getReadableTextColor(hex);
      const label = token.replace(/([A-Z])/g, ' $1').trim();
      const isCustom = typeof colors[token] === 'string' && colors[token].trim() !== '';
      if (isCustom) {
        customCount += 1;
      }
      const classes = ['admin-preview__swatch', isCustom ? 'admin-preview__swatch--active' : 'admin-preview__swatch--default'];
      return `<div class="${classes.join(' ')}" data-color-token="${token}" style="background:${hex};color:${readable}"><span>${label}<br>${hex}</span></div>`;
    })
    .join('');
  const message = customCount === 0
    ? '<div class="admin-preview__message"><p class="admin-status">Using default palette. Update a swatch to customize the theme.</p></div>'
    : '';
  elements.designPreview.innerHTML = `${message}${swatches}`;
}

function toColorValue(value) {
  if (typeof value !== 'string') return '#000000';
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())) {
    return value.trim();
  }
  return '#000000';
}

function getReadableTextColor(color) {
  if (!/^#/.test(color)) return '#0f172a';
  const hex = color.replace('#', '');
  const bigint = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#f8fafc';
}

function getValue(path) {
  if (!state.data || !path) return undefined;
  return path.split('.').reduce((acc, segment) => (acc ? acc[segment] : undefined), state.data);
}

function getDeepValue(object, path) {
  if (!object || !path) return undefined;
  return path.split('.').reduce((acc, segment) => (acc ? acc[segment] : undefined), object);
}

function setValue(path, value) {
  if (!state.data || !path) return;
  const segments = path.split('.');
  let target = state.data;
  segments.slice(0, -1).forEach((segment) => {
    if (typeof target[segment] !== 'object' || target[segment] === null) {
      target[segment] = {};
    }
    target = target[segment];
  });
  const last = segments[segments.length - 1];
  target[last] = value;
}

function setDeepValue(target, path, value) {
  if (!target || !path) return;
  const segments = path.split('.');
  let current = target;
  segments.slice(0, -1).forEach((segment) => {
    if (typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }
    current = current[segment];
  });
  const last = segments[segments.length - 1];
  current[last] = value;
}

async function saveFromJsonEditor() {
  if (!elements.jsonEditor) return;
  try {
    const parsed = JSON.parse(elements.jsonEditor.value);
    await saveData(parsed);
  } catch (error) {
    if (elements.jsonStatus) {
      elements.jsonStatus.textContent = 'Cannot save: JSON is invalid.';
      elements.jsonStatus.className = 'admin-status admin-status--error';
    }
  }
}

async function saveData(nextData) {
  if (!state.token) {
    if (elements.tokenStatus) {
      elements.tokenStatus.textContent = 'Set an admin token before saving.';
      elements.tokenStatus.className = 'admin-status admin-status--error';
    }
    return;
  }
  try {
    setSaving(true);
    const response = await fetch('/api/site', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': state.token,
      },
      body: JSON.stringify(nextData, null, 2),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Save failed (${response.status})`);
    }
    applyData(nextData, { snapshotSource: nextData });
    if (elements.jsonStatus) {
      elements.jsonStatus.textContent = 'Changes saved successfully.';
      elements.jsonStatus.className = 'admin-status admin-status--success';
    }
  } catch (error) {
    console.error(error);
    if (elements.jsonStatus) {
      elements.jsonStatus.textContent = error.message || 'Save failed. Check your token and try again.';
      elements.jsonStatus.className = 'admin-status admin-status--error';
    }
  } finally {
    setSaving(false);
  }
}

function restoreSnapshot() {
  if (!state.snapshot) return;
  const confirmed = confirm('Reset all unsaved changes?');
  if (!confirmed) return;
  try {
    const snapshot = clone(state.snapshot);
    applyData(snapshot, { snapshotSource: state.snapshot });
    if (elements.jsonStatus) {
      elements.jsonStatus.textContent = 'Changes reverted to last saved version.';
      elements.jsonStatus.className = 'admin-status';
    }
  } catch (error) {
    console.error(error);
    if (elements.jsonStatus) {
      elements.jsonStatus.textContent = 'Unable to reset changes.';
      elements.jsonStatus.className = 'admin-status admin-status--error';
    }
  }
}

function setDirty(isDirty) {
  state.dirty = Boolean(isDirty);
  if (elements.unsavedIndicator) {
    elements.unsavedIndicator.hidden = !state.dirty;
  }
  updatePublishButton();
}

function setSaving(isSaving) {
  state.saving = Boolean(isSaving);
  updatePublishButton();
}

function updatePublishButton() {
  if (!elements.publishChanges) return;
  elements.publishChanges.disabled = state.saving || !state.dirty;
  elements.publishChanges.setAttribute('aria-busy', state.saving ? 'true' : 'false');
  elements.publishChanges.textContent = state.saving ? 'Saving…' : state.publishLabel;
}

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

init();
