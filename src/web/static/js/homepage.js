// Lấy lịch sử từ localStorage (bên Transaction)
function getTransactionHistory() {
  try {
    const stored = localStorage.getItem('transactionHistory');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  
  // Mặc định lần đầu
  return [
    { date: "02/11/2026", content: "Tuition payment", amount: -3500000, status: "Success" }
  ];
}

function saveTransactionHistory(history) {
  localStorage.setItem('transactionHistory', JSON.stringify(history));
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

      if (history.length === 0) {
        historyContainerEl.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: #64748B; font-weight: 600;">
            No transactions yet.
          </div>
        `;
      } else {
        const rows = history.map(item => {
          const isNegative = item.amount < 0;
          const amountStyle = isNegative
            ? 'style="color: var(--danger-red); font-weight: 700;"'
            : 'style="color: #10B981; font-weight: 700;"';
          const formattedAmount = (isNegative ? '' : '+') + formatVND(item.amount);
          const statusClass = 'status-' + item.status.toLowerCase();

          return `
            <tr>
              <td>${item.date}</td>
              <td>${item.content}</td>
              <td ${amountStyle}>${formattedAmount}</td>
              <td><span class="${statusClass}">${item.status}</span></td>
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