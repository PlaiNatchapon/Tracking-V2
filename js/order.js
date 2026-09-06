// ฟังก์ชันเปิด-ปิด ดูรายละเอียดออเดอร์
function toggleDetails(id) {
  const detailsEl = document.getElementById("details-" + id);
  detailsEl.classList.toggle("show");
}

// ฟังก์ชันจำลองการกดปุ่มรับ หรือ ยกเลิก
function handleAction(message) {
  alert("ดำเนินการ: " + message);
}

// ฟังก์ชันดึงข้อมูลออเดอร์จาก Backend มาแสดงผล
async function loadOrders() {
  try {
    const response = await fetch("/api/orders");
    const orders = await response.json();

    const orderListContainer = document.getElementById("order-list");
    orderListContainer.innerHTML = "";

    if (!orders || orders.length === 0) {
      orderListContainer.innerHTML =
        '<div style="text-align: center; color: var(--ink-faint); padding: 20px;">ไม่มีรายการออเดอร์ในขณะนี้</div>';
      return;
    }

    orders.forEach((order) => {
      const orderIdFormatted = `#ORD-${order.id}`;
      const totalItemsCount = order.items
        ? order.items.reduce(
            (sum, item) => sum + Number(item.quantity_taken || 0),
            0,
          )
        : 0;

      // สร้างรายการสินค้าด้านใน (แสดงข้อความชื่อสินค้าและจำนวน)
      let itemsHtml = "";
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          itemsHtml += `
                  <div class="item-row">
                    <span>${item.product_name} (${item.category || "-"})</span>
                    <span><b>${item.quantity_taken}</b> ชิ้น</span>
                  </div>
                `;
        });
      } else {
        itemsHtml =
          '<div style="font-size: 12px; color: var(--ink-faint);">ไม่มีรายการสินค้า</div>';
      }

      const orderItemEl = document.createElement("div");
      orderItemEl.className = "order-item";
      orderItemEl.innerHTML = `
              <div class="order-head">
                <span class="order-id">${orderIdFormatted}</span>
                <span class="status-badge pending">รอตรวจสอบ</span>
              </div>
              <div class="order-summary">
                คำสั่งซื้อจากแผนก ${order.department || "-"} (จำนวนรวม: ${totalItemsCount} ชิ้น)
              </div>

              <div class="order-details" id="details-${order.id}">
                <div class="detail-row">
                  <span class="detail-label">รหัสพนักงาน</span>
                  <span class="detail-value">${order.employee_id || "-"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">ผู้ทำรายการ</span>
                  <span class="detail-value">${order.employee_name || "-"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">แผนก</span>
                  <span class="detail-value">${order.department || "-"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">ข้อเสนอแนะ</span>
                  <span class="detail-value">${order.suggestions || "-"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">วันที่สร้างรายการ</span>
                  <span class="detail-value">${order.created_at ? new Date(order.created_at).toLocaleString("th-TH") : "-"}</span>
                </div>

                <div class="items-container">
                  <div class="detail-label" style="margin-bottom: 6px; font-weight: 600;">รายการสินค้าในบิล:</div>
                  ${itemsHtml}
                </div>
              </div>

              <div class="order-actions">
                <button class="btn btn-detail" onclick="toggleDetails(${order.id})">
                  ดูรายละเอียด
                </button>
                <button class="btn btn-accept" onclick="handleAction('รับออเดอร์ ${orderIdFormatted}')">
                  รับ
                </button>
                <button class="btn btn-cancel" onclick="handleAction('ยกเลิกออเดอร์ ${orderIdFormatted}')">
                  ยกเลิก
                </button>
              </div>
            `;

      orderListContainer.appendChild(orderItemEl);
    });
  } catch (err) {
    console.error("Error loading orders:", err);
    document.getElementById("order-list").innerHTML =
      '<div style="text-align: center; color: var(--danger); padding: 20px;">ไม่สามารถเชื่อมต่อเพื่อดึงข้อมูลออเดอร์ได้</div>';
  }
}

// โหลดข้อมูลออเดอร์ทันทีเมื่อเปิดหน้าเว็บ
window.addEventListener("DOMContentLoaded", loadOrders);

function handleLogout() {
  localStorage.clear();
  window.location.replace("login.html");
  if (window.history && window.history.pushState) {
    window.history.replaceState(null, null, "login.html");
  }
}
