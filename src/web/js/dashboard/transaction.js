import { STORAGE_KEYS } from '../../config/config.js';
import { formatVND, getUser, initDashboard } from './dashboard-shell.js';
import {
  getAccountDisplayId, getAccountKey, getCustomerAccounts, getUserKey,
  readStoredTransactionHistory
} from './customer-accounts.js';
import { setMessage, t } from '../../i18n/i18n.js';

const mockTuitionDatabase = {
  "523V0003": { name: "Trần Hoàng Khải", amount: 3500000, semester: 'HK1/2026-2027', status: 'UNPAID' },
  "524K0008": { name: "Vũ Hùng Phi", amount: 4200000, semester: 'HK1/2026-2027', status: 'UNPAID' },
  "524K0031": { name: "Đinh Ngọc Hoa", amount: 5000000, semester: 'HK1/2026-2027', status: 'UNPAID' },
  "524K0032": { name: "Trường Giang", amount: 15000000, semester: 'HK1/2026-2027', status: 'UNPAID' },
  "524K0034": { name: "Sinh viên mẫu", amount: 3500000, semester: 'HK1/2026-2027', status: 'PAID' }
};

let currentTuition = null;
let paymentAccount = null;
let isProcessing = false;
const studentIdInput = document.getElementById('mssv-input');
const searchButton = document.getElementById('btn-search');
const termsCheckbox = document.getElementById('chk-terms');
const confirmButton = document.getElementById('btn-confirm-tx');
const descriptionInput = document.getElementById('payment-description');

function renderTransactionPageAuth(isLoggedIn, user) {
  const payerNameEl = document.getElementById('payer-name');
  const payerPhoneEl = document.getElementById('payer-phone');
  const payerEmailEl = document.getElementById('payer-email');
  const userBalanceEl = document.getElementById('user-balance');
  const paymentAccountNumber = document.getElementById('payment-account-number');

  const payer = isLoggedIn ? user : null;
  const selectedAccount = payer ? getCustomerAccounts(payer).selectedAccount : null;
  if (getAccountKey(paymentAccount) !== getAccountKey(selectedAccount)) {
    termsCheckbox.checked = false;
  }
  paymentAccount = selectedAccount;

  payerNameEl.textContent = payer?.full_name ?? payer?.name ?? '-';
  payerPhoneEl.textContent = payer?.phone ?? '-';
  payerEmailEl.textContent = payer?.email ?? '-';
  userBalanceEl.textContent = formatVND(paymentAccount?.balance);
  const accountDisplayId = getAccountDisplayId(paymentAccount);
  paymentAccountNumber.hidden = !accountDisplayId;
  paymentAccountNumber.textContent = accountDisplayId;

  const formDisabled = !payer || isProcessing;
  document.getElementById('btn-logout').disabled = isProcessing;
  studentIdInput.disabled = formDisabled;
  searchButton.disabled = formDisabled;
  descriptionInput.disabled = formDisabled;
  termsCheckbox.disabled = formDisabled || !paymentAccount;

  if (!payer) {
    studentIdInput.value = '';
    resetPaymentState();
    return;
  }

  renderTuitionDetails();
  validateTransactionState();
}

function setLookupMessage(key) {
  const message = document.getElementById('lookup-message');
  setMessage(message, key);
  studentIdInput.setAttribute('aria-invalid', String(Boolean(key)));
}

function setPaymentMessage(key, isError = false, values) {
  const message = document.getElementById('payment-message');
  message.classList.toggle('status-message--error', isError);
  setMessage(message, key, values);
}

function resetPaymentState() {
  currentTuition = null;
  termsCheckbox.checked = false;

  renderTuitionDetails();
  setLookupMessage('');
  setPaymentMessage('');
  validateTransactionState();
}

function renderTuitionDetails() {
  const amountDue = currentTuition?.status === 'UNPAID' ? currentTuition.amount : 0;
  const formattedFee = formatVND(amountDue);
  const status = currentTuition
    ? t(currentTuition.status === 'PAID' ? 'dashboardPaid' : 'dashboardUnpaid')
    : '-';
  const details = {
    'student-name': currentTuition?.name ?? '-',
    'tuition-semester': currentTuition?.semester ?? '-',
    'tuition-status': status,
    'tuition-amount': formattedFee,
    'summary-tuition-amount': formattedFee
  };

  for (const [id, value] of Object.entries(details)) {
    document.getElementById(id).textContent = value;
  }
}

function hasSuccessfulPayment(tuition, history, userKey) {
  return history.some(item => item?.payerKey === userKey &&
    item.studentId === tuition.studentId && item.semester === tuition.semester &&
    item.status === 'Success');
}

function getStudentId() {
  return studentIdInput.value.trim().toUpperCase();
}

function searchTuition() {
  if (isProcessing) return;
  const mssv = getStudentId();

  resetPaymentState();

  if (!mssv) {
    setLookupMessage('dashboardStudentRequired');
    return;
  }

  // Khi nối backend, tra cứu học phí theo mã sinh viên và dùng số tiền, học kỳ, trạng thái từ API.
  const data = mockTuitionDatabase[mssv];
  if (!data) {
    setLookupMessage('dashboardTuitionNotFound');
    return;
  }

  currentTuition = { ...data, studentId: mssv };
  if (hasSuccessfulPayment(
    currentTuition,
    readStoredTransactionHistory() ?? [],
    getUserKey(getUser())
  )) {
    currentTuition.status = 'PAID';
  }
  renderTuitionDetails();
  validateTransactionState();
}

