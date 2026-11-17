import { formatVND, getUser, initDashboard, renderAccountStatus } from './dashboard-shell.js';
import { setMessage, t } from '../../i18n/i18n.js';
import {
  canPayWithAccount, getAccountDisplayId, getAccountKey, getCustomerAccounts, getUserKey,
  readStoredTransactionHistory, selectPaymentAccount
} from './customer-accounts.js';

const historyStatuses = {
  Success: 'dashboardHistorySuccess',
  Pending: 'dashboardHistoryPending',
  Failed: 'dashboardHistoryFailed'
};

const accountList = document.getElementById('home-accounts');
const historyContainerEl = document.getElementById('history-container');
const historyDetailDialog = document.getElementById('history-detail-dialog');
const visibleRowLimit = 3;
const limitAccountRows = createRowLimiter(accountList);
const limitHistoryRows = createRowLimiter(historyContainerEl);
let historyCustomerId = null;
let customerHistory = null;
let historyRequestCustomerId = null;
let historyRequestVersion = 0;

function resetCustomerHistory() {
  historyCustomerId = null;
  customerHistory = null;
  historyRequestCustomerId = null;
  historyRequestVersion += 1;
}

function createRowLimiter(container) {
  let first;
  let last;
  function fitRows() {
    const height = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
    const horizontalScrollbar = container.offsetHeight - container.clientHeight;
    container.style.maxBlockSize = `${height + horizontalScrollbar}px`;
  }
  const observer = new ResizeObserver(fitRows);

  return (rows, header) => {
    observer.disconnect();
    if (rows.length <= visibleRowLimit) {
      container.style.removeProperty('max-block-size');
      return;
    }

    first = header ?? rows[0];
    last = rows[visibleRowLimit - 1];
    fitRows();
    observer.observe(container);
    if (header) observer.observe(header);
    for (const row of Array.from(rows).slice(0, visibleRowLimit)) {
      observer.observe(row, { box: 'border-box' });
    }
  };
}

const demoHistory = [{ date: '02/11/2026', amount: -3500000, status: 'Success' }];

function renderHomeAccounts(user, { accounts, isDemo, selectedAccount }) {
  const status = document.getElementById('home-accounts-status');
  const note = document.getElementById('home-accounts-note');
  const template = document.getElementById('home-account-template');
  const items = accounts.map(account => {
    const row = template.content.cloneNode(true);
    const title = getAccountDisplayId(account) || t('dashboardAccount');
    row.querySelector('[data-account-title]').textContent = title;
    renderAccountStatus(row.querySelector('[data-account-status]'), account.account_active);
    row.querySelector('[data-balance-label]').textContent = t('dashboardBalance');
    row.querySelector('[data-account-balance]').textContent = formatVND(account.balance);

    const button = row.querySelector('[data-select-account]');
    const selected = getAccountKey(account) === getAccountKey(selectedAccount);
    button.textContent = t(selected ? 'dashboardAccountSelected' : 'dashboardSelectAccount');
    button.setAttribute('aria-label', `${button.textContent} — ${title}`);
    button.setAttribute('aria-pressed', String(selected));
    button.disabled = !canPayWithAccount(account);
    button.addEventListener('click', () => {
      if (selected) return;
      try {
        selectPaymentAccount(user, account);
      } catch {
        setMessage(status, 'dashboardAccountSelectionError');
        return;
      }
      renderHomeAccounts(user, getCustomerAccounts(user));
      accountList.querySelector('[aria-pressed="true"]')?.focus();
    });

    return row;
  });

  const scrollTop = accountList.scrollTop;
  accountList.replaceChildren(...items);
  accountList.hidden = items.length === 0;

  const scrollable = items.length > visibleRowLimit;
  accountList.classList.toggle('home-account-list--scrollable', scrollable);
  if (scrollable) {
    accountList.tabIndex = 0;
  } else {
    accountList.removeAttribute('tabindex');
  }
  limitAccountRows(accountList.children);
  accountList.scrollTop = scrollTop;
  note.hidden = !isDemo;
  const emptyMessage = user?.isLoggedIn ? 'dashboardNoAccounts' : 'dashboardAccountsSignIn';
  setMessage(status, items.length ? '' : emptyMessage);
}

