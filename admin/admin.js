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
  jsonEditor: document.getElementById('json-editor'),
  jsonStatus: document.getElementById('json-status'),
  formatJson: document.getElementById('format-json'),
  resetJson: document.getElementById('reset-json'),
  saveJson: document.getElementById('save-json'),
};

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

async function init() {
  if (elements.tokenInput) {
    elements.tokenInput.value = state.token;
  }
  if (elements.publishChanges) {
    state.publishLabel = elements.publishChanges.textContent.trim() || state.publishLabel;
  }
  attachEventListeners();
  setupCollections();
  setupSectionObserver();
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
  state.snapshot = JSON.stringify(snapshotSource);
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
  });
  renderCollections();
  updateDesignPreview();
  updateJsonEditor();
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
  setDirty(true);
  updateJsonEditor({ silent: true });
  if (path.startsWith('design.colors') || path.startsWith('design.fonts') || path.startsWith('design.customCss')) {
    updateDesignPreview();
  }
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
    setDirty(true);
    updateJsonEditor({ silent: true });
    renderCollections();
  }

  if (action === 'remove-item') {
    const item = button.closest('[data-collection-item]');
    if (!item) return;
    const index = Number(item.dataset.index);
    const list = getCollectionList(path);
    list.splice(index, 1);
    setValue(path, list);
    setDirty(true);
    updateJsonEditor({ silent: true });
    renderCollections();
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
  setDirty(true);
  updateJsonEditor({ silent: true });
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
  if (!elements.designPreview) return;
  const colors = state.data?.design?.colors || {};
  const keys = Object.keys(colors);
  if (!keys.length) {
    elements.designPreview.innerHTML = '<p class="admin-status">Add colors to see a preview.</p>';
    return;
  }
  elements.designPreview.innerHTML = keys
    .map((key) => {
      const hex = colors[key];
      const textColor = getReadableTextColor(hex);
      return `<div class="admin-preview__swatch" style="background:${hex};color:${textColor}"><span>${key}<br>${hex}</span></div>`;
    })
    .join('');
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
  target[segments.at(-1)] = value;
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
  current[segments.at(-1)] = value;
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
    const parsed = JSON.parse(state.snapshot);
    applyData(parsed, { snapshotSource: parsed });
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
