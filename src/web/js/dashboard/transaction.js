import { formatVND, getUser, initDashboard } from './dashboard-shell.js';
import {
  getAccountDisplayId, getAccountKey, getCustomerAccounts,
} from './customer-accounts.js';
import { STORAGE_KEYS } from '../../config/config.js';
import { setMessage, t } from '../../i18n/i18n.js';

let currentTuition = null;
let availableTuitions = [];
let paymentAccount = null;
let isProcessing = false;
const PENDING_PAYMENT_STORAGE_KEY = 'ibanking:pending-tuition-payment';
const PAYMENT_ATTEMPT_STORAGE_KEY = 'ibanking:tuition-payment-attempt';

function getPaymentAttempt() {
  try {
    const attempt = JSON.parse(
      sessionStorage.getItem(PAYMENT_ATTEMPT_STORAGE_KEY) || 'null'
    );
    if (
      typeof attempt?.idempotencyKey === 'string' &&
      typeof attempt?.customerId === 'string' &&
      typeof attempt?.tuitionId === 'string' &&
      typeof attempt?.accountId === 'string' &&
      typeof attempt?.description === 'string'
    ) {
      return attempt;
    }
  } catch {
    sessionStorage.removeItem(PAYMENT_ATTEMPT_STORAGE_KEY);
  }
  return null;
}

function getPaymentIdempotencyKey(tuition, accountId, description) {
  const customerId = getUser()?.customer_id;
  if (typeof customerId !== 'string') {
    throw new Error('Unable to identify the signed-in customer.');
  }
  const previousAttempt = getPaymentAttempt();
  if (
    previousAttempt?.customerId === customerId &&
    previousAttempt.tuitionId === tuition.tuitionId &&
    previousAttempt.accountId === accountId &&
    previousAttempt.description === description
  ) {
    return previousAttempt.idempotencyKey;
  }

  const idempotencyKey = crypto.randomUUID();
  sessionStorage.setItem(
    PAYMENT_ATTEMPT_STORAGE_KEY,
    JSON.stringify({
      idempotencyKey,
      customerId,
      tuitionId: tuition.tuitionId,
      accountId,
      description
    })
  );
  return idempotencyKey;
}

function clearPaymentAttempt() {
  currentPaymentIdempotencyKey = null;
  sessionStorage.removeItem(PAYMENT_ATTEMPT_STORAGE_KEY);
}

function loadPendingPayment() {
  try {
    const storedPayment = JSON.parse(
      sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY) || 'null'
    );
    if (
      typeof storedPayment?.transactionId === 'string' &&
      typeof storedPayment?.customerId === 'string' &&
      typeof storedPayment?.tuition?.tuitionId === 'string' &&
      typeof storedPayment?.tuition?.studentId === 'string' &&
      typeof storedPayment?.tuition?.name === 'string' &&
      typeof storedPayment?.tuition?.semester === 'string' &&
      Number.isFinite(storedPayment?.tuition?.amount)
    ) {
      return storedPayment;
    }
  } catch {
    sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
  }
  return null;
}

let pendingPayment = loadPendingPayment();
let currentPaymentIdempotencyKey = null;
const studentIdInput = document.getElementById('mssv-input');
const searchButton = document.getElementById('btn-search');
const tuitionSelect = document.getElementById('tuition-select');
const checkPaymentButton = document.getElementById('btn-check-payment');
const termsCheckbox = document.getElementById('chk-terms');
const confirmButton = document.getElementById('btn-confirm-tx');
const descriptionInput = document.getElementById('payment-description');
const otpVerification = document.getElementById('otp-verification');
const otpInput = document.getElementById('payment-otp');
const verifyOtpButton = document.getElementById('btn-verify-otp');

