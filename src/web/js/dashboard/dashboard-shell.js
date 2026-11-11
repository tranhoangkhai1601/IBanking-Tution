import '../components/auth-brand.js';
import '../components/language-switch.js';
import '../components/menu-toggle.js';
import { APP_CONFIG, PAGE_PATHS, STORAGE_KEYS } from '../../config/config.js';
import { initI18n, t } from '../../i18n/i18n.js';
import { isAccountStorageKey } from './customer-accounts.js';

export function getUser() {
  try {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.user));
    return user && typeof user === 'object' && !Array.isArray(user) ? user : null;
  } catch {
    return null;
  }
}

export async function initDashboard({ titleKey, render, requiresAuth = false }) {
  if (requiresAuth && !getUser()?.isLoggedIn) {
    window.location.href = PAGE_PATHS.homepage;
    return false;
  }

  const userDisplay = document.getElementById('user-display');
  const userName = userDisplay.querySelector('.user-name');
  const signIn = document.getElementById('btn-signin');
  const logout = document.getElementById('btn-logout');
  const authLinks = document.querySelectorAll('.auth-only');

  function renderPage() {
    const user = getUser();
    const isLoggedIn = Boolean(user?.isLoggedIn);
    if (!isLoggedIn && requiresAuth) {
      window.location.href = PAGE_PATHS.homepage;
      return;
    }

    userDisplay.hidden = !isLoggedIn;
    userName.textContent = isLoggedIn ? user.full_name ?? user.name ?? '' : '';
    signIn.hidden = isLoggedIn;
    logout.hidden = !isLoggedIn;
    authLinks.forEach(link => { link.hidden = !isLoggedIn; });
    render(isLoggedIn, user);
  }

  const ready = await initI18n({
    titleKey,
    statusElement: document.getElementById('dashboard-i18n-status'),
    onChange: renderPage
  });
  if (!ready) return false;

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) renderPage();
  });
  window.addEventListener('storage', (event) => {
    if (event.storageArea === localStorage && isAccountStorageKey(event.key)) renderPage();
  });

  signIn.addEventListener('click', () => {
    window.location.assign(PAGE_PATHS.login);
  });
  logout.addEventListener('click', () => {
    // Khi nối backend, gọi API kết thúc phiên rồi cập nhật trạng thái giao diện.
    const user = getUser() || {};
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ ...user, isLoggedIn: false }));
    renderPage();
  });
  signIn.disabled = false;
  logout.disabled = false;
  return true;
}

export function formatVND(amount) {
  if (!Number.isFinite(amount)) return '—';
  return `${amount.toLocaleString(APP_CONFIG.currencyLocale)} ${APP_CONFIG.currencyCode}`;
}

export function renderAccountStatus(element, active) {
  const key = typeof active === 'boolean'
    ? (active ? 'dashboardAccountActive' : 'dashboardAccountInactive')
    : 'dashboardAccountStatusUnavailable';
  element.textContent = t(key);
  element.classList.toggle('status-success', active === true);
}
