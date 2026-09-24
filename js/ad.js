// โหลดข้อมูลผู้ใช้เมื่อเปิดหน้าเว็บ หรือสลับมาที่แท็บ users
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded - กำลังเรียกใช้งานฟังก์ชันเริ่มต้น");
  loadDashboardData();
  loadUsersData(); // โหลดรายชื่อผู้ใช้เตรียมไว้
});

// ดักฟังการสลับแท็บ เพื่อโหลดข้อมูลผู้ใช้เมื่อกดคลิกแท็บจัดการผู้ใช้
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
    loadUsersData(); // โหลดรายชื่อผู้ใช้ใหม่ทุกครั้งที่กดเข้าแท็บนี้
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
    document.getElementById("page-subheading").textContent =
      headings[tabId].sub;
  }
}

// -------------------------------------------------------------------------
// ระบบจัดการผู้ใช้งาน (Users Management)
// -------------------------------------------------------------------------

// 1. โหลดรายชื่อผู้ใช้จาก Backend (สมมติ Endpoint คือ /api/users)
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
    lucide.createIcons();
  } catch (err) {
    console.error("Error loading users:", err);
  }
}

// 2. เพิ่มผู้ใช้ใหม่ (ส่งข้อมูลไปยัง Backend /api/users)
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
      loadUsersData(); // โหลดตารางใหม่
    } else {
      const errData = await response.json();
      alert("เกิดข้อผิดพลาด: " + (errData.message || "ไม่สามารถบันทึกได้"));
    }
  } catch (error) {
    console.error("Error adding user:", error);
    alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์เพื่อบันทึกผู้ใช้ได้");
  }
}

// 3. เปิด Modal แก้ไขผู้ใช้งาน
function openEditUserModal(id, fullname, username, password, department) {
  document.getElementById("editUserId").value = id;
  document.getElementById("editFullname").value = fullname;
  document.getElementById("editUsername").value = username;
  document.getElementById("editPassword").value = password;
  document.getElementById("editDepartment").value = department;

  document.getElementById("editUserModal").classList.add("active");
  lucide.createIcons();
}

function closeEditUserModal() {
  document.getElementById("editUserModal").classList.remove("active");
}

// 4. บันทึกการแก้ไขผู้ใช้งาน (PUT /api/users/:id)
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

// 5. ลบผู้ใช้งาน (DELETE /api/users/:id)
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