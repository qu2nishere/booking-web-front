// Dữ liệu thành viên nhóm
const teamMembers = [
    {
        id: 1,
        fullName: "Nguyễn Quốc Khoa",
        studentId: "23110116",
        phone: "0379265076",
        email: "23110116@student.hcmute.edu.vn",
        dob: "18/06/2005",
        avatar: "https://res.cloudinary.com/df4ojgg7k/image/upload/v1775093845/bf6f809356d1d78f8ec0_qgqv4e.jpg",
        portfolioLink: "https://khoa18062005.github.io/Portfolio_NguyenQuocKhoa_FIT_HCMUTE/"
    },
    {
        id: 2,
        fullName: "Nguyễn Ngọc Thiện",
        studentId: "23110154",
        phone: "0866930448",
        email: "huyalex009@gmail.com",
        dob: "21/11/2005",
        avatar: "https://res.cloudinary.com/df4ojgg7k/image/upload/v1775094059/Screenshot_2026-04-02_084025_x2pn0j.png",
        portfolioLink: "https://thienfolio.onrender.com/"
    },
    {
        id: 3,
        fullName: "Nghiêm Phú Đăng Quân",
        studentId: "23110144",
        phone: "0374389294",
        email: "nghiemquan200@gmail.com",
        dob: "24/12/2005",
        avatar: "https://res.cloudinary.com/df4ojgg7k/image/upload/v1775094118/3563782641085889523_k79aly.jpg",
        portfolioLink: "https://resume-zoor.onrender.com/"
    }
];

// Render danh sách thành viên
function renderTeamMembers() {
    const teamGrid = document.getElementById('team-grid');
    if (!teamGrid) return;

    teamGrid.innerHTML = teamMembers.map(member => `
        <div class="team-card" data-id="${member.id}">
            <div class="card-avatar">
                <img src="${member.avatar}" alt="Avatar của ${member.fullName}">
            </div>
            <div class="card-info">
                <h3 class="member-name">${member.fullName}</h3>
                <p class="member-student-id"><strong>MSSV:</strong> ${member.studentId}</p>
                <p class="member-phone"><strong>Điện thoại:</strong> ${member.phone}</p>
                <p class="member-email"><strong>Email:</strong> ${member.email}</p>
                <p class="member-dob"><strong>Ngày sinh:</strong> ${member.dob}</p>
                <a href="${member.portfolioLink}" class="btn-portfolio">Xem Portfolio</a>
            </div>
        </div>
    `).join('');

    // Gắn sự kiện click cho toàn bộ card (tùy chọn, nếu muốn click vào card cũng chuyển trang)
    document.querySelectorAll('.team-card').forEach(card => {
        const btn = card.querySelector('.btn-portfolio');
        const link = btn.getAttribute('href');
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Tránh sự kiện nếu click vào nút (vì nút đã có link riêng)
            if (e.target === btn || btn.contains(e.target)) {
                return;
            }
            window.location.href = link;
        });
    });
}

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', () => {
    renderTeamMembers();
});