function showHistoryDetails(item, { student, amount, accountNumber, statusKey, statusClass }) {
  const fields = {
    date: item.date,
    student,
    amount,
    account: accountNumber,
    'merchant-account': item.merchantAccountNumber
  };
  for (const [name, value] of Object.entries(fields)) {
    document.getElementById(`history-detail-${name}`).textContent = value || '—';
  }

  const status = document.getElementById('history-detail-status');
  status.className = statusClass;
  setMessage(status, statusKey);
  if (!statusKey) status.textContent = item.status || '—';

  const detail = document.getElementById('history-detail-description');
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  setMessage(detail, description ? '' : 'dashboardHistoryNoDescription');
  if (description) detail.textContent = description;
  historyDetailDialog.showModal();
}

function renderHistoryRow(body, item, accountsByKey, userAccountNumber) {
  const row = body.insertRow();
  const student = item.studentName ??
    (item.content === 'Tuition payment' ? item.description : item.content) ??
    item.description;
  row.insertCell().textContent = item.date || '—';
  row.insertCell().textContent = student || '—';

  const amountCell = row.insertCell();
  if (Number.isFinite(item.amount)) {
    const isDebit = item.amount < 0;
    amountCell.className = isDebit ? 'history-amount--debit' : 'history-amount--credit';
    amountCell.textContent = (isDebit ? '' : '+') + formatVND(item.amount);
  } else {
    amountCell.textContent = '—';
  }

  const ownsPayment = Boolean(item.payerKey && item.payerKey === userAccountNumber);
  const paymentAccount = item.paymentAccount ??
    (ownsPayment ? accountsByKey.get(item.paymentAccountKey) : null);
  const accountCell = row.insertCell();
  accountCell.className = 'history-payment-account';
  accountCell.textContent = getAccountDisplayId(paymentAccount) || '—';

  const statusKey = Object.hasOwn(historyStatuses, item.status) ? historyStatuses[item.status] : '';
  const statusClass = statusKey ? `status-${item.status.toLowerCase()}` : '';
  const status = document.createElement('span');
  status.className = statusClass;
  status.textContent = statusKey ? t(statusKey) : item.status || '—';
  row.insertCell().append(status);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'outline-button history-detail-button';
  button.textContent = t('dashboardHistoryDetail');
  button.setAttribute('aria-haspopup', 'dialog');
  button.addEventListener('click', () => showHistoryDetails(item, {
    student,
    amount: amountCell.textContent,
    accountNumber: getAccountDisplayId(paymentAccount),
    statusKey,
    statusClass
  }));
  row.insertCell().append(button);
}

function renderTransactionHistory(history, user, accounts) {
  const { scrollLeft, scrollTop } = historyContainerEl;
  limitHistoryRows([]);

  if (!user) {
    historyContainerEl.innerHTML = `
      <p class="status-message" role="status">
        ${t('dashboardHistorySignIn', {
          signIn: `<a href="#">${t('dashboardHistorySignInLink')}</a>`
        })}
      </p>
    `;
    historyContainerEl.querySelector('a').addEventListener('click', event => {
      event.preventDefault();
      document.getElementById('btn-signin').click();
    });
    return;
  }

  if (!history?.length) {
    const message = document.createElement('p');
    const isLoading = history === undefined;
    const isError = history === null;
    message.className = 'status-message';
    message.classList.toggle('status-message--error', isError);
    message.setAttribute('role', isError ? 'alert' : 'status');
    message.textContent = t(
      isLoading
        ? 'dashboardHistoryLoading'
        : isError
          ? 'dashboardHistoryError'
          : 'dashboardHistoryEmpty'
    );
    historyContainerEl.replaceChildren(message);
    return;
  }

  historyContainerEl.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th scope="col">${t('dashboardHistoryDate')}</th>
          <th scope="col">${t('dashboardHistoryStudent')}</th>
          <th scope="col">${t('dashboardHistoryAmount')}</th>
          <th scope="col">${t('dashboardPayerAccount')}</th>
          <th scope="col">${t('dashboardHistoryStatus')}</th>
          <th scope="col">${t('dashboardHistoryDetail')}</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;
  const body = historyContainerEl.querySelector('tbody');
  const accountsByKey = new Map(accounts.map(account => [getAccountKey(account), account]));
  for (const item of history) {
    renderHistoryRow(body, item, accountsByKey, getUserKey(user));
  }
  limitHistoryRows(body.rows, body.previousElementSibling);
  historyContainerEl.scrollLeft = scrollLeft;
  historyContainerEl.scrollTop = scrollTop;
}

