// =========================================================================
// เมื่อโหลดหน้าเว็บเสร็จ ให้เริ่มต้นทำงานทุกระบบพร้อมกันที่จุดเดียว
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded - กำลังเรียกใช้งานฟังก์ชันเริ่มต้นทั้งหมด");
  loadDashboardData(); // โหลดข้อมูลติดตามสถานะกิจกรรม
  if (typeof fetchMetrics === 'function') fetchMetrics(); // โหลดตัวเลขการ์ด Metric ทันที
  loadUsersData();     // โหลดรายชื่อผู้ใช้เตรียมไว้
  loadProducts();      // โหลดข้อมูลสินค้าในคลัง
});

// -------------------------------------------------------------------------
// ระบบสลับแท็บ (Tab Navigation)
// -------------------------------------------------------------------------
function switchTab(tabId, buttonElement) {
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.getElementById(tabId).classList.add("active");
  buttonElement.classList.add("active");

  if (tabId === "users") {
    loadUsersData();
  } else if (tabId === "dashboard") {
    loadDashboardData();
    if (typeof fetchMetrics === 'function') fetchMetrics();
  } else if (tabId === "products") {
    loadProducts();
  }

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

// -------------------------------------------------------------------------
// ระบบติดตามสถานะกิจกรรม (Dashboard Tracking)
// -------------------------------------------------------------------------
async function loadDashboardData() {
  try {
    const response = await fetch("/api/admin/orders");
    if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลแดชบอร์ดได้");

    const result = await response.json();
    const ordersData = result.data || [];

    const tbody = document.getElementById("dashboardTableBody");
    if (!tbody) return;

    if (ordersData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--ink-soft);">ยังไม่มีข้อมูลกิจกรรมในระบบ</td></tr>`;
      return;
    }

    let html = "";
    ordersData.forEach((item) => {
      let vehicleVal = item.vehicle_selection || item.vehicle || "";
      let rawStatus = item.statusText || item.status || "รอดำเนินการ";
      
      let statusText = "รอดำเนินการ";
      let bgColor = "#e0f2fe"; 
      let textColor = "#0369a1";
      let icon = "clock";

      if (
        item.status === "accounting_verified" || 
        item.status === "completed" || 
        item.status === "verified" ||
        rawStatus.includes("ยืนยันการชำระ") || 
        rawStatus.includes("เสร็จสิ้น") ||
        rawStatus.includes("accounting_verified")
      ) {
        statusText = "งานเสร็จสิ้น";
        bgColor = "#dcfce7";
        textColor = "#166534";
        icon = "check-circle-2";
      } else if (
        vehicleVal.toLowerCase().includes("pickup") || 
        vehicleVal === "pickup-self" ||
        item.status === "logistic_delivered" || 
        item.status === "delivered" || 
        rawStatus.includes("จัดส่ง") ||
        vehicleVal.toLowerCase().includes("logistic")
      ) {
        statusText = "รอฝ่ายบัญชีตรวจสอบครับ";
        bgColor = "#fef9c3";
        textColor = "#854d0e";
        icon = "clock";
      } else if (rawStatus.includes("ตรวจสอบ") || rawStatus.includes("ปล่อยรถ") || item.status === "checker_verified") {
        statusText = rawStatus.includes("ปล่อยรถ") ? "ปล่อยรถแล้ว" : "กำลังตรวจสอบ";
        bgColor = "#bae6fd";
        textColor = "#0369a1"; 
        icon = "truck";
      } else if (rawStatus.includes("แพ็ค") || rawStatus.includes("fulfillment") || item.status === "warehouse_packed") {
        statusText = "กำลังแพ็คสินค้า";
        bgColor = "#f3e8ff";
        textColor = "#6b21a8";
        icon = "package";
      } else {
        statusText = rawStatus;
        bgColor = "#e0f2fe";
        textColor = "#0369a1";
        icon = "clock";
      }

      html += `
        <tr>
          <td><strong>#${item.id}</strong></td>
          <td>${item.operator || item.employee_name || "-"}</td>
          <td><span class="badge badge-outline">${item.department || "-"}</span></td>
          <td>${vehicleVal}</td>
          <td>
            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; font-weight: 500; font-size: 13px; border-radius: 20px; background-color: ${bgColor}; color: ${textColor};">
              <i data-lucide="${icon}" style="width: 14px; height: 14px;"></i>
              ${statusText}
            </span>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    console.error("Error loading dashboard data:", err);
  }
}

// -------------------------------------------------------------------------
// ระบบจัดการผู้ใช้งาน (Users Management)
// -------------------------------------------------------------------------
async function loadUsersData() {
  try {
    const response = await fetch("/api/users");
    if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้งานได้");

    const result = await response.json();
    let usersData = Array.isArray(result) ? result : result.data || [];

    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    if (usersData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--ink-soft);">ยังไม่มีข้อมูลผู้ใช้งานในระบบ</td></tr>`;
      return;
    }

    let html = "";
    usersData.forEach((user) => {
      html += `
        <tr>
            <td><strong>#${user.id}</strong></td>
            <td>${user.fullname || user.name || "-"}</td>
            <td><code>${user.username}</code></td>
            <td><span style="background: #eee; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${user.password}</span></td>
            <td><span class="badge badge-warning">${user.department}</span></td>
            <td>
                <button class="btn btn-outline btn-sm" style="margin-right: 5px;" onclick="openEditUserModal('${user.id}', '${user.fullname || user.name || ""}', '${user.username}', '${user.password}', '${user.department}')">
                    <i data-lucide="edit" style="width: 14px; height: 14px"></i> แก้ไข
                </button>
                <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="deleteUser('${user.id}')">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px"></i> ลบ
                </button>
            </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    console.error("Error loading users:", err);
  }
}

async function handleUserSubmit(event) {
  event.preventDefault();
  const userData = {
    fullname: document.getElementById("newFullname").value,
    username: document.getElementById("newUsername").value,
    password: document.getElementById("newPassword").value,
    department: document.getElementById("newDepartment").value,
  };

  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (response.ok) {
      alert("บันทึกผู้ใช้งานใหม่เรียบร้อยแล้ว");
      event.target.reset();
      loadUsersData();
    } else {
      const errData = await response.json();
      alert("เกิดข้อผิดพลาด: " + (errData.message || "ไม่สามารถบันทึกได้"));
    }
  } catch (error) {
    console.error("Error adding user:", error);
    alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อบันทึกผู้ใช้ได้");
  }
}

function openEditUserModal(id, fullname, username, password, department) {
  document.getElementById("editUserId").value = id;
  document.getElementById("editFullname").value = fullname;
  document.getElementById("editUsername").value = username;
  document.getElementById("editPassword").value = password;
  document.getElementById("editDepartment").value = department;

  const modal = document.getElementById("editUserModal");
  if (modal) modal.classList.add("active");
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeEditUserModal() {
  const modal = document.getElementById("editUserModal");
  if (modal) modal.classList.remove("active");
}

async function handleEditUserSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("editUserId").value;
  const updatedData = {
    fullname: document.getElementById("editFullname").value,
    username: document.getElementById("editUsername").value,
    password: document.getElementById("editPassword").value,
    department: document.getElementById("editDepartment").value,
  };

  try {
    const response = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });

    if (response.ok) {
      alert("อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว");
      closeEditUserModal();
      loadUsersData();
    } else {
      alert("ไม่สามารถอัปเดตข้อมูลได้");
    }
  } catch (error) {
    console.error("Error updating user:", error);
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
  }
}

async function deleteUser(id) {
  if (!confirm("คุณต้องการลบบัญชีผู้ใช้นี้ใช่หรือไม่?")) return;

  try {
    const response = await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      alert("ลบผู้ใช้งานเรียบร้อยแล้ว");
      loadUsersData();
    } else {
      alert("ไม่สามารถลบผู้ใช้งานได้");
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
  }
}

function handleLogout() {
  localStorage.clear();
  window.location.replace("login.html");
  if (window.history && window.history.pushState) {
    window.history.replaceState(null, null, "login.html");
  }
}

// -------------------------------------------------------------------------
// Real-time Socket.io Listener
// -------------------------------------------------------------------------
if (typeof io !== 'undefined') {
  const socket = io();
  socket.on("orderUpdated", () => {
    console.log("🔄 ได้รับสัญญาณอัปเดตออเดอร์ กำลังรีเฟรชหน้าแดชบอร์ด...");
    loadDashboardData();
    if (typeof fetchMetrics === 'function') fetchMetrics();
  });
}


function handleReceiveReport() {
  // โค้ดในอนาคตสำหรับการกดรับรายงานจะใส่ไว้ที่นี่
  console.log("กำลังกดรับรายงาน...");
  alert("กดรับรายงานเรียบร้อยแล้ว!");
}