function renderTransactionPageAuth(isLoggedIn, user) {
  const payerNameEl = document.getElementById('payer-name');
  const payerPhoneEl = document.getElementById('payer-phone');
  const payerEmailEl = document.getElementById('payer-email');
  const userBalanceEl = document.getElementById('user-balance');
  const paymentAccountNumber = document.getElementById('payment-account-number');

  const payer = isLoggedIn ? user : null;
  if (pendingPayment && payer?.customer_id !== pendingPayment.customerId) {
    pendingPayment = null;
    sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
  }
  if (pendingPayment && !currentTuition) {
    currentTuition = { ...pendingPayment.tuition, status: 'PENDING' };
    studentIdInput.value = pendingPayment.tuition.studentId;
  }
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
  tuitionSelect.disabled = formDisabled;
  descriptionInput.disabled = formDisabled;
  termsCheckbox.disabled = formDisabled || !paymentAccount;
  checkPaymentButton.hidden = !payer || !pendingPayment;
  checkPaymentButton.disabled = isProcessing;
  otpVerification.hidden = !payer || !pendingPayment?.requiresOtp;
  otpInput.disabled = isProcessing;
  verifyOtpButton.disabled = isProcessing;

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
  availableTuitions = [];
  currentPaymentIdempotencyKey = null;
  tuitionSelect.replaceChildren();
  document.getElementById('tuition-selection-group').hidden = true;
  termsCheckbox.checked = false;

  renderTuitionDetails();
  setLookupMessage('');
  if (pendingPayment) {
    setPaymentMessage('dashboardPaymentPending');
  } else {
    setPaymentMessage('');
  }
  validateTransactionState();
}

function renderTuitionDetails() {
  const amountDue = currentTuition?.status === 'UNPAID' ? currentTuition.amount : 0;
  const formattedFee = formatVND(amountDue);
  const status = currentTuition
    ? t({
      PAID: 'dashboardPaid',
      PENDING: 'dashboardHistoryPending',
      UNPAID: 'dashboardUnpaid'
    }[currentTuition.status] ?? 'dashboardUnpaid')
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

async function checkPendingPaymentStatus() {
  if (!pendingPayment || isProcessing) return;
  isProcessing = true;
  checkPaymentButton.disabled = true;
  try {
    const payment = await getPaymentStatus(pendingPayment.transactionId);
    if (payment.status === 'PENDING') {
      pendingPayment.requiresOtp = payment.requires_otp;
      sessionStorage.setItem(
        PENDING_PAYMENT_STORAGE_KEY,
        JSON.stringify(pendingPayment)
      );
      otpVerification.hidden = !payment.requires_otp;
      setPaymentMessage('dashboardPaymentPending');
      return;
    }
    await applyPaymentStatus(payment, pendingPayment.tuition);
  } catch (error) {
    setPaymentError(
      error instanceof Error ? error.message : t('dashboardPaymentError')
    );
  } finally {
    isProcessing = false;
    const user = getUser();
    renderTransactionPageAuth(Boolean(user?.isLoggedIn), user);
  }
}

function getStudentId() {
  return studentIdInput.value.trim().toUpperCase();
}

class ApiRequestError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed (${status})`);
    this.status = status;
  }
}

async function fetchApiJson(url, options = {}) {
  const requestOptions = { ...options, credentials: 'same-origin' };
  let response = await fetch(url, requestOptions);

  if (response.status === 401) {
    const refreshResponse = await fetch('/api/v1/auth/refresh', {
      method: 'PUT',
      credentials: 'same-origin'
    });
    if (refreshResponse.ok) {
      response = await fetch(url, requestOptions);
    }
  }

  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      typeof responseBody?.detail === 'string' ? responseBody.detail : ''
    );
  }
  if (!responseBody || typeof responseBody !== 'object') {
    throw new Error('The server returned an invalid response.');
  }
  return responseBody;
}

function setPaymentError(message) {
  const element = document.getElementById('payment-message');
  delete element.dataset.i18n;
  element.classList.add('status-message--error');
  element.textContent = message || t('dashboardPaymentError');
}

function setSelectedTuition(index) {
  currentTuition = availableTuitions[index] ?? null;
  renderTuitionDetails();
  validateTransactionState();
}

async function searchTuition() {
  if (isProcessing) return;
  const mssv = getStudentId();

  resetPaymentState();

  if (!mssv) {
    setLookupMessage('dashboardStudentRequired');
    return;
  }

  isProcessing = true;
  renderTransactionPageAuth(true, getUser());
  setMessage(searchButton, 'dashboardLookingUpTuition');
  try {
    const data = await fetchApiJson(
      `/api/v1/tuition/${encodeURIComponent(mssv)}`
    );
    if (
      typeof data.student_id !== 'string' ||
      typeof data.name !== 'string' ||
      data.student_id.toUpperCase() !== mssv ||
      !Array.isArray(data.details)
    ) {
      throw new Error('The tuition service returned invalid student data.');
    }

    availableTuitions = data.details.map(item => {
      const amount = Number(item?.amount);
      const semesterIsValid =
        (typeof item?.semester === 'string' && item.semester.trim().length > 0) ||
        (typeof item?.semester === 'number' && Number.isFinite(item.semester));
      if (
        typeof item?.tuition_id !== 'string' ||
        !semesterIsValid ||
        item.status !== 'UNPAID' ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        throw new Error('The tuition service returned invalid tuition data.');
      }
      return {
        tuitionId: item.tuition_id,
        studentId: data.student_id,
        name: data.name,
        semester: String(item.semester),
        amount,
        status: pendingPayment?.tuition.tuitionId === item.tuition_id
          ? 'PENDING'
          : item.status
      };
    });

    tuitionSelect.replaceChildren();
    availableTuitions.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${item.semester} — ${formatVND(item.amount)}`;
      tuitionSelect.append(option);
    });
    document.getElementById('tuition-selection-group').hidden =
      availableTuitions.length < 2;

    if (availableTuitions.length > 0) {
      setSelectedTuition(0);
    } else {
      currentTuition = {
        studentId: data.student_id,
        name: data.name,
        semester: '-',
        amount: 0,
        status: 'PAID'
      };
      renderTuitionDetails();
      validateTransactionState();
      setPaymentMessage('dashboardNoOutstandingTuition');
    }
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      setLookupMessage('dashboardTuitionNotFound');
    } else {
      setLookupMessage('dashboardTuitionLookupError');
    }
  } finally {
    isProcessing = false;
    setMessage(searchButton, 'dashboardLookUp');
    const user = getUser();
    renderTransactionPageAuth(Boolean(user?.isLoggedIn), user);
  }
}

