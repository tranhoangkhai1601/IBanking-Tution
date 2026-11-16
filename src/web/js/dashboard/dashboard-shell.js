import '../components/auth-brand.js';
import '../components/language-switch.js';
import '../components/menu-toggle.js';
import { APP_CONFIG, PAGE_PATHS, STORAGE_KEYS } from '../../config/config.js';
import { initI18n, setMessage, t } from '../../i18n/i18n.js';
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
  const userDisplay = document.getElementById('user-display');
  const userName = userDisplay.querySelector('.user-name');
  const signIn = document.getElementById('btn-signin');
  const logout = document.getElementById('btn-logout');
  const authLinks = document.querySelectorAll('.auth-only');
  const statusElement = document.getElementById('dashboard-i18n-status');
  const pageContent = document.querySelector('.dashboard-layout');
  let profileReady = false;

  function renderPage() {
    if (!profileReady) return;

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
    statusElement,
    onChange: renderPage
  });
  if (!ready) return false;

  signIn.addEventListener('click', () => {
    window.location.assign(PAGE_PATHS.login);
  });
  signIn.disabled = false;

  pageContent.inert = true;
  try {
    let response = await fetch('/api/v1/customers/me', {
      credentials: 'same-origin'
    });

    if (response.status === 401) {
      const refreshResponse = await fetch('/api/v1/auth/refresh',{
        method: 'POST',
        credentials: 'same-origin'
      });

      if (refreshResponse.ok) {
        response = await fetch('/api/v1/customers/me', {
          credentials: 'same-origin'
        });
      }
    }

    if (response.status === 401) {
      const user = getUser();
      if (user?.isLoggedIn) {
        localStorage.removeItem(STORAGE_KEYS.user);
      }

      profileReady = true;
      pageContent.inert = false;
      if (requiresAuth) {
        window.location.href = PAGE_PATHS.homepage;
        return false;
      }
    } else {
      if (!response.ok) {
        throw new Error(`Customer profile request failed: ${response.status}`);
      }

      const responseData = await response.json();
      const customer = responseData?.data;
      if (
        !customer ||
        typeof customer.customer_id !== 'string' ||
        !Array.isArray(customer.accounts)
      ) {
        throw new Error('Customer profile response has an invalid shape');
      }

      const user = {
        ...getUser(),
        ...customer,
        isLoggedIn: true
      };
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      profileReady = true;
      pageContent.inert = false;
    }
  } catch {
    setMessage(statusElement, 'dashboardCustomerLoadError');
    return false;
  }

  if (!profileReady) return false;

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) renderPage();
  });
  window.addEventListener('storage', (event) => {
    if (event.storageArea === localStorage && isAccountStorageKey(event.key)) renderPage();
  });

  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      if (!response.ok) {
        throw new Error(`Logout request failed: ${response.status}`);
      }

      const user = getUser() || {};
      localStorage.removeItem(STORAGE_KEYS.user);
      setMessage(statusElement, '');
      renderPage();
    } catch {
      setMessage(statusElement, 'dashboardLogoutError');
    } finally {
      logout.disabled = false;
    }
  });
  logout.disabled = false;
  renderPage();
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
