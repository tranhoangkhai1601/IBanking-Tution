const mockTuitionDatabase = {
  "523V0003": { name: "Trần Hoàng Khải", amount: 3500000, semester: 'HK1/2026-2027', status: 'UNPAID' },
  "524K0008": { name: "Vũ Hùng Phi", amount: 4200000, semester: 'HK1/2026-2027', status: 'UNPAID' },
  "524K0031": { name: "Đinh Ngọc Hoa", amount: 5000000, semester: 'HK1/2026-2027', status: 'UNPAID' },
  "524K0032": { name: "Trường Giang", amount: 15000000, semester: 'HK1/2026-2027', status: 'UNPAID' },
  "524K0034": { name: "Sinh viên mẫu", amount: 3500000, semester: 'HK1/2026-2027', status: 'PAID' }
};

let currentTuition = null;
let userBalance = 0;
let isProcessing = false;

function renderTransactionPageAuth(isLoggedIn, user) {
  const payerNameEl = document.getElementById('payer-name');
  const payerPhoneEl = document.getElementById('payer-phone');
  const payerEmailEl = document.getElementById('payer-email');
  const userBalanceEl = document.getElementById('user-balance');

  const mssvInput = document.getElementById('mssv-input');
  const btnSearch = document.getElementById('btn-search');
  const chkTerms = document.getElementById('chk-terms');
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.disabled = isProcessing;

  if (isLoggedIn && user) {
    if (payerNameEl) payerNameEl.innerText = user.name ?? '-';
    if (payerPhoneEl) payerPhoneEl.innerText = user.phone ?? '-';
    if (payerEmailEl) payerEmailEl.innerText = user.email ?? '-';
    userBalance = user.balance ?? 0;
    if (userBalanceEl) userBalanceEl.innerText = formatVND(userBalance);

    if (mssvInput) mssvInput.disabled = isProcessing;
    if (btnSearch) btnSearch.disabled = isProcessing;
    if (chkTerms) chkTerms.disabled = isProcessing;
    validateTransactionState();
  } else {
    if (payerNameEl) payerNameEl.innerText = '-';
    if (payerPhoneEl) payerPhoneEl.innerText = '-';
    if (payerEmailEl) payerEmailEl.innerText = '-';
    userBalance = 0;
    if (userBalanceEl) userBalanceEl.innerText = '0 VND';

    if (mssvInput) {
      mssvInput.value = '';
      mssvInput.disabled = true;
    }
    if (btnSearch) btnSearch.disabled = true;
    if (chkTerms) chkTerms.disabled = true;

    resetPaymentState();
  }
}

function setLookupMessage(text) {
  const message = document.getElementById('lookup-message');
  const input = document.getElementById('mssv-input');
  if (message) message.textContent = text;
  if (input) input.setAttribute('aria-invalid', String(Boolean(text)));
}

function setPaymentMessage(text, isError = false) {
  const message = document.getElementById('payment-message');
  if (!message) return;
  message.classList.toggle('status-message--error', isError);
  message.textContent = text;
}

// Reset khi đổi đối tượng (ô tick và Confirm button)
function resetPaymentState() {
  currentTuition = null;

  const chkTerms = document.getElementById('chk-terms');
  if (chkTerms) chkTerms.checked = false;

  renderTuitionDetails();
  setLookupMessage('');
  setPaymentMessage('');
  validateTransactionState();
}

function renderTuitionDetails() {
  const amountDue = currentTuition?.status === 'UNPAID' ? currentTuition.amount : 0;
  const formattedFee = formatVND(amountDue);
  const details = {
    'student-name': currentTuition?.name ?? '-',
    'tuition-semester': currentTuition?.semester ?? '-',
    'tuition-status': currentTuition?.status ?? '-',
    'tuition-amount': formattedFee,
    'summary-tuition-amount': formattedFee
  };

  for (const [id, value] of Object.entries(details)) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
  }
}

function getStoredTransactionHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem('transactionHistory'));
    if (Array.isArray(stored)) return stored;
  } catch (e) { }
  return [];
}

function hasSuccessfulPayment(tuition, history) {
  return history.some(item => item?.studentId === tuition.studentId &&
    item.semester === tuition.semester && item.status === 'Success');
}

function getStudentId() {
  return document.getElementById('mssv-input').value.trim().toUpperCase();
}

function searchTuition() {
  if (isProcessing) return;
  const mssv = getStudentId();

  // reset sau mỗi lần tra cứu
  resetPaymentState();

  if (!mssv) {
    setLookupMessage('Please enter a student ID.');
    return;
  }

  const data = mockTuitionDatabase[mssv];
  if (!data) {
    setLookupMessage('No tuition information found for this student ID.');
    return;
  }

  currentTuition = { ...data, studentId: mssv };
  if (hasSuccessfulPayment(currentTuition, getStoredTransactionHistory())) {
    currentTuition.status = 'PAID';
  }
  renderTuitionDetails();
  validateTransactionState();
}

