// ResetPW.js - Xử lý logic cho trang quên mật khẩu (Đã thêm gợi ý mật khẩu)

// DOM elements
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const emailForm = document.getElementById('emailForm');
const otpForm = document.getElementById('otpForm');
const passwordForm = document.getElementById('passwordForm');
const emailInput = document.getElementById('resetEmail');

let otpHandler = null;
let passwordChecker = null;
let userEmail = '';

// Hàm chuyển bước
function showStep(stepNumber) {
    step1.classList.remove('active');
    step2.classList.remove('active');
    step3.classList.remove('active');

    if (stepNumber === 1) step1.classList.add('active');
    if (stepNumber === 2) step2.classList.add('active');
    if (stepNumber === 3) step3.classList.add('active');
}

// Hàm kiểm tra email hợp lệ
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return emailRegex.test(email);
}

// Khởi tạo OTP Handler khi vào bước 2
function initOTP() {
    if (!otpHandler) {
        otpHandler = new OTPHandler('.otp-input', 'otpTimer', 'resendOtp', 'resetEmail');
    }
    return otpHandler;
}

// Xử lý form email (Bước 1)
if (emailForm) {
    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;

        if (!email) {
            alert('Vui lòng nhập email!');
            return;
        }

        if (!validateEmail(email)) {
            alert('Vui lòng nhập email hợp lệ!');
            return;
        }

        userEmail = email;

        // Khởi tạo và gửi OTP
        const handler = initOTP();
        handler.sendOTP(email);

        showStep(2);
    });
}

// Xử lý form OTP (Bước 2)
if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!otpHandler) {
            alert('Có lỗi xảy ra. Vui lòng thử lại!');
            return;
        }

        const enteredOTP = otpHandler.getOTP();

        if (enteredOTP.length !== 6) {
            alert('Vui lòng nhập đủ 6 số OTP!');
            return;
        }

        const isVerified = await otpHandler.verifyOTP(enteredOTP);

        if (isVerified) {
            alert('✅ Xác thực OTP thành công!');
            showStep(3);

            // Khởi tạo password checker khi vào bước 3
            // ĐÃ SỬA: Thêm tham số 'passwordHint' để hiển thị gợi ý mật khẩu
            if (!passwordChecker) {
                passwordChecker = initPasswordChecker(
                    'newPassword', // passwordId
                    'strengthBar', // strengthBarId
                    'strengthText', // strengthTextId
                    'confirmPassword', // confirmId
                    'matchMessage', // matchId
                    'passwordHint' // hintId - THÊM VÀO ĐỂ CÓ GỢI Ý MẬT KHẨU
                );
            }
        } else {
            alert('❌ Mã OTP không chính xác! Vui lòng thử lại.');
        }
    });
}

// Xử lý đặt lại mật khẩu (Bước 3)
if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // ĐÃ SỬA: Thêm tham số 'passwordHint' khi khởi tạo
        if (!passwordChecker) {
            passwordChecker = initPasswordChecker(
                'newPassword', // passwordId
                'strengthBar', // strengthBarId
                'strengthText', // strengthTextId
                'confirmPassword', // confirmId
                'matchMessage', // matchId
                'passwordHint' // hintId - THÊM VÀO ĐỂ CÓ GỢI Ý MẬT KHẨU
            );
        }

        if (passwordChecker && passwordChecker.validate()) {
            // Lấy thông tin mật khẩu mới
            const newPassword = document.getElementById('newPassword') ?.value;
            const strength = passwordChecker.checkStrength();

            try {
                const response = await fetch('https://mayvang-api.onrender.com/api/auth/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: userEmail,
                        newPassword: newPassword
                    })
                });

                if (response.ok) {
                    alert(`🎉 Đặt lại mật khẩu thành công!\n\n🔐 Độ mạnh mật khẩu mới: ${strength.feedback}\n\nVui lòng đăng nhập lại.`);
                    window.location.href = 'login.html';
                } else {
                    const errorText = await response.text();
                    alert(`❌ Đặt lại mật khẩu thất bại: ${errorText}`);
                }
            } catch (error) {
                console.error('Lỗi đặt lại mật khẩu:', error);
                alert('Không thể kết nối đến server. Hãy kiểm tra Backend đã chạy chưa nhé!');
            }
        }
    });
}

// Cleanup khi rời trang
window.addEventListener('beforeunload', () => {
    if (otpHandler) {
        otpHandler.destroy();
    }
});
