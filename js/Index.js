// ==========================================
// 1. MOBILE MENU TOGGLE
// ==========================================
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');
const navButtons = document.querySelector('.nav-buttons');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');

        // Hiển thị cả nút đăng nhập/đăng ký trong menu mobile
        if (navLinks.classList.contains('active')) {
            if (!document.querySelector('.mobile-nav-buttons')) {
                const mobileNavBtns = navButtons.cloneNode(true);
                mobileNavBtns.classList.add('mobile-nav-buttons');
                mobileNavBtns.style.marginTop = '20px';
                mobileNavBtns.style.justifyContent = 'center';
                navLinks.appendChild(mobileNavBtns);
            }
        } else {
            const mobileBtns = document.querySelector('.mobile-nav-buttons');
            if (mobileBtns) mobileBtns.remove();
        }
    });
}

// ==========================================
// 2. SMOOTH SCROLL CHO NAVIGATION
// ==========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href !== '' && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ==========================================
// 3. HEADER SCROLL EFFECT
// ==========================================
let lastScroll = 0;
const header = document.querySelector('.main-header');

if (header) {
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.96)';
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
        }

        lastScroll = currentScroll;
    });
}

// ==========================================
// 4. ANIMATION ON SCROLL (FADE IN)
// ==========================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Thêm hiệu ứng fade cho các phần tử
document.querySelectorAll('.room-card, .service-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ==========================================
// 5. PRELOAD IMAGES FALLBACK
// ==========================================
const images = document.querySelectorAll('img');
images.forEach(img => {
    img.addEventListener('error', function () {
        this.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDQwIDQwIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNlZTBlMGUiLz48dGV4dCB4PSI1IiB5PSIyNSIgZmlsbD0iIzk5OSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
        this.style.objectFit = 'cover';
    });
});

// Hiệu ứng hover cho các nút
const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-book, .btn-login, .btn-register-nav');
buttons.forEach(btn => {
    btn.addEventListener('mouseenter', function () {
        this.style.transition = 'all 0.3s ease';
    });
});

// ==========================================
// 6. TYPEWRITER EFFECT (CHỮ CHẠY)
// ==========================================
const words = ["Sang Trọng", "Đẳng Cấp", "Thư Giãn", "Khác Biệt"];
let wordIndex = 0;
let isDeleting = false;
let text = "";
let typeSpeed = 150;

function typeWriter() {
    const typeWriterElement = document.querySelector('.typewriter-text');
    if (!typeWriterElement) return;

    const currentWord = words[wordIndex];

    if (isDeleting) {
        // Đang xóa chữ
        text = currentWord.substring(0, text.length - 1);
        typeSpeed = 100;
    } else {
        // Đang gõ chữ
        text = currentWord.substring(0, text.length + 1);
        typeSpeed = 150;
    }

    typeWriterElement.textContent = text;

    // Kịch bản gõ và xóa
    if (!isDeleting && text === currentWord) {
        // Gõ xong 1 từ -> Dừng lại 2 giây cho khách đọc
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && text === "") {
        // Xóa xong -> Chuyển sang từ tiếp theo
        isDeleting = false;
        wordIndex++;
        if (wordIndex >= words.length) {
            wordIndex = 0; // Quay vòng lại từ đầu
        }
        typeSpeed = 500; // Nghỉ 0.5s trước khi gõ từ mới
    }

    setTimeout(typeWriter, typeSpeed);
}

// Khởi chạy Typewriter khi trang đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.typewriter-text')) {
        setTimeout(typeWriter, 1000); // Chờ 1 giây tạo cảm giác tự nhiên
    }
});

console.log('Trang chủ đã sẵn sàng với hiệu ứng chữ chạy!');

// ==========================================
// 7. LOAD PUBLIC REVIEWS
// ==========================================
function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        } [tag])
    );
}

