// Cấu hình dùng chung cho frontend
export const APP_CONFIG = Object.freeze({
  appName: "IBanking-Tution",
  minPasswordLength: 6,
  otpLength: 6
});

export const STORAGE_KEYS = Object.freeze({
  recoveryRecipient: "ibanking.recoveryRecipient",
  otpExpiresAt: "ibanking.otpExpiresAt"
});