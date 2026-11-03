// Mock data transactions cho FE th (temp)
const mockTransactionHistory = [
  { date: "02/11/2026", content: "Tuition payment for student ID 524K0031", amount: -3500000, status: "Success" },
  { date: "28/10/2026", content: "Account top-up", amount: 5000000, status: "Success" }
];


function renderHomePageAuth(isLoggedIn, user) {
  // lấy thông tin user
  const accNumEl = document.getElementById('account-number');
  const accBalEl = document.getElementById('account-balance');
  const historyContainerEl = document.getElementById('history-container');

  if (isLoggedIn && user) {
    if (accNumEl) accNumEl.innerText = user.accountNumber || "1023456789";
    if (accBalEl) accBalEl.innerText = formatVND(user.balance || 10000000);

    if (historyContainerEl) {
      let rows = mockTransactionHistory.map(item => {
        const isNegative = item.amount < 0;
        const amountClass = isNegative ? 'style="color: var(--danger-red); font-weight: 700;"' : 'style="color: #10B981; font-weight: 700;"';
        const formattedAmount = (isNegative ? '' : '+') + formatVND(item.amount);

        return `
          <tr>
            <td>${item.date}</td>
            <td>${item.content}</td>
            <td ${amountClass}>${formattedAmount}</td>
            <td><span class="status-success">${item.status}</span></td>
          </tr>
        `;
      }).join('');

      historyContainerEl.innerHTML = `
        <table class="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }
  } else {
    if (accNumEl) accNumEl.innerText = "-";
    if (accBalEl) accBalEl.innerText = "0 VND";

    if (historyContainerEl) {
      historyContainerEl.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #64748B; font-weight: 600; font-size: 16px;">
          🔒 Please <a href="#" onclick="handleSignIn(); return false;" style="color: var(--secondary-blue); text-decoration: underline;">sign in</a> to view your account information and transaction history.
        </div>
      `;
    }
  }
}