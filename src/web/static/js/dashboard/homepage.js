import { STORAGE_KEYS } from '../../config/config.js';
import { initDashboard, formatVND } from './dashboard-shell.js';
import { t } from '../../i18n/i18n.js';

const historyStatuses = {
  Success: 'dashboardHistorySuccess',
  Pending: 'dashboardHistoryPending',
  Failed: 'dashboardHistoryFailed'
};

// Lấy lịch sử từ localStorage (bên Transaction)
function getTransactionHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.transactionHistory);
    if (stored !== null) {
      const history = JSON.parse(stored);
      return Array.isArray(history) && history.every(item => typeof item?.status === 'string')
        ? history : null;
    }
  } catch (e) {
    return null;
  }

  // Mặc định lần đầu
  return [
    { date: "02/11/2026", content: "Tuition payment", amount: -3500000, status: "Success" }
  ];
}

function saveTransactionHistory(history) {
  localStorage.setItem(STORAGE_KEYS.transactionHistory, JSON.stringify(history));
}

function renderHomePageAuth(isLoggedIn, user) {
  const accNumEl = document.getElementById('account-number');
  const accBalEl = document.getElementById('account-balance');
  const historyContainerEl = document.getElementById('history-container');

  if (isLoggedIn && user) {
    if (accNumEl) accNumEl.innerText = user.accountNumber ?? "-";
    if (accBalEl) accBalEl.innerText = formatVND(user.balance ?? 0);

    if (historyContainerEl) {
      const history = getTransactionHistory();

      if (history === null) {
        historyContainerEl.innerHTML = `
          <p class="status-message status-message--error" role="alert">
            ${t('dashboardHistoryError')}
          </p>
        `;
      } else if (history.length === 0) {
        historyContainerEl.innerHTML = `
          <p class="status-message" role="status">
            ${t('dashboardHistoryEmpty')}
          </p>
        `;
      } else {
        historyContainerEl.innerHTML = `
          <table class="history-table">
            <thead>
              <tr>
                <th>${t('dashboardHistoryDate')}</th>
                <th>${t('dashboardHistoryDescription')}</th>
                <th>${t('dashboardHistoryAmount')}</th>
                <th>${t('dashboardHistoryStatus')}</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        `;
        const body = historyContainerEl.querySelector('tbody');
        for (const item of history) {
          const row = body.insertRow();
          row.insertCell().textContent = item.date;
          row.insertCell().textContent = item.content === 'Tuition payment'
            ? t('dashboardHistoryPayment') : item.content;

          const amount = row.insertCell();
          const isNegative = item.amount < 0;
          amount.textContent = (isNegative ? '' : '+') + formatVND(item.amount);
          amount.style.color = isNegative ? 'var(--color-error)' : '#10B981';
          amount.style.fontWeight = '700';

          const status = document.createElement('span');
          if (Object.hasOwn(historyStatuses, item.status)) {
            status.className = 'status-' + item.status.toLowerCase();
            status.textContent = t(historyStatuses[item.status]);
          } else {
            status.textContent = item.status;
          }
          row.insertCell().append(status);
        }
      }
    }
  } else {
    if (accNumEl) accNumEl.innerText = "-";
    if (accBalEl) accBalEl.innerText = formatVND(0);

    if (historyContainerEl) {
      historyContainerEl.innerHTML = `
        <p class="status-message" role="status">
          ${t('dashboardHistorySignIn', {
            signIn: `<a href="#">${t('dashboardHistorySignInLink')}</a>`
          })}
        </p>
      `;
      historyContainerEl.querySelector('a').addEventListener('click', (event) => {
        event.preventDefault();
        document.getElementById('btn-signin').click();
      });
    }
  }
}
await initDashboard({ titleKey: 'dashboardHome', render: renderHomePageAuth });
