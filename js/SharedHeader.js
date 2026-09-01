// SharedHeader.js
// Script này được load đồng bộ vào các trang HTML, loại bỏ hoàn toàn độ trễ của việc fetch()
// Giúp cho Header hiển thị ngay lập tức cùng với trang (như JSP include)

const sharedHeaderHTML = `
    <header class="main-header">
        <nav class="navbar">
            <div class="logo">
                <a href="index.html" class="logo-link">
                    <h2>MÂY<span>VÀNG</span></h2>
                </a>
            </div>

            <ul class="nav-links" id="nav-links">
                <li><a href="index.html">Trang chủ</a></li>
                <li><a href="room.html">Đặt phòng</a></li>
                <!-- <li><a href="room.html#available-rooms">Phòng trống</a></li> -->
                <li><a href="profile.html">Tài khoản</a></li>
                <li><a href="contact.html">Liên hệ</a></li>
            </ul>

            <div class="nav-right">
                <div class="nav-buttons" id="auth-buttons">
                    <a href="login.html" class="btn-login">Đăng nhập</a>
                    <a href="register.html" class="btn-register-nav">Đăng ký</a>
                </div>

                <div class="user-dropdown" id="user-dropdown" style="display: none;">
                    <button class="user-dropdown-toggle" id="user-dropdown-toggle" type="button" aria-haspopup="true" aria-expanded="false">
                        <span class="user-avatar-mini" id="header-avatar-mini">
                            <img id="header-avatar-img" src="asset/default-avatar.png" alt="Avatar" referrerpolicy="no-referrer" onerror="this.src='asset/default-avatar.png'">
                        </span>
                        <span class="user-meta">
                            <span class="user-greeting">Xin chào,</span>
                            <strong id="display-username">User</strong>
                        </span>
                        <i class="fas fa-chevron-down dropdown-arrow"></i>
                    </button>

                    <div class="user-dropdown-menu" id="user-dropdown-menu" role="menu">
                        <div class="dropdown-head">
                            <div class="dropdown-head-avatar">
                                <img id="dropdown-avatar-img" src="asset/default-avatar.png" alt="Avatar" referrerpolicy="no-referrer" onerror="this.src='asset/default-avatar.png'">
                            </div>
                            <div class="dropdown-head-info">
                                <strong id="dropdown-username">User</strong>
                                <span id="dropdown-tier" class="dropdown-tier">Bronze</span>
                            </div>
                        </div>

                        <a href="profile.html" class="dropdown-item" role="menuitem">
                            <span class="dropdown-icon"><i class="far fa-user"></i></span>
                            <span>Hồ sơ cá nhân</span>
                        </a>

                        <a href="profile.html#tab-history" class="dropdown-item" role="menuitem">
                            <span class="dropdown-icon"><i class="far fa-calendar-check"></i></span>
                            <span>Lịch sử đặt phòng</span>
                        </a>

                        <a href="room.html" class="dropdown-item" role="menuitem">
                            <span class="dropdown-icon"><i class="far fa-compass"></i></span>
                            <span>Đặt phòng ngay</span>
                        </a>

                        <hr class="dropdown-divider">

                        <button id="logout-btn" class="dropdown-item logout-item" type="button" role="menuitem">
                            <span class="dropdown-icon"><i class="fas fa-sign-out-alt"></i></span>
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>

                <button class="mobile-menu-btn" id="mobileMenuBtn" type="button" aria-label="Mở menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </nav>
    </header>
`;

// Chèn Header vào trang ngay lập tức
const placeholder = document.getElementById('header-placeholder');
if (placeholder) {
    placeholder.innerHTML = sharedHeaderHTML;
}

// Chạy khởi tạo UI cho Header (nếu Header.js đã được load)
// Để an toàn (nếu script SharedHeader load trước Header.js), ta bọc vào DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    if (typeof initHeader === 'function') initHeader();
    if (typeof initAuth === 'function') initAuth();
});

