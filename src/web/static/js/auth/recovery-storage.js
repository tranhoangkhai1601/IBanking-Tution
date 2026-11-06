import { PAGE_PATHS, STORAGE_KEYS } from "../../config/config.js";

const stepPaths = {
    otp: PAGE_PATHS.otp,
    reset: PAGE_PATHS.resetPassword
};

function readRecoveryFlow() {
    try {
        const flow = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.recoveryFlow));
        return Object.hasOwn(stepPaths, flow?.step) &&
            typeof flow.maskedRecipient === "string" && flow.maskedRecipient
            ? flow : null;
    } catch {
        return null;
    }
}

export function clearRecoveryFlow() {
    try {
        sessionStorage.removeItem(STORAGE_KEYS.recoveryFlow);
    } catch {
        // Trình duyệt có thể chặn cả việc truy cập sessionStorage.
    }
}

function saveRecoveryFlow(flow) {
    try {
        sessionStorage.setItem(STORAGE_KEYS.recoveryFlow, JSON.stringify(flow));
        return true;
    } catch {
        return false;
    }
}

// Trạng thái này điều khiển các bước demo trong cùng một tab.
export function startRecoveryFlow(maskedRecipient) {
    return saveRecoveryFlow({ step: "otp", maskedRecipient });
}

export function advanceRecoveryFlow() {
    const flow = readRecoveryFlow();
    return flow?.step === "otp" && saveRecoveryFlow({ ...flow, step: "reset" });
}

export function requireRecoveryStep(step) {
    const flow = readRecoveryFlow();
    if (flow?.step === step) return flow;

    document.body.hidden = true;
    window.location.replace(flow ? stepPaths[flow.step] : PAGE_PATHS.forgotPassword);
    return null;
}
