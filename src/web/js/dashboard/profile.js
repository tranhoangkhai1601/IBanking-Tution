import { setMessage, t } from '../../i18n/i18n.js';
import { formatVND, initDashboard, renderAccountStatus } from './dashboard-shell.js';
import {
  getAccountDisplayId, getAccountKey, getCustomerAccounts, getUserKey
} from './customer-accounts.js';

const missingValue = '—';
const accountsList = document.getElementById('profile-accounts');
const accountTemplate = document.getElementById('profile-account-template');
const editDialog = document.getElementById('profile-edit-dialog');
const editForm = document.getElementById('profile-edit-form');
const deleteDialog = document.getElementById('profile-delete-dialog');

// Trạng thái xem thử chỉ dùng trong trang Hồ sơ.
let currentUser;
let editedDetails;
let pendingAccountKey;
const removedAccountKeys = new Set();

function formatOpenDate(value) {
  // Định dạng ngày thuần túy thành DD/MM/YYYY, giữ nguyên ngày ở mọi múi giờ.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : missingValue;
}

function renderAccount(account) {
  const card = accountTemplate.content.cloneNode(true);
  const type = account.account_type === 'payment'
    ? t('dashboardPaymentAccount')
    : account.account_type;
  const title = getAccountDisplayId(account) || type || t('dashboardAccount');
  card.querySelector('[data-account-title]').textContent = title;

  const typeLabel = card.querySelector('[data-account-type]');
  typeLabel.textContent = type ?? '';
  typeLabel.hidden = !getAccountDisplayId(account) || !type;

  renderAccountStatus(card.querySelector('[data-account-status]'), account.account_active);

  card.querySelector('[data-account-date]').textContent = formatOpenDate(account.account_open_date);
  card.querySelector('[data-account-balance]').textContent = formatVND(account.balance);

  const description = card.querySelector('[data-account-description]');
  description.textContent = account.description?.trim() ?? '';
  description.hidden = !description.textContent;

  for (const label of card.querySelectorAll('[data-i18n]')) {
    label.textContent = t(label.dataset.i18n);
  }

  const deleteButton = card.querySelector('.profile-account-actions button');
  deleteButton.setAttribute('aria-label', t('profileDeleteNamed', { account: title }));
  deleteButton.addEventListener('click', () => {
    pendingAccountKey = getAccountKey(account);
    setMessage(document.getElementById('profile-delete-message'), 'profileDeleteMessage', { account: title });
    deleteDialog.showModal();
  });

  return card;
}

function renderPersonal(user) {
  const name = (user.full_name ?? user.name ?? '').trim();
  const initials = name.split(/\s+/).slice(-2).map(word => Array.from(word)[0]).join('');
  document.getElementById('profile-avatar').textContent = initials.toUpperCase() || missingValue;
  document.getElementById('profile-name').textContent = name || missingValue;
  document.getElementById('profile-email').textContent = user.email?.trim() || missingValue;
  document.getElementById('profile-phone').textContent = user.phone?.trim() || missingValue;
}

function renderAccounts(user) {
  const { accounts, isDemo } = getCustomerAccounts(user);
  const visibleAccounts = accounts.filter(account => !removedAccountKeys.has(getAccountKey(account)));
  accountsList.replaceChildren(...visibleAccounts.map(renderAccount));
  accountsList.hidden = visibleAccounts.length === 0;
  document.getElementById('profile-empty').hidden = visibleAccounts.length > 0;
  document.getElementById('profile-demo-note').hidden = !isDemo || visibleAccounts.length === 0;
}

function renderProfile(_isLoggedIn, user) {
  if (getUserKey(currentUser) !== getUserKey(user)) {
    editedDetails = undefined;
    removedAccountKeys.clear();
    editDialog.close();
    deleteDialog.close();
  }
  currentUser = user;
  renderPersonal(editedDetails ?? user);
  renderAccounts(user);
  document.getElementById('profile-content').hidden = false;
}

document.getElementById('profile-edit').addEventListener('click', () => {
  const details = editedDetails ?? currentUser;
  for (const input of editForm.querySelectorAll('input')) {
    input.value = details[input.name] ?? '';
  }
  editDialog.showModal();
});

document.getElementById('profile-edit-cancel').addEventListener('click', () => editDialog.close());

editForm.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(editForm);
  // Khi nối backend, gửi thông tin cá nhân đến API cập nhật hồ sơ và hiển thị dữ liệu máy chủ trả về.
  editedDetails = {
    name: fields.get('name').trim(),
    email: fields.get('email').trim(),
    phone: fields.get('phone').trim()
  };
  renderPersonal(editedDetails);
  editDialog.close();
});

document.getElementById('profile-delete-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'delete') return;

  event.preventDefault();
  // Khi nối backend, gọi API gỡ tài khoản theo account_id và tải lại danh sách sau khi thành công.
  removedAccountKeys.add(pendingAccountKey);
  deleteDialog.close();
  renderAccounts(currentUser);
  const nextFocus = accountsList.querySelector('button') ?? document.getElementById('accounts-title');
  nextFocus.focus();
});

await initDashboard({
  titleKey: 'dashboardProfile',
  render: renderProfile,
  requiresAuth: true
});
