import { APP_CONFIG } from "../config/config.js";
import { validateLogin } from "./auth-validation.js";

const form = document.getElementById("login-form");
const loginButton = document.getElementById("login-submit");
const statusMessage = document.getElementById("login-status");

const inputs = {
    identifier: document.getElementById("identifier"),
    password: document.getElementById("password")
};

const errorElements = {
    identifier: document.getElementById("identifier-error"),
    password: document.getElementById("password-error")
};

document.querySelectorAll("[data-app-name]").forEach((element) => {
    element.textContent = APP_CONFIG.appName;
});
document.title = `Login | ${APP_CONFIG.appName}`;

inputs.password.minLength = APP_CONFIG.minPasswordLength;

let hasSubmitted = false;

function readForm() {
    return validateLogin({
        identifier: inputs.identifier.value,
        password: inputs.password.value
    });
}

function displayErrors(errors) {
    for (const name of Object.keys(inputs)) {
        const message = errors[name] || "";

        inputs[name].setAttribute(
            "aria-invalid",
            String(Boolean(message))
        );

        errorElements[name].textContent = message;
        errorElements[name].hidden = !message;
    }
}

form.addEventListener("input", () => {
    statusMessage.textContent = "";

    if (!hasSubmitted) {
        return;
    }

    const result = readForm();
    displayErrors(result.errors);
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    hasSubmitted = true;
    statusMessage.textContent = "";

    const result = readForm();

    inputs.identifier.value = result.values.identifier;
    displayErrors(result.errors);

    if (Object.keys(result.errors).length > 0) {
        const firstInvalidInput = result.errors.identifier
            ? inputs.identifier
            : inputs.password;

        firstInvalidInput.focus();
        return;
    }

    // TODO: Integrate the real login flow here in a future task.

    statusMessage.textContent =
        "Input is valid. Login is not connected yet.";
});

loginButton.disabled = false;

const passwordToggle = document.getElementById("password-toggle");
const passwordSlash = document.getElementById("password-slash");

passwordToggle.addEventListener("click", () => {
  const shouldShow = inputs.password.type === "password";

  inputs.password.type = shouldShow ? "text" : "password";

  passwordSlash.toggleAttribute("hidden", !shouldShow);

  passwordToggle.setAttribute(
    "aria-label",
    shouldShow ? "Hide password" : "Show password"
  );
});
