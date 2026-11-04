// Cấu hình dùng chung cho frontend
export const APP_CONFIG = Object.freeze({
  appName: "IBanking-Tution",
  minPasswordLength: 6,
  otpLength: 6,
  defaultLanguage: "en"
});

export const STORAGE_KEYS = Object.freeze({
  recoveryRecipient: "ibanking.recoveryRecipient",
  otpExpiresAt: "ibanking.otpExpiresAt",
  language: "ibanking.language"
});

export const LANGUAGES = Object.freeze({
  en: "English",
  vi: "Tiếng Việt"
});