function validateTransactionState() {
  const hasTuition = currentTuition?.status === 'UNPAID' &&
    currentTuition.amount > 0 && Boolean(currentTuition.tuitionId);
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

  setPaymentMessage('');
  isProcessing = true;
  renderTransactionPageAuth(true, payer);

  processTuitionPayment(tuition, selectedAccount, descriptionInput.value.trim());
}

async function refreshCustomerProfile() {
  const response = await fetchApiJson('/api/v1/customers/me');
  const customer = response?.data;
  if (
    !customer ||
    typeof customer.customer_id !== 'string' ||
    !Array.isArray(customer.accounts)
  ) {
    throw new Error('The customer service returned an invalid profile.');
  }
  const updatedUser = {
    ...getUser(),
    ...customer,
    isLoggedIn: true
  };
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(updatedUser));
  renderTransactionPageAuth(true, updatedUser);
}

async function getPaymentStatus(transactionId) {
  const payment = await fetchApiJson(
    `/api/v1/payments/${encodeURIComponent(transactionId)}`
  );
  if (payment.transaction_id !== transactionId) {
    throw new Error('The payment service returned a different transaction.');
  }
  if (!['PENDING', 'SUCCESS', 'FAILED'].includes(payment.status)) {
    throw new Error('The payment service returned an unknown status.');
  }
  if (typeof payment.requires_otp !== 'boolean') {
    throw new Error('The payment service returned an invalid OTP state.');
  }
  return payment;
}

async function applyPaymentStatus(payment, tuition) {
  pendingPayment = null;
  sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
  clearPaymentAttempt();
  checkPaymentButton.hidden = true;
  otpVerification.hidden = true;
  otpInput.value = '';
  if (payment.status === 'FAILED') {
    if (currentTuition?.tuitionId === tuition.tuitionId) {
      currentTuition = { ...tuition, status: 'UNPAID' };
    }
    setPaymentMessage('dashboardPaymentFailed', true);
    return;
  }

  if (currentTuition?.tuitionId === tuition.tuitionId) {
    currentTuition = { ...tuition, status: 'PAID' };
  }
  termsCheckbox.checked = false;
  descriptionInput.value = '';
  try {
    await refreshCustomerProfile();
    setPaymentMessage('dashboardPaymentSuccess', false, {
      student: tuition.name,
      amount: formatVND(tuition.amount)
    });
  } catch {
    setPaymentMessage('dashboardPaymentSuccessRefreshError', false, {
      student: tuition.name,
      amount: formatVND(tuition.amount)
    });
  }
  renderTuitionDetails();
  validateTransactionState();
}

