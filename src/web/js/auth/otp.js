import "../components/auth-brand.js";
import "../components/language-switch.js";

import { APP_CONFIG, PAGE_PATHS } from "../../config/config.js";
import { validateOtp } from "./auth-validation.js";
import { initI18n, t, setMessage } from "../../i18n/i18n.js";
import { advanceRecoveryFlow, requireRecoveryStep } from "./recovery-storage.js";

const recovery = requireRecoveryStep("otp");
window.addEventListener("pageshow", (event) => {
    if (event.persisted) requireRecoveryStep("otp");
});

const form = document.getElementById("otp-form");
const inputGroup = document.getElementById("otp-inputs");
const errorElement = document.getElementById("otp-error");
const helpElement = document.getElementById("otp-help");
const statusMessage = document.getElementById("otp-status");
const submitButton = document.getElementById("otp-submit");
const resendButton = document.getElementById("resend-otp");
const otpExpiryElement = document.getElementById("otp-expiry");
const otpTimeElement = document.getElementById("otp-time");

resendButton.disabled = true;

function renderOtpTimer(remainingSeconds) {
    const totalSeconds = Math.max(
        0,
        Math.floor(remainingSeconds)
    );

    const minutes = String(
        Math.floor(totalSeconds / 60)
    ).padStart(2, "0");

    const seconds = String(
        totalSeconds % 60
    ).padStart(2, "0");

    otpTimeElement.textContent = `${minutes}:${seconds}`;
    otpExpiryElement.hidden = false;
}
// Khi nối backend, tính thời gian còn lại từ mốc hết hạn trong phản hồi và cập nhật đồng hồ.
renderOtpTimer(90);

const otpLength = APP_CONFIG.otpLength;
const description = document.getElementById("otp-description");

const maskedRecipient = recovery?.maskedRecipient;

inputGroup.style.setProperty("--otp-length", String(otpLength));

let hasSubmitted = false;

const otpInputs = Array.from({ length: otpLength }, (_, index) => {
    const input = document.createElement("input");

    input.className = "input-field";
    input.type = "text";
    input.name = `otp-digit-${index + 1}`;
    input.inputMode = "numeric";

    // Cho phép nhận cả mã từ tính năng tự điền rồi tách vào các ô.
    input.maxLength = otpLength;
    input.autocomplete = index === 0 ? "one-time-code" : "off";

    input.setAttribute(
        "aria-label",
        `Digit ${index + 1} of ${otpLength}`
    );

    input.setAttribute("aria-invalid", "false");
    input.setAttribute("aria-describedby", "otp-help otp-error");

    inputGroup.appendChild(input);

    return input;
});

function readCode() {
    return otpInputs.map((input) => input.value).join("");
}

function displayError(message) {
    errorElement.textContent = message;
    errorElement.hidden = !message;

    otpInputs.forEach((input) => {
        input.setAttribute(
            "aria-invalid",
            String(Boolean(message))
        );
    });
}

function handleEdit() {
    if (submitButton.disabled) {
        return;
    }

    setMessage(statusMessage, "");

    if (hasSubmitted) {
        displayError(validateOtp(readCode()));
    }
}

function fillDigits(value, startIndex = 0) {
    const digits = value
        .replace(/[^0-9]/g, "")
        .slice(0, otpLength - startIndex);

    if (!digits) {
        return;
    }

    for (let index = startIndex; index < otpLength; index++) {
        otpInputs[index].value = digits[index - startIndex] || "";
    }

    const nextIndex = Math.min(
        startIndex + digits.length,
        otpLength - 1
    );

    otpInputs[nextIndex].focus();
    handleEdit();
}

otpInputs.forEach((input, index) => {
    input.addEventListener("focus", () => {
        input.select();
    });

    input.addEventListener("input", () => {
        const digits = input.value.replace(/[^0-9]/g, "");

        // Trường hợp trình duyệt tự điền toàn bộ mã vào một ô.
        if (digits.length === otpLength) {
            fillDigits(digits);
            return;
        }

        input.value = digits.slice(-1);
        handleEdit();

        if (input.value && index < otpLength - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace") {
            event.preventDefault();

            if (input.value) {
                input.value = "";
            } else if (index > 0) {
                otpInputs[index - 1].value = "";
                otpInputs[index - 1].focus();
            }

            handleEdit();
            return;
        }

        if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault();
            otpInputs[index - 1].focus();
        }

        if (event.key === "ArrowRight" && index < otpLength - 1) {
            event.preventDefault();
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener("paste", (event) => {
        event.preventDefault();

        const digits = event.clipboardData
            .getData("text")
            .replace(/[^0-9]/g, "");

        const startIndex = digits.length >= otpLength ? 0 : index;

        fillDigits(digits, startIndex);
    });
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (submitButton.disabled) {
        return;
    }

    hasSubmitted = true;
    setMessage(statusMessage, "");

    const error = validateOtp(readCode());
    displayError(error);

    if (error) {
        const firstEmptyInput = otpInputs.find(
            (input) => !input.value
        );

        (firstEmptyInput || otpInputs[0]).focus();
        return;
    }

    // Khi nối backend, gửi mã OTP cùng mã yêu cầu khôi phục đến API xác minh.
    // Chỉ chuyển sang đặt lại mật khẩu sau khi máy chủ xác nhận mã.
    if (!requireRecoveryStep("otp")) return;
    if (!advanceRecoveryFlow()) {
        statusMessage.classList.add("status-message--error");
        setMessage(statusMessage, "recoveryFlowError");
        return;
    }

    submitButton.disabled = true;
    window.location.assign(PAGE_PATHS.resetPassword);
});

resendButton.addEventListener("click", () => {
    if (resendButton.disabled) {
        return;
    }

    // Khi nối backend, gọi API gửi lại OTP và cập nhật thời hạn theo phản hồi mới.
    setMessage(statusMessage, "resendPending");
});

function renderOtpLanguage() {
    helpElement.textContent = t("otpHelp", { length: otpLength });

    if (maskedRecipient) {
        const recipientElement = document.createElement("strong");
        recipientElement.textContent = maskedRecipient;

        description.replaceChildren(
            document.createTextNode(t("otpPrefix", { length: otpLength })),
            recipientElement,
            document.createTextNode(".")
        );
    } else {
        description.textContent = t("otpDescription");
    }

    otpInputs.forEach((input, index) => {
        input.setAttribute("aria-label", t("otpDigit", {
            index: index + 1,
            length: otpLength
        }));
    });

    if (hasSubmitted) {
        displayError(validateOtp(readCode()));
    }
}

const languageReady = recovery && await initI18n({
    titleKey: "otpPageTitle",
    statusElement: statusMessage,
    onChange: renderOtpLanguage
});

if (languageReady) {
    submitButton.disabled = false;
    resendButton.disabled = false;
}
