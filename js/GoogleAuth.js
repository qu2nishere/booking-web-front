// GoogleAuth.js - Đăng nhập bằng Google (Google Identity Services)
//
// ⚠️ BẮT BUỘC: Thay YOUR_GOOGLE_CLIENT_ID bên dưới bằng Client ID thật của bạn
// lấy từ Google Cloud Console (APIs & Services → Credentials → OAuth 2.0 Client ID,
// loại "Web application"). Nhớ thêm http://127.0.0.1:5500 và http://localhost:5500
// vào mục "Authorized JavaScript origins". Client ID này phải GIỐNG với
// google.client-id trong application.properties của backend.
const GOOGLE_CLIENT_ID = "121925631383-nu18dka9ssej2ov1lg7efjdidt2b9nct.apps.googleusercontent.com";

const GOOGLE_AUTH_API = "https://mayvang-api.onrender.com/api/auth/google";

// Sau khi Google trả credential -> gửi lên backend đổi lấy JWT của hệ thống
async function exchangeGoogleCredential(credential, onSuccess) {
    try {
        const res = await fetch(GOOGLE_AUTH_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                credential
            })
        });

        let data = {};
        try {
            data = await res.json();
        } catch (e) {
            /* ignore */ }

        if (!res.ok) {
            notifyMsg(data.message || "Đăng nhập Google thất bại", "error");
            return;
        }
        onSuccess(data);
    } catch (err) {
        console.error("Lỗi đăng nhập Google:", err);
        notifyMsg("Không thể kết nối tới máy chủ.", "error");
    }
}

// Mặc định: lưu token + điều hướng theo vai trò (dùng chung cho cả login & register)
function handleGoogleAuthSuccess(data) {
    if (data.token) localStorage.setItem("jwt_token", data.token);
    localStorage.setItem("current_user", data.username || "");
    localStorage.setItem("role", data.role || "CUSTOMER");

    notifyMsg("Đăng nhập Google thành công!", "success");

    setTimeout(() => {
        window.location.href = data.role === "MANAGER" ? "admin.html" : "index.html";
    }, 1000);
}

// Render nút "Đăng nhập với Google" vào phần tử có id = containerId
function renderGoogleButton(containerId, onSuccess = handleGoogleAuthSuccess) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Chờ thư viện GIS tải xong
    if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
        setTimeout(() => renderGoogleButton(containerId, onSuccess), 300);
        return;
    }

    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE_CLIENT_ID")) {
        container.innerHTML =
            '<div style="color:#b45309;font-size:0.85rem;text-align:center;">' +
            '⚠️ Chưa cấu hình Google Client ID trong js/GoogleAuth.js</div>';
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => exchangeGoogleCredential(response.credential, onSuccess)
    });

    google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        type: "standard",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "center",
        width: 300
    });
}

// notify có thể chưa được nạp ở một số trang -> fallback an toàn
function notifyMsg(message, type) {
    if (typeof notify !== "undefined" && notify.show) {
        notify.show(message, type);
    } else {
        alert(message);
    }
}
