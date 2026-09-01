class PaymentResultPage {
    constructor() {
        this.params = new URLSearchParams(window.location.search);
        this.token = localStorage.getItem("jwt_token");
        this.init();
    }

    init() {
        this.renderPaymentResult();
        this.refreshProfileAfterPayment();
    }

    async refreshProfileAfterPayment() {
        if (!this.token) return;

        try {
            const response = await fetch("https://mayvang-api.onrender.com/api/users/me", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) return;

            const profile = await response.json();

            localStorage.setItem("current_user", profile.username || "");
            localStorage.setItem("current_avatar", profile.avatar || "");

            const headerName = document.getElementById("display-username");
            const headerAvatar = document.getElementById("header-avatar-img");

            if (headerName) headerName.innerText = profile.username || "User";
            if (headerAvatar) {
                headerAvatar.src = profile.avatar && profile.avatar.trim() !== "" ?
                    profile.avatar :
                    "asset/default-avatar.png";
            }
        } catch (error) {
            console.warn("Không thể refresh profile sau thanh toán:", error);
        }
    }

    renderPaymentResult() {
        const status = (this.params.get("status") || "failed").toLowerCase();
        const message = this.params.get("message") || "Không nhận được kết quả thanh toán";
        const bookingId = this.params.get("bookingId") || "--";
        const amount = this.params.get("amount") || "0";
        const transactionCode = this.params.get("transactionCode") || "--";
        const earnedPoint = Number(this.params.get("earnedPoint") || "0");
        const bookingStatus = (this.params.get("bookingStatus") || "pending").toLowerCase();

        const card = document.getElementById("paymentResultCard");
        const emoji = document.getElementById("paymentStatusEmoji");
        const title = document.getElementById("paymentTitle");
        const messageEl = document.getElementById("paymentMessage");
        const bookingIdEl = document.getElementById("bookingId");
        const amountEl = document.getElementById("paymentAmount");
        const transactionCodeEl = document.getElementById("transactionCode");
        const paymentStatusText = document.getElementById("paymentStatusText");
        const paymentNote = document.getElementById("paymentNote");
        const pointRewardBox = document.getElementById("pointRewardBox");
        const earnedPointText = document.getElementById("earnedPointText");
        const paymentStatusBadge = document.getElementById("paymentStatusBadge");
        const bookingStatusBadge = document.getElementById("bookingStatusBadge");
        const paymentActions = document.getElementById("paymentActions");

        bookingIdEl.innerText = bookingId;
        amountEl.innerText = this.formatMoney(amount);
        transactionCodeEl.innerText = transactionCode;

        paymentStatusBadge.className = "status-badge";
        bookingStatusBadge.className = "status-badge booking-badge";

        bookingStatusBadge.innerText = `Booking: ${this.formatBookingStatus(bookingStatus)}`;
        bookingStatusBadge.classList.add(this.getBookingBadgeClass(bookingStatus));

        if (status === "success") {
            card.classList.add("payment-success");
            emoji.innerText = "✅";
            title.innerText = "Thanh toán thành công";
            messageEl.innerText = message;
            paymentStatusText.innerText = "Đã thanh toán";
            paymentStatusBadge.innerText = "Thanh toán thành công";
            paymentStatusBadge.classList.add("success");
            paymentNote.innerText = "Booking của bạn đã được xác nhận thành công. Hệ thống đã cập nhật điểm thành viên và gửi email xác nhận nếu mail đã cấu hình đúng.";

            if (earnedPoint > 0) {
                pointRewardBox.style.display = "flex";
                earnedPointText.innerText = `+${earnedPoint} điểm`;
                this.safeNotify(`Bạn vừa được cộng ${earnedPoint} điểm thành viên!`, "success");
            } else {
                pointRewardBox.style.display = "none";
                this.safeNotify("Thanh toán thành công!", "success");
            }
        } else {
            card.classList.add("payment-failed");
            emoji.innerText = "❌";
            title.innerText = "Thanh toán chưa thành công";
            messageEl.innerText = message;
            paymentStatusText.innerText = "Thất bại / Bị hủy";
            paymentStatusBadge.innerText = "Thanh toán thất bại";
            paymentStatusBadge.classList.add("failed");

            if (bookingStatus === "pending") {
                paymentNote.innerText = "Giao dịch chưa hoàn tất. Booking vẫn đang được giữ trong thời gian cho phép, bạn có thể thanh toán lại ngay.";
            } else if (bookingStatus === "cancelled") {
                paymentNote.innerText = "Booking đã hết hạn giữ phòng hoặc đã bị hủy. Bạn cần tạo booking mới nếu muốn tiếp tục đặt.";
            } else {
                paymentNote.innerText = "Giao dịch chưa hoàn tất.";
            }

            pointRewardBox.style.display = "none";
            this.safeNotify("Thanh toán thất bại hoặc bị hủy", "error");
        }

        paymentActions.innerHTML = `
            ${bookingStatus === "pending" && bookingId !== "--" ? `
                <button type="button" class="btn-payment warning" id="repayBtn">Thanh toán lại</button>
            ` : ""}
            <a href="profile.html?bookingId=${encodeURIComponent(bookingId)}" class="btn-payment primary">Xem chi tiết booking</a>
            <a href="room.html" class="btn-payment secondary">Tiếp tục đặt phòng</a>
        `;

        const repayBtn = document.getElementById("repayBtn");
        if (repayBtn) {
            repayBtn.addEventListener("click", () => this.handleRepay(bookingId));
        }
    }

    async handleRepay(bookingId) {
        if (!this.token) {
            this.safeNotify("Bạn cần đăng nhập để thanh toán lại", "error");
            setTimeout(() => window.location.href = "login.html", 800);
            return;
        }

        try {
            const response = await fetch(`https://mayvang-api.onrender.com/api/payments/vnpay/${bookingId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                this.safeNotify(result.message || "Không thể tạo link thanh toán lại", "error");
                return;
            }

            window.location.href = result.paymentUrl;
        } catch (error) {
            console.error(error);
            this.safeNotify("Lỗi kết nối khi thanh toán lại", "error");
        }
    }

    getBookingBadgeClass(status) {
        switch ((status || "").toLowerCase()) {
            case "confirmed":
                return "confirmed";
            case "pending":
                return "pending";
            case "checked_in":
                return "success";
            case "checked_out":
                return "success";
            case "cancelled":
                return "failed";
            default:
                return "neutral";
        }
    }

    formatBookingStatus(status) {
        switch ((status || "").toLowerCase()) {
            case "pending":
                return "Chờ thanh toán";
            case "confirmed":
                return "Đã xác nhận";
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

    formatMoney(value) {
        return Number(value || 0).toLocaleString("vi-VN") + " VNĐ";
    }

    safeNotify(message, type) {
        if (typeof notify !== "undefined" && notify ?.show) {
            setTimeout(() => notify.show(message, type), 250);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new PaymentResultPage();
});
