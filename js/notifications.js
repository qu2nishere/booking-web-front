class Notifications {
    constructor() {
        this.createContainer('top');
        this.createContainer('bottom');
    }

    createContainer(position) {
        const id = `toast-container-${position}`;
        if (!document.getElementById(id)) {
            const container = document.createElement('div');
            container.id = id;
            document.body.appendChild(container);
        }
    }

    show(message, type = 'success', position = 'top') {
        let targetContainer = document.getElementById(`toast-container-${position}`);
        if (!targetContainer) {
            this.createContainer(position);
            targetContainer = document.getElementById(`toast-container-${position}`);
        }

        const toast = document.createElement('div');
        toast.className = `toast-custom toast-${type}`;

        const icon = type === 'success' ? '✅' : (type === 'warning' ? '⚠️' : '❌');

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        if (targetContainer) {
            targetContainer.appendChild(toast);
        }

        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 2800);
    }

    confirm(title, message, onConfirm) {
        let overlay = document.getElementById('custom-confirm-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'custom-confirm-overlay';
            overlay.className = 'custom-confirm-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="custom-confirm-box">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="custom-confirm-actions">
                    <button class="custom-confirm-btn custom-confirm-cancel" id="customConfirmCancel">Hủy bỏ</button>
                    <button class="custom-confirm-btn custom-confirm-ok" id="customConfirmOk">Đồng ý</button>
                </div>
            </div>
        `;

        setTimeout(() => overlay.classList.add('show'), 10);

        const cancelBtn = document.getElementById('customConfirmCancel');
        const okBtn = document.getElementById('customConfirmOk');

        const close = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.innerHTML = '', 300);
        };

        cancelBtn.onclick = close;
        okBtn.onclick = () => {
            close();
            if (typeof onConfirm === 'function') onConfirm();
        };
    }
}

const notify = new Notifications();

// Password Toggle Global Logic
document.addEventListener("DOMContentLoaded", () => {
    // Lắng nghe sự kiện click trên document để hỗ trợ cả các phần tử sinh ra động
    document.body.addEventListener("click", function(e) {
        if (e.target.classList.contains("toggle-password")) {
            const targetId = e.target.getAttribute("data-target");
            const input = document.getElementById(targetId);
            if (input) {
                if (input.type === "password") {
                    input.type = "text";
                    e.target.classList.remove("fa-eye-slash");
                    e.target.classList.add("fa-eye");
                } else {
                    input.type = "password";
                    e.target.classList.remove("fa-eye");
                    e.target.classList.add("fa-eye-slash");
                }
            }
        }
    });

    // ── Image Lightbox (Shopee-style) ────────────────────────────────────
    // Tạo DOM cho lightbox 1 lần duy nhất
    const lightboxOverlay = document.createElement('div');
    lightboxOverlay.className = 'lightbox-overlay';
    lightboxOverlay.innerHTML = `
        <button class="lightbox-close" aria-label="Đóng">&times;</button>
        <img src="" alt="Phóng to ảnh">
    `;
    document.body.appendChild(lightboxOverlay);

    const lightboxImg = lightboxOverlay.querySelector('img');
    const lightboxCloseBtn = lightboxOverlay.querySelector('.lightbox-close');

    // Mở lightbox
    window.openLightbox = function(src) {
        lightboxImg.src = src;
        lightboxOverlay.style.display = 'flex';
        // Trigger reflow rồi mới add class active để animation chạy
        void lightboxOverlay.offsetWidth;
        lightboxOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    // Đóng lightbox
    function closeLightbox() {
        lightboxOverlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            lightboxOverlay.style.display = 'none';
            lightboxImg.src = '';
        }, 250);
    }

    lightboxCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
    });

    // Click vào vùng tối (backdrop) để đóng
    lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === lightboxOverlay) closeLightbox();
    });

    // Nhấn Escape để đóng
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxOverlay.classList.contains('active')) {
            closeLightbox();
        }
    });
});
