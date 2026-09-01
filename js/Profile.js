class ProfileService {
    constructor() {
        this.baseUrl = "https://mayvang-api.onrender.com/api/users";
        this.paymentBaseUrl = "https://mayvang-api.onrender.com/api/payments";
        this.token = localStorage.getItem("jwt_token");

        this.form = document.getElementById("profileForm");
        this.changePasswordForm = document.getElementById("changePasswordForm");
        this.avatarInput = document.getElementById("avatar");
        this.avatarFileInput = document.getElementById("avatarFile");
        this.uploadAvatarBtn = document.getElementById("uploadAvatarBtn");
        this.avatarPreview = document.getElementById("profileAvatarPreview");
        this.avatarUploadStatus = document.getElementById("avatarUploadStatus");

        this.init();
    }

    async init() {
        if (!this.token) {
            notify.show("Bạn cần đăng nhập để vào trang hồ sơ", "error");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);
            return;
        }

        this.bindEvents();

        // Ẩn màn hình loading, hiện nội dung ngay lập tức để tránh cảm giác "lag"
        const pageLoading = document.getElementById("page-loading");
        const mainContent = document.getElementById("main-profile-content");
        if (pageLoading) pageLoading.style.display = "none";
        if (mainContent) mainContent.style.display = "block";

        // Tải dữ liệu bất đồng bộ, phần nào xong thì hiện phần đó
        this.loadProfile();
        this.loadBookingHistory();
        this.loadMyReviews();
    }

    bindEvents() {
        if (this.form) {
            this.form.addEventListener("submit", (e) => this.handleUpdateProfile(e));
        }

        this.bindReviewEvents();

        if (this.changePasswordForm) {
            this.changePasswordForm.addEventListener("submit", (e) => this.handleChangePassword(e));
        }

        if (this.uploadAvatarBtn) {
            this.uploadAvatarBtn.addEventListener("click", () => this.handleUploadAvatar());
        }

        if (this.avatarFileInput) {
            this.avatarFileInput.addEventListener("change", () => this.previewLocalAvatar());
        }

        const tabLinks = document.querySelectorAll("#profile-tabs a");
        tabLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                this.activateTab(link.getAttribute("data-target"));
            });
        });

        // Mở đúng tab khi truy cập qua hash (vd: profile.html#tab-history)
        const applyHash = () => {
            const hash = (window.location.hash || "").replace("#", "");
            if (hash && document.getElementById(hash)) {
                this.activateTab(hash);
            }
        };
        applyHash();
        window.addEventListener("hashchange", applyHash);
    }

    activateTab(targetId) {
        const tabLinks = document.querySelectorAll("#profile-tabs a");
        tabLinks.forEach(t => {
            t.classList.toggle("active", t.getAttribute("data-target") === targetId);
        });
        document.querySelectorAll(".tab-content").forEach(content => {
            content.style.display = content.id === targetId ? "block" : "none";
        });
    }

    getAvatarUrl(url) {
        if (!url || !url.trim()) {
            return "asset/default-avatar.png";
        }
        // URL Google avatar không cần cache-bust
        if (url.includes("googleusercontent.com")) {
            return url;
        }
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}t=${Date.now()}`;
    }

    previewLocalAvatar() {
        const file = this.avatarFileInput.files[0];

        if (!file) {
            this.avatarUploadStatus.innerText = "Chưa chọn ảnh nào";
            this.avatarUploadStatus.className = "avatar-upload-status";
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        this.avatarPreview.src = previewUrl;
        this.avatarUploadStatus.innerText = `Đã chọn: ${file.name}`;
        this.avatarUploadStatus.className = "avatar-upload-status";
    }

    async handleUploadAvatar() {
        const file = this.avatarFileInput.files[0];

        if (!file) {
            notify.show("Vui lòng chọn ảnh trước khi upload", "error");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            this.uploadAvatarBtn.disabled = true;
            this.uploadAvatarBtn.innerText = "Đang tải...";

            const response = await fetch(`${this.baseUrl}/me/avatar`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                this.avatarUploadStatus.innerText = result.message || "Upload avatar thất bại";
                this.avatarUploadStatus.className = "avatar-upload-status error";
                notify.show(result.message || "Upload avatar thất bại", "error");
                return;
            }

            const avatarUrl = result.avatarUrl || "";

            this.avatarInput.value = avatarUrl;
            this.avatarPreview.src = this.getAvatarUrl(avatarUrl);

            this.avatarUploadStatus.innerText = "Upload avatar thành công";
            this.avatarUploadStatus.className = "avatar-upload-status success";

            localStorage.setItem("current_avatar", avatarUrl);

            this.updateHeaderUI({
                username: localStorage.getItem("current_user") || "User",
                avatar: avatarUrl
            });

            notify.show("Upload avatar thành công!", "success");
            await this.loadProfile();

        } catch (error) {
            console.error(error);
            this.avatarUploadStatus.innerText = "Lỗi kết nối khi upload avatar";
            this.avatarUploadStatus.className = "avatar-upload-status error";
            notify.show("Không thể upload avatar", "error");
        } finally {
            this.uploadAvatarBtn.disabled = false;
            this.uploadAvatarBtn.innerText = "Tải ảnh lên";
        }
    }

    async loadProfile() {
        try {
            const response = await fetch(`${this.baseUrl}/me`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/json"
                }
            });

            const result = await response.json();

            if (!response.ok) {
                notify.show(result.message || "Không tải được hồ sơ cá nhân", "error");
                return;
            }

            this.renderProfile(result);
        } catch (error) {
            console.error(error);
            notify.show("Lỗi kết nối khi tải hồ sơ", "error");
        }
    }

    renderProfile(profile) {
        document.getElementById("username").value = profile.username || "";
        document.getElementById("email").value = profile.email || "";
        document.getElementById("phone").value = profile.phone || "";
        document.getElementById("dateOfBirth").value = profile.dateOfBirth || "";
        document.getElementById("avatar").value = profile.avatar || "";

        const tier = profile.membershipTier || "Bronze";
        const point = profile.point ?? 0;
        const discount = `${Math.round((profile.discountRate || 0) * 100)}%`;
        const benefits = profile.benefits || "Chưa có quyền lợi";

        // Sidebar
        document.getElementById("sidebarUsername").innerText = profile.username || "--";
        document.getElementById("sidebarEmail").innerText = profile.email || "--";
        this.applySidebarTier(tier);
        document.getElementById("sidebarTier").textContent = tier;
        document.getElementById("sidebarPoint").textContent = point;

        // Tab Hạng thành viên
        document.getElementById("membershipTier").textContent = tier;
        document.getElementById("membershipPoint").textContent = point;
        document.getElementById("membershipDiscount").textContent = discount;
        document.getElementById("membershipBenefitsText").textContent = benefits;

        document.querySelector('.profile-wrapper').classList.add('loaded');
        this.updateTierTable(tier);

        const finalAvatar = this.getAvatarUrl(profile.avatar || "");
        this.avatarPreview.src = finalAvatar;

        localStorage.setItem("current_user", profile.username || "");
        localStorage.setItem("current_avatar", profile.avatar || "");
        localStorage.setItem("current_tier", tier);

        this.updateHeaderUI({
            username: profile.username || "User",
            avatar: profile.avatar || "",
            tier: tier
        });

        // Tài khoản Google: khóa các trường không cho đổi
        this.isGoogleAccount = !!profile.googleAccount;
        this.applyGoogleRestrictions(this.isGoogleAccount);
    }

    applyGoogleRestrictions(isGoogle) {
        if (!isGoogle) return;

        // 1. Ẩn tab "Đổi mật khẩu"
        const passwordTabLink = document.querySelector('#profile-tabs a[data-target="tab-password"]');
        const passwordTab = document.getElementById('tab-password');
        if (passwordTabLink && passwordTabLink.parentElement) {
            passwordTabLink.parentElement.style.display = 'none';
        }
        if (passwordTab) passwordTab.style.display = 'none';
        if (passwordTabLink && passwordTabLink.classList.contains('active')) {
            this.activateTab('tab-personal');
        }

        // 2. Ẩn phần đổi ảnh đại diện (avatar dùng ảnh từ Google)
        const avatarUploadBox = document.querySelector('.avatar-upload-box');
        const avatarBadge = document.querySelector('.avatar-edit-badge');
        if (avatarUploadBox) avatarUploadBox.style.display = 'none';
        if (avatarBadge) avatarBadge.style.display = 'none';

        // 3. Khóa Tên đăng nhập + Email
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        [usernameInput, emailInput].forEach(input => {
            if (!input) return;
            input.disabled = true;
            input.readOnly = true;
            input.required = false;
            input.style.background = '#f1f5f9';
            input.style.cursor = 'not-allowed';
        });
        this.addLockedHint(usernameInput, 'Không thể đổi với tài khoản Google');
        this.addLockedHint(emailInput, 'Không thể đổi với tài khoản Google');

        // 4. SĐT & ngày sinh: để trống được, cập nhật bình thường
        const phoneInput = document.getElementById('phone');
        const dobInput = document.getElementById('dateOfBirth');
        if (phoneInput) phoneInput.required = false;
        if (dobInput) dobInput.required = false;

        // 5. Badge "Tài khoản Google" ở sidebar
        this.showGoogleBadge();
    }

    addLockedHint(input, text) {
        if (!input || !input.parentElement) return;
        if (input.parentElement.querySelector('.locked-hint')) return;
        const small = document.createElement('small');
        small.className = 'locked-hint';
        small.style.cssText = 'display:block;margin-top:6px;color:#94a3b8;font-size:0.8rem;';
        small.innerHTML = '<i class="fas fa-lock"></i> ' + text;
        input.parentElement.appendChild(small);
    }

    showGoogleBadge() {
        const card = document.querySelector('.profile-card');
        if (!card || document.getElementById('googleAccountBadge')) return;
        const badge = document.createElement('div');
        badge.id = 'googleAccountBadge';
        badge.style.cssText = 'margin:10px auto 0;display:inline-flex;align-items:center;gap:6px;' +
            'background:#eef2ff;color:#4f46e5;padding:6px 12px;border-radius:999px;font-size:0.8rem;font-weight:600;';
        badge.innerHTML = '<i class="fab fa-google"></i> Tài khoản Google';
        const sidebarEmail = document.getElementById('sidebarEmail');
        if (sidebarEmail) {
            sidebarEmail.insertAdjacentElement('afterend', badge);
        } else {
            card.appendChild(badge);
        }
    }

    applySidebarTier(tier) {
        const el = document.getElementById("sidebarTier");
        if (!el) return;
        el.innerText = tier || "Bronze";
        el.className = "sidebar-tier " + this.tierClass(tier);
    }

    tierClass(tier) {
        const k = (tier || "").toLowerCase();
        if (k.includes("silver") || k.includes("bạc")) return "tier-silver";
        if (k.includes("gold") || k.includes("vàng")) return "tier-gold";
        if (k.includes("platinum") || k.includes("bạch kim")) return "tier-platinum";
        return "tier-bronze";
    }

    updateTierTable(tier) {
        const rows = document.querySelectorAll(".tier-table tr[data-tier]");
        const key = this.tierClass(tier).replace("tier-", "");
        rows.forEach(r => {
            r.classList.toggle("tier-row-active", r.getAttribute("data-tier") === key);
        });
    }

    updateHeaderUI(profile) {
        const tier = profile.tier || localStorage.getItem("current_tier") || "Bronze";
        // Ưu tiên dùng hàm chuẩn của Header nếu đã nạp
        if (typeof updateHeaderUserUI === "function") {
            updateHeaderUserUI(profile.username || "User", profile.avatar || "", tier);
        } else {
            const headerName = document.getElementById("display-username");
            const headerAvatar = document.getElementById("header-avatar-img");
            if (headerName) headerName.innerText = profile.username || "User";
            if (headerAvatar) headerAvatar.src = this.getAvatarUrl(profile.avatar || "");
        }

        window.dispatchEvent(new CustomEvent("profile-updated", {
            detail: {
                username: profile.username || "User",
                avatar: profile.avatar || "",
                tier: tier
            }
        }));
    }

    async handleUpdateProfile(e) {
        e.preventDefault();

        const btnSubmit = document.getElementById("btnSaveProfile");
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = "Đang lưu...";
        }

        // Tài khoản Google chỉ được đổi SĐT & ngày sinh; tài khoản thường đổi đầy đủ
        const payload = this.isGoogleAccount ?
            {
                phone: document.getElementById("phone").value.trim(),
                dateOfBirth: document.getElementById("dateOfBirth").value
            } :
            {
                username: document.getElementById("username").value.trim(),
                email: document.getElementById("email").value.trim(),
                phone: document.getElementById("phone").value.trim(),
                dateOfBirth: document.getElementById("dateOfBirth").value
            };

        try {
            const response = await fetch(`${this.baseUrl}/me`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.errors && Array.isArray(result.errors)) {
                    const firstError = result.errors[0];
                    notify.show(firstError.defaultMessage || "Dữ liệu không hợp lệ", "error");
                } else {
                    notify.show(result.message || "Cập nhật thất bại", "error");
                }
                return;
            }

            notify.show("Cập nhật hồ sơ thành công!", "success");
            this.renderProfile(result);

            // Nếu backend trả JWT mới (do đổi username) → cập nhật token
            if (result.token) {
                localStorage.setItem("jwt_token", result.token);
                this.token = result.token;
            }

            if (typeof initAuth === "function") {
                initAuth();
            }
        } catch (error) {
            console.error(error);
            notify.show("Không thể kết nối để cập nhật hồ sơ", "error");
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = "Lưu thay đổi";
            }
        }
    }

    async handleChangePassword(e) {
        e.preventDefault();

        const btnSubmit = document.getElementById("btnChangePassword");
        const oldPassword = document.getElementById("oldPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (newPassword !== confirmPassword) {
            notify.show("Mật khẩu mới và xác nhận mật khẩu không khớp", "error");
            return;
        }

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = "Đang xử lý...";
        }

        const payload = {
            oldPassword: oldPassword,
            newPassword: newPassword,
            confirmPassword: confirmPassword
        };

        try {
            const response = await fetch(`${this.baseUrl}/me/password`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                notify.show(result.message || "Đổi mật khẩu thất bại", "error");
                return;
            }

            notify.show("Đổi mật khẩu thành công!", "success");
            this.changePasswordForm.reset();
        } catch (error) {
            console.error(error);
            notify.show("Không thể kết nối để đổi mật khẩu", "error");
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = "Cập nhật mật khẩu";
            }
        }
    }

    async loadBookingHistory() {
        const container = document.getElementById("bookingHistoryList");

        try {
            const response = await fetch(`${this.baseUrl}/me/bookings`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/json"
                }
            });

            const result = await response.json();

            if (!response.ok) {
                container.innerHTML = `<div class="empty-booking">Không tải được lịch sử đặt phòng.</div>`;
                return;
            }

            this.renderBookingHistory(result);
        } catch (error) {
            console.error(error);
            container.innerHTML = `<div class="empty-booking">Lỗi kết nối khi tải lịch sử đặt phòng.</div>`;
        }
    }

    renderBookingHistory(bookings) {
        const container = document.getElementById("bookingHistoryList");
        const targetBookingId = new URLSearchParams(window.location.search).get("bookingId");

        if (!bookings || bookings.length === 0) {
            container.innerHTML = `<div class="empty-booking">Bạn chưa có booking nào.</div>`;
            return;
        }

        container.innerHTML = bookings.map(booking => {
            const roomsHtml = (booking.rooms || []).map(room => `
                <div class="booking-room-item">
                    <div>
                        <strong>Phòng ${room.roomNumber}</strong>
                        <span>${room.roomType}</span>
                    </div>
                    <div>
                        <strong>Giá/đêm</strong>
                        <span>${this.formatMoney(room.pricePerNight)}</span>
                    </div>
                    <div>
                        <strong>Thành tiền</strong>
                        <span>${this.formatMoney(room.subTotal)}</span>
                    </div>
                    <div class="booking-price">${this.formatMoney(room.subTotal)}</div>
                </div>
            `).join("");

            const isTarget = String(booking.bookingID) === String(targetBookingId);

            return `
                <article class="booking-item ${isTarget ? 'booking-item-highlight' : ''}" id="booking-${booking.bookingID}">
                    <div class="booking-top">
                        <div>
                            <h4>Mã đơn: MV-${booking.bookingID}</h4>
                            <div class="booking-meta">
                                <span><b>Ngày đặt:</b> ${this.formatDateTime(booking.bookingDate)}</span>
                                <span><b>Check-in:</b> ${booking.checkin || "--"}</span>
                                <span><b>Check-out:</b> ${booking.checkout || "--"}</span>
                                <span><b>Thanh toán:</b> ${this.formatPaymentStatus(booking.paymentStatus)}</span>
                                <span><b>Giữ phòng đến:</b> ${booking.expiredAt ? this.formatDateTime(booking.expiredAt) : "--"}</span>
                            </div>
                        </div>
                        <div class="booking-status ${this.getStatusClass(booking.status)}">
                            ${this.formatStatus(booking.status)}
                        </div>
                    </div>

                    <div class="booking-body">
                        <div class="booking-room-list">
                            ${roomsHtml}
                        </div>

                        <div class="booking-total">
                            <div class="booking-price">
                                <span>Tổng thanh toán:</span>
                                <strong>${booking.totalPrice.toLocaleString()} VNĐ</strong>
                            </div>
                            ${booking.discountAmount > 0 ? `
                            <div style="color: #10b981; font-weight: 500; font-size: 0.95rem; text-align: right; margin-top: 4px;">
                                Đã giảm ${booking.discountAmount.toLocaleString()} VNĐ từ ưu đãi thành viên
                            </div>` : ''}
                        </div>

                        <div class="booking-footer" style="margin-top:16px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
                            ${this.renderBookingHint(booking)}
                            ${booking.canRepay ? `
                                <button 
                                    type="button"
                                    class="btn-save-profile"
                                    data-booking-id="${booking.bookingID}"
                                    onclick="profileService.handleRepayBooking(${booking.bookingID})">
                                    Thanh toán lại
                                </button>
                                <button 
                                    type="button"
                                    class="btn-save-profile"
                                    style="background: #ef4444; box-shadow: 0 6px 16px rgba(239,68,68,0.22);"
                                    onclick="profileService.handleCancelBooking(${booking.bookingID})">
                                    Hủy đặt phòng
                                </button>
                            ` : ""}
                            ${(booking.status || "").toLowerCase() === "checked_out" || (booking.status || "").toLowerCase() === "completed" ? (
                                booking.reviewed ? `
                                    <button 
                                        type="button"
                                        class="btn-save-profile"
                                        style="background: #9ca3af; box-shadow: 0 6px 16px rgba(156,163,175,0.22); cursor: not-allowed;"
                                        disabled>
                                        <i class="fas fa-check-circle" style="margin-right: 5px;"></i> Đã đánh giá
                                    </button>
                                ` : `
                                    <button 
                                        type="button"
                                        class="btn-save-profile"
                                        style="background: #10b981; box-shadow: 0 6px 16px rgba(16,185,129,0.22);"
                                        onclick="profileService.openReviewModal(${booking.bookingID})">
                                        <i class="fas fa-star" style="margin-right: 5px;"></i> Đánh giá
                                    </button>
                                `
                            ) : ""}
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        if (targetBookingId) {
            setTimeout(() => {
                const targetEl = document.getElementById(`booking-${targetBookingId}`);
                if (targetEl) {
                    targetEl.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }
            }, 250);
        }
    }

    renderBookingHint(booking) {
        if (booking.canRepay) {
            return `
                <div style="padding:10px 14px; border-radius:14px; background:rgba(245,158,11,0.12); color:#b45309; font-weight:600;">
                    Booking đang chờ thanh toán. Bạn vẫn có thể thanh toán lại trước khi hết hạn giữ phòng.
                </div>
            `;
        }

        if (booking.expired && booking.status ?.toLowerCase() === "cancelled") {
            return `
                <div style="padding:10px 14px; border-radius:14px; background:rgba(239,68,68,0.10); color:#b91c1c; font-weight:600;">
                    Booking đã hết hạn giữ phòng và đã bị hủy. Muốn đặt tiếp bạn cần tạo booking mới.
                </div>
            `;
        }

        if ((booking.status || "").toLowerCase() === "confirmed") {
            return `
                <div style="padding:10px 14px; border-radius:14px; background:rgba(16,185,129,0.10); color:#047857; font-weight:600;">
                    Booking đã thanh toán thành công.
                </div>
            `;
        }

        return "";
    }

    async handleRepayBooking(bookingId) {
        try {
            const response = await fetch(`${this.paymentBaseUrl}/vnpay/${bookingId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                notify.show(result.message || "Không thể tạo link thanh toán lại", "error");
                await this.loadBookingHistory();
                return;
            }

            window.location.href = result.paymentUrl;
        } catch (error) {
            console.error(error);
            notify.show("Lỗi kết nối khi thanh toán lại", "error");
        }
    }

    async handleCancelBooking(bookingId) {
        notify.confirm(
            "Xác nhận hủy đặt phòng",
            "Bạn có chắc chắn muốn hủy đơn đặt phòng này không? Hành động này không thể hoàn tác.",
            async () => {
                try {
                    const response = await fetch(`${this.baseUrl}/me/bookings/${bookingId}/cancel`, {
                        method: "PUT",
                        headers: {
                            "Authorization": `Bearer ${this.token}`
                        }
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        notify.show(result.message || "Không thể hủy đơn đặt phòng", "error");
                        return;
                    }

                    notify.show("Đã hủy đơn đặt phòng thành công", "success");
                    await this.loadBookingHistory(); // Tải lại danh sách để cập nhật UI
                } catch (error) {
                    console.error(error);
                    notify.show("Lỗi kết nối khi hủy đơn đặt phòng", "error");
                }
            }
        );
    }

    getStatusClass(status) {
        const normalized = (status || "").toLowerCase();
        if (normalized === "pending") return "status-pending";
        if (normalized === "confirmed") return "status-confirmed";
        if (normalized === "checked_in") return "status-checked_in";
        if (normalized === "checked_out") return "status-checked_out";
        if (normalized === "cancelled") return "status-cancelled";
        return "status-pending";
    }

    formatStatus(status) {
        const normalized = (status || "").toLowerCase();
        switch (normalized) {
            case "pending":
                return "Đã đặt - chờ thanh toán";
            case "confirmed":
                return "Đã thanh toán";
            case "checked_in":
                return "Đã nhận phòng";
            case "checked_out":
                return "Đã trả phòng";
            case "cancelled":
                return "Đã hủy";
            default:
                return status || "--";
        }
    }

    formatPaymentStatus(status) {
        const normalized = (status || "").toLowerCase();
        switch (normalized) {
            case "pending":
                return "Đang xử lý / chờ thanh toán";
            case "success":
                return "Thanh toán thành công";
            case "failed":
                return "Thanh toán thất bại";
            case "refunded":
                return "Đã hoàn tiền";
            default:
                return status || "--";
        }
    }

    formatMoney(value) {
        return Number(value || 0).toLocaleString("vi-VN") + " VNĐ";
    }

    formatDateTime(dateTime) {
        if (!dateTime) return "--";
        const date = new Date(dateTime);
        if (isNaN(date.getTime())) return dateTime;
        return date.toLocaleString("vi-VN");
    }

    bindReviewEvents() {
        const reviewModal = document.getElementById("reviewModal");
        const btnClose = document.getElementById("btnCloseReviewModal");
        const btnCancel = document.getElementById("btnCancelReview");
        const reviewForm = document.getElementById("reviewForm");

        // Stars
        const mainStars = document.querySelectorAll(".star-rating.main-rating i");
        const mainRatingInput = document.getElementById("reviewRating");
        const subRatingContainers = document.querySelectorAll(".star-rating.sub");

        // Images
        const reviewImagesInput = document.getElementById("reviewImages");
        const reviewImagesPreview = document.getElementById("reviewImagesPreview");

        if (btnClose) {
            btnClose.addEventListener("click", () => reviewModal.style.display = "none");
        }
        if (btnCancel) {
            btnCancel.addEventListener("click", () => reviewModal.style.display = "none");
        }

        // Hàm tính và hiển thị sao tổng thể tự động
        this.updateMainRating = () => {
            const cleanliness = parseFloat(document.getElementById("cleanlinessRating").value) || 0;
            const service = parseFloat(document.getElementById("serviceRating").value) || 0;
            const facilities = parseFloat(document.getElementById("facilitiesRating").value) || 0;
            const location = parseFloat(document.getElementById("locationRating").value) || 0;

            const avgRating = (cleanliness + service + facilities + location) / 4;
            mainRatingInput.value = avgRating;

            // Hiển thị số thập phân bằng label (optional, có thể thêm sau)
            const labelEl = document.querySelector(".rating-group label");
            if (labelEl) {
                labelEl.innerHTML = `Chất lượng tổng thể <span style="color: #f59e0b; font-weight: bold; margin-left: 10px; font-size: 1.4rem;">${avgRating.toFixed(1)}/5.0</span>`;
            }

            // Fill màu bằng linear-gradient cho từng sao
            mainStars.forEach((star, index) => {
                const starIndex = index + 1;
                let fillPercent = 0;
                if (avgRating >= starIndex) {
                    fillPercent = 100;
                } else if (avgRating > starIndex - 1) {
                    fillPercent = (avgRating - (starIndex - 1)) * 100;
                }

                star.style.background = `linear-gradient(90deg, #fbbf24 ${fillPercent}%, #e2e8f0 ${fillPercent}%)`;
                star.style.webkitBackgroundClip = "text";
                star.style.webkitTextFillColor = "transparent";
                star.style.color = "transparent"; // fallback
            });
        };
        const updateMainRating = this.updateMainRating;

        // Ngăn click vào sao tổng thể (optional vì đã có pointer-events:none nếu cần, nhưng ko có event là đủ)
        if (mainStars) {
            mainStars.forEach(star => star.style.cursor = "default");
        }

        if (subRatingContainers) {
            subRatingContainers.forEach(container => {
                const targetInputId = container.getAttribute("data-target");
                const targetInput = document.getElementById(targetInputId);
                const subStars = container.querySelectorAll("i");

                // Initialize default to 5
                subStars.forEach(s => s.style.color = "#fbbf24");

                subStars.forEach(star => {
                    star.addEventListener("click", (e) => {
                        const rating = e.target.getAttribute("data-rating");
                        targetInput.value = rating;
                        subStars.forEach(s => {
                            s.style.color = s.getAttribute("data-rating") <= rating ? "#fbbf24" : "#e2e8f0";
                        });
                        updateMainRating(); // Tự động cập nhật sao tổng thể
                    });
                });
            });
            // Khởi tạo lần đầu
            updateMainRating();
        }

        if (reviewImagesInput) {
            reviewImagesInput.addEventListener("change", (e) => {
                reviewImagesPreview.innerHTML = "";
                const files = e.target.files;
                if (files.length > 5) {
                    notify.show("Chỉ được chọn tối đa 5 ảnh", "error");
                    reviewImagesInput.value = "";
                    return;
                }
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const img = document.createElement("img");
                        img.src = e.target.result;
                        img.style.width = "70px";
                        img.style.height = "70px";
                        img.style.objectFit = "cover";
                        img.style.borderRadius = "8px";
                        img.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
                        reviewImagesPreview.appendChild(img);
                    }
                    reader.readAsDataURL(file);
                }
            });
        }

        if (reviewForm) {
            reviewForm.addEventListener("submit", async (e) => {
                e.preventDefault();

                const submitBtn = reviewForm.querySelector(".btn-submit-review");
                const editId = document.getElementById("reviewEditId").value;
                const isEdit = !!editId;

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = isEdit ? "Đang lưu..." : "Đang gửi...";
                }

                const bookingId = document.getElementById("reviewBookingId").value;
                const rating = mainRatingInput.value;
                const comment = document.getElementById("reviewComment").value;

                const cleanlinessRating = document.getElementById("cleanlinessRating").value;
                const serviceRating = document.getElementById("serviceRating").value;
                const facilitiesRating = document.getElementById("facilitiesRating").value;
                const locationRating = document.getElementById("locationRating").value;
                const isAnonymous = document.getElementById("reviewAnonymous").checked;

                if (rating === "0") {
                    notify.show("Vui lòng chọn số sao tổng thể", "error");
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = isEdit ? "Lưu thay đổi" : "Gửi đánh giá";
                    }
                    return;
                }

                try {
                    let imageUrls = document.getElementById("reviewExistingImages").value || "";
                    const files = reviewImagesInput ? reviewImagesInput.files : null;
                    if (files && files.length > 0) {
                        const formData = new FormData();
                        for (let i = 0; i < files.length; i++) {
                            formData.append("files", files[i]);
                        }
                        const uploadRes = await fetch(`https://mayvang-api.onrender.com/api/reviews/me/images`, {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${this.token}`
                            },
                            body: formData
                        });
                        if (uploadRes.ok) {
                            const urls = await uploadRes.json();
                            imageUrls = urls.join(",");
                        } else {
                            notify.show("Tải ảnh thất bại, chỉ gửi đánh giá chữ", "error");
                        }
                    }

                    const response = await fetch(
                        isEdit ? `https://mayvang-api.onrender.com/api/reviews/${editId}` : `https://mayvang-api.onrender.com/api/reviews/`, {
                            method: isEdit ? "PUT" : "POST",
                            headers: {
                                "Authorization": `Bearer ${this.token}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                booking: {
                                    bookingID: bookingId
                                },
                                rating: parseFloat(rating),
                                comment: comment,
                                cleanlinessRating: parseInt(cleanlinessRating),
                                serviceRating: parseInt(serviceRating),
                                facilitiesRating: parseInt(facilitiesRating),
                                locationRating: parseInt(locationRating),
                                anonymous: isAnonymous,
                                imageUrls: imageUrls
                            })
                        }
                    );

                    if (!response.ok) {
                        notify.show(isEdit ? "Cập nhật đánh giá thất bại" : "Đánh giá thất bại. Có thể bạn đã đánh giá booking này.", "error");
                        return;
                    }

                    notify.show(isEdit ? "Cập nhật đánh giá thành công!" : "Đánh giá thành công!", "success");
                    reviewModal.style.display = "none";
                    reviewForm.reset();
                    mainStars.forEach(s => s.style.color = "#e2e8f0");
                    if (subRatingContainers) {
                        subRatingContainers.forEach(container => {
                            container.querySelectorAll("i").forEach(s => s.style.color = "#fbbf24");
                        });
                    }
                    if (reviewImagesPreview) reviewImagesPreview.innerHTML = "";

                    await this.loadBookingHistory();
                    await this.loadMyReviews();
                } catch (err) {
                    console.error(err);
                    notify.show("Lỗi kết nối", "error");
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = isEdit ? "Lưu thay đổi" : "Gửi đánh giá";
                    }
                }
            });
        }
    }

    openReviewModal(bookingId) {
        document.getElementById("reviewBookingId").value = bookingId;
        document.getElementById("reviewEditId").value = "";
        document.getElementById("reviewExistingImages").value = "";

        const reviewModal = document.getElementById("reviewModal");
        const reviewForm = document.getElementById("reviewForm");

        if (reviewForm) {
            reviewForm.reset();
            const mainStars = document.querySelectorAll(".star-rating.main-rating i");
            if (mainStars) mainStars.forEach(s => s.style.color = "#e2e8f0");

            const subStars = document.querySelectorAll(".star-rating.sub i");
            if (subStars) subStars.forEach(s => s.style.color = "#fbbf24");

            const preview = document.getElementById("reviewImagesPreview");
            if (preview) preview.innerHTML = "";

            ["cleanlinessRating", "serviceRating", "facilitiesRating", "locationRating"].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = 5;
            });
            if (this.updateMainRating) this.updateMainRating();

            const submitBtn = reviewForm.querySelector(".btn-submit-review");
            if (submitBtn) submitBtn.innerText = "Gửi đánh giá";
        }

        const modalTitle = document.getElementById("reviewModalTitle");
        if (modalTitle) modalTitle.textContent = "Đánh giá Mây Vàng";

        if (reviewModal) {
            reviewModal.style.display = "flex";
        }
    }

    async loadMyReviews() {
        const container = document.getElementById("myReviewsList");
        if (!container) return;

        try {
            const res = await fetch(`https://mayvang-api.onrender.com/api/reviews/me`, {
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            });
            if (!res.ok) throw new Error("Failed to load reviews");
            const reviews = await res.json();
            this.myReviewsCache = reviews;
            this.renderMyReviews(reviews);
        } catch (err) {
            console.error(err);
            container.innerHTML = `<div class="empty-booking">Không thể tải đánh giá. Vui lòng thử lại.</div>`;
        }
    }

    renderMyReviews(reviews) {
        const container = document.getElementById("myReviewsList");
        if (!container) return;

        if (!reviews || reviews.length === 0) {
            container.innerHTML = `<div class="empty-booking">Bạn chưa có đánh giá nào.</div>`;
            return;
        }

        container.innerHTML = reviews.map(review => {
            const rating = review.rating || 0;
            const starsHtml = Array.from({
                length: 5
            }, (_, i) => {
                const starIndex = i + 1;
                let fillPercent = 0;
                if (rating >= starIndex) fillPercent = 100;
                else if (rating > starIndex - 1) fillPercent = (rating - (starIndex - 1)) * 100;
                return `<i class="fas fa-star" style="background: linear-gradient(90deg, #fbbf24 ${fillPercent}%, #e2e8f0 ${fillPercent}%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: transparent;"></i>`;
            }).join("");

            const images = (review.imageUrls || "").split(",").map(u => u.trim()).filter(Boolean);
            const imagesHtml = images.length ? `
                <div class="review-images">
                    ${images.map(url => `<img src="${url}" alt="Ảnh đánh giá" style="cursor:pointer;" onclick="openLightbox(this.src)">`).join("")}
                </div>
            ` : "";

            return `
                <article class="review-card">
                    <div class="review-card-top">
                        <div>
                            <h4>${review.roomType ? review.roomType : "Mây Vàng"}${review.bookingID ? ` · Mã đơn: MV-${review.bookingID}` : ""}</h4>
                            <div class="review-meta">
                                <span><i class="fas fa-calendar"></i> ${this.formatDateTime(review.reviewDate)}</span>
                                ${review.anonymous ? `<span class="review-anon-badge"><i class="fas fa-user-secret"></i> Ẩn danh</span>` : ""}
                            </div>
                        </div>
                        <div class="review-card-actions">
                            <button type="button" class="btn-icon-action btn-icon-edit" onclick="profileService.editReview(${review.reviewID})" title="Sửa đánh giá">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button type="button" class="btn-icon-action btn-icon-delete" onclick="profileService.deleteReview(${review.reviewID})" title="Xóa đánh giá">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="review-stars">${starsHtml} <span class="review-score">${rating.toFixed(1)}/5</span></div>
                    <p class="review-comment">${review.comment || ""}</p>
                    ${imagesHtml}
                    ${review.adminReply ? `
                        <div class="review-reply">
                            <strong><i class="fas fa-reply"></i> Phản hồi từ Mây Vàng:</strong>
                            <p>${review.adminReply}</p>
                        </div>
                    ` : ""}
                </article>
            `;
        }).join("");
    }

    editReview(reviewId) {
        const review = (this.myReviewsCache || []).find(r => r.reviewID === reviewId);
        if (!review) {
            notify.show("Không tìm thấy đánh giá", "error");
            return;
        }

        const reviewModal = document.getElementById("reviewModal");
        const reviewForm = document.getElementById("reviewForm");
        if (!reviewModal || !reviewForm) return;

        reviewForm.reset();

        document.getElementById("reviewEditId").value = review.reviewID;
        document.getElementById("reviewBookingId").value = review.bookingID || "";
        document.getElementById("reviewExistingImages").value = review.imageUrls || "";
        document.getElementById("reviewComment").value = review.comment || "";
        document.getElementById("reviewAnonymous").checked = !!review.anonymous;

        const subRatings = {
            cleanlinessRating: review.cleanlinessRating || 5,
            serviceRating: review.serviceRating || 5,
            facilitiesRating: review.facilitiesRating || 5,
            locationRating: review.locationRating || 5
        };

        Object.entries(subRatings).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input) input.value = value;
            const container = document.querySelector(`.star-rating.sub[data-target="${id}"]`);
            if (container) {
                container.querySelectorAll("i").forEach(s => {
                    s.style.color = parseInt(s.getAttribute("data-rating")) <= value ? "#fbbf24" : "#e2e8f0";
                });
            }
        });

        if (this.updateMainRating) this.updateMainRating();

        const preview = document.getElementById("reviewImagesPreview");
        if (preview) {
            preview.innerHTML = "";
            const images = (review.imageUrls || "").split(",").map(u => u.trim()).filter(Boolean);
            images.forEach(url => {
                const img = document.createElement("img");
                img.src = url;
                img.style.width = "70px";
                img.style.height = "70px";
                img.style.objectFit = "cover";
                img.style.borderRadius = "8px";
                img.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
                preview.appendChild(img);
            });
        }

        const modalTitle = document.getElementById("reviewModalTitle");
        if (modalTitle) modalTitle.textContent = "Cập nhật đánh giá";

        const submitBtn = reviewForm.querySelector(".btn-submit-review");
        if (submitBtn) submitBtn.innerText = "Lưu thay đổi";

        reviewModal.style.display = "flex";
    }

    async deleteReview(reviewId) {
        if (!confirm("Bạn có chắc muốn xóa đánh giá này không?")) return;

        try {
            const res = await fetch(`https://mayvang-api.onrender.com/api/reviews/${reviewId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            });

            if (!res.ok) {
                notify.show("Xóa đánh giá thất bại", "error");
                return;
            }

            notify.show("Đã xóa đánh giá", "success");
            await this.loadMyReviews();
            await this.loadBookingHistory();
        } catch (err) {
            console.error(err);
            notify.show("Lỗi kết nối", "error");
        }
    }
}

let profileService = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!profileService) {
        profileService = new ProfileService();
    }
});
