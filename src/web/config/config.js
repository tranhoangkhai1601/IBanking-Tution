// Cấu hình dùng chung cho frontend
export const APP_CONFIG = Object.freeze({
  appName: "IBanking-Tution",
  minPasswordLength: 6,
  otpLength: 6,
  defaultLanguage: "en",
  // Số dư và số tiền giao dịch đều tính theo VND
  currencyLocale: "vi-VN",
  currencyCode: "VND",
});

export const PAGE_PATHS = Object.freeze({
  homepage: "./index",
  login: "./login",
  forgotPassword: "./forgot-password",
  otp: "./otp",
  resetPassword: "./reset-password",
  transaction: "./transaction",
  profile: "./profile",
});

export const STORAGE_KEYS = Object.freeze({
  user: "user",
  transactionHistory: "transactionHistory",
  selectedPaymentAccount: "ibanking.selectedPaymentAccount",
  recoveryFlow: "ibanking.recoveryFlow",
  language: "ibanking.language",
});

export const LANGUAGES = Object.freeze({
  en: "English",
  vi: "Tiếng Việt",
});
