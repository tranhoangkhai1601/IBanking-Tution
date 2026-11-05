import { STORAGE_KEYS } from "../config/config.js";

// Thông tin người nhận đã che chỉ phục vụ hiển thị, không chặn luồng UI.
export function readRecoveryRecipient() {
    try {
        return sessionStorage.getItem(STORAGE_KEYS.recoveryRecipient);
    } catch {
        return null;
    }
}

export function clearRecoveryRecipient() {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.recoveryRecipient);
    } catch {
        // Trình duyệt có thể chặn cả việc truy cập sessionStorage.
    }
}

export function saveRecoveryRecipient(maskedRecipient) {
    try {
        sessionStorage.setItem(STORAGE_KEYS.recoveryRecipient, maskedRecipient);
    } catch {
        // Tránh hiển thị người nhận cũ nếu lần lưu mới thất bại.
        clearRecoveryRecipient();
    }
}
