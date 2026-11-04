import {
    APP_CONFIG,
    LANGUAGES
} from "../config/config.js";

import {
    getLanguage,
    LANGUAGE_EVENT
} from "./language.js";

let dictionaries = {};
let loadingPromise = null;

// Tải các bản dịch một lần trong mỗi lần mở trang.
function loadDictionaries() {
    if (!loadingPromise) {
        loadingPromise = Promise.all(
            Object.keys(LANGUAGES).map(async (language) => {
                const url = new URL(
                    `../locales/${language}.json`,
                    import.meta.url
                );

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(
                        `Cannot load ${language}.json: ${response.status}`
                    );
                }

                const messages = await response.json();

                return [language, messages];
            })
        ).then((entries) => {
            dictionaries = Object.fromEntries(entries);
        });
    }

    return loadingPromise;
}

// Ví dụ: t("passwordTooShort", { length: 6 }). Dùng để translate các chuỗi có biến. Nếu không tìm thấy bản dịch, trả về key.
export function t(key, values = {}) {
    const template =
        dictionaries[getLanguage()]?.[key] ??
        dictionaries[APP_CONFIG.defaultLanguage]?.[key] ??
        key;

    return template.replace(/\{(\w+)\}/g, (match, name) => {
        return Object.hasOwn(values, name)
            ? String(values[name])
            : match;
    });
}

// Ghi nhớ khóa để thông báo đang hiển thị cũng đổi ngôn ngữ.
export function setMessage(element, key) {
    if (!key) {
        delete element.dataset.i18n;
        element.textContent = "";
        return;
    }

    element.dataset.i18n = key;
    element.textContent = t(key);
}

export async function initI18n({
    titleKey,
    statusElement,
    onChange = () => { }
}) {
    try {
        await loadDictionaries();
    } catch {
        delete statusElement.dataset.i18n;

        statusElement.textContent =
            "Unable to load language files. Please reload the page. / " +
            "Không tải được bản dịch. Vui lòng tải lại trang.";

        document.documentElement.classList.remove("i18n-pending");
        return false;
    }

    function applyLanguage() {
        const language = getLanguage();

        document.documentElement.lang = language;
        document.title = `${t(titleKey)} | ${APP_CONFIG.appName}`;

        document.querySelectorAll("[data-i18n]").forEach((element) => {
            element.textContent = t(element.dataset.i18n);
        });

        document
            .querySelectorAll("[data-i18n-placeholder]")
            .forEach((element) => {
                element.placeholder = t(element.dataset.i18nPlaceholder);
            });

        document
            .querySelectorAll("[data-i18n-aria-label]")
            .forEach((element) => {
                element.setAttribute(
                    "aria-label",
                    t(element.dataset.i18nAriaLabel)
                );
            });

        const messages = {
            ...dictionaries[APP_CONFIG.defaultLanguage],
            ...dictionaries[language]
        };

        document.querySelectorAll("auth-brand").forEach((component) => {
            component.setCopy(messages);
        });

        // Từng trang tự cập nhật lỗi và nội dung có biến.
        onChange();
    }

    document.addEventListener(
        LANGUAGE_EVENT,
        applyLanguage
    );

    try {
        applyLanguage();
    } finally {
        document.documentElement.classList.remove("i18n-pending");
    }

    return true;
}
