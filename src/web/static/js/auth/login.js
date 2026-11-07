import "../components/auth-brand.js";
import "../components/language-switch.js";

import { APP_CONFIG, PAGE_PATHS, STORAGE_KEYS } from "../../config/config.js";
import { validateLogin } from "./auth-validation.js";
import { initI18n, t, setMessage } from "../../i18n/i18n.js";

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
    if (loginButton.disabled) {
        return;
    }

    setMessage(statusMessage, "");

    if (!hasSubmitted) {
        return;
    }

    const result = readForm();
    displayErrors(result.errors);
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (loginButton.disabled) {
        return;
    }

    hasSubmitted = true;
    setMessage(statusMessage, "");

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

    // Khi nối backend, gửi thông tin đăng nhập đến API xác thực và chỉ chuyển trang sau khi máy chủ tạo phiên.
    // Thay hồ sơ mẫu bên dưới bằng thông tin khách hàng từ phiên đã xác thực.
    loginButton.disabled = true;
    try {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({
            name: "Đinh Ngọc Hoa",
            accountNumber: "1023456789",
            phone: "0862123456",
            email: "524K0031@gmail.com",
            balance: 10000000,
            isLoggedIn: true
        }));
    } catch {
        statusMessage.classList.add("status-message--error");
        setMessage(statusMessage, "loginSessionError");
        loginButton.disabled = false;
        return;
    }

    inputs.password.value = "";
    window.location.replace(PAGE_PATHS.homepage);
});

const passwordToggle = document.getElementById("password-toggle");
const passwordSlash = document.getElementById("password-slash");

passwordToggle.disabled = true;

passwordToggle.addEventListener("click", () => {
  const shouldShow = inputs.password.type === "password";

  inputs.password.type = shouldShow ? "text" : "password";

  passwordSlash.toggleAttribute("hidden", !shouldShow);

  passwordToggle.setAttribute(
    "aria-label",
    t(shouldShow ? "hidePassword" : "showPassword")
  );
});

const languageReady = await initI18n({
    titleKey: "loginPageTitle",
    statusElement: statusMessage,

    onChange() {
        passwordToggle.setAttribute(
            "aria-label",
            t(inputs.password.type === "password"
                ? "showPassword"
                : "hidePassword")
        );

        if (hasSubmitted) {
            displayErrors(readForm().errors);
        }
    }
});

if (languageReady) {
    loginButton.disabled = false;
    passwordToggle.disabled = false;
}
