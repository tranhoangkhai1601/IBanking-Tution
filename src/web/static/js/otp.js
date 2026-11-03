import { APP_CONFIG, STORAGE_KEYS } from "../config/config.js";
import { validateOtp } from "./auth-validation.js";

const form = document.getElementById("otp-form");
const inputGroup = document.getElementById("otp-inputs");
const errorElement = document.getElementById("otp-error");
const helpElement = document.getElementById("otp-help");
const statusMessage = document.getElementById("otp-status");
const submitButton = document.getElementById("otp-submit");
const resendButton = document.getElementById("resend-otp");
const otpExpiryElement = document.getElementById("otp-expiry");
const otpTimeElement = document.getElementById("otp-time");

// Giá trị mẫu để xem giao diện, đơn vị giây.
let otpRemainingSeconds = 90;
// Hiên thị thời gian còn lại để nhập OTP, ẩn nếu không có giá trị.
function renderOtpTimer() {
    if (otpRemainingSeconds === null) {
        otpExpiryElement.hidden = true;
        return;
    }

    const totalSeconds = Math.max(
        0,
        Math.floor(otpRemainingSeconds)
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
renderOtpTimer();

const otpLength = APP_CONFIG.otpLength;
const description = document.getElementById("otp-description");

const maskedRecipient = sessionStorage.getItem(
    STORAGE_KEYS.recoveryRecipient
);

// Hiển thị thông tin người nhận đã được ẩn một phần nếu có.
if (maskedRecipient) {
    const recipientElement = document.createElement("strong");
    recipientElement.textContent = maskedRecipient;

    description.replaceChildren(
        document.createTextNode(
            `Enter the ${otpLength}-digit code for `
        ),
        recipientElement,
        document.createTextNode(".")
    );
}

document.querySelectorAll("[data-app-name]").forEach((element) => {
    element.textContent = APP_CONFIG.appName;
});

document.title = `OTP Verification | ${APP_CONFIG.appName}`;

helpElement.textContent = `Enter the ${otpLength}-digit code.`;
inputGroup.style.setProperty("--otp-length", String(otpLength));

let hasSubmitted = false;

const otpInputs = Array.from({ length: otpLength }, (_, index) => {
    const input = document.createElement("input");

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
    statusMessage.textContent = "";

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

    hasSubmitted = true;
    statusMessage.textContent = "";

    const error = validateOtp(readCode());
    displayError(error);

    if (error) {
        const firstEmptyInput = otpInputs.find(
            (input) => !input.value
        );

        (firstEmptyInput || otpInputs[0]).focus();
        return;
    }

    // TODO: Integrate real OTP verification in a future task.

    statusMessage.textContent =
        "Input is valid. OTP verification is not connected yet.";
});

resendButton.addEventListener("click", () => {
    // TODO: Integrate the real resend OTP request in a future task.

    statusMessage.textContent =
        "Resending OTP is not connected yet.";
});

submitButton.disabled = false;