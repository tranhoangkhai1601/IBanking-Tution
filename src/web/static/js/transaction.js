const mockTuitionDatabase = {
  "524K0033": { name: "Trần Minh Hiếu", amount: 3500000 },
  "524K0032": { name: "Đàm Ninh", amount: 4200000 },
  "524K0031": { name: "Ngọc Hoa", amount: 5000000 }
};

let currentTuitionFee = 0;
let userBalance = 0;

function renderTransactionPageAuth(isLoggedIn, user) {
  // Chưa login thì trả về Home
  if (!isLoggedIn || !user) return;

  const payerNameEl = document.getElementById('payer-name');
  const payerPhoneEl = document.getElementById('payer-phone');
  const payerEmailEl = document.getElementById('payer-email');
  const userBalanceEl = document.getElementById('user-balance');

  // Info người thanh toán học phí
  if (payerNameEl) payerNameEl.innerText = user.name || '-';
  if (payerPhoneEl) payerPhoneEl.innerText = user.phone || '-';
  if (payerEmailEl) payerEmailEl.innerText = user.email || '-';

  userBalance = user.balance || 0;
  if (userBalanceEl) userBalanceEl.innerText = formatVND(userBalance);

  // tra cứu bằng mssv
  const mssvInput = document.getElementById('mssv-input');
  const btnSearch = document.getElementById('btn-search');
  const chkTerms = document.getElementById('chk-terms');
  if (mssvInput) mssvInput.disabled = false;
  if (btnSearch) btnSearch.disabled = false;
  if (chkTerms) chkTerms.disabled = false;

  validateTransactionState();
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