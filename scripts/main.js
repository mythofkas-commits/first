const navToggle = document.querySelector('.nav-toggle');
const primaryNav = document.querySelector('#primary-navigation');
const yearEl = document.querySelectorAll('#year');

if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isOpen));
    primaryNav.classList.toggle('is-open');
  });
}

if (yearEl.length) {
  const year = new Date().getFullYear();
  yearEl.forEach((node) => {
    node.textContent = year;
  });
}

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
