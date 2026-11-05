const mockTuitionDatabase = {
  "523V0003": { name: "Trần Hoàng Khải", amount: 3500000 },
  "524K0008": { name: "Vũ Hùng Phi", amount: 4200000 },
  "524K0031": { name: "Đinh Ngọc Hoa", amount: 5000000 },
  "524K0032": { name: "Trường Giang", amount: 15000000 } // dòng test: học phí lớn hơn số dư mock (10tr)
};

let currentTuitionFee = 0;
let userBalance = 0;

function renderTransactionPageAuth(isLoggedIn, user) {
  const payerNameEl = document.getElementById('payer-name');
  const payerPhoneEl = document.getElementById('payer-phone');
  const payerEmailEl = document.getElementById('payer-email');
  const userBalanceEl = document.getElementById('user-balance');

  const mssvInput = document.getElementById('mssv-input');
  const btnSearch = document.getElementById('btn-search');
  const chkTerms = document.getElementById('chk-terms');

  if (isLoggedIn && user) {
    if (payerNameEl) payerNameEl.innerText = user.name ?? '-';
    if (payerPhoneEl) payerPhoneEl.innerText = user.phone ?? '-';
    if (payerEmailEl) payerEmailEl.innerText = user.email ?? '-';
    userBalance = user.balance ?? 0;
    if (userBalanceEl) userBalanceEl.innerText = formatVND(userBalance);

    if (mssvInput) mssvInput.disabled = false;
    if (btnSearch) btnSearch.disabled = false;
    if (chkTerms) chkTerms.disabled = false;
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

// Hiện hoặc ẩn thông báo
function showLookupMessage(text) {
  const el = document.getElementById('lookup-message');
  if (!el) return;
  el.innerText = text;
  el.style.display = 'block';
}

function hideLookupMessage() {
  const el = document.getElementById('lookup-message');
  if (el) el.style.display = 'none';
}

// Reset khi đổi đối tượng (ô tick và Confirm button)
function resetPaymentState() {
  currentTuitionFee = 0;

  const chkTerms = document.getElementById('chk-terms');
  if (chkTerms) chkTerms.checked = false;

  const studentNameEl = document.getElementById('student-name');
  const tuitionAmountEl = document.getElementById('tuition-amount');
  const summaryAmountEl = document.getElementById('summary-tuition-amount');
  if (studentNameEl) studentNameEl.innerText = '-';
  if (tuitionAmountEl) tuitionAmountEl.innerText = '0 VND';
  if (summaryAmountEl) summaryAmountEl.innerText = '0 VND';

  hideLookupMessage();
  validateTransactionState();
}

function searchTuition() {
  const mssv = document.getElementById('mssv-input').value.trim().toUpperCase();

  // reset sau mỗi lần tra cứu
  resetPaymentState();

  if (!mssv) {
    showLookupMessage('Please enter a student ID.');
    return;
  }

  const data = mockTuitionDatabase[mssv];
  if (!data) {
    showLookupMessage('No tuition information found for this student ID.');
    return;
  }

  currentTuitionFee = data.amount;
  const formattedFee = formatVND(currentTuitionFee);

  const studentNameEl = document.getElementById('student-name');
  const tuitionAmountEl = document.getElementById('tuition-amount');
  const summaryAmountEl = document.getElementById('summary-tuition-amount');
  if (studentNameEl) studentNameEl.innerText = data.name;
  if (tuitionAmountEl) tuitionAmountEl.innerText = formattedFee;
  if (summaryAmountEl) summaryAmountEl.innerText = formattedFee;

  validateTransactionState();
}

// trạng thái giao dịch (mock data tạm th)
function validateTransactionState() {
  const chkTerms = document.getElementById('chk-terms');
  const btnConfirm = document.getElementById('btn-confirm-tx');
  const warningEl = document.getElementById('balance-warning');
  const isChecked = chkTerms ? chkTerms.checked : false;

  const hasTuition = currentTuitionFee > 0;
  const isEnoughBalance = userBalance >= currentTuitionFee;

  if (warningEl) {
    warningEl.style.display = (hasTuition && !isEnoughBalance) ? 'block' : 'none';
  }

  if (btnConfirm) {
    if (hasTuition && isEnoughBalance && isChecked) {
      btnConfirm.disabled = false;
      btnConfirm.classList.add('active');
    } else {
      btnConfirm.disabled = true;
      btnConfirm.classList.remove('active');
    }
  }
}

// Submit (Mock th)
function submitTransaction() {
  const chkTerms = document.getElementById('chk-terms');
  const btnConfirm = document.getElementById('btn-confirm-tx');

  // Bảo vệ thêm (dù button đã bị disable)
  if (!chkTerms || !chkTerms.checked) {
    showLookupMessage('Please accept the terms and conditions.');
    return;
  }

  if (currentTuitionFee <= 0) {
    showLookupMessage('Please look up a valid student ID first.');
    return;
  }

  if (userBalance < currentTuitionFee) {
    showLookupMessage('Insufficient balance.');
    return;
  }

  // Tránh bấm nút nhiều lần
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.classList.remove('active');
    btnConfirm.innerText = 'PROCESSING...';
  }

  // Gỉa lập xử lý thời gian (Cần API,OTP)
  setTimeout(() => {
    // Trừ tiền
    userBalance -= currentTuitionFee;

    // Cập nhật số dư
    const userBalanceEl = document.getElementById('user-balance');
    if (userBalanceEl) userBalanceEl.innerText = formatVND(userBalance);

    // Cập nhật localStorage
    const user = getUser();
    if (user) {
      user.balance = userBalance;
      localStorage.setItem('user', JSON.stringify(user));
    }

    // Cập nhật lịch sử khi có giao dịch
    const today = new Date();
    const dateStr = String(today.getDate()).padStart(2, '0') + '/' +
      String(today.getMonth() + 1).padStart(2, '0') + '/' +
      today.getFullYear();

    const studentName = document.getElementById('student-name')?.innerText || 'Unknown';

    const newTx = {
      date: dateStr,
      content: studentName,
      amount: -currentTuitionFee,
      status: "Success"
    };

    // Lấy history 
    let history = [];
    try {
      const stored = localStorage.getItem('transactionHistory');
      if (stored) history = JSON.parse(stored);
    } catch (e) { }

    history.unshift(newTx); // thêm vào (đầu hàng)
    localStorage.setItem('transactionHistory', JSON.stringify(history));

    alert(
      `Payment successful!\n\n` +
      `Student: ${studentName}\n` +
      `Amount: ${formatVND(currentTuitionFee)}\n` +
      `Remaining balance: ${formatVND(userBalance)}`
    );

    // Reset form
    const mssvInput = document.getElementById('mssv-input');
    if (mssvInput) mssvInput.value = '';
    resetPaymentState();

    if (btnConfirm) {
      btnConfirm.innerText = 'CONFIRM TRANSACTION';
    }
  }, 800);

  // ô mssv
  document.addEventListener('DOMContentLoaded', function () {
    const mssvInput = document.getElementById('mssv-input');
    if (!mssvInput) return;

    mssvInput.addEventListener('input', function () {
      const cleaned = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleaned !== this.value) this.value = cleaned;
      resetPaymentState();
    });

    mssvInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') searchTuition();
    });
  });
}