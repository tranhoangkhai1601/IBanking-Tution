import { APP_CONFIG } from "../config/config.js";
import { t } from "./i18n.js";

export const AUTH_MESSAGES = Object.freeze({
  get identifierRequired() {
    return t("identifierRequired");
  },

  get identifierInvalid() {
    return t("identifierInvalid");
  },

  get passwordRequired() {
    return t("passwordRequired");
  },

  get passwordTooShort() {
    return t("passwordTooShort", {
      length: APP_CONFIG.minPasswordLength
    });
  },

  get otpRequired() {
    return t("otpRequired");
  },

  get otpInvalid() {
    return t("otpInvalid", {
      length: APP_CONFIG.otpLength
    });
  }
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const PHONE_PATTERN = /^(?:0|\+84)[35789][0-9]{8}$/;

export function validateIdentifier(value) {
  const identifier = value.trim();

  if (!identifier) {
    return AUTH_MESSAGES.identifierRequired;
  }

  if (
    !EMAIL_PATTERN.test(identifier) &&
    !PHONE_PATTERN.test(identifier)
  ) {
    return AUTH_MESSAGES.identifierInvalid;
  }

  return "";
}

export function validatePassword(password) {
  if (password.length === 0) {
    return AUTH_MESSAGES.passwordRequired;
  }

  if (password.length < APP_CONFIG.minPasswordLength) {
    return AUTH_MESSAGES.passwordTooShort;
  }

  return "";
}

export function validateLogin({ identifier, password }) {
  const errors = {};

  const identifierError = validateIdentifier(identifier);
  const passwordError = validatePassword(password);

  if (identifierError) {
    errors.identifier = identifierError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  return {
    errors,
    values: {
      identifier: identifier.trim(),
      password
    }
  };
}

export function validateOtp(code) {
  if (!code) {
    return AUTH_MESSAGES.otpRequired;
  }

  const pattern = new RegExp(
    `^[0-9]{${APP_CONFIG.otpLength}}$`
  );

  return pattern.test(code)
    ? ""
    : AUTH_MESSAGES.otpInvalid;
}

export function validateResetPassword({
  password,
  confirmPassword
}) {
  const errors = {};

  const passwordError = validatePassword(password);

  if (passwordError) {
    errors.password = passwordError;
  }

  if (confirmPassword.length === 0) {
    errors.confirmPassword = t("confirmPasswordRequired");
  } else if (confirmPassword !== password) {
    errors.confirmPassword = t("passwordMismatch");
  }

  return { errors };
}