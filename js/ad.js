// เริ่มต้นเรนเดอร์ไอคอน Lucide ทั้งหมด
lucide.createIcons();

// โหลดข้อมูลอัตโนมัติเมื่อเปิดหน้าเว็บ
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Loaded - กำลังเรียกใช้งาน loadDashboardData()");
    loadDashboardData();
});

// ตรวจสอบและเชื่อมต่อ Socket.io (ใช้ตัวแปรส่วนกลาง หรือเชื่อมต่อใหม่โดยไม่ใช้คำสั่ง const ซ้ำ)
window.socket = window.socket || io();

window.socket.on("orderUpdated", (data) => {
    console.log("ได้รับข้อมูลอัปเดตแบบ Real-time:", data);
    loadDashboardData();
});

window.socket.on("newOrderAdmin", (data) => {
    console.log("มีออเดอร์ใหม่เข้ามาแบบ Real-time:", data);
    loadDashboardData();
});

function switchTab(tabId, buttonElement) {
    document.querySelectorAll(".tab-content").forEach((tab) => {
        tab.classList.remove("active");
    });
    document.querySelectorAll(".nav-item").forEach((btn) => {
        btn.classList.remove("active");
    });

    document.getElementById(tabId).classList.add("active");
    buttonElement.classList.add("active");

    const headings = {
        dashboard: {
            title: "ติดตามกิจกรรมและสถานะ",
            sub: "ภาพรวมการดำเนินงานและกิจกรรมล่าสุดในระบบแบบเรียลไทม์",
        },
        users: {
            title: "จัดการผู้ใช้งานระบบ",
            sub: "เพิ่มบัญชีผู้ใช้งาน และกำหนดสิทธิ์การเข้าถึงระบบ",
        },
        products: {
            title: "เพิ่มสินค้าเข้าระบบ",
            sub: "ลงทะเบียนสินค้าหรือวัตถุดิบใหม่เข้าสู่คลังสินค้า",
        },
        analytics: {
            title: "สถิติและประวัติออเดอร์",
            sub: "ตรวจสอบประวัติย้อนหลังและรายงานสรุปผลงาน",
        },
    };

    if (headings[tabId]) {
        document.getElementById("page-heading").textContent = headings[tabId].title;
        document.getElementById("page-subheading").textContent = headings[tabId].sub;
    }
}

function handleLogout() {
    localStorage.clear();
    window.location.replace("login.html");
}

function handleUserSubmit(event) {
    event.preventDefault();
    alert("บันทึกผู้ใช้งานใหม่เรียบร้อยแล้ว");
    event.target.reset();
}

function handleProductSubmit(event) {
    event.preventDefault();
    alert("เพิ่มสินค้าเข้าคลังเรียบร้อยแล้ว");
    event.target.reset();
}

// ฟังก์ชันเปิด Modal Timeline
function openTimelineModal(orderId, department, operator, vehicle, statusText) {
    document.getElementById("modalOrderTitle").textContent = `สถานะออเดอร์: #${orderId}`;
    document.getElementById("modalOrderSub").textContent = `ผู้ปฏิบัติงาน: ${operator} | รหัสรถ: ${vehicle}`;

    const timelineContainer = document.getElementById("timelineContent");
    
    timelineContainer.innerHTML = `
        <div class="timeline-item current">
            <div class="timeline-dot"></div>
            <div class="timeline-title">แผนกปัจจุบัน: ${department || 'ไม่ระบุ'}</div>
            <div class="timeline-desc">สถานะการดำเนินงาน: ${statusText || 'กำลังดำเนินการ'}</div>
            <div class="timeline-time">อัปเดตจากระบบปัจจุบัน</div>
        </div>
    `;

    document.getElementById("timelineModal").classList.add("active");
    lucide.createIcons();
}

// ปิด Modal
function closeTimelineModal() {
    document.getElementById("timelineModal").classList.remove("active");
}

// ฟังก์ชันโหลดข้อมูลจากหลังบ้าน
async function loadDashboardData() {
    console.log("กำลังเชื่อมต่อเพื่อดึงข้อมูลจาก API (/api/orders)...");
    try {
        const response = await fetch('/api/orders');
        console.log("สถานะ Response จากเซิร์ฟเวอร์:", response.status);
        
        const result = await response.json();
        console.log("ข้อมูล JSON ที่ได้รับ:", result);

        let ordersData = [];
        if (Array.isArray(result)) {
            ordersData = result;
        } else if (result.data && Array.isArray(result.data)) {
            ordersData = result.data;
        }

        const tbody = document.querySelector("#dashboard table tbody");
        if (!tbody) {
            console.warn("ไม่พบ Element tbody ในตาราง Dashboard");
            return;
        }

        if (ordersData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--ink-soft);">ยังไม่มีข้อมูลออเดอร์ในระบบฐานข้อมูล</td></tr>`;
            return;
        }

        let html = "";
        ordersData.forEach(order => {
            html += `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>${order.operator || '-'}</td>
                    <td>${order.department || '-'}</td>
                    <td>${order.vehicle || '-'}</td>
                    <td>
                        <span class="badge ${order.badgeClass || 'badge-warning'}">
                            <i data-lucide="${order.icon || 'clock'}" style="width: 12px"></i>
                            ${order.statusText || 'กำลังดำเนินการ'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="openTimelineModal('${order.id}', '${order.department}', '${order.operator}', '${order.vehicle}', '${order.statusText}')">
                            <i data-lucide="git-commit" style="width: 14px; height: 14px"></i>
                            <span>ดูขั้นตอน</span>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        lucide.createIcons();
        console.log("โหลดข้อมูลลงตารางสำเร็จเรียบร้อย");

    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการเชื่อมต่อ API:", err);
    }
}