function handleLogout() {
  localStorage.clear();
  window.location.replace("login.html");
  if (window.history && window.history.pushState) {
    window.history.replaceState(null, null, "login.html");
  }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchCheckerOrders();

    if (typeof io !== "undefined") {
        const socket = io();
        socket.on("orderUpdated", () => {
            fetchCheckerOrders();
        });
    }
});

// ฟังก์ชันดึงข้อมูลออเดอร์สำหรับ Checker
async function fetchCheckerOrders() {
    const orderListContainer = document.getElementById("order-list");
    orderListContainer.innerHTML = "<p style='text-align:center; color:#666;'>กำลังโหลดข้อมูลออเดอร์...</p>";

    try {
        const response = await fetch("http://localhost:3000/api/checker/orders");
        if (!response.ok) throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");

        const orders = await response.json();
        renderCheckerOrders(orders);
    } catch (err) {
        console.error("Error:", err);
        orderListContainer.innerHTML = `<p style="text-align:center; color:red;">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${err.message}</p>`;
    }
}

// ฟังก์ชันสร้าง HTML แสดงรายการออเดอร์ (แสดงเฉพาะเลขออเดอร์ และ รหัสรถ)
function renderCheckerOrders(orders) {
    const orderListContainer = document.getElementById("order-list");
    orderListContainer.innerHTML = "";

    if (orders.length === 0) {
        orderListContainer.innerHTML = "<p style='text-align:center; color:#888;'>ไม่มีออเดอร์ในระบบตอนนี้</p>";
        return;
    }

    orders.forEach(order => {
        const card = document.createElement("div");
        card.className = "order-card";
        card.style.cssText = "background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;";

        // ดึง vehicle_selection จากตาราง orders โดยตรง
        let vehicleCode = order.vehicle_selection || 'ยังไม่ระบุรหัสรถ';

        card.innerHTML = `
            <div>
                <h3 style="margin: 0 0 8px 0; color: #333;">ออเดอร์ #${order.id}</h3>
                <p style="margin: 0; font-size: 14px; color: #555;">
                    <strong>รหัสรถ:</strong> <span style="color: #2563eb; font-weight: 600;">${vehicleCode}</span>
                </p>
            </div>
            <div>
                <button onclick='openDetailModal(${JSON.stringify(order)})' style="background: #4f46e5; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
                    🔍 ดูรายละเอียดเชิงลึก
                </button>
            </div>
        `;

        orderListContainer.appendChild(card);
    });
}

// ฟังก์ชันเปิด Modal แสดงรายละเอียดเชิงลึก
function openDetailModal(order) {
    let modalBg = document.getElementById("orderDetailModal");
    if (!modalBg) {
        modalBg = document.createElement("div");
        modalBg.id = "orderDetailModal";
        modalBg.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;";
        document.body.appendChild(modalBg);
    }

    let photosHtml = '<p style="color:#888; font-size:13px;">ไม่มีรูปภาพสินค้าขึ้นรถ</p>';
    if (order.packing_photos && order.packing_photos.length > 0) {
        photosHtml = `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:5px;">
            ${order.packing_photos.map(p => `<img src="http://localhost:3000${p}" style="width:100px; height:100px; object-fit:cover; border-radius:4px; border:1px solid #ccc;">`).join('')}
        </div>`;
    }

    // ข้อมูลผู้ทำรายการก่อนหน้า (ชื่อ และ แผนก)
    let prevEmployeeName = order.employee_name || order.employee_id || 'ไม่ระบุชื่อ';
    let prevDepartment = order.department || 'Warehouse / ฝ่ายคลังสินค้า';
    let vehicleCode = order.vehicle_selection || 'ยังไม่ได้ระบุ';
    let warehouseComment = order.work_comment || 'ไม่มีหมายเหตุ';

    modalBg.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 8px; width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #1f2937; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">รายละเอียดเชิงลึก - ออเดอร์ #${order.id}</h3>
            
            <div style="font-size: 14px; color: #374151; line-height: 1.6; margin: 15px 0;">
                <p><strong>ผู้ทำรายการก่อนหน้า (คนแพ็ค):</strong> ${prevEmployeeName}</p>
                <p><strong>แผนก:</strong> ${prevDepartment}</p>
                <p><strong>รหัสรถ:</strong> ${vehicleCode}</p>
                <p><strong>หมายเหตุจากฝ่าย warehouse:</strong> ${warehouseComment}</p>
                <hr style="border:0; border-top:1px solid #eee; margin: 12px 0;">
                <p><strong>รูปภาพหลักฐานสินค้าขึ้นรถ:</strong></p>
                ${photosHtml}
            </div>

            <div style="text-align: right; margin-top: 20px;">
                <button onclick="document.getElementById('orderDetailModal').remove()" style="background: #9ca3af; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    ปิดหน้าต่าง
                </button>
            </div>
        </div>
    `;
    modalBg.style.display = "flex";
}