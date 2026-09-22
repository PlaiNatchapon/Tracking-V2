console.log("=== acc.js ทำงานแล้วจ้า ===");

lucide.createIcons();
let allOrders = [];

function handleLogout() {
  localStorage.clear();
  window.location.replace("login.html");
  if (window.history && window.history.pushState) {
    window.history.replaceState(null, null, "login.html");
  }
}

async function fetchAccountingOrders() {
  console.log("กำลังยิง API ไปที่ /api/accounting/orders ...");
  try {
    const response = await fetch("/api/accounting/orders");
    console.log("สถานะ Response จากเซิร์ฟเวอร์:", response.status);

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    console.log("ข้อมูลที่ได้รับจากหลังบ้าน:", data);

    allOrders = Array.isArray(data) ? data : [];
    renderOrders(allOrders);
  } catch (err) {
    console.error("เกิดข้อผิดพลาดตอนดึงข้อมูล:", err);
    document.getElementById("accountingOrderList").innerHTML = `
      <div class="empty-state">
        <p style="color: var(--danger);">ไม่สามารถดึงข้อมูลได้: ${err.message}</p>
      </div>
    `;
  }
}

function renderOrders(ordersToRender) {
  const container = document.getElementById("accountingOrderList");
  const badge = document.getElementById("orderCountBadge");

  if (!container || !badge) return;

  badge.innerText = `${ordersToRender.length} รายการ`;

  if (ordersToRender.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="folder-search" style="width: 48px; height: 48px; margin-bottom: 12px;"></i>
        <p>ไม่พบรายการออเดอร์ที่มีหลักฐานการชำระเงินรอตรวจสอบในขณะนี้</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = ordersToRender
    .map((order) => {
      let vehicleDisplay = order.vehicle_selection;
      let iconName = "car";
      let labelText = "รหัสรถ";

      if (!vehicleDisplay) {
        vehicleDisplay = "ไม่ระบุ";
      } else if (
        vehicleDisplay === "pickup-self" ||
        vehicleDisplay.toLowerCase().includes("pickup")
      ) {
        vehicleDisplay = "มารับเองที่ร้าน (Self-Pickup)";
        iconName = "store";
        labelText = "วิธีรับสินค้า";
      }

      // 🛠️ ดึงเฉพาะชื่อไฟล์เพียวๆ แล้วส่งให้ API กลางช่วยวิ่งหาจากทุกโฟลเดอร์อัตโนมัติ
      let slipPath = "";
      if (order.payment_slip) {
        let rawSlip = order.payment_slip.trim();
        let filename = rawSlip.split("/").pop(); // ตัด path ออก เอาเฉพาะชื่อไฟล์ เช่น 1790065721121-501003731.png
        if (!filename.includes(".")) {
          filename += ".png";
        }
        slipPath = `/api/accounting/slip-image/${filename}`;
      }

      return `
      <div class="order-item">
        <div class="order-details">
          <h3>ออเดอร์ #${order.id || "-"}</h3>
          <div class="order-meta" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px; margin-top: 8px;">
            <span><i data-lucide="user-check" style="width: 14px; height: 14px;"></i> ผู้เปิดบิล: ${order.creator_name || "ไม่ระบุ"} (${order.creator_department || "ไม่ระบุแผนก"})</span>
            <span><i data-lucide="truck" style="width: 14px; height: 14px;"></i> ผู้จัดส่ง: ${order.delivery_person_name || "ไม่ระบุ"}</span>
            <span><i data-lucide="${iconName}" style="width: 14px; height: 14px;"></i> ${labelText}: ${vehicleDisplay}</span>
            <span><i data-lucide="calendar" style="width: 14px; height: 14px;"></i> วันที่: ${order.delivery_time ? new Date(order.delivery_time).toLocaleString("th-TH") : "-"}</span>
          </div>
        </div>
        <div class="order-actions">
          <button onclick="viewSlip('${slipPath}')" class="btn-action btn-view-slip">
            <i data-lucide="image" style="width: 15px; height: 15px;"></i> ดูสลิป
          </button>
          <button onclick="verifyOrder(${order.id})" class="btn-action btn-verify">
            <i data-lucide="check-circle-2" style="width: 15px; height: 15px;"></i> ยืนยันการชำระเงิน
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  lucide.createIcons();
}

function handleSearch(keyword) {
  const term = (keyword || "").trim().toLowerCase();
  if (!term) {
    renderOrders(allOrders);
    return;
  }
  const filtered = allOrders.filter((order) => {
    const idMatch = String(order.id || "").includes(term);
    const creatorMatch = (order.creator_name || "")
      .toLowerCase()
      .includes(term);
    const deliveryMatch = (order.delivery_person_name || "")
      .toLowerCase()
      .includes(term);
    const vehicleMatch = (order.vehicle_selection || "")
      .toLowerCase()
      .includes(term);
    return idMatch || creatorMatch || deliveryMatch || vehicleMatch;
  });
  renderOrders(filtered);
}

function viewSlip(url) {
  if (!url) {
    alert("ไม่พบไฟล์หลักฐานการชำระเงิน");
    return;
  }

  const existingModal = document.getElementById("slipModal");
  if (existingModal) existingModal.remove();

  const modalHTML = `
    <div id="slipModal" style="
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.75); display: flex; justify-content: center;
      align-items: center; z-index: 9999; backdrop-filter: blur(4px);
    ">
      <div style="
        position: relative; background: #fff; padding: 20px; border-radius: 12px;
        max-width: 90%; max-height: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        display: flex; flex-direction: column; align-items: center;
      ">
        <button onclick="closeSlipModal()" style="
          position: absolute; top: 10px; right: 10px; background: #ff4d4f;
          color: #fff; border: none; border-radius: 50%; width: 32px; height: 32px;
          font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        ">×</button>
        
        <h3 style="margin-top: 0; margin-bottom: 15px; font-family: 'Kanit', sans-serif; color: #333;">หลักฐานการชำระเงิน</h3>
        
        <div style="overflow: auto; max-width: 100%; max-height: 75vh;">
          <img src="${url}" alt="Payment Slip" style="max-width: 100%; height: auto; border-radius: 8px; display: block;" />
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  document.getElementById("slipModal").addEventListener("click", (e) => {
    if (e.target.id === "slipModal") {
      closeSlipModal();
    }
  });
}

function closeSlipModal() {
  const modal = document.getElementById("slipModal");
  if (modal) modal.remove();
}

async function verifyOrder(orderId) {
  if (
    confirm(`ต้องการยืนยันการชำระเงินสำหรับออเดอร์ #${orderId} ใช่หรือไม่?`)
  ) {
    try {
      const response = await fetch(`/api/accounting/orders/${orderId}/verify`, {
        method: "PUT",
      });
      const result = await response.json();
      if (response.ok) {
        alert("บันทึกการตรวจสอบเรียบร้อย");
        fetchAccountingOrders();
      } else {
        alert("เกิดข้อผิดพลาด: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error verifying order:", err);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded ทำงานแล้ว เรียกฟังก์ชันดึงข้อมูล...");
  fetchAccountingOrders();
});
