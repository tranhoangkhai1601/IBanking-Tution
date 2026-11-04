import { APP_CONFIG } from "../../config/config.js";

// Nội dung chỉ phục vụ component thương hiệu.
// Sau này có thể thay bằng nội dung từ bộ dịch.
const DEFAULT_COPY = Object.freeze({
    aboutApp: "About the application",
    services: "Digital tuition services",
    brandLineOne: "Bank with clarity.",
    brandLineTwo: "Move with confidence.",
    brandDescription:
        "A clearer way to access your tuition services, designed around you.",
    protectTitle: "Protect your account details",
    protectDescription:
        "Keep your password and personal information private.",
    accountAccess: "Account access"
});

// Logo được khai báo một lần, dùng cho cả desktop và mobile.
const LOGO_MARKUP = `
  <span class="brand__mark" aria-hidden="true">
    <svg
      viewBox="0 0 32 32"
      fill="none"
      focusable="false">
      <path
        d="M16 3.5 26 7.3v7.9c0 6.2-4.1 11.3-10 13.3-5.9-2-10-7.1-10-13.3V7.3L16 3.5Z"
        fill="currentColor">
      </path>
      <path
        d="m11.7 16.1 2.8 2.9 6.2-6.5"
        stroke="white"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round">
      </path>
    </svg>
  </span>
`;

const PANEL_MARKUP = `
  <div class="brand-panel__glow" aria-hidden="true"></div>

  <div class="brand">
    ${LOGO_MARKUP}
    <span class="brand__name" data-brand-name></span>
  </div>

  <div class="brand-panel__content">
    <p class="trust-pill">
      <span aria-hidden="true"></span>
      <strong data-brand-copy="services"></strong>
    </p>

    <h2>
      <span data-brand-copy="brandLineOne"></span><br>
      <span data-brand-copy="brandLineTwo"></span>
    </h2>

    <p data-brand-copy="brandDescription"></p>
  </div>

  <div class="security-card">
    <span class="security-card__icon" aria-hidden="true">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        focusable="false">
        <path
          d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10Z">
        </path>
      </svg>
    </span>

    <div>
      <strong data-brand-copy="protectTitle"></strong>
      <p data-brand-copy="protectDescription"></p>
    </div>
  </div>
`;

const COMPACT_MARKUP = `
  <div class="brand brand--compact">
    ${LOGO_MARKUP}
    <span class="brand__name" data-brand-name></span>
  </div>

  <span
    class="mobile-header__label"
    data-brand-copy="accountAccess">
  </span>
`;

class AuthBrand extends HTMLElement {
    constructor() {
        super();

        this._copy = { ...DEFAULT_COPY };
        this._rendered = false;
    }

    connectedCallback() {
        if (!this._rendered) {
            const isCompact = this.getAttribute("variant") === "compact";

            // Chỉ chèn cấu trúc HTML cố định của component.
            this.innerHTML = isCompact
                ? COMPACT_MARKUP
                : PANEL_MARKUP;

            this._rendered = true;
        }

        this._updateText();
    }

    // Cập nhật chữ mà không tạo lại cấu trúc HTML.
    setCopy(copy) {
        if (!copy || typeof copy !== "object") {
            return;
        }

        for (const key of Object.keys(DEFAULT_COPY)) {
            if (typeof copy[key] === "string") {
                this._copy[key] = copy[key];
            }
        }

        if (this._rendered) {
            this._updateText();
        }
    }

    _updateText() {
        this.querySelectorAll("[data-brand-name]").forEach((element) => {
            element.textContent = APP_CONFIG.appName;
        });

        this.querySelectorAll("[data-brand-copy]").forEach((element) => {
            const key = element.dataset.brandCopy;
            element.textContent = this._copy[key];
        });

        if (this.getAttribute("variant") !== "compact") {
            this.setAttribute("role", "complementary");
            this.setAttribute("aria-label", this._copy.aboutApp);
        }
    }
}

if (!customElements.get("auth-brand")) {
    customElements.define("auth-brand", AuthBrand);
}