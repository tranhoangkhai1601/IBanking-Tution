import {
    APP_CONFIG,
    STORAGE_KEYS,
    LANGUAGES
} from "../config/config.js";

export const LANGUAGE_EVENT = "app:languagechange";

let currentLanguage = APP_CONFIG.defaultLanguage;

// Đọc lựa chọn đã lưu khi mở trang.
try {
    const savedLanguage = localStorage.getItem(
        STORAGE_KEYS.language
    );

    if (Object.hasOwn(LANGUAGES, savedLanguage)) {
        currentLanguage = savedLanguage;
    }
} catch {
    // Dùng cấu hình mặc định nếu trình duyệt chặn storage.
}

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