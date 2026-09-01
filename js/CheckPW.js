// CheckPW.js - Kiểm tra độ mạnh của mật khẩu (Phiên bản nâng cao)

class PasswordChecker {
    constructor(passwordInput, strengthBar, strengthText, confirmInput = null, matchMessage = null, hintContainer = null) {
        this.passwordInput = passwordInput;
        this.strengthBar = strengthBar;
        this.strengthText = strengthText;
        this.confirmInput = confirmInput;
        this.matchMessage = matchMessage;
        this.hintContainer = hintContainer;
        
        this.init();
    }
    
    init() {
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', () => {
                this.checkStrength();
                if (this.hintContainer) this.updateHints();
            });
            if (this.confirmInput) {
                this.passwordInput.addEventListener('input', () => this.checkMatch());
                this.confirmInput.addEventListener('input', () => this.checkMatch());
            }
        }
    }
    
    checkStrength() {
        const password = this.passwordInput.value;
        
        if (!this.strengthBar || !this.strengthText) return;
        
        let strength = 0;
        let feedback = '';
        let color = '';
        let width = '0%';
        let barClass = '';
        
        if (password.length === 0) {
            feedback = '';
            color = '';
            width = '0%';
            barClass = '';
        } else {
            // Kiểm tra độ dài
            if (password.length >= 6) strength++;
            if (password.length >= 8) strength++;
            
            // Kiểm tra chữ thường
            if (/[a-z]/.test(password)) strength++;
            
            // Kiểm tra chữ hoa
            if (/[A-Z]/.test(password)) strength++;
            
            // Kiểm tra số
            if (/[0-9]/.test(password)) strength++;
            
            // Kiểm tra ký tự đặc biệt
            if (/[^a-zA-Z0-9]/.test(password)) strength++;
            
            // Đánh giá độ mạnh
            if (strength <= 2) {
                feedback = 'Yếu - Mật khẩu quá đơn giản';
                color = '#ef4444';
                width = '33%';
                barClass = 'weak';
            } else if (strength <= 4) {
                feedback = 'Trung bình - Có thể cải thiện thêm';
                color = '#f59e0b';
                width = '66%';
                barClass = 'medium';
            } else {
                feedback = 'Mạnh - Mật khẩu an toàn';
                color = '#10b981';
                width = '100%';
                barClass = 'strong';
            }
        }
        
        // Cập nhật thanh màu
        this.strengthBar.style.width = width;
        this.strengthBar.style.background = color;
        this.strengthBar.className = 'strength-bar ' + barClass;
        this.strengthText.textContent = feedback;
        this.strengthText.style.color = color;
        
        return { strength, feedback, color };
    }
    
    updateHints() {
        if (!this.hintContainer) return;
        
        const password = this.passwordInput.value;
        const hints = this.hintContainer.querySelectorAll('.hint-item');
        
        const rules = {
            'length': password.length >= 6,
            'uppercase': /[A-Z]/.test(password),
            'lowercase': /[a-z]/.test(password),
            'number': /[0-9]/.test(password),
            'special': /[^a-zA-Z0-9]/.test(password)
        };
        
        hints.forEach(hint => {
            const rule = hint.dataset.rule;
            if (rules[rule]) {
                hint.classList.add('valid');
                hint.classList.remove('invalid');
                hint.innerHTML = hint.innerHTML.replace('○', '✓');
            } else if (password.length > 0) {
                hint.classList.add('invalid');
                hint.classList.remove('valid');
                hint.innerHTML = hint.innerHTML.replace('✓', '○');
            } else {
                hint.classList.remove('valid', 'invalid');
                hint.innerHTML = hint.innerHTML.replace('✓', '○');
            }
        });
    }
    
    checkMatch() {
        if (!this.confirmInput || !this.matchMessage) return;
        
        const password = this.passwordInput.value;
        const confirm = this.confirmInput.value;
        
        if (confirm.length === 0) {
            this.matchMessage.textContent = '';
            this.matchMessage.className = 'password-match';
            return;
        }
        
        if (password === confirm) {
            this.matchMessage.textContent = '✓ Mật khẩu khớp';
            this.matchMessage.style.color = '#10b981';
            this.matchMessage.className = 'password-match match-success';
            return true;
        } else {
            this.matchMessage.textContent = '✗ Mật khẩu không khớp';
            this.matchMessage.style.color = '#ef4444';
            this.matchMessage.className = 'password-match match-error';
            return false;
        }
    }
    
    validate() {
        const password = this.passwordInput.value;
        const isValid = password.length >= 6;
        
        if (!isValid) {
            alert('⚠️ Mật khẩu phải có ít nhất 6 ký tự!');
            this.passwordInput.focus();
            return false;
        }
        
        if (this.confirmInput) {
            const isMatch = this.checkMatch();
            if (!isMatch) {
                alert('⚠️ Mật khẩu nhập lại không khớp!');
                this.confirmInput.focus();
                return false;
            }
        }
        
        return true;
    }
}

// Hàm tiện ích để khởi tạo password checker
function initPasswordChecker(passwordId, strengthBarId, strengthTextId, confirmId = null, matchId = null, hintId = null) {
    const passwordInput = document.getElementById(passwordId);
    const strengthBar = document.getElementById(strengthBarId);
    const strengthText = document.getElementById(strengthTextId);
    const confirmInput = confirmId ? document.getElementById(confirmId) : null;
    const matchMessage = matchId ? document.getElementById(matchId) : null;
    const hintContainer = hintId ? document.getElementById(hintId) : null;
    
    if (!passwordInput || !strengthBar || !strengthText) {
        console.error('Không tìm thấy các element cần thiết cho password checker');
        return null;
    }
    
    return new PasswordChecker(passwordInput, strengthBar, strengthText, confirmInput, matchMessage, hintContainer);
}
