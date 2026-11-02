import { APP_CONFIG } from "./config.js";

export const AUTH_RULES = Object.freeze({
  minPasswordLength: APP_CONFIG.minPasswordLength
});

export const AUTH_MESSAGES = Object.freeze({
  identifierRequired: "Please enter your email or phone number.",
  identifierInvalid: "Please enter a valid email or phone number.",
  passwordRequired: "Please enter your password.",
  passwordTooShort:
    `Password must contain at least ${AUTH_RULES.minPasswordLength} characters.`
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

  if (password.length < AUTH_RULES.minPasswordLength) {
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