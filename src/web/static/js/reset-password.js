import "./components/auth-brand.js";
import "./components/language-switch.js";

import { APP_CONFIG } from "../config/config.js";
import { validateResetPassword } from "./auth-validation.js";
import { initI18n, t, setMessage } from "./i18n.js";

const form = document.getElementById("reset-password-form");
const submitButton = document.getElementById("reset-password-submit");
const statusMessage = document.getElementById("reset-password-status");
const pageError = document.getElementById("reset-page-error");
const formView = document.getElementById("reset-form-view");
const successView = document.getElementById("reset-success");
const successTitle = document.getElementById("reset-success-title");
const authPanel = form.closest(".auth-panel");

const inputs = {
    password: document.getElementById("new-password"),
    confirmPassword: document.getElementById("confirm-password")
};

const errorElements = {
    password: document.getElementById("new-password-error"),
    confirmPassword: document.getElementById("confirm-password-error")
};

inputs.password.minLength = APP_CONFIG.minPasswordLength;

let hasSubmitted = false;
let isComplete = false;

function readForm() {
    return validateResetPassword({
        password: inputs.password.value,
        confirmPassword: inputs.confirmPassword.value
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

const passwordToggles = Array.from(
    form.querySelectorAll("[data-password-toggle]"),
    (button) => ({
        button,
        input: document.getElementById(
            button.dataset.passwordToggle
        ),
        slash: button.querySelector("[data-password-slash]")
    })
);

function updatePasswordToggleLabels() {
    passwordToggles.forEach(({ button, input }) => {
        button.setAttribute(
            "aria-label",
            t(
                input.type === "password"
                    ? "showPassword"
                    : "hidePassword"
            )
        );
    });
}

passwordToggles.forEach(({ button, input, slash }) => {
    button.addEventListener("click", () => {
        const shouldShow = input.type === "password";

        input.type = shouldShow ? "text" : "password";
        slash.toggleAttribute("hidden", !shouldShow);

        updatePasswordToggleLabels();
    });
});

function clearResetError() {
    setMessage(statusMessage, "");
    statusMessage.hidden = true;
}

// Chỉ gọi khi server trả về lỗi tương ứng.
export function showResetError(key = "resetServerError") {
    if (isComplete) {
        return;
    }

    setMessage(statusMessage, key);
    statusMessage.hidden = false;
}

// Chỉ gọi sau khi server xác nhận đã đổi mật khẩu.
export function showResetSuccess() {
    if (isComplete || submitButton.disabled) {
        return;
    }

    isComplete = true;
    hasSubmitted = false;

    clearResetError();
    displayErrors({});

    // Xóa mật khẩu khỏi các input khi hoàn tất.
    form.reset();

    passwordToggles.forEach(({ input, slash }) => {
        input.type = "password";
        slash.setAttribute("hidden", "");
    });

    updatePasswordToggleLabels();

    formView.hidden = true;
    successView.hidden = false;

    authPanel.setAttribute(
        "aria-labelledby",
        "reset-success-title"
    );

    document.title =
        `${t("resetSuccessTitle")} | ${APP_CONFIG.appName}`;

    successTitle.focus();
}

form.addEventListener("input", () => {
    if (submitButton.disabled || isComplete) {
        return;
    }

    clearResetError();

    if (hasSubmitted) {
        displayErrors(readForm().errors);
    }
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (submitButton.disabled || isComplete) {
        return;
    }

    hasSubmitted = true;
    clearResetError();

    const result = readForm();
    displayErrors(result.errors);

    const firstInvalidName = Object.keys(inputs).find(
        (name) => result.errors[name]
    );

    if (firstInvalidName) {
        inputs[firstInvalidName].focus();
        return;
    }

    // Demo UI: hiển thị màn hình thành công khi dữ liệu đúng định dạng.
    // TODO: Khi có backend, chỉ gọi hàm này sau phản hồi thành công từ server.
    showResetSuccess();
    //
    // Server báo mật khẩu đã được sử dụng:
    // showResetError("passwordReused");
    //
    // Server báo lỗi chung:
    // showResetError("resetServerError");
});

const languageReady = await initI18n({
    titleKey: "resetPageTitle",
    statusElement: pageError,

    onChange() {
        updatePasswordToggleLabels();

        if (isComplete) {
            document.title =
                `${t("resetSuccessTitle")} | ${APP_CONFIG.appName}`;

            return;
        }

        if (hasSubmitted) {
            displayErrors(readForm().errors);
        }
    }
});

if (languageReady) {
    submitButton.disabled = false;

    passwordToggles.forEach(({ button }) => {
        button.disabled = false;
    });
} else {
    pageError.hidden = false;
}
