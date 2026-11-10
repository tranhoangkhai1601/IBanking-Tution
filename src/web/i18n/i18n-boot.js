// Script thường chạy trong head, trước khi trình duyệt vẽ nội dung trang.
(() => {
    const root = document.documentElement;
    root.classList.add("i18n-pending");

    const showFallback = () => {
        root.classList.remove("i18n-pending");
    };

    // Nếu module bị thiếu hoặc lỗi, vẫn cho người dùng thấy trang dự phòng.
    window.addEventListener("error", (event) => {
        if (event.target instanceof HTMLScriptElement || event instanceof ErrorEvent) {
            showFallback();
        }
    }, true);

    window.addEventListener("unhandledrejection", showFallback);
})();
