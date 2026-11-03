import { APP_CONFIG, STORAGE_KEYS } from "../config/config.js";
import { validateIdentifier } from "./auth-validation.js";

const form = document.getElementById("forgot-password-form");
const identifierInput = document.getElementById("identifier");
const identifierError = document.getElementById("identifier-error");
const submitButton = document.getElementById("forgot-password-submit");
const statusMessage = document.getElementById("forgot-password-status");

document.querySelectorAll("[data-app-name]").forEach((element) => {
  element.textContent = APP_CONFIG.appName;
});
document.title = `Forgot Password | ${APP_CONFIG.appName}`;

let hasSubmitted = false;

function displayError(message) {
  identifierInput.setAttribute(
    "aria-invalid",
    String(Boolean(message))
  );

  identifierError.textContent = message;
  identifierError.hidden = !message;
}

identifierInput.addEventListener("input", () => {
  statusMessage.textContent = "";

  sessionStorage.removeItem(STORAGE_KEYS.recoveryRecipient);

  if (!hasSubmitted) {
    return;
  }

  const error = validateIdentifier(identifierInput.value);
  displayError(error);
});

// Lưu giá trị của email hoặc phone number đã nhập vào sessionStorage để hiển thị lại trên trang OTP.
function maskIdentifier(value) {
  const identifier = value.trim();

  if (identifier.includes("@")) {
    const [name, domain] = identifier.split("@");

    const visiblePart = name.slice(0, 2);
    const hiddenLength = Math.max(
      3,
      name.length - visiblePart.length
    );

    return `${visiblePart}${"•".repeat(hiddenLength)}@${domain}`;
  }

  const digits = identifier.replace(/[^0-9]/g, "");

  return `••• ••• ••${digits.slice(-3)}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  hasSubmitted = true;
  statusMessage.textContent = "";

  identifierInput.value = identifierInput.value.trim();

  const error = validateIdentifier(identifierInput.value);
  displayError(error);

  if (error) {
    identifierInput.focus();
    return;
  }

  // Chuyển trang để xem giao diện OTP.
  // TODO: Khi có backend, chỉ chuyển sau khi yêu cầu gửi mã được xử lý.

  const maskedRecipient = maskIdentifier(identifierInput.value);

  sessionStorage.setItem(
    STORAGE_KEYS.recoveryRecipient,
    maskedRecipient
  );

  window.location.assign("./otp.html");
});

submitButton.disabled = false;