function validateTransactionState() {
  const hasTuition = currentTuition?.status === 'UNPAID' && currentTuition.amount > 0;
  const isEnoughBalance = paymentAccount && paymentAccount.balance >= (currentTuition?.amount ?? 0);

  let warning = '';
  if (!paymentAccount) warning = 'dashboardNoPaymentAccount';
  else if (hasTuition && !isEnoughBalance) warning = 'dashboardInsufficientBalance';
  setMessage(document.getElementById('balance-warning'), warning);

  const canConfirm = !isProcessing && hasTuition && isEnoughBalance && termsCheckbox.checked;
  confirmButton.disabled = !canConfirm;
  setMessage(confirmButton, isProcessing ? 'dashboardProcessing' : 'dashboardConfirmTransaction');
}

function submitTransaction() {
  if (isProcessing) return;

  const payer = getUser();
  if (!payer?.isLoggedIn) return;

  if (!termsCheckbox.checked) {
    setPaymentMessage('dashboardTermsRequired', true);
    return;
  }

  const tuition = currentTuition;
  if (!tuition || tuition.studentId !== getStudentId()) {
    resetPaymentState();
    setPaymentMessage('dashboardLookupRequired', true);
    return;
  }

  if (tuition.status !== 'UNPAID' || tuition.amount <= 0) {
    setPaymentMessage('dashboardNoOutstandingTuition');
    return;
  }

  const { selectedAccount } = getCustomerAccounts(payer);
  const accountKey = getAccountKey(selectedAccount);
  if (!selectedAccount || accountKey !== getAccountKey(paymentAccount) || selectedAccount.balance < tuition.amount) {
    renderTransactionPageAuth(true, payer);
    return;
  }

  const description = descriptionInput.value.trim();
  setPaymentMessage('');
  isProcessing = true;
  renderTransactionPageAuth(true, payer);

  // Khi nối backend, thay bộ hẹn giờ bằng API thanh toán, gửi account_id và thông tin khoản học phí đã tra cứu.
  // Máy chủ kiểm tra quyền dùng tài khoản, số dư và giao dịch trùng; xác minh OTP nếu luồng thanh toán yêu cầu.
  setTimeout(async () => {
    try {
      const finish = () => completePayment(getUserKey(payer), accountKey, tuition, description);
      if (navigator.locks) {
        await navigator.locks.request(STORAGE_KEYS.transactionHistory, finish);
      } else {
        finish();
      }
    } catch {
      setPaymentMessage('dashboardPaymentError', true);
    } finally {
      isProcessing = false;
      const user = getUser();
      renderTransactionPageAuth(Boolean(user?.isLoggedIn), user);
    }
  }, 800);
}

function completePayment(payerKey, paymentAccountKey, tuition, description) {
  const user = getUser();
  if (!user?.isLoggedIn || getUserKey(user) !== payerKey) {
    resetPaymentState();
    setPaymentMessage('dashboardSessionChanged', true);
    return;
  }

  const storedHistory = readStoredTransactionHistory();
  if (storedHistory === null) {
    setPaymentMessage('dashboardPaymentError', true);
    return;
  }

  const history = storedHistory ?? [];
  const { selectedAccount } = getCustomerAccounts(user, history);
  if (getAccountKey(selectedAccount) !== paymentAccountKey) {
    termsCheckbox.checked = false;
    setPaymentMessage('dashboardPaymentAccountChanged', true);
    return;
  }

  if (hasSuccessfulPayment(tuition, history, getUserKey(user))) {
    currentTuition = { ...tuition, status: 'PAID' };
    setPaymentMessage('dashboardAlreadyPaid');
    return;
  }

  if (selectedAccount.balance < tuition.amount) return;

  const today = new Date();
  const dateStr = String(today.getDate()).padStart(2, '0') + '/' +
    String(today.getMonth() + 1).padStart(2, '0') + '/' +
    today.getFullYear();
  const newTx = {
    date: dateStr,
    studentName: tuition.name,
    description,
    studentId: tuition.studentId,
    semester: tuition.semester,
    amount: -tuition.amount,
    status: 'Success',
    payerKey,
    paymentAccountKey,
    paymentAccount: {
      accountNumber: getAccountDisplayId(selectedAccount)
    }
  };

  // Bản demo dùng cùng một bản ghi cho lịch sử và khoản trừ. Khi nối API, cập nhật theo giao dịch và số dư máy chủ trả về.
  localStorage.setItem(STORAGE_KEYS.transactionHistory, JSON.stringify([newTx, ...history]));
  setPaymentMessage('dashboardPaymentSuccess', false, {
    student: tuition.name,
    amount: formatVND(tuition.amount),
    balance: formatVND(selectedAccount.balance - tuition.amount)
  });

  currentTuition = { ...tuition, status: 'PAID' };
  termsCheckbox.checked = false;
  descriptionInput.value = '';
}

const ready = await initDashboard({
  titleKey: 'dashboardPayTuition',
  render: renderTransactionPageAuth,
  requiresAuth: true
});

if (ready) {
  searchButton.addEventListener('click', searchTuition);
  termsCheckbox.addEventListener('change', validateTransactionState);
  confirmButton.addEventListener('click', submitTransaction);

  studentIdInput.addEventListener('input', () => {
    if (isProcessing) return;
    const cleaned = studentIdInput.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned !== studentIdInput.value) studentIdInput.value = cleaned;
    resetPaymentState();
  });

  studentIdInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') searchTuition();
  });
}
