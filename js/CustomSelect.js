// CustomSelect.js
// Xử lý Custom Select Dropdown & Flatpickr Datepicker

document.addEventListener("DOMContentLoaded", () => {
    initFlatpickr();
    initCustomSelects();
});

function initFlatpickr() {
    // Nếu có thư viện flatpickr, khởi tạo cho các thẻ input date
    if (typeof flatpickr !== 'undefined') {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            // Chuyển type thành text để tắt popup lịch mặc định của trình duyệt
            input.type = 'text';
            
            let fpInstance = flatpickr(input, {
                locale: "vn",
                dateFormat: "Y-m-d", // Giữ định dạng giống input date chuẩn để không lỗi logic code cũ
                altInput: true,
                altFormat: "d/m/Y", // Hiển thị định dạng VN đẹp mắt
                minDate: "today", // Không cho chọn ngày quá khứ
                disableMobile: "true" // Vô hiệu hóa lịch native trên mobile
            });
            
            // Xử lý bật/tắt khi click nhiều lần vào ô input
            if (fpInstance.altInput) {
                fpInstance.altInput.addEventListener('mousedown', function(e) {
                    if (fpInstance.isOpen) {
                        e.preventDefault();
                        e.stopPropagation();
                        fpInstance.close();
                        fpInstance.altInput.blur(); // Bỏ focus để click lần sau có thể mở lại bình thường
                    }
                });
            }

            // Đóng lịch khi người dùng cuộn trang (tránh hiện tượng lịch trôi nổi che giao diện)
            window.addEventListener('scroll', () => {
                if (fpInstance.isOpen) {
                    fpInstance.close();
                    if (fpInstance.altInput) fpInstance.altInput.blur();
                }
            }, { passive: true });
        });
    }
}

function initCustomSelects() {
    const selects = document.querySelectorAll('select.room-search-select');
    
    selects.forEach(select => {
        // Tránh khởi tạo 2 lần
        if (select.dataset.customized === 'true') return;
        select.dataset.customized = 'true';

        // Ẩn select gốc (thêm class để không hiển thị UI nhưng vẫn lấy được value khi querySelector)
        select.classList.add('room-search-select-hidden');
        
        // Tạo container bọc ngoài
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        
        // Tạo nút trigger hiển thị giá trị đang chọn
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        
        // Lấy tên class icon bên phải (ví dụ fas fa-chevron-down) nếu HTML gốc có
        // Trong room.html, thẻ <i> nằm kế thẻ select
        const iconRight = select.nextElementSibling;
        let iconHTML = '<i class="fas fa-chevron-down input-icon-right"></i>';
        if (iconRight && iconRight.tagName === 'I') {
            iconHTML = iconRight.outerHTML;
            iconRight.style.display = 'none'; // Ẩn icon gốc đi
        }

        const selectedOption = select.options[select.selectedIndex];
        trigger.innerHTML = `<span>${selectedOption.text}</span> ${iconHTML}`;
        
        // Tạo danh sách các options
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';
        
        Array.from(select.options).forEach(option => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-option';
            if (option.selected) {
                customOption.classList.add('selected');
            }
            customOption.dataset.value = option.value;
            customOption.textContent = option.text;
            
            // Xử lý sự kiện khi click vào một lựa chọn
            customOption.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện nổi bọt làm đóng wrapper ngay
                
                // Cập nhật text trên trigger
                trigger.querySelector('span').textContent = customOption.textContent;
                
                // Xóa class selected cũ, thêm vào cái mới
                optionsContainer.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                customOption.classList.add('selected');
                
                // CẬP NHẬT SELECT GỐC VÀ KÍCH HOẠT SỰ KIỆN CHANGE CHO JAVASCRIPT CŨ BẮT ĐƯỢC
                select.value = customOption.dataset.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Đóng dropdown
                wrapper.classList.remove('open');
            });
            
            optionsContainer.appendChild(customOption);
        });
        
        // Ghép nối DOM
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsContainer);
        
        // Chèn wrapper vào ngay sau select gốc
        select.parentNode.insertBefore(wrapper, select.nextSibling);
        
        // Xử lý sự kiện mở/đóng dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Đóng các dropdown khác đang mở
            document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });
    });

    // Đóng toàn bộ dropdown nếu click ra ngoài
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(wrapper => {
            wrapper.classList.remove('open');
        });
    });

    // Đóng toàn bộ dropdown khi cuộn trang
    window.addEventListener('scroll', () => {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(wrapper => {
            wrapper.classList.remove('open');
        });
    }, { passive: true });
}

