document.addEventListener("DOMContentLoaded", function () {
  checkAuthStatus();
});

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    return null;
  }
}

function checkAuthStatus() {
  const user = getUser();
  const isLoggedIn = !!(user && user.isLoggedIn);

  const isHomePage = window.location.pathname.endsWith('homepage.html') ||
                     window.location.pathname.endsWith('/');
  if (!isLoggedIn && !isHomePage) {
    window.location.href = './homepage.html';
    return;
  }

  const userDisplayEl = document.getElementById('user-display');
  const btnSigninEl = document.getElementById('btn-signin');
  const btnLogoutEl = document.getElementById('btn-logout');

  document.querySelectorAll('.auth-only').forEach(el => {
    el.style.display = isLoggedIn ? '' : 'none';
  });

  if (isLoggedIn) {
    if (userDisplayEl) {
      userDisplayEl.style.display = 'flex';
      userDisplayEl.innerHTML = `<span class="user-name">${user.name}</span>`;
    }
    if (btnSigninEl) btnSigninEl.style.display = 'none';
    if (btnLogoutEl) btnLogoutEl.style.display = 'inline-block';
  } else {
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

// Mock Data
function handleSignIn() {
  const mockUser = {
    name: "Đinh Ngọc Hoa",
    accountNumber: "1023456789",
    phone: "0862123456",
    email: "524K0031@gmail.com",
    balance: 10000000,
    isLoggedIn: true
  };
  localStorage.setItem('user', JSON.stringify(mockUser));
  checkAuthStatus();
}

function handleLogout() {
  const user = getUser() || {};
  user.isLoggedIn = false;
  localStorage.setItem('user', JSON.stringify(user));
  checkAuthStatus();
}

function formatVND(amount) {
  return (amount || 0).toLocaleString('vi-VN') + " VND";
}