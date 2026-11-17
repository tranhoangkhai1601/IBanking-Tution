import { STORAGE_KEYS } from '../../config/config.js';

// Dữ liệu bổ sung cho phiên demo, theo các trường của Customer_Details.
const demoSessionAccountNumber = '1023456789';
const demoAccounts = [
  {
    customer_id: 'demo-customer',
    account_id: 'demo-payment',
    account_type: 'payment',
    account_open_date: '2024-09-05',
    account_active: true
  },
  {
    customer_id: 'demo-customer',
    account_id: 'demo-payment-secondary',
    accountNumber: '1023456790',
    account_type: 'payment',
    account_open_date: '2025-03-12',
    balance: 2500000,
    account_active: false,
    description: 'Quỹ học phí'
  },
  {
    customer_id: 'demo-customer',
    account_id: 'demo-acb-payment',
    accountNumber: '1023456791',
    account_type: 'payment',
    account_open_date: '2025-06-14',
    balance: 8500000,
    account_active: true
  },
  {
    customer_id: 'demo-customer',
    account_id: 'demo-techcombank-payment',
    accountNumber: '1023456792',
    account_type: 'payment',
    account_open_date: '2025-08-21',
    balance: 1200000,
    account_active: true
  }
];

const selectionPrefix = `${STORAGE_KEYS.selectedPaymentAccount}:`;

export function getAccountKey(account) {
  return account?.account_id ?? account?.accountNumber;
}

export function getAccountDisplayId(account) {
  return account?.account_num ?? account?.accountNumber ?? account?.account_id ?? '';
}

export function getUserKey(user) {
  return user?.customer_id ?? user?.accountNumber ?? user?.email;
}

export function canPayWithAccount(account) {
  return account?.account_active !== false && Number.isFinite(account?.balance);
}

// Lớp lưu trữ demo dùng chung. Phân biệt chưa có lịch sử (undefined) và dữ liệu lỗi (null).
export function readStoredTransactionHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.transactionHistory);
    if (stored === null) return undefined;

    const history = JSON.parse(stored);
    return Array.isArray(history) && history.every(item => typeof item?.status === 'string')
      ? history
      : null;
  } catch {
    return null;
  }
}

export function selectPaymentAccount(user, account) {
  const userKey = getUserKey(user);
  if (!userKey || !getAccountKey(account)) return;

  localStorage.setItem(selectionPrefix + userKey, getAccountKey(account));
}

export function isAccountStorageKey(key) {
  return key === null ||
    key === STORAGE_KEYS.user ||
    key === STORAGE_KEYS.transactionHistory ||
    key.startsWith(selectionPrefix);
}

export function getCustomerAccounts(user, history = readStoredTransactionHistory() ?? []) {
  const userKey = getUserKey(user);
  if (!userKey) {
    return { accounts: [], isDemo: false, selectedAccount: null };
  }

  const hasServerAccounts = Array.isArray(user.accounts);
  const isDemo = !hasServerAccounts && user.accountNumber === demoSessionAccountNumber;
  const [primaryAccount, ...otherAccounts] = demoAccounts;
  const records = hasServerAccounts
    ? user.accounts.map(account => ({
      ...account,
      balance: typeof account.balance === 'number'
        ? account.balance
        : typeof account.balance === 'string'
          ? Number(account.balance)
          : Number.NaN
    }))
    : user.accountNumber
      ? isDemo
        ? [{ ...primaryAccount, ...user }, ...otherAccounts]
        : [{ accountNumber: user.accountNumber, balance: user.balance }]
      : [];
  const debits = new Map();
  for (const payment of history) {
    if (payment?.payerKey === userKey && payment.status === 'Success' &&
        payment.paymentAccountKey && Number.isFinite(payment.amount) && payment.amount < 0) {
      const key = payment.paymentAccountKey;
      debits.set(key, (debits.get(key) ?? 0) + payment.amount);
    }
  }

  const accounts = records.map(account => {
    const debit = debits.get(getAccountKey(account));
    return debit === undefined ? account : { ...account, balance: account.balance + debit };
  });
  const eligibleAccounts = accounts.filter(canPayWithAccount);
  let savedKey = null;
  try {
    savedKey = localStorage.getItem(selectionPrefix + userKey);
  } catch {
    // Continue with the first eligible account if storage is unavailable.
  }
  const selectedAccount = eligibleAccounts.find(account => getAccountKey(account) === savedKey)
    ?? eligibleAccounts[0] ?? null;

  return { accounts, isDemo, selectedAccount };
}