// trạng thái giao dịch (mock data tạm th)
function validateTransactionState() {
  const chkTerms = document.getElementById('chk-terms');
  const btnConfirm = document.getElementById('btn-confirm-tx');
  const warningEl = document.getElementById('balance-warning');
  const isChecked = chkTerms ? chkTerms.checked : false;

  const hasTuition = currentTuition?.status === 'UNPAID' && currentTuition.amount > 0;
  const isEnoughBalance = userBalance >= (currentTuition?.amount ?? 0);

  if (warningEl) {
    warningEl.textContent = hasTuition && !isEnoughBalance
      ? 'Insufficient balance to pay this tuition.'
      : '';
  }

  if (btnConfirm) {
    const canConfirm = !isProcessing && hasTuition && isEnoughBalance && isChecked;
    btnConfirm.disabled = !canConfirm;
    btnConfirm.innerText = isProcessing ? 'Processing…' : 'Confirm transaction';
  }
}

// Submit (Mock th)
function submitTransaction() {
  if (isProcessing) return;

  const payer = getUser();
  if (!payer?.isLoggedIn) return;

  const chkTerms = document.getElementById('chk-terms');

  // Bảo vệ thêm (dù button đã bị disable)
  if (!chkTerms || !chkTerms.checked) {
    setPaymentMessage('Please accept the terms and conditions.', true);
    return;
  }

  const tuition = currentTuition;
  if (!tuition || tuition.studentId !== getStudentId()) {
    resetPaymentState();
    setPaymentMessage('Please look up a valid student ID first.', true);
    return;
  }

  if (tuition.status !== 'UNPAID' || tuition.amount <= 0) {
    setPaymentMessage('This tuition has no outstanding balance.');
    return;
  }

  if ((payer.balance ?? 0) < tuition.amount) {
    renderTransactionPageAuth(true, payer);
    return;
  }

  setPaymentMessage('');
  isProcessing = true;
  renderTransactionPageAuth(true, payer);

  // Gỉa lập xử lý thời gian (Cần API,OTP)
  setTimeout(() => {
    try {
      const user = getUser();
      if (!user?.isLoggedIn || user.accountNumber !== payer.accountNumber) {
        resetPaymentState();
        setPaymentMessage('Your session changed. Please look up the student ID again.', true);
        return;
      }

      const history = getStoredTransactionHistory();
      if (hasSuccessfulPayment(tuition, history)) {
        currentTuition = { ...tuition, status: 'PAID' };
        renderTuitionDetails();
        setPaymentMessage('This tuition has already been paid.');
        return;
      }

      const balance = user.balance ?? 0;
      if (balance < tuition.amount) {
        return;
      }

      const remainingBalance = balance - tuition.amount;
      const today = new Date();
      const dateStr = String(today.getDate()).padStart(2, '0') + '/' +
        String(today.getMonth() + 1).padStart(2, '0') + '/' +
        today.getFullYear();

      const newTx = {
        date: dateStr,
        content: tuition.name,
        studentId: tuition.studentId,
        semester: tuition.semester,
        amount: -tuition.amount,
        status: 'Success'
      };

      localStorage.setItem('user', JSON.stringify({ ...user, balance: remainingBalance }));
      try {
        localStorage.setItem('transactionHistory', JSON.stringify([newTx, ...history]));
      } catch (error) {
        localStorage.setItem('user', JSON.stringify(user));
        throw error;
      }

      setPaymentMessage(
        `Payment successful for ${tuition.name}. Paid ${formatVND(tuition.amount)}. ` +
        `Remaining balance: ${formatVND(remainingBalance)}.`
      );

      currentTuition = { ...tuition, status: 'PAID' };
      chkTerms.checked = false;
      renderTuitionDetails();
    } catch (error) {
      setPaymentMessage('Unable to save the payment. Please try again.', true);
    } finally {
      isProcessing = false;
      const user = getUser();
      renderTransactionPageAuth(Boolean(user?.isLoggedIn), user);
    }
  }, 800);
}

// ô mssv
document.addEventListener('DOMContentLoaded', function () {
  const mssvInput = document.getElementById('mssv-input');
  if (!mssvInput) return;

  mssvInput.addEventListener('input', function () {
    if (isProcessing) return;
    const cleaned = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned !== this.value) this.value = cleaned;
    resetPaymentState();
  });

  mssvInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') searchTuition();
  });
});