function renderHomePageAuth(isLoggedIn, user) {
  if (!isLoggedIn) {
    resetCustomerHistory();
    renderHomeAccounts(null, { accounts: [], isDemo: false });
    renderTransactionHistory(null, null, []);
    return;
  }

  const storedHistory = readStoredTransactionHistory();
  const { accounts, isDemo, selectedAccount } = getCustomerAccounts(user, storedHistory ?? []);
  renderHomeAccounts(user, { accounts, isDemo, selectedAccount });

  if (isDemo) {
    resetCustomerHistory();
    renderTransactionHistory(demoHistory, user, accounts);
    return;
  }

  if (historyCustomerId !== user.customer_id) {
    resetCustomerHistory();
    historyCustomerId = user.customer_id;
  }
  if (Array.isArray(customerHistory)) {
    renderTransactionHistory(customerHistory, user, accounts);
    return;
  }

  renderTransactionHistory(undefined, user, accounts);
  if (historyRequestCustomerId === user.customer_id) return;
  const requestedCustomerId = user.customer_id;
  historyRequestCustomerId = requestedCustomerId;
  const requestVersion = ++historyRequestVersion;

  void (async () => {
    try {
      let response = await fetch('/api/v1/customers/me/transactions', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (response.status === 401) {
        const refreshResponse = await fetch('/api/v1/auth/refresh', {
          method: 'PUT',
          credentials: 'same-origin'
        });
        if (refreshResponse.ok) {
          response = await fetch('/api/v1/customers/me/transactions', {
            credentials: 'same-origin',
            cache: 'no-store'
          });
        }
      }
      if (!response.ok) {
        throw new Error(`Transaction history request failed: ${response.status}`);
      }
      const body = await response.json();
      if (!Array.isArray(body?.data)) {
        throw new Error('Transaction history response has an invalid shape.');
      }
      const fetchedHistory = body.data.map(item => {
        const amount = Number(item.amount);
        if (
          typeof item.transaction_id !== 'string' ||
          typeof item.date !== 'string' ||
          !Number.isFinite(amount) ||
          typeof item.status !== 'string'
        ) {
          throw new Error('Transaction history contains an invalid entry.');
        }
        return { ...item, amount };
      });
      if (
        historyCustomerId === requestedCustomerId &&
        historyRequestVersion === requestVersion
      ) {
        customerHistory = fetchedHistory;
      }
    } catch {
      if (
        historyCustomerId === requestedCustomerId &&
        historyRequestVersion === requestVersion
      ) {
        customerHistory = null;
      }
    } finally {
      if (
        historyRequestCustomerId === requestedCustomerId &&
        historyRequestVersion === requestVersion
      ) {
        historyRequestCustomerId = null;
      }
      if (
        historyCustomerId !== requestedCustomerId ||
        historyRequestVersion !== requestVersion
      ) return;
      const currentUser = getUser();
      if (currentUser?.customer_id !== requestedCustomerId) return;
      const latestAccounts = getCustomerAccounts(currentUser).accounts;
      renderTransactionHistory(customerHistory, currentUser, latestAccounts);
    }
  })();
}

window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  resetCustomerHistory();
  const user = getUser();
  renderHomePageAuth(Boolean(user?.isLoggedIn), user);
});

await initDashboard({ titleKey: 'dashboardHome', render: renderHomePageAuth });
