/**
 * Lớp xử lý gọi API (Tách biệt logic mạng)
 */
class ApiService {
    constructor() {
        this.baseUrl = "https://mayvang-api.onrender.com/api";
    }

    // Lấy token từ LocalStorage
    getHeaders() {
        const token = localStorage.getItem('jwt_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    // Xử lý các lỗi chung (401, 403, 500)
    async handleResponse(response) {
        if (response.status === 401 || response.status === 403) {
            alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('current_user');
            window.location.href = 'login.html';
            throw new Error("Unauthorized");
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // API: Lấy dữ liệu doanh thu
    async getRevenue(period = 'week') {
        try {
            const response = await fetch(`${this.baseUrl}/manager/revenue?period=${period}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error("Lỗi khi tải doanh thu:", error);
            return null;
        }
    }

    // API: Lấy danh sách khách hàng tiềm năng
    async getPotentialCustomers() {
        try {
            const response = await fetch(`${this.baseUrl}/manager/potential-customers`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error("Lỗi khi tải danh sách khách hàng tiềm năng:", error);
            return null;
        }
    }

    // API: Lấy danh sách Booking (Có Lọc & Tìm kiếm)
    async getBookings(status = 'all', keyword = '') {
        try {
            // Encode keyword để tránh lỗi URL khi gõ dấu cách hoặc ký tự đặc biệt
            let url = `${this.baseUrl}/manager/bookings?status=${status}`;
            if (keyword) {
                url += `&keyword=${encodeURIComponent(keyword)}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error("Lỗi khi tải danh sách booking:", error);
            return [];
        }
    }

    // API: Lấy danh sách tất cả phòng (CÓ HỖ TRỢ LỌC THEO NGÀY)
    async getAllRooms(dateString = '') {
        try {
            let url = `${this.baseUrl}/rooms`;
            if (dateString) {
                url += `?date=${dateString}`;
            }
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error("Lỗi khi tải danh sách phòng:", error);
            return [];
        }
    }

    // API: Cập nhật thông tin phòng
    async updateRoom(roomId, roomData) {
        try {
            const response = await fetch(`${this.baseUrl}/rooms/${roomId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(roomData)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error("Lỗi khi cập nhật phòng:", error);
            throw error;
        }
    }

    // API: Lấy danh sách đánh giá cho admin
    async getAdminReviews() {
        try {
            // Because there's no specific admin endpoint in our controller, we can use the public one 
            // OR create an admin endpoint. For now, public endpoint gets all reviews.
            const response = await fetch(`${this.baseUrl}/reviews/public`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error("Lỗi khi tải đánh giá:", error);
            return [];
        }
    }

    // API: Trả lời đánh giá
    async replyReview(reviewId, replyContent) {
        try {
            const response = await fetch(`${this.baseUrl}/reviews/${reviewId}/reply`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    reply: replyContent
                })
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error("Lỗi khi phản hồi đánh giá:", error);
            throw error;
        }
    }

    // API: Xóa phản hồi đánh giá
    async deleteReply(reviewId) {
        try {
            const response = await fetch(`${this.baseUrl}/reviews/${reviewId}/reply`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error("Lỗi khi xóa phản hồi:", error);
            throw error;
        }
    }
}

/**
 * Lớp điều khiển giao diện Admin (UI Controller)
 */
class AdminDashboard {
    constructor() {
        this.api = new ApiService();
        this.revenueChartInstance = null; // Lưu trữ instance của Chart.js
        this.roomsData = []; // Lưu trữ dữ liệu phòng tại local
        this.init();
    }

    init() {
        // Không đủ quyền thì dừng luôn, không chạy tiếp (tránh gọi API admin vô ích)
        if (!this.checkAuth()) return;
        this.setupClock();
        this.setupEventListeners();

        // Tải dữ liệu mặc định khi vừa vào trang (Tab Doanh thu - period: week)
        this.loadRevenueData('week');

        // Set ngày mặc định cho bộ lọc phòng là hôm nay
        const roomViewDate = document.getElementById('roomViewDate');
        if (roomViewDate) {
            const today = new Date();
            const offset = today.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(today - offset)).toISOString().slice(0, -1);
            roomViewDate.value = localISOTime.split('T')[0];

            // Lịch đẹp giống bên client (flatpickr) — vẫn giữ value dạng Y-m-d cho code cũ
            if (typeof flatpickr !== 'undefined') {
                flatpickr(roomViewDate, {
                    locale: 'vn',
                    dateFormat: 'Y-m-d',
                    altInput: true,
                    altFormat: 'd/m/Y',
                    altInputClass: 'modern-input flatpickr-alt',
                    defaultDate: roomViewDate.value,
                    disableMobile: true
                });
            }
        }

        // Lịch cho khoảng ngày bảo trì trong modal
        if (typeof flatpickr !== 'undefined') {
            const fpOpts = {
                locale: 'vn',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd/m/Y',
                altInputClass: 'modern-input flatpickr-alt',
                minDate: 'today',
                disableMobile: true
            };
            const startEl = document.getElementById('maintenanceStart');
            const endEl = document.getElementById('maintenanceEnd');
            if (startEl) this.fpMaintStart = flatpickr(startEl, fpOpts);
            if (endEl) this.fpMaintEnd = flatpickr(endEl, fpOpts);
        }

        // Nạp danh sách loại phòng cho dropdown trong modal
        this.loadRoomTypes();

        // Biến các <select> thành dropdown đẹp (custom)
        ['roomStatusFilter', 'statusFilter', 'roomStatus'].forEach(id => {
            const el = document.getElementById(id);
            if (el) this.enhanceSelect(el);
        });

        // Hiện/ẩn ô chọn khoảng ngày bảo trì theo trạng thái được chọn
        const roomStatusEl = document.getElementById('roomStatus');
        if (roomStatusEl) {
            roomStatusEl.addEventListener('change', () => this.toggleMaintenanceDates(roomStatusEl.value));
        }

        // Click ra ngoài thì đóng mọi dropdown
        document.addEventListener('click', () => {
            document.querySelectorAll('.adm-select.open').forEach(w => w.classList.remove('open'));
        });
    }

    // Lấy danh sách loại phòng để đổ vào dropdown (luôn đồng bộ với DB, không bị thiếu loại)
    async loadRoomTypes() {
        const typeSelect = document.getElementById('roomType');
        if (!typeSelect) return;
        try {
            const res = await fetch(`${this.api.baseUrl}/room-types`);
            if (!res.ok) return;
            const types = await res.json();
            this.roomTypes = types;
            typeSelect.innerHTML = types
                .map(t => `<option value="${t.typeID}">${t.typeName}</option>`)
                .join('');

            // Dựng/cập nhật dropdown đẹp cho ô loại phòng
            if (typeSelect.dataset.enhanced === 'true' && typeSelect._admRebuild) {
                typeSelect._admRebuild();
            } else {
                this.enhanceSelect(typeSelect);
            }
        } catch (err) {
            console.error('Không tải được danh sách loại phòng:', err);
        }
    }

    // 1. Kiểm tra đăng nhập + đúng quyền MANAGER
    checkAuth() {
        const token = localStorage.getItem('jwt_token');
        const user = localStorage.getItem('current_user');
        const role = localStorage.getItem('role');

        // Chưa đăng nhập -> về trang đăng nhập
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }

        // Đăng nhập rồi nhưng không phải quản lý -> đá về trang chủ ngay (không hiện khung admin)
        if (role !== 'MANAGER') {
            alert('Bạn không có quyền truy cập trang quản trị.');
            window.location.href = 'index.html';
            return false;
        }

        // Cập nhật tên Admin trên UI nếu có
        const adminNameEl = document.querySelector('.admin-info strong');
        if (adminNameEl && user) {
            adminNameEl.innerText = user;
        }
        return true;
    }

    // 2. Cài đặt đồng hồ thời gian thực
    setupClock() {
        const timeEl = document.getElementById('currentDateTime');
        if (!timeEl) return;

        const updateTime = () => {
            const now = new Date();
            timeEl.innerText = now.toLocaleString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    // 3. Đăng ký các sự kiện (Click, Change)
    setupEventListeners() {
        // Sự kiện chuyển Tab Sidebar
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = item.getAttribute('data-tab');
                this.switchTab(item, tabId);
            });
        });

        // Sự kiện Đăng xuất (dùng modal custom thay cho confirm() xấu)
        const logoutBtn = document.getElementById('logoutBtn');
        const logoutModal = document.getElementById('logoutConfirmModal');
        const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');
        const logoutCancelBtn = document.getElementById('logoutCancelBtn');

        if (logoutBtn && logoutModal) {
            // Mở modal khi bấm nút đăng xuất
            logoutBtn.addEventListener('click', () => {
                logoutModal.style.display = 'flex';
            });

            // Xác nhận đăng xuất
            logoutConfirmBtn.addEventListener('click', () => {
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('current_user');
                window.location.href = 'login.html';
            });

            // Hủy bỏ
            logoutCancelBtn.addEventListener('click', () => {
                logoutModal.style.display = 'none';
            });

            // Bấm vùng tối bên ngoài cũng đóng modal
            logoutModal.addEventListener('click', (e) => {
                if (e.target === logoutModal) {
                    logoutModal.style.display = 'none';
                }
            });
        }

        // Sự kiện lọc Doanh thu (Tuần, Tháng, Năm)
        const revenueFilters = document.querySelectorAll('.revenue-filter .filter-btn');
        revenueFilters.forEach(btn => {
            btn.addEventListener('click', (e) => {
                revenueFilters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const period = btn.getAttribute('data-period');
                this.loadRevenueData(period);
            });
        });

        // Sự kiện làm mới danh sách khách hàng tiềm năng
        const refreshPotentialBtn = document.getElementById('refreshPotentialBtn');
        if (refreshPotentialBtn) {
            refreshPotentialBtn.addEventListener('click', () => {
                this.loadPotentialCustomers();
            });
        }

        // Sự kiện lọc Booking
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.loadBookings();
            });
        }

        const searchBooking = document.getElementById('searchBooking');
        if (searchBooking) {
            // Dùng setTimeout (Debounce) để người dùng gõ xong mới gọi API
            let timeout = null;
            searchBooking.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.loadBookings();
                }, 500);
            });
        }

        // SỰ KIỆN MỚI: Bắt sự kiện đổi ngày xem phòng
        const roomViewDate = document.getElementById('roomViewDate');
        if (roomViewDate) {
            roomViewDate.addEventListener('change', (e) => {
                this.loadRooms(e.target.value);
            });
        }

        // Bắt sự kiện khi người dùng chọn lọc trạng thái phòng
        const roomStatusFilter = document.getElementById('roomStatusFilter');
        if (roomStatusFilter) {
            roomStatusFilter.addEventListener('change', () => {
                this.renderRoomsList();
            });
        }

        // Sự kiện Submit Form cập nhật phòng
        const roomForm = document.getElementById('roomForm');
        if (roomForm) {
            roomForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitRoomUpdate();
            });
        }

        // Sự kiện tạo tài khoản quản lý mới
        const createManagerForm = document.getElementById('createManagerForm');
        if (createManagerForm) {
            createManagerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateManager();
            });
        }

        // Các sự kiện cho Modal (Tắt modal khi bấm X)
        const closeBtns = document.querySelectorAll('.close');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            });
        });

        // Tắt modal khi click ra ngoài vùng modal
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    // 4. Hàm chuyển đổi Tabs
    switchTab(activeNavItem, tabId) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        activeNavItem.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const targetTab = document.getElementById(`${tabId}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Gọi API tương ứng khi chuyển tab
        if (tabId === 'manager-account') {
            const msg = document.getElementById('mgrFormMsg');
            if (msg) msg.innerText = '';
        }
        if (tabId === 'revenue') {
            this.loadRevenueData('week');
        } else if (tabId === 'potential-customers') {
            this.loadPotentialCustomers();
        } else if (tabId === 'booking-list') {
            this.loadBookings();
        } else if (tabId === 'room-management') {
            // Lấy ngày hiện tại trên input để tải
            const dateStr = document.getElementById('roomViewDate') ?.value || '';
            this.loadRooms(dateStr);
        } else if (tabId === 'review-management') {
            this.loadAdminReviews();
        }
    }

    // Tạo tài khoản quản lý mới (gọi API /manager/managers)
    async handleCreateManager() {
        const username = document.getElementById('mgrUsername').value.trim();
        const email = document.getElementById('mgrEmail').value.trim();
        const password = document.getElementById('mgrPassword').value;
        const msgEl = document.getElementById('mgrFormMsg');

        msgEl.style.color = '#ef4444';
        msgEl.innerText = '';

        try {
            const res = await fetch(`${this.api.baseUrl}/manager/managers`, {
                method: 'POST',
                headers: this.api.getHeaders(),
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            let data = {};
            try {
                data = await res.json();
            } catch (e) {
                /* ignore */ }

            if (!res.ok) {
                if (data.errors && Array.isArray(data.errors)) {
                    msgEl.innerText = data.errors[0].defaultMessage || 'Dữ liệu không hợp lệ';
                } else {
                    msgEl.innerText = data.message || 'Tạo quản lý thất bại';
                }
                return;
            }

            msgEl.style.color = '#16a34a';
            msgEl.innerText = `Đã tạo tài khoản quản lý "${data.username}" thành công!`;
            document.getElementById('createManagerForm').reset();
        } catch (err) {
            console.error(err);
            msgEl.innerText = 'Lỗi kết nối tới máy chủ';
        }
    }

    // Biến 1 thẻ <select> gốc thành dropdown đẹp (custom), vẫn giữ select gốc để lấy value
    enhanceSelect(select) {
        if (!select || select.dataset.enhanced === 'true') return;
        select.dataset.enhanced = 'true';
        select.style.display = 'none';

        // Ẩn mũi tên cũ của .select-wrapper (nếu có) để khỏi bị 2 mũi tên
        if (select.parentElement && select.parentElement.classList.contains('select-wrapper')) {
            select.parentElement.classList.add('adm-no-arrow');
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'adm-select';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'adm-select-trigger';
        const label = document.createElement('span');
        label.className = 'adm-select-label';
        const chevron = document.createElement('i');
        chevron.className = 'fas fa-chevron-down adm-select-chevron';
        trigger.appendChild(label);
        trigger.appendChild(chevron);

        const menu = document.createElement('ul');
        menu.className = 'adm-select-menu';

        const buildOptions = () => {
            menu.innerHTML = '';
            Array.from(select.options).forEach(opt => {
                const li = document.createElement('li');
                li.className = 'adm-select-opt';
                li.dataset.value = opt.value;
                li.textContent = opt.textContent;
                if (opt.value === select.value) li.classList.add('selected');
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change', {
                        bubbles: true
                    }));
                    wrapper.classList.remove('open');
                });
                menu.appendChild(li);
            });
        };

        const syncLabel = () => {
            const sel = select.options[select.selectedIndex];
            label.textContent = sel ? sel.textContent : '';
            menu.querySelectorAll('.adm-select-opt').forEach(li => {
                li.classList.toggle('selected', li.dataset.value === select.value);
            });
        };

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.adm-select.open').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });

        // Đồng bộ khi value thay đổi (kể cả khi code set value rồi dispatch 'change')
        select.addEventListener('change', syncLabel);

        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);
        select.parentNode.insertBefore(wrapper, select.nextSibling);

        // Cho phép dựng lại options khi đổ động (vd loại phòng tải từ API)
        select._admRebuild = () => {
            buildOptions();
            syncLabel();
        };

        buildOptions();
        syncLabel();
    }

    // Hiện ô chọn khoảng ngày + lý do khi trạng thái là bảo trì / ngừng hoạt động
    toggleMaintenanceDates(status) {
        const show = (status === 'maintenance' || status === 'inactive');
        const dateGroup = document.getElementById('maintenanceDateGroup');
        if (dateGroup) dateGroup.style.display = show ? 'block' : 'none';
    }

    // Toast thông báo đẹp (thay cho alert mặc định của trình duyệt)
    showToast(message, type = 'success') {
        const colors = {
            success: '#16a34a',
            error: '#dc2626',
            info: '#2563eb'
        };
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            info: 'fa-circle-info'
        };
        const color = colors[type] || colors.success;
        const icon = icons[type] || icons.success;

        let container = document.getElementById('admToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'admToastContainer';
            container.style.cssText = 'position:fixed; top:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:10px;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `display:flex; align-items:center; gap:12px; background:#fff; color:#1e293b;
            border-left:5px solid ${color}; box-shadow:0 10px 30px rgba(0,0,0,0.18); border-radius:14px;
            padding:14px 20px; min-width:280px; max-width:380px; font-size:0.95rem; font-weight:500;
            transform:translateX(120%); transition:transform .35s cubic-bezier(.22,1,.36,1);`;
        toast.innerHTML = `<i class="fas ${icon}" style="color:${color}; font-size:1.35rem;"></i><span>${message}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 350);
        }, 3000);
    }

    // 5. Xử lý logic nghiệp vụ: Doanh Thu
    async loadRevenueData(period) {
        const data = await this.api.getRevenue(period);
        if (!data) return;

        document.getElementById('totalRevenue').innerText = this.formatCurrency(data.totalRevenue || 0);
        document.getElementById('totalBookings').innerText = data.totalBookings || 0;
        document.getElementById('bookedRoomsCount').innerText = data.bookedRoomsCount || 0;
        document.getElementById('avgDailyRevenue').innerText = this.formatCurrency(data.avgDailyRevenue || 0);

        let labels = [];
        let values = [];

        if (data.chartData && data.chartData.length > 0) {
            labels = data.chartData.map(item => item.date || item.key || '');
            values = data.chartData.map(item => item.revenue || item.value || 0);
        } else {
            labels = ['Chưa có dữ liệu'];
            values = [0];
        }

        this.renderChart(labels, values, period);
    }

    // 6. Xử lý logic nghiệp vụ: Khách hàng tiềm năng (RFM)
    async loadPotentialCustomers() {
        const tableBody = document.getElementById('potentialTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Đang tải dữ liệu... <i class="fas fa-spinner fa-spin"></i></td></tr>';

        const customers = await this.api.getPotentialCustomers();

        if (!customers || customers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Không có dữ liệu khách hàng tiềm năng.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';

        customers.forEach(customer => {
            let points = Math.floor((customer.totalSpent || 0) / 100000);

            let tier = 'Bronze';
            let tierBg = '#cd7f32';
            let tierColor = '#fff';

            if (points >= 6000) {
                tier = 'Platinum';
                tierBg = '#e5e4e2';
                tierColor = '#333';
            } else if (points >= 2500) {
                tier = 'Gold';
                tierBg = '#ffd700';
                tierColor = '#333';
            } else if (points >= 800) {
                tier = 'Silver';
                tierBg = '#c0c0c0';
                tierColor = '#333';
            }

            // RFM label styling
            const rfmScore = customer.rfmScore || 0;
            let labelBg, labelColor, labelIcon;
            switch (customer.rfmLabel) {
                case 'VIP':
                    labelBg = '#fef3c7';
                    labelColor = '#92400e';
                    labelIcon = '🔥';
                    break;
                case 'Tiềm năng cao':
                    labelBg = '#d1fae5';
                    labelColor = '#065f46';
                    labelIcon = '⭐';
                    break;
                case 'Cần kích hoạt':
                    labelBg = '#fef9c3';
                    labelColor = '#854d0e';
                    labelIcon = '💤';
                    break;
                default:
                    labelBg = '#f1f5f9';
                    labelColor = '#64748b';
                    labelIcon = '❄️';
            }

            // RFM score color
            let scoreBg, scoreColor;
            if (rfmScore >= 7) {
                scoreBg = '#dc2626';
                scoreColor = '#fff';
            } else if (rfmScore >= 5) {
                scoreBg = '#f59e0b';
                scoreColor = '#fff';
            } else {
                scoreBg = '#94a3b8';
                scoreColor = '#fff';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${customer.username || 'Khách vãng lai'}</strong></td>
                <td>${customer.email || 'Chưa cập nhật'}</td>
                <td>${customer.phone || 'Chưa cập nhật'}</td>
                <td style="text-align: center;"><strong>${customer.totalBookings || 0}</strong></td>
                <td style="color: #c53030; font-weight: bold;">${this.formatCurrency(customer.totalSpent || 0)}</td>
                <td>${customer.lastBookingDate || 'N/A'}</td>
                <td><span style="padding: 4px 8px; border-radius: 4px; background: ${tierBg}; font-weight: bold; font-size: 12px; color: ${tierColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${tier}</span></td>
                <td style="text-align: center;">
                    <span title="R=${customer.recencyScore || 0} | F=${customer.frequencyScore || 0} | M=${customer.monetaryScore || 0}" 
                          style="display:inline-block; padding: 4px 10px; border-radius: 20px; background: ${scoreBg}; color: ${scoreColor}; font-weight: 700; font-size: 0.85rem; cursor: help; min-width: 28px;">
                        ${rfmScore}/9
                    </span>
                </td>
                <td>
                    <span style="display:inline-flex; align-items:center; gap:4px; padding: 4px 10px; border-radius: 20px; background: ${labelBg}; color: ${labelColor}; font-weight: 600; font-size: 0.8rem; white-space: nowrap;">
                        ${labelIcon} ${customer.rfmLabel || 'N/A'}
                    </span>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // 7. Xử lý logic nghiệp vụ: Danh sách Booking
    async loadBookings() {
        const tableBody = document.getElementById('bookingTableBody');
        if (!tableBody) return;

        // Bật loading
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Đang tải dữ liệu... <i class="fas fa-spinner fa-spin"></i></td></tr>';

        const status = document.getElementById('statusFilter').value;
        const keyword = document.getElementById('searchBooking').value;

        // Lấy dữ liệu từ API
        const bookings = await this.api.getBookings(status, keyword);

        if (!bookings || bookings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Không tìm thấy kết quả nào phù hợp.</td></tr>';
            return;
        }

        tableBody.innerHTML = ''; // Xóa loading

        bookings.forEach(booking => {
            const tr = document.createElement('tr');

            let roomDisplay = "N/A";
            let checkinDisplay = "N/A";
            let checkoutDisplay = "N/A";

            if (booking.details && booking.details.length > 0) {
                // Lấy tất cả các tên phòng và nối chúng lại bằng dấu phẩy
                roomDisplay = booking.details.map(d => d.roomNumber).join(', ');

                // Lấy thông tin ngày tháng của phòng đầu tiên làm đại diện cho cả booking
                const firstDetail = booking.details[0];
                checkinDisplay = this.formatDate(firstDetail.checkinDate);
                checkoutDisplay = this.formatDate(firstDetail.checkoutDate);
            }

            // Xử lý huy hiệu trạng thái (Badge)
            let statusBadge = '';
            switch (booking.status ?.toLowerCase()) {
                case 'confirmed':
                    statusBadge = '<span style="color: #155724; background: #d4edda; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Đã xác nhận</span>';
                    break;
                case 'pending':
                    statusBadge = '<span style="color: #856404; background: #fff3cd; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Chờ xử lý</span>';
                    break;
                case 'cancelled':
                    statusBadge = '<span style="color: #721c24; background: #f8d7da; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Đã hủy</span>';
                    break;
                default:
                    statusBadge = `<span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #e2e3e5;">${booking.status || 'N/A'}</span>`;
            }

            tr.style.cursor = 'pointer';
            tr.style.transition = 'background 0.15s';
            tr.innerHTML = `
                <td><strong>#${booking.bookingID}</strong></td>
                <td>${booking.username || 'N/A'}</td>
                <td>${booking.phone || 'N/A'}</td>
                <td>${booking.email || 'N/A'}</td>
                <td style="max-width: 150px; line-height: 1.4;"><strong>${roomDisplay}</strong></td>
                <td>${checkinDisplay}</td>
                <td>${checkoutDisplay}</td>
                <td style="color: #c53030; font-weight: bold;">${this.formatCurrency(booking.totalPrice || 0)}</td>
                <td>${statusBadge}</td>
            `;

            // Nhấn vào cả hàng để xem chi tiết
            tr.addEventListener('click', () => this.showBookingDetailModal(booking, statusBadge));
            tr.addEventListener('mouseover', () => tr.style.background = '#fef6ee');
            tr.addEventListener('mouseout', () => tr.style.background = '');

            tableBody.appendChild(tr);
        });
    }

    // 8. Hàm mở Modal Chi Tiết Booking
    showBookingDetailModal(booking, statusBadgeHtml) {
        const modal = document.getElementById('bookingDetailModal');
        const content = document.getElementById('bookingDetailContent');
        if (!modal || !content) return;

        // Render danh sách các phòng trong booking này
        let detailsHtml = '';
        if (booking.details && booking.details.length > 0) {
            detailsHtml = booking.details.map((d, index) => `
                <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef; margin-bottom: 10px;">
                    <h5 style="margin-top:0; margin-bottom: 8px; color: #495057;">Phòng ${index + 1}: <strong style="color:#c53030;">${d.roomNumber}</strong> - ${d.roomType}</h5>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
                        <span><i class="fas fa-calendar-alt" style="color:#6c757d;"></i> Từ: <strong>${this.formatDate(d.checkinDate)}</strong></span>
                        <span>Đến: <strong>${this.formatDate(d.checkoutDate)}</strong></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px;">
                        <span>Thành tiền: <strong style="color: #c53030;">${this.formatCurrency(d.subTotal || 0)}</strong></span>
                    </div>
                </div>
            `).join('');
        } else {
            detailsHtml = '<p style="color: #dc3545;">Không có dữ liệu chi tiết phòng.</p>';
        }

        // Đổ toàn bộ dữ liệu vào body của Modal
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
                    <h4 style="margin-top: 0; color: #343a40; border-bottom: 1px solid #dee2e6; padding-bottom: 8px;"><i class="fas fa-user"></i> Thông tin khách</h4>
                    <p style="margin: 8px 0;"><strong>Họ tên:</strong> ${booking.username || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>SĐT:</strong> ${booking.phone || 'N/A'}</p>
                    <p style="margin: 8px 0;"><strong>Email:</strong> ${booking.email || 'N/A'}</p>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
                    <h4 style="margin-top: 0; color: #343a40; border-bottom: 1px solid #dee2e6; padding-bottom: 8px;"><i class="fas fa-file-invoice"></i> Đơn đặt #${booking.bookingID}</h4>
                    <p style="margin: 8px 0;"><strong>Ngày đặt:</strong> ${this.formatDate(booking.bookingDate)}</p>
                    <p style="margin: 8px 0;"><strong>Trạng thái:</strong> ${statusBadgeHtml}</p>
                    <p style="margin: 8px 0; font-size: 1.1em;"><strong>Tổng thanh toán:</strong> <span style="color: #c53030; font-weight: bold;">${this.formatCurrency(booking.totalPrice || 0)}</span></p>
                </div>
            </div>
            <h4 style="color: #343a40; margin-bottom: 10px;"><i class="fas fa-bed"></i> Danh sách phòng đã chọn</h4>
            <div style="max-height: 250px; overflow-y: auto; padding-right: 5px;">
                ${detailsHtml}
            </div>
        `;

        modal.style.display = 'flex';
    }

    // 9. Xử lý logic nghiệp vụ: Quản lý Phòng
    async loadRooms(dateString = '') {
        const roomsGrid = document.getElementById('roomsGrid');
        if (!roomsGrid) return;

        roomsGrid.innerHTML = '<div style="text-align:center; width: 100%; padding: 20px;">Đang tải dữ liệu phòng... <i class="fas fa-spinner fa-spin"></i></div>';

        const rooms = await this.api.getAllRooms(dateString);
        this.roomsData = rooms;

        if (!rooms || rooms.length === 0) {
            roomsGrid.innerHTML = '<div style="text-align:center; width: 100%; padding: 20px;">Không có dữ liệu phòng.</div>';
            return;
        }

        this.renderRoomsList();
    }

    renderRoomsList() {
        const roomsGrid = document.getElementById('roomsGrid');
        if (!roomsGrid) return;

        // Lấy giá trị bộ lọc hiện tại
        const filterValue = document.getElementById('roomStatusFilter') ?.value || 'all';

        let total = this.roomsData.length;
        let available = 0,
            booked = 0,
            maintenance = 0,
            inactive = 0;

        // BƯỚC 1: Tính toán thống kê dựa trên TẤT CẢ dữ liệu (để 4 ô trên cùng luôn đúng)
        this.roomsData.forEach(room => {
            const status = room.status ?.toLowerCase() || 'available';
            if (status === 'available') available++;
            else if (status === 'booked') booked++;
            else if (status === 'maintenance') maintenance++;
            else if (status === 'inactive') inactive++;
        });

        document.getElementById('totalRooms').innerText = total;
        document.getElementById('availableRooms').innerText = available;
        document.getElementById('bookedRoomsStat').innerText = booked;
        document.getElementById('maintenanceRooms').innerText = maintenance;
        const inactiveEl = document.getElementById('inactiveRooms');
        if (inactiveEl) inactiveEl.innerText = inactive;

        roomsGrid.innerHTML = '';

        // BƯỚC 2: Lọc dữ liệu theo giá trị dropdown
        const filteredRooms = this.roomsData.filter(room => {
            if (filterValue === 'all') return true;
            const status = room.status ?.toLowerCase() || 'available';
            return status === filterValue;
        });

        // BƯỚC 3: Vẽ giao diện
        if (filteredRooms.length === 0) {
            roomsGrid.style.display = 'block';
            roomsGrid.innerHTML = '<div style="text-align:center; width: 100%; padding: 30px; color: #666;"><i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; color: #ccc;"></i><br>Không có phòng nào khớp với trạng thái này.</div>';
            return;
        }

        filteredRooms.forEach(room => {
            const status = room.status ?.toLowerCase() || 'available';
            let statusText = '',
                statusIcon = '',
                statusBgColor = '',
                statusTextColor = '';

            switch (status) {
                case 'available':
                    statusText = 'Còn trống';
                    statusIcon = 'fa-check-circle';
                    statusBgColor = '#d4edda';
                    statusTextColor = '#155724';
                    break;
                case 'booked':
                    statusText = 'Đã đặt';
                    statusIcon = 'fa-lock';
                    statusBgColor = '#f8d7da';
                    statusTextColor = '#721c24';
                    break;
                case 'maintenance':
                    statusText = 'Bảo trì';
                    statusIcon = 'fa-tools';
                    statusBgColor = '#fff3cd';
                    statusTextColor = '#856404';
                    break;
                case 'inactive':
                    statusText = 'Ngừng kinh doanh';
                    statusIcon = 'fa-ban';
                    statusBgColor = '#e2e3e5';
                    statusTextColor = '#383d41';
                    break;
                default:
                    statusText = status;
                    statusBgColor = '#e2e3e5';
                    statusTextColor = '#383d41';
            }

            const roomCard = document.createElement('div');
            roomCard.style.border = '1px solid #e0e0e0';
            roomCard.style.borderRadius = '8px';
            roomCard.style.padding = '15px';
            roomCard.style.backgroundColor = '#fff';
            roomCard.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
            roomCard.style.cursor = 'pointer';
            roomCard.style.transition = '0.3s';

            const badgeStyle = `background-color: ${statusBgColor}; color: ${statusTextColor}; font-size: 12px; font-weight: bold; padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;`;

            roomCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
                    <h3 style="margin: 0; color: #2c3e50;">P. ${room.roomNumber}</h3>
                    <span style="${badgeStyle}"><i class="fas ${statusIcon}"></i> ${statusText}</span>
                </div>
                <div style="font-size: 14px; color: #555;">
                    <p style="margin: 5px 0;"><strong>Loại:</strong> <span style="font-weight: 600;">${room.typeName}</span></p>
                    <p style="margin: 5px 0;"><strong>Giá:</strong> <span style="color: #c53030; font-weight:bold;">${this.formatCurrency(room.priceRoom)}</span></p>
                    <p style="margin: 5px 0;"><strong>Sức chứa:</strong> <i class="fas fa-user"></i> ${room.occupancy}</p>
                    ${room.description ? `<p style="margin: 10px 0 0; padding-top: 10px; border-top: 1px dashed #eee; font-size: 13px; color: #6b7280; font-style: italic; line-height: 1.5;"><i class="fas fa-mountain-sun" style="color: #0d9488; margin-right: 5px;"></i>${this.escapeHTML(room.description)}</p>` : ''}
                    ${room.statusNote ? `<p style="margin: 6px 0 0; font-size: 13px; color: #b45309; font-style: italic; line-height: 1.5;"><i class="fas fa-wrench" style="color: #d97706; margin-right: 5px;"></i>${this.escapeHTML(room.statusNote)}</p>` : ''}
                </div>
            `;

            roomCard.addEventListener('mouseover', () => roomCard.style.boxShadow = '0 5px 15px rgba(0,0,0,0.15)');
            roomCard.addEventListener('mouseout', () => roomCard.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)');
            roomCard.addEventListener('click', () => this.showRoomModal(room));

            roomsGrid.appendChild(roomCard);
        });

        // Thiết lập lại Grid CSS
        roomsGrid.style.display = 'grid';
        roomsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(240px, 1fr))';
        roomsGrid.style.gap = '20px';
    }

    showRoomModal(room) {
        const modal = document.getElementById('roomModal');
        if (!modal) return;

        document.getElementById('roomId').value = room.roomID;
        document.getElementById('roomName').value = room.roomNumber;
        document.getElementById('roomName').disabled = true;

        // Tính phụ phí riêng của phòng (priceExtra = giá hiển thị - giá gốc loại phòng)
        // Giá hiển thị (room.priceRoom) = giá gốc loại phòng + priceExtra (view/ngoại cảnh)
        const currentType = (this.roomTypes || []).find(t => t.typeID === room.typeID);
        const basePrice = currentType ? currentType.priceRoom : 0;
        this._currentPriceExtra = room.priceRoom - basePrice; // lưu lại phụ phí riêng của phòng
        if (this._currentPriceExtra < 0) this._currentPriceExtra = 0; // đề phòng dữ liệu lệch

        // Chọn Loại phòng theo typeID (option value chính là typeID)
        const typeSelect = document.getElementById('roomType');

        // Gỡ handler cũ (nếu có) để tránh chồng sự kiện khi mở modal nhiều lần
        if (this._onRoomTypeChange) {
            typeSelect.removeEventListener('change', this._onRoomTypeChange);
        }

        // Đăng ký handler mới: khi đổi loại phòng -> tự cập nhật giá & sức chứa
        this._onRoomTypeChange = () => {
            const selectedTypeId = parseInt(typeSelect.value, 10);
            const selectedType = (this.roomTypes || []).find(t => t.typeID === selectedTypeId);
            if (selectedType) {
                // Giá mới = giá gốc loại phòng mới + phụ phí riêng (view/ngoại cảnh) của phòng
                document.getElementById('roomPrice').value = selectedType.priceRoom + this._currentPriceExtra;
                document.getElementById('roomCapacity').value = selectedType.occupancy;
            }
        };
        typeSelect.addEventListener('change', this._onRoomTypeChange);

        typeSelect.value = String(room.typeID);
        typeSelect.dispatchEvent(new Event('change', {
            bubbles: true
        })); // cập nhật dropdown đẹp + giá/sức chứa

        document.getElementById('roomPrice').value = room.priceRoom;
        document.getElementById('roomPrice').disabled = true;
        document.getElementById('roomCapacity').value = room.occupancy;
        document.getElementById('roomCapacity').disabled = true;

        // Nếu phòng hiện tại đang được Booked trên UI, trong Modal chỉ hiển thị nó ở trạng thái vật lý là Available
        let physicalStatus = room.status ?.toLowerCase() || 'available';
        if (physicalStatus === 'booked') {
            physicalStatus = 'available';
        }
        const statusSelect = document.getElementById('roomStatus');
        statusSelect.value = physicalStatus;
        statusSelect.dispatchEvent(new Event('change', {
            bubbles: true
        })); // cập nhật dropdown đẹp + ẩn/hiện ô ngày

        // Điền sẵn khoảng ngày bảo trì (nếu phòng đang có lịch)
        if (this.fpMaintStart) {
            if (room.maintenanceStart) this.fpMaintStart.setDate(room.maintenanceStart, false);
            else this.fpMaintStart.clear();
        }
        if (this.fpMaintEnd) {
            if (room.maintenanceEnd) this.fpMaintEnd.setDate(room.maintenanceEnd, false);
            else this.fpMaintEnd.clear();
        }

        // Điền lý do bảo trì / ngừng kinh doanh
        const noteEl = document.getElementById('statusNote');
        if (noteEl) noteEl.value = room.statusNote || '';

        modal.style.display = 'flex';
    }

    async submitRoomUpdate() {
        const roomId = document.getElementById('roomId').value;
        const status = document.getElementById('roomStatus').value;

        const typeSelect = document.getElementById('roomType');
        // option value chính là typeID (đổ từ /api/room-types) -> không cần map tay, không lo thiếu loại
        const typeId = parseInt(typeSelect.value, 10) || 0;

        const updateData = {
            typeID: typeId,
            status: status
        };

        // Khoảng ngày bảo trì/ngừng hoạt động (rỗng -> null = áp dụng tới khi gỡ thủ công)
        if (status === 'maintenance' || status === 'inactive') {
            updateData.maintenanceStart = document.getElementById('maintenanceStart').value || null;
            updateData.maintenanceEnd = document.getElementById('maintenanceEnd').value || null;
            updateData.statusNote = document.getElementById('statusNote').value || null;
        } else {
            updateData.maintenanceStart = null;
            updateData.maintenanceEnd = null;
            updateData.statusNote = null;
        }

        const btnSave = document.querySelector('.btn-save');
        const originalText = btnSave.innerHTML;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        btnSave.disabled = true;

        try {
            await this.api.updateRoom(roomId, updateData);
            this.showToast("Cập nhật thông tin phòng thành công!", 'success');
            document.getElementById('roomModal').style.display = 'none';
            // Lấy lại ngày đang chọn để refresh đúng dữ liệu
            const dateStr = document.getElementById('roomViewDate') ?.value || '';
            this.loadRooms(dateStr);
        } catch (error) {
            this.showToast("Cập nhật thất bại. Vui lòng thử lại!", 'error');
        } finally {
            btnSave.innerHTML = originalText;
            btnSave.disabled = false;
        }
    }

    // 11. Xử lý nghiệp vụ: Quản lý Đánh giá
    escapeHTML(str) {
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

    async loadAdminReviews() {
        const tableBody = document.getElementById('reviewsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Đang tải dữ liệu... <i class="fas fa-spinner fa-spin"></i></td></tr>';

        const reviews = await this.api.getAdminReviews();
        if (!reviews || reviews.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Không có đánh giá nào.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        reviews.sort((a, b) => b.reviewID - a.reviewID).forEach(review => {
            const tr = document.createElement('tr');

            const safeComment = this.escapeHTML(review.comment);
            const safeUsername = this.escapeHTML(review.customerName || 'N/A');
            const safeAdminReply = this.escapeHTML(review.adminReply || '');
            const hasReply = !!review.adminReply;

            tr.innerHTML = `
                <td><strong>#${review.reviewID}</strong></td>
                <td>${safeUsername}</td>
                <td><a href="#" style="color:#3b82f6;">#${review.bookingID || 'N/A'}</a></td>
                <td style="color: #fbbf24; font-weight:bold;">${review.rating} <i class="fas fa-star"></i></td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${safeComment}">
                    ${safeComment}
                </td>
                <td>${this.formatDate(review.reviewDate)}</td>
                <td>${hasReply 
                    ? `<span style="color: #10b981;"><i class="fas fa-check-circle" style="margin-right:3px;"></i>Đã phản hồi</span>` 
                    : `<span style="color: #ef4444;">Chưa phản hồi</span>`}
                </td>
                <td style="text-align: center;">
                    ${hasReply ? `
                        <div style="display:flex; align-items:center; gap:6px; justify-content:center;">
                            <button disabled style="background: #d1fae5; color: #059669; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: not-allowed; opacity: 0.85;">
                                <i class="fas fa-check"></i> Đã phản hồi
                            </button>
                            <div style="position:relative;">
                                <button class="btn-reply-menu" data-id="${review.reviewID}" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display:flex; align-items:center; justify-content:center; transition: all 0.2s; font-size: 14px;"
                                    onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div class="reply-dropdown" data-dropdown-id="${review.reviewID}" style="display:none; position:absolute; right:0; top:36px; background:white; border:1px solid #e2e8f0; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.12); min-width:160px; z-index:1000; overflow:hidden;">
                                    <button class="btn-edit-reply" data-id="${review.reviewID}" data-comment="${safeComment}" data-reply="${safeAdminReply}" style="display:flex; align-items:center; gap:8px; width:100%; padding:10px 14px; border:none; background:none; cursor:pointer; color:#475569; font-size:0.85rem; transition:background 0.15s;"
                                        onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'">
                                        <i class="fas fa-pen" style="color:#3b82f6; width:16px;"></i> Chỉnh sửa
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <button class="btn-small btn-reply-review" data-id="${review.reviewID}" data-comment="${safeComment}" style="background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 0.82rem; font-weight: 600;"
                            onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                            <i class="fas fa-reply"></i> Phản hồi
                        </button>
                    `}
                </td>
            `;

            // Event: Nút phản hồi mới (chưa reply)
            const replyBtn = tr.querySelector('.btn-reply-review');
            if (replyBtn) {
                replyBtn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const comment = e.currentTarget.getAttribute('data-comment');
                    this.showReplyModal(id, comment);
                });
            }

            // Event: Menu 3 chấm toggle
            const menuBtn = tr.querySelector('.btn-reply-menu');
            if (menuBtn) {
                menuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const rid = e.currentTarget.getAttribute('data-id');
                    // Đóng tất cả dropdown khác
                    document.querySelectorAll('.reply-dropdown').forEach(d => d.style.display = 'none');
                    const dropdown = tr.querySelector(`.reply-dropdown[data-dropdown-id="${rid}"]`);
                    if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                });
            }

            // Event: Chỉnh sửa phản hồi
            const editBtn = tr.querySelector('.btn-edit-reply');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const comment = e.currentTarget.getAttribute('data-comment');
                    const existingReply = e.currentTarget.getAttribute('data-reply');
                    document.querySelectorAll('.reply-dropdown').forEach(d => d.style.display = 'none');
                    this.showReplyModal(id, comment, existingReply);
                });
            }

            // Event: Xóa phản hồi


            tableBody.appendChild(tr);
        });

        // Add event listener for refresh button
        const refreshBtn = document.getElementById("refreshReviewsBtn");
        if (refreshBtn && !refreshBtn.dataset.bound) {
            refreshBtn.addEventListener('click', () => this.loadAdminReviews());
            refreshBtn.dataset.bound = true;
        }
    }

    showReplyModal(reviewId, comment, existingReply = '') {
        const modal = document.getElementById('replyReviewModal');
        if (!modal) return;
        const isEdit = !!existingReply;

        document.getElementById('replyReviewId').value = reviewId;
        document.getElementById('replyCustomerComment').textContent = `"${comment}"`;
        document.getElementById('adminReplyText').value = existingReply;

        // Cập nhật tiêu đề modal
        const modalTitle = modal.querySelector('.modal-content h3');
        if (modalTitle) {
            modalTitle.innerHTML = isEdit ?
                '<i class="fas fa-pen" style="color:#f15a24;"></i> Chỉnh sửa phản hồi' :
                '<i class="fas fa-reply" style="color:#f15a24;"></i> Phản hồi đánh giá';
        }

        const form = document.getElementById('replyReviewForm');
        // Remove old event listener
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Cập nhật nút submit
        const btnSubmit = newForm.querySelector('button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.innerHTML = isEdit ?
                '<i class="fas fa-save"></i> Lưu thay đổi' :
                '<i class="fas fa-paper-plane"></i> Gửi phản hồi';
        }

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const originalHtml = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
            btnSubmit.disabled = true;

            try {
                const rId = document.getElementById('replyReviewId').value;
                const replyText = document.getElementById('adminReplyText').value;
                await this.api.replyReview(rId, replyText);
                modal.style.display = 'none';
                this.showToast(isEdit ? "Cập nhật phản hồi thành công!" : "Gửi phản hồi thành công!", 'success');
                this.loadAdminReviews();
            } catch (err) {
                this.showToast("Lỗi khi gửi phản hồi, vui lòng thử lại.", 'error');
            } finally {
                btnSubmit.innerHTML = originalHtml;
                btnSubmit.disabled = false;
            }
        });

