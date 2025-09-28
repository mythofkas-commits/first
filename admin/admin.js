const state = {
  data: null,
  snapshot: null,
  token: localStorage.getItem('adminToken') || '',
  dirty: false,
};

const elements = {
  tokenInput: document.getElementById('admin-token'),
  saveToken: document.getElementById('save-token'),
  tokenStatus: document.getElementById('token-status'),
  designPreview: document.getElementById('design-preview'),
  jsonEditor: document.getElementById('json-editor'),
  jsonStatus: document.getElementById('json-status'),
  formatJson: document.getElementById('format-json'),
  resetJson: document.getElementById('reset-json'),
  saveJson: document.getElementById('save-json'),
};

async function init() {
  if (elements.tokenInput) {
    elements.tokenInput.value = state.token;
  }
  attachEventListeners();
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

  document.querySelectorAll('[data-path]').forEach((field) => {
    field.addEventListener('input', (event) => handleFieldChange(event.target));
  });

  elements.jsonEditor?.addEventListener('input', () => {
    state.dirty = true;
    elements.jsonStatus.textContent = 'Unsaved changes in JSON editor.';
    elements.jsonStatus.className = 'admin-status';
  });

  elements.formatJson?.addEventListener('click', () => {
    formatJsonEditor();
  });

  elements.resetJson?.addEventListener('click', () => {
    if (!state.snapshot) return;
    const confirmed = confirm('Reset all unsaved changes?');
    if (!confirmed) return;
    state.data = JSON.parse(state.snapshot);
    state.dirty = false;
    populateForm();
    elements.jsonStatus.textContent = 'Changes reverted to last saved version.';
    elements.jsonStatus.className = 'admin-status';
  });

  elements.saveJson?.addEventListener('click', () => {
    saveFromJsonEditor();
  });
}

async function loadContent() {
  try {
    const response = await fetch('/api/site');
    if (!response.ok) {
      throw new Error(`Failed to load site content (${response.status})`);
    }
    const data = await response.json();
    state.data = data;
    state.snapshot = JSON.stringify(data);
    state.dirty = false;
    populateForm();
    elements.jsonStatus.textContent = 'Content loaded successfully.';
    elements.jsonStatus.className = 'admin-status admin-status--success';
  } catch (error) {
    console.error(error);
    elements.jsonStatus.textContent = 'Failed to load site data. Check the server logs.';
    elements.jsonStatus.className = 'admin-status admin-status--error';
  }
}

function populateForm() {
  if (!state.data) return;
  document.querySelectorAll('[data-path]').forEach((field) => {
    const path = field.dataset.path;
    const value = getValue(path);
    if (field.matches('[data-json]')) {
      field.value = value ? JSON.stringify(value, null, 2) : '';
    } else if (field.type === 'color') {
      field.value = toColorValue(value);
    } else if (field.tagName === 'TEXTAREA') {
      field.value = value ?? '';
    } else {
      field.value = value ?? '';
    }
    field.setCustomValidity('');
  });
  updateDesignPreview();
  updateJsonEditor();
}

function handleFieldChange(field) {
  const path = field.dataset.path;
  if (!path) return;
  let value = field.value;
  if (field.matches('[data-json]')) {
    if (!value.trim()) {
      setValue(path, []);
      field.setCustomValidity('');
    } else {
      try {
        const parsed = JSON.parse(value);
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
  } else {
    setValue(path, value);
  }
  state.dirty = true;
  updateJsonEditor({ silent: true });
  if (path.startsWith('design.colors') || path.startsWith('design.fonts') || path === 'design.customCss') {
    updateDesignPreview();
  }
}

function updateJsonEditor(options = {}) {
  if (!elements.jsonEditor || !state.data) return;
  const previousSelectionStart = elements.jsonEditor.selectionStart;
  const previousSelectionEnd = elements.jsonEditor.selectionEnd;
  elements.jsonEditor.value = JSON.stringify(state.data, null, 2);
  if (options.silent) {
    elements.jsonEditor.selectionStart = previousSelectionStart;
    elements.jsonEditor.selectionEnd = previousSelectionEnd;
  }
}

function formatJsonEditor() {
  if (!elements.jsonEditor) return;
  try {
    const parsed = JSON.parse(elements.jsonEditor.value);
    elements.jsonEditor.value = JSON.stringify(parsed, null, 2);
    elements.jsonStatus.textContent = 'JSON formatted.';
    elements.jsonStatus.className = 'admin-status';
  } catch (error) {
    elements.jsonStatus.textContent = 'Cannot format invalid JSON.';
    elements.jsonStatus.className = 'admin-status admin-status--error';
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

async function saveFromJsonEditor() {
  if (!elements.jsonEditor) return;
  try {
    const parsed = JSON.parse(elements.jsonEditor.value);
    await saveData(parsed);
  } catch (error) {
    elements.jsonStatus.textContent = 'Cannot save: JSON is invalid.';
    elements.jsonStatus.className = 'admin-status admin-status--error';
  }
}

async function saveData(nextData) {
  if (!state.token) {
    elements.tokenStatus.textContent = 'Set an admin token before saving.';
    elements.tokenStatus.className = 'admin-status admin-status--error';
    return;
  }
  try {
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
    state.data = nextData;
    state.snapshot = JSON.stringify(nextData);
    state.dirty = false;
    populateForm();
    elements.jsonStatus.textContent = 'Changes saved successfully.';
    elements.jsonStatus.className = 'admin-status admin-status--success';
  } catch (error) {
    console.error(error);
    elements.jsonStatus.textContent = error.message || 'Save failed. Check your token and try again.';
    elements.jsonStatus.className = 'admin-status admin-status--error';
  }
}

init();
