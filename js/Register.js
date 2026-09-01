// Đăng ký 2 bước: (1) điền form -> backend gửi OTP về email; (2) nhập OTP -> tạo tài khoản
class RegisterService {
    constructor() {
        this.registerUrl = "https://mayvang-api.onrender.com/api/auth/register";
        this.verifyUrl = "https://mayvang-api.onrender.com/api/auth/register/verify";
    }

    // Bước 1: gửi dữ liệu đăng ký -> backend kiểm tra & gửi OTP
    async sendRegister(userData) {
        document.querySelectorAll('.error-msg').forEach(el => el.innerText = '');

        try {
            const response = await fetch(this.registerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                return {
                    ok: true,
                    result
                };
            }

            if (response.status === 400) {
                if (result.errors && Array.isArray(result.errors)) {
                    // Lỗi validation của Spring Boot -> gắn vào từng ô
                    result.errors.forEach(err => {
                        const errorElement = document.getElementById(`error-${err.field}`);
                        if (errorElement) {
                            errorElement.innerText = err.defaultMessage;
                            errorElement.style.color = "#ef4444";
                            errorElement.style.fontSize = "13px";
                            errorElement.style.marginTop = "5px";
                            errorElement.style.display = "block";
                        }
                    });
                    notify.show("Vui lòng kiểm tra lại các trường màu đỏ!", "error");
                } else {
                    // Ví dụ: Email đã tồn tại, Username đã tồn tại...
                    notify.show(result.message || "Dữ liệu không hợp lệ", "error");
                }
            } else if (response.status === 403) {
                notify.show("Lỗi 403: Không có quyền truy cập.", "error");
            } else {
                notify.show("Lỗi máy chủ (Code " + response.status + ")", "error");
            }
            return {
                ok: false
            };

        } catch (error) {
            console.error("Lỗi:", error);
            notify.show("Không thể kết nối tới máy chủ Backend.", "error");
            return {
                ok: false
            };
        }
    }
}

const registerService = new RegisterService();
const registerForm = document.getElementById('registerForm');
const regOtpForm = document.getElementById('regOtpForm');

let passwordChecker = null;
let otpHandler = null;
let pendingUserData = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initPasswordChecker === 'function') {
        passwordChecker = initPasswordChecker(
            'regPassword', 'regStrengthBar', 'regStrengthText',
            'regConfirmPassword', 'regMatchMessage', 'passwordHint'
        );
    }

    // Nút "Đăng nhập với Google"
    if (typeof renderGoogleButton === 'function') {
        renderGoogleButton('googleBtn');
    }
});

function showRegStep(step) {
    const s1 = document.getElementById('reg-step1');
    const s2 = document.getElementById('reg-step2');
    if (s1) s1.style.display = step === 1 ? 'block' : 'none';
    if (s2) s2.style.display = step === 2 ? 'block' : 'none';
}

// Bước 1: submit form -> gửi OTP
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!(passwordChecker && passwordChecker.validate())) {
            return;
        }

        const userData = {
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            dateOfBirth: document.getElementById('birthday').value,
            password: document.getElementById('regPassword').value,
            confirmPassword: document.getElementById('regConfirmPassword').value
        };

        const submitBtn = registerForm.querySelector('.register-btn');
        if (submitBtn) submitBtn.disabled = true;

        const res = await registerService.sendRegister(userData);

        if (submitBtn) submitBtn.disabled = false;

        if (!res.ok) return;

        // Sang bước nhập OTP
        pendingUserData = userData;
        const emailLabel = document.getElementById('otpEmailLabel');
        if (emailLabel) emailLabel.innerText = userData.email;

        showRegStep(2);

        // Khởi tạo OTP handler dùng endpoint đăng ký
        if (otpHandler) otpHandler.destroy();
        otpHandler = new OTPHandler('#reg-step2 .otp-input', 'otpTimer', 'resendOtp', null, {
            sendUrl: registerService.registerUrl,
            verifyUrl: registerService.verifyUrl,
            buildSendBody: () => pendingUserData // gửi lại OTP = gửi lại toàn bộ form
        });
        otpHandler.userEmail = userData.email;
        otpHandler.startTimer();

        const firstOtp = document.querySelector('#reg-step2 .otp-input');
        if (firstOtp) firstOtp.focus();

        notify.show("📧 Mã OTP đã được gửi tới email của bạn!", "success");
    });
}

// Bước 2: submit OTP -> tạo tài khoản
if (regOtpForm) {
    regOtpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!otpHandler) {
            notify.show("Có lỗi xảy ra, vui lòng thử lại!", "error");
            return;
        }

        const otp = otpHandler.getOTP();
        if (otp.length !== 6) {
            notify.show("Vui lòng nhập đủ 6 số OTP!", "error");
            return;
        }

        const btn = regOtpForm.querySelector('.register-btn');
        if (btn) btn.disabled = true;

        const ok = await otpHandler.verifyOTP(otp);

        if (btn) btn.disabled = false;

        if (ok) {
            notify.show("🎉 Đăng ký thành công!", "success");
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            notify.show("Mã OTP không chính xác hoặc đã hết hạn!", "error");
        }
    });
}

// Quay lại bước 1
const backToRegStep1 = document.getElementById('backToRegStep1');
if (backToRegStep1) {
    backToRegStep1.addEventListener('click', (e) => {
        e.preventDefault();
        if (otpHandler) otpHandler.destroy();
        showRegStep(1);
    });
}