async function processTuitionPayment(tuition, selectedAccount, description) {
  try {
    currentPaymentIdempotencyKey = getPaymentIdempotencyKey(
      tuition,
      getAccountKey(selectedAccount),
      description
    );
    const createdPayment = await fetchApiJson('/api/v1/payments/tuition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': currentPaymentIdempotencyKey
      },
      body: JSON.stringify({
        account_id: getAccountKey(selectedAccount),
        student_id: tuition.studentId,
        tuition_id: tuition.tuitionId,
        description
      })
    });
    if (typeof createdPayment.transaction_id !== 'string') {
      throw new Error('The payment service returned an invalid transaction.');
    }
    if (createdPayment.status === 'FAILED') {
      clearPaymentAttempt();
      setPaymentMessage('dashboardPaymentFailed', true);
      return;
    }
    pendingPayment = {
      transactionId: createdPayment.transaction_id,
      tuition,
      requiresOtp: createdPayment.requires_otp === true,
      customerId: payerCustomerId()
    };
    sessionStorage.setItem(
      PENDING_PAYMENT_STORAGE_KEY,
      JSON.stringify(pendingPayment)
    );
    checkPaymentButton.hidden = false;
    otpVerification.hidden = !pendingPayment.requiresOtp;

    if (currentTuition?.tuitionId === tuition.tuitionId) {
      currentTuition = { ...tuition, status: 'PENDING' };
    }
    setPaymentMessage('dashboardPaymentPending');
    renderTuitionDetails();
    validateTransactionState();
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 502) {
      clearPaymentAttempt();
    }
    setPaymentError(
      error instanceof Error ? error.message : t('dashboardPaymentError')
    );
  } finally {
    isProcessing = false;
    const user = getUser();
    renderTransactionPageAuth(Boolean(user?.isLoggedIn), user);
  }
}

function payerCustomerId() {
  const customerId = getUser()?.customer_id;
  if (typeof customerId !== 'string') {
    throw new Error('Unable to identify the signed-in customer.');
  }
  return customerId;
}

async function verifyPendingPaymentOtp() {
  if (!pendingPayment || isProcessing) return;
  const otpCode = otpInput.value.trim();
  if (!/^[0-9]{6}$/.test(otpCode)) {
    setPaymentMessage('dashboardOtpInvalid', true);
    return;
  }

  isProcessing = true;
  verifyOtpButton.disabled = true;
  try {
    const payment = await fetchApiJson(
      `/api/v1/payments/${encodeURIComponent(pendingPayment.transactionId)}/verify-otp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_code: otpCode })
      }
    );
    if (payment.transaction_id !== pendingPayment.transactionId) {
      throw new Error('The payment service returned a different transaction.');
    }
    pendingPayment.requiresOtp = payment.requires_otp === true;
    sessionStorage.setItem(
      PENDING_PAYMENT_STORAGE_KEY,
      JSON.stringify(pendingPayment)
    );
    otpVerification.hidden = pendingPayment.requiresOtp;
    otpInput.value = '';
    if (payment.status === 'FAILED') {
      await applyPaymentStatus(payment, pendingPayment.tuition);
    } else if (pendingPayment.requiresOtp) {
      setPaymentMessage('dashboardOtpVerifiedWaiting');
    } else {
      setPaymentMessage('dashboardOtpVerified');
    }
  } catch (error) {
    setPaymentError(
      error instanceof Error ? error.message : t('dashboardPaymentError')
    );
  } finally {
    isProcessing = false;
    const user = getUser();
    renderTransactionPageAuth(Boolean(user?.isLoggedIn), user);
  }
}

const ready = await initDashboard({
  titleKey: 'dashboardPayTuition',
  render: renderTransactionPageAuth,
  requiresAuth: true
});

if (ready) {
  searchButton.addEventListener('click', searchTuition);
  checkPaymentButton.addEventListener('click', checkPendingPaymentStatus);
  verifyOtpButton.addEventListener('click', verifyPendingPaymentOtp);
  tuitionSelect.addEventListener('change', () => {
    setSelectedTuition(Number(tuitionSelect.value));
    termsCheckbox.checked = false;
  });
  termsCheckbox.addEventListener('change', validateTransactionState);
  confirmButton.addEventListener('click', submitTransaction);

  studentIdInput.addEventListener('input', () => {
    if (isProcessing) return;
    const cleaned = studentIdInput.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned !== studentIdInput.value) studentIdInput.value = cleaned;
    resetPaymentState();
  });
  descriptionInput.addEventListener('input', () => {
    if (!pendingPayment) currentPaymentIdempotencyKey = null;
  });

  studentIdInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') searchTuition();
  });
}
