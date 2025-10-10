const cart = [];
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

let serviceSearch;
let sortSelect;
let cartList;
let subtotalEl;
let durationEl;
let startCheckout;
let stripeButton;
let cmsDashboard;
let integrationContainer;
let cartForm;
let filterButtons = [];
let serviceItems = [];
let serviceLists = [];
let defaultOrder = new Map();
let initialized = false;
let checkoutConfig = {
  mode: 'form',
  stripe: { apiKey: null, sessionId: null },
  cms: { endpoint: null, token: null }
};

function initDomReferences() {
  serviceSearch = document.querySelector('#service-search');
  sortSelect = document.querySelector('#service-sort');
  cartList = document.querySelector('.cart__items');
  subtotalEl = document.querySelector('#cart-subtotal');
  durationEl = document.querySelector('#cart-duration');
  startCheckout = document.querySelector('#start-checkout');
  stripeButton = document.querySelector('[data-role="stripe-button"]');
  cmsDashboard = document.querySelector('[data-role="cms-dashboard"]');
  integrationContainer = document.querySelector('.cart__integrations');
  cartForm = document.querySelector('.cart__form');
  if (startCheckout && !startCheckout.dataset.defaultLabel) {
    startCheckout.dataset.defaultLabel = startCheckout.textContent;
  }
}

function refreshCollections() {
  filterButtons = Array.from(document.querySelectorAll('.filter-button'));
  serviceItems = Array.from(document.querySelectorAll('.service-item'));
  serviceLists = Array.from(document.querySelectorAll('.service-list'));
  defaultOrder = new Map(serviceItems.map((item, index) => [item, index]));
}

function handleFilterClick(event) {
  const button = event.currentTarget;
  filterButtons.forEach((btn) => btn.classList.remove('is-active'));
  button.classList.add('is-active');
  filterServices();
}

function attachFilterListeners() {
  filterButtons.forEach((button) => {
    if (button.dataset.listenerAttached) return;
    button.dataset.listenerAttached = 'true';
    button.addEventListener('click', handleFilterClick);
  });
}

function handleServiceListClick(event) {
  const target = event.target;
  if (target.matches('.service-item__add')) {
    addToCart(target);
  }
}

function attachServiceListListeners() {
  serviceLists.forEach((list) => {
    if (list.dataset.listenerAttached) return;
    list.dataset.listenerAttached = 'true';
    list.addEventListener('click', handleServiceListClick);
  });
}

function normalize(text) {
  return text.toLowerCase().trim();
}

function filterServices() {
  const query = normalize(serviceSearch?.value || '');
  const activeFilter = document.querySelector('.filter-button.is-active')?.dataset.filter || 'all';

  serviceItems.forEach((item) => {
    const matchesText = !query || normalize(item.textContent).includes(query);
    const categories = (item.dataset.category || '').split(/\s+/).filter(Boolean);
    const matchesCategory = activeFilter === 'all' || categories.includes(activeFilter);
    item.style.display = matchesText && matchesCategory ? '' : 'none';
  });

  serviceLists.forEach((list) => {
    const hasVisibleChildren = Array.from(list.children).some((child) => child.style.display !== 'none');
    list.parentElement.style.display = hasVisibleChildren ? '' : 'none';
  });
}

function sortServices(criteria) {
  const compareFns = {
    'price-low': (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
    'price-high': (a, b) => Number(b.dataset.price) - Number(a.dataset.price),
    duration: (a, b) => Number(a.dataset.duration) - Number(b.dataset.duration),
    default: (a, b) => (defaultOrder.get(a) || 0) - (defaultOrder.get(b) || 0),
  };

  const compare = compareFns[criteria] || compareFns.default;

  serviceLists.forEach((list) => {
    const items = Array.from(list.querySelectorAll('.service-item'));
    const sorted = items.sort(compare);
    sorted.forEach((item) => list.appendChild(item));
  });
}

function updateCart() {
  if (!cartList) return;
  cartList.innerHTML = '';
  if (!cart.length) {
    const emptyState = document.createElement('li');
    emptyState.textContent = 'No services selected yet.';
    emptyState.className = 'cart__item cart__item--empty';
    cartList.appendChild(emptyState);
  } else {
    cart.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'cart__item';
      li.innerHTML = `
        <div>
          <div class="cart__item-title">${item.name}</div>
          <div class="cart__item-meta">${item.duration} min • ${currencyFormatter.format(item.price)}</div>
        </div>
        <button class="cart__remove" type="button" data-index="${index}">Remove</button>
      `;
      cartList.appendChild(li);
    });
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const totalDuration = cart.reduce((sum, item) => sum + item.duration, 0);

  if (subtotalEl) {
    subtotalEl.textContent = currencyFormatter.format(subtotal);
  }
  if (durationEl) {
    durationEl.textContent = `${totalDuration} min`;
  }
}

function addToCart(button) {
  const parent = button.closest('.service-item');
  if (!parent) return;

  const service = {
    name: button.dataset.service,
    price: Number(parent.dataset.price),
    duration: Number(parent.dataset.duration),
  };

  cart.push(service);
  updateCart();

  button.textContent = 'Added';
  button.disabled = true;
  button.classList.add('is-added');
  setTimeout(() => {
    button.textContent = 'Add';
    button.disabled = false;
    button.classList.remove('is-added');
  }, 1500);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
}

