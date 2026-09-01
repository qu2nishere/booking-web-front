class LoginService {
    constructor() {
        // Địa chỉ API đăng nhập của Backend
        this.apiUrl = "https://mayvang-api.onrender.com/api/auth/login";
    }

    async loginUser(loginData, rememberMe) {
        // 1. Xóa sạch các thông báo lỗi cũ
        document.querySelectorAll('.error-msg').forEach(el => el.innerText = '');

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            // Cố gắng đọc JSON từ Backend
            let result = {};
            try {
                result = await response.json();
            } catch (err) {
                console.warn("Backend không trả về JSON chuẩn");
            }

            // 2. Xử lý kết quả
            if (response.ok) {
                notify.show("Đăng nhập thành công! Chào mừng trở lại.", "success");

                localStorage.setItem('current_user', result.username || loginData.username);
                localStorage.setItem('role', result.role);

                if (rememberMe) {
                    localStorage.setItem('rememberedUser', loginData.username);
                } else {
                    localStorage.removeItem('rememberedUser');
                }

                if (result.token) {
                    localStorage.setItem('jwt_token', result.token);
                }

                setTimeout(() => {
                    if (result.role === 'MANAGER') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 1200);
            } else if (response.status === 400) {
                // Lỗi Validation từ LoginRequest.java (ví dụ: để trống)
                if (result.errors && Array.isArray(result.errors)) {
                    result.errors.forEach(err => {
                        const errorElement = document.getElementById(`error-${err.field}`);
                        if (errorElement) {
                            errorElement.innerText = err.defaultMessage;
                            errorElement.style.color = "#ef4444"; // Đỏ mượt
                            errorElement.style.fontSize = "13px";
                            errorElement.style.marginTop = "5px";
                            errorElement.style.display = "block";
                        }
                    });
                    notify.show("Vui lòng điền đầy đủ thông tin!", "error");
                } else {
                    notify.show(result.message || "Thông tin không hợp lệ", "error");
                }
            } else if (response.status === 401 || response.status === 403) {
                // Lỗi Sai tài khoản hoặc mật khẩu
                notify.show("Tên đăng nhập hoặc mật khẩu không chính xác!", "error");
            } else {
                notify.show("Lỗi máy chủ (Code: " + response.status + ")", "error");
            }

        } catch (error) {
            console.error("Lỗi kết nối:", error);
            notify.show("Không thể kết nối tới máy chủ.", "error");
        }
    }
}

// Khởi tạo các đối tượng
const loginService = new LoginService();
const loginForm = document.getElementById('loginForm');
const rememberCheckbox = document.querySelector('.remember-checkbox');

// Khi trang load lên, kiểm tra xem có nhớ tên đăng nhập không
document.addEventListener('DOMContentLoaded', () => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser && document.getElementById('loginUsername')) {
        document.getElementById('loginUsername').value = rememberedUser;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    // Nút "Đăng nhập với Google"
    if (typeof renderGoogleButton === 'function') {
        renderGoogleButton('googleBtn');
    }
});

// Xử lý sự kiện khi nhấn Đăng nhập
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Ngăn trang tự reload

        // Gom dữ liệu đúng với tên biến trong LoginRequest.java
        const loginData = {
            username: document.getElementById('loginUsername').value.trim(),
            password: document.getElementById('loginPassword').value
        };

        const isRemember = rememberCheckbox ? rememberCheckbox.checked : false;

        console.log("Đang gửi yêu cầu đăng nhập...");
        // Gọi API
        await loginService.loginUser(loginData, isRemember);
    });
}
