const serviceSearch = document.querySelector('#service-search');
const filterButtons = document.querySelectorAll('.filter-button');
const sortSelect = document.querySelector('#service-sort');
const serviceItems = Array.from(document.querySelectorAll('.service-item'));
const serviceLists = document.querySelectorAll('.service-list');
const cartList = document.querySelector('.cart__items');
const subtotalEl = document.querySelector('#cart-subtotal');
const durationEl = document.querySelector('#cart-duration');
const startCheckout = document.querySelector('#start-checkout');
const cartForm = document.querySelector('.cart__form');

const cart = [];

function normalize(text) {
  return text.toLowerCase().trim();
}

function filterServices() {
  const query = normalize(serviceSearch?.value || '');
  const activeFilter = document.querySelector('.filter-button.is-active')?.dataset.filter || 'all';

  serviceItems.forEach((item) => {
    const matchesText = !query || normalize(item.textContent).includes(query);
    const matchesCategory = activeFilter === 'all' || item.dataset.category === activeFilter;
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
    default: (a, b) => serviceItems.indexOf(a) - serviceItems.indexOf(b),
  };

  const compare = compareFns[criteria] || compareFns.default;

  serviceLists.forEach((list) => {
    const items = Array.from(list.querySelectorAll('.service-item'));
    const sorted = items.sort(compare);
    sorted.forEach((item) => list.appendChild(item));
  });
}

function updateCart() {
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
          <div class="cart__item-meta">${item.duration} min • $${item.price}</div>
        </div>
        <button class="cart__remove" type="button" data-index="${index}">Remove</button>
      `;
      cartList.appendChild(li);
    });
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const totalDuration = cart.reduce((sum, item) => sum + item.duration, 0);

  subtotalEl.textContent = `$${subtotal}`;
  durationEl.textContent = `${totalDuration} min`;
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

serviceLists.forEach((list) => {
  list.addEventListener('click', (event) => {
    const target = event.target;
    if (target.matches('.service-item__add')) {
      addToCart(target);
    }
  });
});

cartList?.addEventListener('click', (event) => {
  const target = event.target;
  if (target.matches('.cart__remove')) {
    const index = Number(target.dataset.index);
    removeFromCart(index);
  }
});

serviceSearch?.addEventListener('input', filterServices);

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((btn) => btn.classList.remove('is-active'));
    button.classList.add('is-active');
    filterServices();
  });
});

sortSelect?.addEventListener('change', () => {
  sortServices(sortSelect.value);
});

startCheckout?.addEventListener('click', () => {
  cartForm?.scrollIntoView({ behavior: 'smooth' });
  cartForm?.querySelector('input, textarea')?.focus({ preventScroll: true });
});

cartForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!cart.length) {
    alert('Please add at least one service before submitting your request.');
    return;
  }

  alert('Thank you! Your appointment request has been sent. We will reach out shortly.');
  cart.splice(0, cart.length);
  cartForm.reset();
  updateCart();
});

filterServices();
updateCart();