        modal.style.display = 'flex';
    }

    // 10. Cấu hình Chart.js
    renderChart(labels, data, period) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;

        if (this.revenueChartInstance) {
            this.revenueChartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(255, 140, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(212, 160, 23, 0.2)');

        let titleText = 'Biểu đồ doanh thu';
        if (period === 'week') titleText += ' (Tuần này)';
        if (period === 'month') titleText += ' (Tháng này)';
        if (period === 'year') titleText += ' (Năm nay)';

        this.revenueChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Doanh thu (VND)',
                    data: data,
                    backgroundColor: gradient,
                    borderColor: '#FF8C00',
                    borderWidth: 2,
                    borderRadius: 6,
                    hoverBackgroundColor: '#D4A017'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: titleText,
                        font: {
                            size: 16,
                            family: "'Segoe UI', Roboto, sans-serif"
                        },
                        color: '#4a3f35'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            borderDash: [5, 5],
                            color: '#f1e5d1'
                        },
                        ticks: {
                            callback: (value) => {
                                return value.toLocaleString('vi-VN') + ' ₫';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // --- CÁC HÀM TIỆN ÍCH (UTILITIES) ---
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    }
}

// Khởi chạy ứng dụng khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();

    // Đóng dropdown menu phản hồi khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-reply-menu') && !e.target.closest('.reply-dropdown')) {
            document.querySelectorAll('.reply-dropdown').forEach(d => d.style.display = 'none');
        }
    });
});
