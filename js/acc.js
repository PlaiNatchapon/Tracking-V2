     // เริ่มต้นใช้งาน Lucide Icons
      lucide.createIcons();

      let allOrders = []; // ตัวแปรเก็บข้อมูลออเดอร์ทั้งหมดเพื่อใช้กรองผ่านช่องค้นหา

      function handleLogout() {
        localStorage.clear();
        window.location.replace("login.html");
        if (window.history && window.history.pushState) {
          window.history.replaceState(null, null, "login.html");
        }
      }

      function handleLogout() {
  localStorage.clear();
  window.location.replace("login.html");
  if (window.history && window.history.pushState) {
    window.history.replaceState(null, null, "login.html");
  }
}

      // ฟังก์ชันสำหรับดึงข้อมูลออเดอร์ (เตรียมเชื่อมต่อหลังบ้าน)
      async function fetchAccountingOrders() {
        const container = document.getElementById("accountingOrderList");
        const badge = document.getElementById("orderCountBadge");

        try {
    

          allOrders = []; // ค่าจำลองเบื้องต้น

          renderOrders(allOrders);
        } catch (err) {
          console.error("Error fetching accounting orders:", err);
        }
      }

      // ฟังก์ชันเรนเดอร์รายการลงหน้าจอ
      function renderOrders(ordersToRender) {
        const container = document.getElementById("accountingOrderList");
        const badge = document.getElementById("orderCountBadge");

        badge.innerText = `${ordersToRender.length} รายการ`;

        if (ordersToRender.length === 0) {
          container.innerHTML = `
          <div class="empty-state">
            <i data-lucide="folder-search"></i>
            <p>ไม่พบรายการออเดอร์ที่ตรงกับการค้นหา หรือยังไม่มีรายการสลิปชำระเงิน</p>
          </div>
        `;
          lucide.createIcons();
          return;
        }

        container.innerHTML = ordersToRender
          .map(
            (order) => `
        <div class="order-item">
          <div class="order-details">
            <h3>ออเดอร์ #${order.id}</h3>
            <div class="order-meta">
              <span><i data-lucide="user" style="width: 14px; height: 14px;"></i> ผู้จัดส่ง: ${order.delivery_person_name || "ไม่ระบุ"}</span>
              <span><i data-lucide="calendar" style="width: 14px; height: 14px;"></i> วันที่บันทึก: ${new Date(order.created_at).toLocaleString("th-TH")}</span>
            </div>
          </div>
          <div class="order-actions">
            <button onclick="viewSlip('${order.payment_slip}')" class="btn-action btn-view-slip">
              <i data-lucide="image" style="width: 16px; height: 16px;"></i>
              ดูสลิป
            </button>
            <button onclick="verifyOrder(${order.id})" class="btn-action btn-verify">
              <i data-lucide="check-circle-2" style="width: 16px; height: 16px;"></i>
              ยืนยันการชำระเงิน
            </button>
          </div>
        </div>
      `,
          )
          .join("");

        lucide.createIcons();
      }

      // ฟังก์ชันกรองข้อมูลเมื่อพิมพ์ในช่องค้นหา
      function handleSearch(keyword) {
        const term = keyword.trim().toLowerCase();
        if (!term) {
          renderOrders(allOrders);
          return;
        }

        const filtered = allOrders.filter((order) => {
          const idMatch = String(order.id).includes(term);
          const nameMatch = (order.delivery_person_name || "")
            .toLowerCase()
            .includes(term);
          return idMatch || nameMatch;
        });

        renderOrders(filtered);
      }

      function viewSlip(url) {
        if (!url) {
          alert("ไม่พบไฟล์หลักฐานการชำระเงิน");
          return;
        }
        window.open(url, "_blank");
      }

      function verifyOrder(orderId) {
        if (
          confirm(
            `ต้องการยืนยันการชำระเงินสำหรับออเดอร์ #${orderId} ใช่หรือไม่?`,
          )
        ) {
          alert("บันทึกการตรวจสอบเรียบร้อย");
        }
      }

      document.addEventListener("DOMContentLoaded", () => {
        fetchAccountingOrders();
      });

      async function fetchAccountingOrders() {
        try {
          const response = await fetch("/api/accounting/orders"); // เปลี่ยน path ตามที่คุณ mount ใน server.js
          allOrders = await response.json();
          renderOrders(allOrders);
        } catch (err) {
          console.error("Error fetching accounting orders:", err);
        }
      }

      async function fetchAccountingOrders() {
        try {
          const response = await fetch("/api/accounting/orders"); // เปลี่ยน path ตามที่คุณ mount ใน server.js
          allOrders = await response.json();
          renderOrders(allOrders);
        } catch (err) {
          console.error("Error fetching accounting orders:", err);
        }
      }