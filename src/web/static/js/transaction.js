const mockTuitionDatabase = {
  "524K0033": { name: "Trần Minh Hiếu", amount: 3500000 },
  "524K0032": { name: "Đàm Ninh", amount: 4200000 },
  "524K0031": { name: "Ngọc Hoa", amount: 5000000 }
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
    // để show thôi
    if (payerNameEl) payerNameEl.innerText = user.name || 'Đinh Ngọc Hoa';
    if (payerPhoneEl) payerPhoneEl.innerText = user.phone || '0862123456';
    if (payerEmailEl) payerEmailEl.innerText = user.email || '524k0031@student.tdtu.edu.vn';
    userBalance = user.balance || 10000000;
    if (userBalanceEl) userBalanceEl.innerText = formatVND(userBalance);

    // bấm log in là vào luôn
    if (mssvInput) mssvInput.disabled = false;
    if (btnSearch) btnSearch.disabled = false;
    if (chkTerms) chkTerms.disabled = false;
  } else {

    // giao diện chưa login
    if (payerNameEl) payerNameEl.innerText = '-';
    if (payerPhoneEl) payerPhoneEl.innerText = '-';
    if (payerEmailEl) payerEmailEl.innerText = '-';
    if (userBalanceEl) userBalanceEl.innerText = '0 VND';

    const studentNameEl = document.getElementById('student-name');
    const tuitionAmountEl = document.getElementById('tuition-amount');
    const summaryAmountEl = document.getElementById('summary-tuition-amount');

    if (studentNameEl) studentNameEl.innerText = '-';
    if (tuitionAmountEl) tuitionAmountEl.innerText = '0 VND';
    if (summaryAmountEl) summaryAmountEl.innerText = '0 VND';

    if (mssvInput) {
      mssvInput.value = '';
      mssvInput.disabled = true;
    }
    if (btnSearch) btnSearch.disabled = true;
    if (chkTerms) {
      chkTerms.checked = false;
      chkTerms.disabled = true;
    }

    currentTuitionFee = 0;
    validateTransactionState();
  }
}

function searchTuition() {
  const mssvInput = document.getElementById('mssv-input').value.trim().toUpperCase();
  const studentNameEl = document.getElementById('student-name');
  const tuitionAmountEl = document.getElementById('tuition-amount');
  const summaryAmountEl = document.getElementById('summary-tuition-amount');

  if (!mssvInput) {
    alert("Please enter a student ID!");
    return;
  }

  if (mockTuitionDatabase[mssvInput]) {
    const data = mockTuitionDatabase[mssvInput];
    if (studentNameEl) studentNameEl.innerText = data.name;
    currentTuitionFee = data.amount;
    
    const formattedFee = formatVND(currentTuitionFee);
    if (tuitionAmountEl) tuitionAmountEl.innerText = formattedFee;
    if (summaryAmountEl) summaryAmountEl.innerText = formattedFee;
  } else {
    alert("No tuition information found for this student ID!");
    if (studentNameEl) studentNameEl.innerText = "-";
    currentTuitionFee = 0;
    if (tuitionAmountEl) tuitionAmountEl.innerText = "0 VND";
    if (summaryAmountEl) summaryAmountEl.innerText = "0 VND";
  }

  validateTransactionState();
}


// trạng thái giao dịch (mock data tạm th)
function validateTransactionState() {
  const chkTerms = document.getElementById('chk-terms');
  const btnConfirm = document.getElementById('btn-confirm-tx');
  const isChecked = chkTerms ? chkTerms.checked : false;

  const hasTuition = currentTuitionFee > 0;
  const isEnoughBalance = userBalance >= currentTuitionFee;

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