function buildFilters(filters = []) {
  const containers = document.querySelectorAll('[data-list="order.filters"]');
  if (!containers.length) return;
  const list = Array.isArray(filters) && filters.length ? filters : null;
  containers.forEach((container) => {
    if (!list) {
      container.querySelectorAll('.filter-button').forEach((button, index) => {
        if (index === 0) {
          button.classList.add('is-active');
        }
      });
      return;
    }
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

function buildServiceMenu(groups = []) {
  const containers = document.querySelectorAll('[data-list="order.serviceMenu"]');
  if (!containers.length) return;
  const list = Array.isArray(groups) && groups.length ? groups : null;
  containers.forEach((container) => {
    if (!list) return;
    container.innerHTML = '';
    list.forEach((group) => {
      const section = document.createElement('div');
      section.className = 'service-group';
      if (group.id) section.id = group.id;
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
            <span class="service-item__price">${currencyFormatter.format(Number(service.price) || 0)}</span>
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

function initializeOrderPage(content) {
  if (!initialized) {
    initDomReferences();
    if (!cartList) return;

    cartList.addEventListener('click', (event) => {
      const target = event.target;
      if (target.matches('.cart__remove')) {
        const index = Number(target.dataset.index);
        removeFromCart(index);
      }
    });

    serviceSearch?.addEventListener('input', filterServices);

    sortSelect?.addEventListener('change', () => {
      sortServices(sortSelect.value);
    });

    startCheckout?.addEventListener('click', handleCheckoutClick);

    cartForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!cart.length) {
        alert('Please add at least one service before submitting your request.');
        return;
      }
      const message = window.__SITE_CONTENT__?.orderPage?.checkout?.submitMessage
        || 'Thank you! Your appointment request has been sent. We will reach out shortly.';
      alert(message);
      cart.splice(0, cart.length);
      cartForm.reset();
      updateCart();
    });

    initialized = true;
  }

  if (content?.orderPage) {
    buildFilters(content.orderPage.filters);
    buildServiceMenu(content.orderPage.serviceMenu);
    configureCheckout(content.orderPage.checkout);
  }

  refreshCollections();
  attachFilterListeners();
  attachServiceListListeners();
  filterServices();
  updateCart();
}

function handleCheckoutClick(event) {
  if (checkoutConfig.mode === 'stripe') {
    event.preventDefault();
    return;
  }
  cartForm?.scrollIntoView({ behavior: 'smooth' });
  cartForm?.querySelector('input, textarea, select')?.focus({ preventScroll: true });
}

function configureCheckout(checkout = {}) {
  checkoutConfig = {
    mode: checkout?.mode || 'form',
    stripe: checkout?.stripe || {},
    cms: checkout?.cms || {},
  };

  if (startCheckout) {
    const label = checkout?.cta || startCheckout.dataset.defaultLabel || startCheckout.textContent;
    if (label) {
      startCheckout.textContent = label;
    }
    const hideStart = checkoutConfig.mode === 'stripe' && checkoutConfig.stripe?.enabled;
    startCheckout.hidden = hideStart;
    startCheckout.disabled = hideStart;
  }

  if (cartForm) {
    cartForm.hidden = checkoutConfig.mode === 'stripe' && checkoutConfig.stripe?.enabled;
  }

  if (stripeButton) {
    const stripe = checkoutConfig.stripe;
    if (stripe?.enabled && stripe.checkoutLink) {
      stripeButton.hidden = false;
      stripeButton.textContent = stripe.buttonLabel || 'Pay & Reserve with Stripe';
      stripeButton.href = stripe.checkoutLink;
      stripeButton.target = stripe.openInNewTab === false ? '_self' : '_blank';
      stripeButton.rel = stripeButton.target === '_blank' ? 'noopener' : '';
    } else {
      stripeButton.hidden = true;
      stripeButton.removeAttribute('href');
    }
  }

  if (cmsDashboard) {
    const cms = checkoutConfig.cms;
    if (cms?.dashboardUrl) {
      cmsDashboard.hidden = false;
      cmsDashboard.href = cms.dashboardUrl;
      cmsDashboard.textContent = cms.buttonLabel || 'Open booking CMS';
      cmsDashboard.target = '_blank';
      cmsDashboard.rel = 'noopener';
    } else {
      cmsDashboard.hidden = true;
      cmsDashboard.removeAttribute('href');
    }
  }

  if (integrationContainer) {
    const stripeVisible = Boolean(stripeButton && !stripeButton.hidden);
    const cmsVisible = Boolean(cmsDashboard && !cmsDashboard.hidden);
    integrationContainer.hidden = !stripeVisible && !cmsVisible;
  }
}

if (document.body && document.body.classList.contains('order-page')) {
  const immediateContent = window.__SITE_CONTENT__;
  if (immediateContent) {
    initializeOrderPage(immediateContent);
  }
  document.addEventListener('site:content-loaded', (event) => {
    initializeOrderPage(event.detail);
  }, { once: true });
}
