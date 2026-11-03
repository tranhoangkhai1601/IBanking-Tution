import { APP_CONFIG } from "../config/config.js";
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

  if (!hasSubmitted) {
    return;
  }

  const error = validateIdentifier(identifierInput.value);
  displayError(error);
});

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

  // TODO: Integrate the real password reset flow in a future task.

  statusMessage.textContent =
    "Input is valid. Password reset is not connected yet.";
});

submitButton.disabled = false;
