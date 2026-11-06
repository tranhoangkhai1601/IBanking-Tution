// Cấu hình dùng chung cho frontend
export const APP_CONFIG = Object.freeze({
  appName: "IBanking-Tution",
  minPasswordLength: 6,
  otpLength: 6,
  defaultLanguage: "en",
  currencyLocale: "vi-VN",
  currencyCode: "VND"
});

export const PAGE_PATHS = Object.freeze({
  homepage: "./homepage.html",
  login: "./login.html",
  forgotPassword: "./forgot-password.html",
  otp: "./otp.html",
  resetPassword: "./reset-password.html"
});

export const STORAGE_KEYS = Object.freeze({
  user: "user",
  transactionHistory: "transactionHistory",
  recoveryFlow: "ibanking.recoveryFlow",
  otpExpiresAt: "ibanking.otpExpiresAt",
  language: "ibanking.language"
});

export const LANGUAGES = Object.freeze({
  en: "English",
  vi: "Tiếng Việt"
});