async function loadReviews(isMyReviews = false) {
    const container = document.getElementById("reviewsContainer");
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; width: 100%; color: #64748b;">Đang tải đánh giá...</div>`;

    try {
        const token = localStorage.getItem("jwt_token");
        let url = "https://mayvang-api.onrender.com/api/reviews/public";
        let headers = {};

        if (isMyReviews && token) {
            url = "https://mayvang-api.onrender.com/api/reviews/me";
            headers = {
                "Authorization": `Bearer ${token}`
            };
        }

        const response = await fetch(url, {
            headers
        });
        if (!response.ok) {
            container.innerHTML = `<div style="text-align: center; width: 100%; color: #64748b;">Không thể tải đánh giá.</div>`;
            return;
        }

        const reviews = await response.json();
        if (!reviews || reviews.length === 0) {
            container.innerHTML = `<div style="text-align: center; width: 100%; color: #64748b; font-style: italic;">Chưa có đánh giá nào.</div>`;
            return;
        }

        const generateStarsHtml = (rating, fontSize = '1rem') => {
            return Array.from({
                length: 5
            }, (_, i) => {
                const starIndex = i + 1;
                let fillPercent = 0;
                if (rating >= starIndex) fillPercent = 100;
                else if (rating > starIndex - 1) fillPercent = (rating - (starIndex - 1)) * 100;
                return `<i class="fas fa-star" style="font-size: ${fontSize}; margin: 0 2px; background: linear-gradient(90deg, #fbbf24 ${fillPercent}%, #e2e8f0 ${fillPercent}%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: transparent;"></i>`;
            }).join('');
        };

        // Tính và hiển thị điểm đánh giá trung bình (chỉ hiển thị ở tab Tất cả)
        const avgContainer = document.getElementById("averageRatingContainer");
        if (!isMyReviews && avgContainer && reviews.length > 0) {
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = (totalRating / reviews.length).toFixed(1);

            const avgStars = generateStarsHtml(avgRating, '1.8rem');

            avgContainer.style.display = "flex";
            avgContainer.innerHTML = `
                <div style="font-size: 4rem; font-weight: 800; color: #1e293b; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.05);">${avgRating}</div>
                <div style="margin: 10px 0;">${avgStars}</div>
                <div style="color: #64748b; font-size: 1rem; background: #fff; padding: 6px 16px; border-radius: 99px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">Dựa trên <strong>${reviews.length}</strong> đánh giá</div>
            `;
        } else if (isMyReviews && avgContainer) {
            avgContainer.style.display = "none";
        }

        // Show top 6 for public, all for my reviews
        const topReviews = isMyReviews ? reviews.sort((a, b) => b.reviewID - a.reviewID) : reviews.sort((a, b) => b.reviewID - a.reviewID).slice(0, 6);

        container.innerHTML = topReviews.map(r => {
            const stars = generateStarsHtml(r.rating, '1rem');

            const safeAdminReply = escapeHTML(r.adminReply);
            const replyDateStr = r.replyDate ? new Date(r.replyDate).toLocaleDateString('vi-VN') : '';

            const date = new Date(r.reviewDate).toLocaleDateString('vi-VN');

            const avatarSrc = r.customerAvatar ?
                (r.customerAvatar.startsWith('http') ? r.customerAvatar : `https://mayvang-api.onrender.com${r.customerAvatar.startsWith('/') ? '' : '/'}${r.customerAvatar}`) :
                'asset/default-avatar.png';

            return `
                <div style="background: white; padding: 20px 24px; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); transition: all 0.25s; border: 1px solid #f1f5f9;" onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.04)'">
                    <div style="display: flex; gap: 14px; align-items: flex-start;">
                        <img src="${avatarSrc}" onerror="this.src='asset/default-avatar.png'" alt="Avatar" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #f1f5f9; flex-shrink: 0; margin-top: 2px;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                                <strong style="color: #1e293b; font-size: 0.95rem;">${escapeHTML(r.customerName) || 'Khách ẩn danh'}</strong>
                                <span style="font-size: 0.78rem; color: #94a3b8;"><i class="far fa-clock" style="margin-right: 3px;"></i>${date}</span>
                                ${r.roomType ? `<span style="background: #f1f5f9; padding: 2px 10px; border-radius: 99px; font-size: 0.75rem; color: #64748b;"><i class="fas fa-bed" style="margin-right: 4px;"></i>${r.roomType}</span>` : ''}
                                ${(r.checkinDate && r.checkoutDate) ? `<span style="background: #f1f5f9; padding: 2px 10px; border-radius: 99px; font-size: 0.75rem; color: #64748b;"><i class="far fa-calendar-alt" style="margin-right: 4px;"></i>${new Date(r.checkinDate).toLocaleDateString('vi-VN')} - ${new Date(r.checkoutDate).toLocaleDateString('vi-VN')}</span>` : ''}
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
                                <span>${stars}</span>
                                ${r.cleanlinessRating ? `
                                <span style="display: flex; align-items: center; gap: 12px; font-size: 0.75rem; color: #64748b; padding-left: 10px; border-left: 1px solid #e2e8f0;">
                                    <span><i class="fas fa-broom" style="color: #d4a017; margin-right: 3px;"></i>Sạch sẽ: <b style="color:#1e293b;">${r.cleanlinessRating}/5</b></span>
                                    <span><i class="fas fa-concierge-bell" style="color: #d4a017; margin-right: 3px;"></i>Dịch vụ: <b style="color:#1e293b;">${r.serviceRating}/5</b></span>
                                    <span><i class="fas fa-tv" style="color: #d4a017; margin-right: 3px;"></i>Tiện nghi: <b style="color:#1e293b;">${r.facilitiesRating}/5</b></span>
                                    <span><i class="fas fa-map-marker-alt" style="color: #d4a017; margin-right: 3px;"></i>Vị trí: <b style="color:#1e293b;">${r.locationRating}/5</b></span>
                                </span>` : ''}
                            </div>
                            <p style="color: #475569; line-height: 1.6; margin: 0 0 ${(r.imageUrls || r.adminReply) ? '10px' : '0'} 0; font-size: 0.92rem;">"${escapeHTML(r.comment)}"</p>
                            ${r.imageUrls ? `<div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: ${r.adminReply ? '10px' : '0'};">${r.imageUrls.split(',').filter(u => u.trim()).map(url => `<img src="${url.trim()}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0; transition: 0.2s;" onclick="openLightbox(this.src)" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">`).join('')}</div>` : ''}
                            ${r.adminReply ? `
                            <div style="display: flex; gap: 10px; align-items: flex-start; margin-top: 6px; padding: 10px 14px; background: #fffbf5; border-radius: 12px; border: 1px solid #fed7aa;">
                                <div style="flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #FF8C00, #D4A017); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; box-shadow: 0 2px 6px rgba(245,158,11,0.3);">
                                    <i class="fas fa-hotel"></i>
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                                        <strong style="color: #c2410c; font-size: 0.82rem;">Khách sạn Mây Vàng</strong>
                                        <span style="background: #f15a24; color: #fff; font-size: 0.58rem; font-weight: 700; padding: 1px 7px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.5px;">Ban quản lý</span>
                                        ${replyDateStr ? `<span style="font-size: 0.7rem; color: #a8a29e;"><i class="far fa-clock" style="margin-right: 3px;"></i>${replyDateStr}</span>` : ''}
                                    </div>
                                    <p style="margin: 0; color: #7c2d12; line-height: 1.5; font-size: 0.85rem;">${safeAdminReply}</p>
                                </div>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div style="text-align: center; width: 100%; color: #dc2626;">Lỗi kết nối khi tải đánh giá.</div>`;
    }
}

function setupReviewTabs() {
    const token = localStorage.getItem("jwt_token");
    const reviewTabs = document.getElementById("reviewTabs");
    const btnAll = document.getElementById("btnAllReviews");
    const btnMy = document.getElementById("btnMyReviews");

    if (token && reviewTabs) {
        reviewTabs.style.display = "flex";

        btnAll.addEventListener("click", () => {
            btnAll.style.background = "linear-gradient(135deg, #ef4136, #c73b0c)";
            btnAll.style.color = "white";
            btnAll.style.boxShadow = "0 4px 14px rgba(239, 65, 54, 0.3)";

            btnMy.style.background = "#e2e8f0";
            btnMy.style.color = "#475569";
            btnMy.style.boxShadow = "none";

            loadReviews(false);
        });

        btnMy.addEventListener("click", () => {
            btnMy.style.background = "linear-gradient(135deg, #ef4136, #c73b0c)";
            btnMy.style.color = "white";
            btnMy.style.boxShadow = "0 4px 14px rgba(239, 65, 54, 0.3)";

            btnAll.style.background = "#e2e8f0";
            btnAll.style.color = "#475569";
            btnAll.style.boxShadow = "none";

            loadReviews(true);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupReviewTabs();
    loadReviews(false);
});
