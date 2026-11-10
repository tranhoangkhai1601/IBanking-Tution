import "../components/auth-brand.js";
import "../components/language-switch.js";

import { PAGE_PATHS } from "../../config/config.js";
import { validateIdentifier } from "./auth-validation.js";
import { initI18n, setMessage } from "../../i18n/i18n.js";
import {
  clearRecoveryFlow,
  startRecoveryFlow
} from "./recovery-storage.js";

const form = document.getElementById("forgot-password-form");
const identifierInput = document.getElementById("identifier");
const identifierError = document.getElementById("identifier-error");
const submitButton = document.getElementById("forgot-password-submit");
const statusMessage = document.getElementById("forgot-password-status");

let hasSubmitted = false;

clearRecoveryFlow();

function displayError(message) {
  identifierInput.setAttribute(
    "aria-invalid",
    String(Boolean(message))
  );

  identifierError.textContent = message;
  identifierError.hidden = !message;
}

identifierInput.addEventListener("input", () => {
  if (submitButton.disabled) {
    return;
  }

  setMessage(statusMessage, "");

  if (!hasSubmitted) {
    return;
  }

  const error = validateIdentifier(identifierInput.value);
  displayError(error);
});

// Chỉ lưu người nhận đã che vào sessionStorage để hiển thị trên trang OTP.
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

  if (submitButton.disabled) {
    return;
  }

  hasSubmitted = true;
  setMessage(statusMessage, "");

  identifierInput.value = identifierInput.value.trim();

  const error = validateIdentifier(identifierInput.value);
  displayError(error);

  if (error) {
    identifierInput.focus();
    return;
  }

  // Khi nối backend, gửi email hoặc số điện thoại đến API yêu cầu OTP.
  // Chuyển bước sau khi API chấp nhận yêu cầu và dùng thông tin người nhận đã che từ phản hồi.
  const maskedRecipient = maskIdentifier(identifierInput.value);

  if (!startRecoveryFlow(maskedRecipient)) {
    statusMessage.classList.add("status-message--error");
    setMessage(statusMessage, "recoveryFlowError");
    return;
  }

  submitButton.disabled = true;
  window.location.assign(PAGE_PATHS.otp);
});

const languageReady = await initI18n({
  titleKey: "forgotPageTitle",
  statusElement: statusMessage,

  onChange() {
    if (hasSubmitted) {
      displayError(validateIdentifier(identifierInput.value));
    }
  }
});

if (languageReady) {
  submitButton.disabled = false;
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      clearRecoveryFlow();
      submitButton.disabled = false;
    }
  });
}
