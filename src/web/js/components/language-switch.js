import { LANGUAGES } from "../../config/config.js";

import {
    getLanguage,
    setLanguage,
    LANGUAGE_EVENT
} from "../../i18n/language.js";

class LanguageSwitch extends HTMLElement {
    constructor() {
        super();

        this._rendered = false;

        this._handleClick = (event) => {
            const button = event.target.closest(
                "button[data-language]"
            );

            if (!button || !this._group.contains(button)) {
                return;
            }

            setLanguage(button.dataset.language);
        };

        this._handleLanguageChange = () => {
            this._updateSelection();
        };
    }

    connectedCallback() {
        if (!this._rendered) {
            this.innerHTML = `
        <div
          class="language-switch__group"
          role="group">
        </div>
      `;

            this._group = this.querySelector(
                ".language-switch__group"
            );

            for (const [language, name] of Object.entries(LANGUAGES)) {
                const button = document.createElement("button");

                button.type = "button";
                button.className = "language-switch__button";
                button.dataset.language = language;

                button.textContent = language.toUpperCase();
                button.lang = language;
                button.title = name;
                button.setAttribute("aria-label", name);

                this._group.appendChild(button);
            }

            this._buttons = Array.from(
                this._group.querySelectorAll("button")
            );

            this._rendered = true;
        }

        this._group.addEventListener(
            "click",
            this._handleClick
        );

        document.addEventListener(
            LANGUAGE_EVENT,
            this._handleLanguageChange
        );

        this._updateSelection();
    }

    disconnectedCallback() {
        this._group?.removeEventListener(
            "click",
            this._handleClick
        );

        document.removeEventListener(
            LANGUAGE_EVENT,
            this._handleLanguageChange
        );
    }

    _updateSelection() {
        const currentLanguage = getLanguage();

        this._group.setAttribute(
            "aria-label",
            currentLanguage === "vi"
                ? "Chọn ngôn ngữ"
                : "Choose language"
        );

        this._buttons.forEach((button) => {
            const isSelected =
                button.dataset.language === currentLanguage;

            button.setAttribute(
                "aria-pressed",
                String(isSelected)
            );
        });
    }
}

if (!customElements.get("language-switch")) {
    customElements.define(
        "language-switch",
        LanguageSwitch
    );
}