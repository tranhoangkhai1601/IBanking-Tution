// Lấy lịch sử từ localStorage (bên Transaction)
function getTransactionHistory() {
  try {
    const stored = localStorage.getItem('transactionHistory');
    if (stored !== null) {
      const history = JSON.parse(stored);
      return Array.isArray(history) && history.every(item => typeof item?.status === 'string')
        ? history : null;
    }
  } catch (e) {
    return null;
  }

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

      if (history === null) {
        historyContainerEl.innerHTML = `
          <p class="status-message status-message--error" role="alert">
            Unable to load transaction history. Please try again.
          </p>
        `;
      } else if (history.length === 0) {
        historyContainerEl.innerHTML = `
          <p class="status-message" role="status">
            No transactions yet.
          </p>
        `;
      } else {
        const rows = history.map(item => {
          const isNegative = item.amount < 0;
          const amountStyle = isNegative
            ? 'style="color: var(--color-error); font-weight: 700;"'
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
        <p class="status-message" role="status">
          Please <a href="#" onclick="handleSignIn(); return false;">sign in</a>
          to view your account information and transaction history.
        </p>
      `;
    }
  }
}
