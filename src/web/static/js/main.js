document.addEventListener("DOMContentLoaded", function () {

  // luôn trả về mock data(test
  const rawUser = localStorage.getItem('user');
  let user = null;
  
  try {
    user = JSON.parse(rawUser);
  } catch (e) {
    user = null;
  }

  if (!user || !user.name || !user.studentId) {
    const defaultUser = {
      name: "Đinh Ngọc Hoa",
      studentId: "524K0031",
      accountNumber: "1023456789",
      phone: "0862123456",
      email: "524k0031@student.tdtu.edu.vn",
      balance: 10000000,
      isLoggedIn: true
    };
    localStorage.setItem('user', JSON.stringify(defaultUser));
  }

  checkAuthStatus();
});



function checkAuthStatus() {
  const user = JSON.parse(localStorage.getItem('user'));
  const isLoggedIn = user && user.isLoggedIn;

  const userDisplayEl = document.getElementById('user-display');
  const btnSigninEl = document.getElementById('btn-signin');
  const btnLogoutEl = document.getElementById('btn-logout');

  if (isLoggedIn && user) {
    if (userDisplayEl) {
      // trên thanh display (sau khi login)
      userDisplayEl.style.display = 'flex';
      userDisplayEl.innerHTML = `
        <span class="user-name">${user.name || 'Đinh Ngọc Hoa'}</span>
        <span class="user-id">${user.studentId || '524K0031'}</span>
      `;
    }
    if (btnSigninEl) btnSigninEl.style.display = 'none';
    if (btnLogoutEl) btnLogoutEl.style.display = 'inline-block';
  } else {

    // chưa login
    if (userDisplayEl) userDisplayEl.style.display = 'none';
    if (btnSigninEl) btnSigninEl.style.display = 'inline-block';
    if (btnLogoutEl) btnLogoutEl.style.display = 'none';
  }

  if (typeof renderTransactionPageAuth === 'function') {
    renderTransactionPageAuth(isLoggedIn, user);
  }
  if (typeof renderHomePageAuth === 'function') {
    renderHomePageAuth(isLoggedIn, user);
  }
}

// login/out với mock data (temp)
function handleSignIn() {
  const defaultUser = {
    name: "Đinh Ngọc Hoa",
    studentId: "524K0031",
    accountNumber: "1023456789",
    phone: "0862123456",
    email: "524k0031@student.tdtu.edu.vn",
    balance: 10000000,
    isLoggedIn: true
  };
  localStorage.setItem('user', JSON.stringify(defaultUser));
  checkAuthStatus();
}

function handleLogout() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  user.isLoggedIn = false;
  localStorage.setItem('user', JSON.stringify(user));
  checkAuthStatus();
}

function formatVND(amount) {
  return (amount || 0).toLocaleString('vi-VN') + " VND";
}