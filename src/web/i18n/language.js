import {
    APP_CONFIG,
    STORAGE_KEYS,
    LANGUAGES
} from "../config/config.js";

export const LANGUAGE_EVENT = "app:languagechange";

function readSavedLanguage(fallback) {
    try {
        const savedLanguage = localStorage.getItem(
            STORAGE_KEYS.language
        );

        if (Object.hasOwn(LANGUAGES, savedLanguage)) {
            return savedLanguage;
        }
    } catch {
        // Giữ lựa chọn hiện tại nếu trình duyệt chặn storage.
    }

    return fallback;
}

let currentLanguage = readSavedLanguage(APP_CONFIG.defaultLanguage);

export function getLanguage() {
    return currentLanguage;
}

export function setLanguage(language) {
    if (!Object.hasOwn(LANGUAGES, language)) {
        return;
    }

    if (language === currentLanguage) {
        return;
    }

    currentLanguage = language;

    try {
        localStorage.setItem(
            STORAGE_KEYS.language,
            currentLanguage
        );
    } catch {
        // Vẫn cho phép đổi lựa chọn trong trang hiện tại.
    }

    document.dispatchEvent(
        new CustomEvent(LANGUAGE_EVENT, {
            detail: {
                language: currentLanguage
            }
        })
    );
}

// Back/Forward Cache khôi phục cả biến JavaScript, không chạy lại module.
window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        setLanguage(readSavedLanguage(currentLanguage));
    }
});
