import { APP_CONFIG } from "../config/config.js";


export const AUTH_MESSAGES = Object.freeze({
  identifierRequired: "Please enter your email or phone number.",
  identifierInvalid: "Please enter a valid email or phone number.",
  passwordRequired: "Please enter your password.",
  passwordTooShort:
    `Password must contain at least ${APP_CONFIG.minPasswordLength} characters.`,
  otpRequired: "Please enter the verification code.",
  otpInvalid:
    `Please enter a ${APP_CONFIG.otpLength}-digit verification code.`
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