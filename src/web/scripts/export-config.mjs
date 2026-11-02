import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

// Tham số thứ nhất: đường dẫn .env.
// Dùng "-" để đọc biến môi trường của container.
const envFile = process.argv[2];

// Tham số thứ hai: đường dẫn file JavaScript đầu ra.
const outputFile = process.argv[3];

const env = envFile && envFile !== "-"
    ? parseEnv(readFileSync(resolve(envFile), "utf8"))
    : process.env; // dùng biến môi trường của container nếu không có file .env.

const appName = env.APP_NAME?.trim();
const rawMinLength = env.PASSWORD_MIN_LENGTH?.trim() || "";

if (!appName) {
    throw new Error("APP_NAME is required.");
}

if (!/^[0-9]+$/.test(rawMinLength)) {
    throw new Error("PASSWORD_MIN_LENGTH must be a positive integer.");
}

const minPasswordLength = Number(rawMinLength);

if (
    !Number.isSafeInteger(minPasswordLength) ||
    minPasswordLength <= 0
) {
    throw new Error("PASSWORD_MIN_LENGTH must be a positive integer.");
}

// Chỉ xuất các trường công khai được cho phép.
const publicConfig = {
    appName,
    minPasswordLength
};

const outputPath = outputFile
    ? resolve(outputFile)
    : new URL("../static/js/config.js", import.meta.url);

const content =
    "// Generated file. Do not edit manually.\n" +
    "export const APP_CONFIG = Object.freeze(" +
    JSON.stringify(publicConfig, null, 2) +
    ");\n";

writeFileSync(outputPath, content, "utf8");

console.log("Public frontend configuration generated.");