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
    const socket = io(`http://${window.location.hostname}:3000`);
    socket.on("orderUpdated", () => {
      fetchCheckerOrders();
    });
  }
});

// ตัวแปรสำหรับเก็บไฟล์ภาพสินค้าที่ผู้ใช้งานเลือกสะสมไว้ และตัวแปรเก็บสถานะการล็อคปัจจุบัน
let accumulatedGoodsFiles = [];
let currentLockedOrderId = null;
let heartbeatInterval = null;

// ฟังก์ชันดึงข้อมูลออเดอร์สำหรับ Checker
async function fetchCheckerOrders() {
  const orderListContainer = document.getElementById("order-list");
  if (!orderListContainer) return;
  orderListContainer.innerHTML = "<p style='text-align:center; color:#666;'>กำลังโหลดข้อมูลออเดอร์...</p>";

  try {
    const apiUrl = `http://${window.location.hostname}:3000/api/checker/orders`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");

    const orders = await response.json();
    renderCheckerOrders(orders);
  } catch (err) {
    console.error("Error:", err);
    orderListContainer.innerHTML = `<p style="text-align:center; color:red;">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${err.message}</p>`;
  }
}

// ฟังก์ชันสร้าง HTML แสดงรายการออเดอร์ (เช็คปุ่มล็อคสถานะ)
function renderCheckerOrders(orders) {
  const orderListContainer = document.getElementById("order-list");
  if (!orderListContainer) return;
  orderListContainer.innerHTML = "";

  if (orders.length === 0) {
    orderListContainer.innerHTML = "<p style='text-align:center; color:#888;'>ไม่มีออเดอร์ในระบบตอนนี้</p>";
    return;
  }

  const currentFullName = localStorage.getItem("fullname") || localStorage.getItem("name") || localStorage.getItem("username") || "ไม่ระบุชื่อ";

  orders.forEach((order) => {
    const card = document.createElement("div");
    card.className = "order-card";
    card.style.cssText = "background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;";

    let vehicleCode = order.vehicle_selection || "ยังไม่ระบุรหัสรถ";
    let workerName = order.fulfiller_name || order.employee_name || order.employee_id || "ยังไม่มีผู้ดำเนินการ";
    let workerDept = order.fulfiller_dept || order.department || "Warehouse";

    // ตรวจสอบว่าออเดอร์นี้ถูกคนอื่นล็อคอยู่หรือไม่ (และยังไม่หมดอายุ 2 นาที)
    let isLockedByOther = false;
    if (order.locked_by && order.locked_by !== currentFullName && order.locked_at) {
      const lockTime = new Date(order.locked_at);
      const now = new Date();
      if ((now - lockTime) / 1000 / 60 < 2) {
        isLockedByOther = true;
      }
    }

    card.innerHTML = `
      <div>
        <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">ออเดอร์ #${order.id}</h3>
        <div style="margin: 0 0 6px 0; font-size: 14px; color: #4b5563; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span><strong>ผู้ทำรายการ:</strong> <span style="color: #111; font-weight: 500;">${workerName}</span></span>
          <span style="color: #cbd5e1;">|</span>
          <span><strong>แผนก:</strong> <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 13px; color: #374151;">${workerDept}</span></span>
        </div>
        <p style="margin: 0; font-size: 14px; color: #555;">
          <strong>รหัสรถ:</strong> <span style="color: #2563eb; font-weight: 600;">${vehicleCode}</span>
          ${isLockedByOther ? `<span style="margin-left: 10px; color: #dc2626; font-size: 13px; background: #fee2e2; padding: 2px 8px; border-radius: 4px;">กำลังถูกตรวจสอบโดย ${order.locked_by}</span>` : ''}
        </p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick='openDetailModal(${JSON.stringify(order)})' style="background: #4f46e5; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s;">
          <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          ดูรายละเอียด
        </button>
        <button onclick='tryOpenDispatchModal(${order.id}, ${JSON.stringify(order)})' style="background: ${isLockedByOther ? '#9ca3af' : '#10b981'}; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: ${isLockedByOther ? 'not-allowed' : 'pointer'}; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s;" ${isLockedByOther ? 'disabled' : ''}>
          <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m10 0a2 2 0 104 0"/></svg>
          ${isLockedByOther ? 'กำลังถูกใช้งาน' : 'ตรวจสอบและปล่อยรถ'}
        </button>
      </div>
    `;

    orderListContainer.appendChild(card);
  });
}

// ฟังก์ชันเปิด Modal ดูรายละเอียด
function openDetailModal(order) {
  let modalBg = document.getElementById("detailModal");
  if (!modalBg) {
    modalBg = document.createElement("div");
    modalBg.id = "detailModal";
    modalBg.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; backdrop-filter: blur(3px);";
    document.body.appendChild(modalBg);
  }

  let vehicleCode = order.vehicle_selection || "ยังไม่ระบุรหัสรถ";
  let workerName = order.fulfiller_name || order.employee_name || order.employee_id || "ยังไม่มีผู้ดำเนินการ";
  let workerDept = order.fulfiller_dept || order.department || "Warehouse";

  modalBg.innerHTML = `
    <div style="background: white; padding: 28px; border-radius: 12px; width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.15); font-family: 'Kanit', sans-serif;">
      <h3 style="margin-top: 0; color: #111827; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span>รายละเอียดออเดอร์</span>
        <span style="font-size: 13px; font-weight: normal; color: #4f46e5; background: #eef2ff; padding: 2px 10px; border-radius: 6px;">ออเดอร์ #${order.id}</span>
      </h3>
      
      <div style="font-size: 14px; color: #374151; line-height: 1.6; margin: 15px 0;">
        <div style="background: #f9fafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
          <p style="margin: 4px 0;"><strong>ผู้ทำรายการ:</strong> <span style="color: #111827; font-weight: 600;">${workerName}</span></p>
          <p style="margin: 4px 0;"><strong>แผนก:</strong> <span style="color: #4b5563; font-weight: 500;">${workerDept}</span></p>
          <p style="margin: 4px 0;"><strong>รหัสรถ:</strong> <span style="color: #2563eb; font-weight: 600;">${vehicleCode}</span></p>
        </div>

        <div style="background: #fff; padding: 10px 0;">
          <p style="margin: 6px 0;"><strong>สถานะ:</strong> <span style="color: #059669; font-weight: 500;">รอการตรวจสอบและปล่อยรถ</span></p>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        <button onclick="document.getElementById('detailModal').remove()" style="background: #4f46e5; color: white; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  `;
  modalBg.style.display = "flex";
}

// ฟังก์ชันก่อนเปิด Modal ปล่อยรถ: ทำการขอ Lock จาก Server ก่อน
async function tryOpenDispatchModal(orderId, order) {
  const currentFullName = localStorage.getItem("fullname") || localStorage.getItem("name") || localStorage.getItem("username") || "ไม่ระบุชื่อ";

  try {
    const apiUrl = `http://${window.location.hostname}:3000/api/checker/orders/${orderId}/lock`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkerName: currentFullName })
    });

    const result = await response.json();
    if (!response.ok) {
      alert("❌ " + (result.error || "ไม่สามารถล็อคออเดอร์นี้ได้"));
      fetchCheckerOrders(); 
      return;
    }

    currentLockedOrderId = orderId;
    startHeartbeat(orderId, currentFullName);
    openDispatchModal(order);
  } catch (err) {
    console.error("Error locking order:", err);
    alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
  }
}

// เริ่มต้นระบบ Heartbeat (ยิงต่ออายุทุกๆ 60 วินาที)
function startHeartbeat(orderId, checkerName) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  heartbeatInterval = setInterval(async () => {
    try {
      const apiUrl = `http://${window.location.hostname}:3000/api/checker/orders/${orderId}/heartbeat`;
      await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkerName })
      });
    } catch (err) {
      console.warn("Heartbeat failed:", err);
    }
  }, 60000);
}

// หยุดระบบ Heartbeat
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ฟังก์ชันปลดล็อคออเดอร์เมื่อกดยกเลิกหรือปิด Modal
async function unlockCurrentOrder() {
  if (!currentLockedOrderId) return;
  const currentFullName = localStorage.getItem("fullname") || localStorage.getItem("name") || localStorage.getItem("username") || "ไม่ระบุชื่อ";

  try {
    stopHeartbeat();
    const apiUrl = `http://${window.location.hostname}:3000/api/checker/orders/${currentLockedOrderId}/unlock`;
    await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkerName: currentFullName })
    });
  } catch (err) {
    console.error("Error unlocking:", err);
  } finally {
    currentLockedOrderId = null;
    fetchCheckerOrders();
  }
}

// ฟังก์ชันเปิด Modal สำหรับกรอกข้อมูลตรวจสอบและปล่อยรถ
function openDispatchModal(order) {
  accumulatedGoodsFiles = [];

  let modalBg = document.getElementById("dispatchModal");
  if (!modalBg) {
    modalBg = document.createElement("div");
    modalBg.id = "dispatchModal";
    modalBg.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; backdrop-filter: blur(3px);";
    document.body.appendChild(modalBg);
  }

  const currentFullName = localStorage.getItem("fullname") || localStorage.getItem("name") || localStorage.getItem("username") || order.fulfiller_name || "ไม่ระบุชื่อ";
  const currentUserDept = localStorage.getItem("department") || order.fulfiller_dept || order.department || "Checker / Warehouse";
  const vehicleCode = order.vehicle_selection || "ยังไม่ระบุรหัสรถ";

  const now = new Date();
  const currentTime = now.toTimeString().substring(0, 5);

  modalBg.innerHTML = `
    <div style="background: white; padding: 28px; border-radius: 12px; width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.15); font-family: 'Kanit', sans-serif;">
      <h3 style="margin-top: 0; color: #111827; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span>ตรวจสอบและปล่อยรถ</span>
        <span style="font-size: 13px; font-weight: normal; color: #4f46e5; background: #eef2ff; padding: 2px 10px; border-radius: 6px;">ออเดอร์ #${order.id}</span>
      </h3>
      
      <div style="font-size: 14px; color: #374151; line-height: 1.6; margin: 15px 0;">
        <div style="background: #f9fafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
          <p style="margin: 4px 0;"><strong>ชื่อ-นามสกุลผู้ตรวจสอบ:</strong> <span style="color: #111827; font-weight: 600;">${currentFullName}</span></p>
          <p style="margin: 4px 0;"><strong>แผนก:</strong> <span id="departmentInput" style="color: #4b5563; font-weight: 500;" data-value="${currentUserDept}">${currentUserDept}</span></p>
          <p style="margin: 4px 0;"><strong>รหัสรถ:</strong> <span id="vehicleSelect" style="color: #2563eb; font-weight: 600;" data-value="${vehicleCode}">${vehicleCode}</span></p>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 6px; font-size: 13px;">เวลาออกจากร้าน</label>
          <input type="time" id="departureTimeInput" value="${currentTime}" style="width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background: #fff;">
        </div>

        <!-- ช่องเลือกรูปภาพสินค้าบนรถ -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 6px; font-size: 13px;">ภาพหลักฐานสินค้าบนรถ (เลือกเพิ่มสะสมได้หลายครั้ง)</label>
          <div style="border: 1px solid #d1d5db; border-radius: 6px; padding: 14px; background: #fafafa;">
            <input type="file" id="goodsPhotos" multiple accept="image/*" style="display: none;" onchange="previewGoodsPhotos(this)">
            <label for="goodsPhotos" style="display: inline-flex; align-items: center; gap: 6px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
              <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              เลือกรูปภาพสินค้าเพิ่ม
            </label>
            <span id="goodsPhotosStatus" style="font-size: 13px; color: #6b7280; margin-left: 10px;">ยังไม่ได้เลือกไฟล์</span>
            
            <div id="goodsPhotosPreview" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;"></div>
          </div>
        </div>

        <!-- ช่องเลือกรูปบิลปล่อยรถ -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 6px; font-size: 13px;">รูปบิลปล่อยรถ</label>
          <div style="border: 1px solid #d1d5db; border-radius: 6px; padding: 14px; background: #fafafa;">
            <input type="file" id="dispatchBillInput" accept="image/*" style="display: none;" onchange="previewBillPhoto(this)">
            <label for="dispatchBillInput" style="display: inline-flex; align-items: center; gap: 6px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
              <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              เลือกรูปบิล
            </label>
            <span id="dispatchBillStatus" style="font-size: 13px; color: #6b7280; margin-left: 10px;">ยังไม่ได้เลือกไฟล์</span>
            
            <div id="dispatchBillPreview" style="margin-top: 10px;"></div>
          </div>
        </div>

        <!-- เพิ่มช่องหมายเหตุเพิ่มเติมถ้าจำเป็น -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 6px; font-size: 13px;">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
          <input type="text" id="workCommentInput" placeholder="ระบุหมายเหตุ..." style="width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background: #fff;">
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        <button onclick="handleCancelDispatch()" style="background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">
          ยกเลิก
        </button>
        <button onclick="submitDispatchOrder(event)" style="background: #10b981; color: white; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">
          บันทึกการปล่อยรถ
        </button>
      </div>
    </div>
  `;
  modalBg.style.display = "flex";
}
// ฟังก์ชันสำหรับกดยกเลิกใน Modal ปล่อยรถ (ปลดล็อคทันทีและปิดหน้าต่าง)
async function handleCancelDispatch() {
  await unlockCurrentOrder();
  const modal = document.getElementById("dispatchModal");
  if (modal) modal.remove();
}

// ฟังก์ชันพรีวิวภาพหลักฐานสินค้าบนรถแบบสะสมไฟล์ได้
function previewGoodsPhotos(input) {
  if (input.files && input.files.length > 0) {
    Array.from(input.files).forEach((file) => {
      accumulatedGoodsFiles.push(file);
    });
    input.value = ""; 
  }

  const statusEl = document.getElementById("goodsPhotosStatus");
  const previewContainer = document.getElementById("goodsPhotosPreview");
  if (!previewContainer) return;
  previewContainer.innerHTML = "";

  if (accumulatedGoodsFiles.length > 0) {
    if (statusEl) {
      statusEl.textContent = `เลือกแล้ว (${accumulatedGoodsFiles.length} รูป)`;
      statusEl.style.color = "#059669";
      statusEl.style.fontWeight = "500";
    }

    accumulatedGoodsFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const imgWrapper = document.createElement("div");
        imgWrapper.style.cssText = "position: relative; width: 64px; height: 64px; border-radius: 6px; overflow: hidden; border: 1px solid #d1d5db; background: #fff;";
        
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.cssText = "width: 100%; height: 100%; object-fit: cover; cursor: pointer;";
        img.title = "คลิกเพื่อดูรูปขนาดใหญ่";
        img.onclick = () => openImageLightbox(e.target.result);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.innerHTML = "✕";
        removeBtn.style.cssText = "position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;";
        removeBtn.onclick = (event) => {
          event.stopPropagation();
          accumulatedGoodsFiles.splice(index, 1);
          previewGoodsPhotos({ files: [] });
        };

        imgWrapper.appendChild(img);
        imgWrapper.appendChild(removeBtn);
        previewContainer.appendChild(imgWrapper);
      };
      reader.readAsDataURL(file);
    });
  } else {
    if (statusEl) {
      statusEl.textContent = "ยังไม่ได้เลือกไฟล์";
      statusEl.style.color = "#6b7280";
      statusEl.style.fontWeight = "normal";
    }
  }
}

// ฟังก์ชันพรีวิวรูปบิลปล่อยรถ
function previewBillPhoto(input) {
  const statusEl = document.getElementById("dispatchBillStatus");
  const previewContainer = document.getElementById("dispatchBillPreview");
  if (!previewContainer) return;
  previewContainer.innerHTML = "";

  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (statusEl) {
      statusEl.textContent = file.name;
      statusEl.style.color = "#059669";
      statusEl.style.fontWeight = "500";
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const imgWrapper = document.createElement("div");
      imgWrapper.style.cssText = "position: relative; width: 64px; height: 64px; border-radius: 6px; overflow: hidden; border: 1px solid #d1d5db; background: #fff;";
      
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.cssText = "width: 100%; height: 100%; object-fit: cover; cursor: pointer;";
      img.title = "คลิกเพื่อดูรูปขนาดใหญ่";
      img.onclick = () => openImageLightbox(e.target.result);

      imgWrapper.appendChild(img);
      previewContainer.appendChild(imgWrapper);
    };
    reader.readAsDataURL(file);
  } else {
    if (statusEl) {
      statusEl.textContent = "ยังไม่ได้เลือกไฟล์";
      statusEl.style.color = "#6b7280";
      statusEl.style.fontWeight = "normal";
    }
  }
}

// ฟังก์ชันเปิด Lightbox แสดงรูปภาพขนาดใหญ่
function openImageLightbox(imageSrc) {
  let lightbox = document.getElementById("imageLightboxModal");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "imageLightboxModal";
    lightbox.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 3000; cursor: pointer;";
    lightbox.onclick = () => lightbox.remove();
    document.body.appendChild(lightbox);
  }

  lightbox.innerHTML = `
    <div style="position: relative; max-width: 90%; max-height: 90%;" onclick="event.stopPropagation()">
      <img src="${imageSrc}" style="display: block; max-width: 100%; max-height: 85vh; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
      <button onclick="document.getElementById('imageLightboxModal').remove()" style="position: absolute; top: -12px; right: -12px; background: #fff; color: #111; border: none; border-radius: 50%; width: 32px; height: 32px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">✕</button>
    </div>
  `;
  lightbox.style.display = "flex";
}

// ฟังก์ชันสำหรับบันทึกการตรวจสอบและปล่อยรถ
async function submitDispatchOrder(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  // 1. ตรวจสอบว่ามีรหัสออเดอร์ที่กำลังล็อคอยู่ไหม
  if (!currentLockedOrderId) {
    alert("❌ ไม่พบรหัสออเดอร์ที่กำลังตรวจสอบ กรุณาลองใหม่อีกครั้ง");
    return;
  }

  // 2. ดึงชื่อผู้ตรวจสอบจาก LocalStorage
  const checkerName = localStorage.getItem("fullname") || 
                      localStorage.getItem("name") || 
                      localStorage.getItem("username") || "ไม่ระบุชื่อ";

  // 3. ดึงค่าจากฟอร์มใน Modal
  const departmentEl = document.getElementById("departmentInput");
  const department = departmentEl?.value || departmentEl?.getAttribute("data-value") || "Checker";

  const departureTime = document.getElementById("departureTimeInput")?.value || "";

  const vehicleEl = document.getElementById("vehicleSelect");
  const vehicleSelection = vehicleEl?.value || vehicleEl?.getAttribute("data-value") || "";

  const workComment = document.getElementById("workCommentInput")?.value || "";

  // 4. เตรียม FormData สำหรับส่งไฟล์และข้อมูล
  const formData = new FormData();
  formData.append("order_id", currentLockedOrderId);
  formData.append("checker_name", checkerName);
  formData.append("department", department);
  formData.append("departure_time", departureTime);
  formData.append("vehicle_selection", vehicleSelection);
  formData.append("work_comment", workComment);

  // แนบรูปสินค้าหลายรูปจากตัวแปรสะสม accumulatedGoodsFiles
  if (typeof accumulatedGoodsFiles !== "undefined" && accumulatedGoodsFiles.length > 0) {
    accumulatedGoodsFiles.forEach(file => {
      formData.append("goods_photos", file);
    });
  }

  // แนบรูปบิลปล่อยรถ
  const billInput = document.getElementById("dispatchBillInput");
  if (billInput && billInput.files[0]) {
    formData.append("dispatch_bill", billInput.files[0]);
  }

  try {
    const apiUrl = `http://${window.location.hostname}:3000/api/checker/dispatch`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData 
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("เซิร์ฟเวอร์ขัดข้องชั่วคราว (Internal Server Error 500)");
    }

    const result = await response.json();

    if (response.ok && result.success) {
      alert("✅ บันทึกข้อมูลการตรวจสอบและปล่อยรถสำเร็จ!");
      
      // ปิด Modal และเคลียร์สถานะ
      const modal = document.getElementById("dispatchModal");
      if (modal) modal.remove();

      if (typeof stopHeartbeat === "function") stopHeartbeat();
      
      // เก็บตัว ID ไว้ชั่วคราวก่อนเคลียร์ เพื่อใช้กรองซ่อนออกจากหน้าจอทันที (ถ้าต้องการความเร็วสูงสุด)
      currentLockedOrderId = null;
      accumulatedGoodsFiles = [];
      
      // 🔄 โหลดรายการออเดอร์ใหม่ทันที ออเดอร์ที่ถูกปล่อยรถจะหายไปจากหน้าจออัตโนมัติ
      if (typeof fetchCheckerOrders === "function") {
        fetchCheckerOrders();
      }
    } else {
      alert("❌ บันทึกไม่สำเร็จ: " + (result.error || "เกิดข้อผิดพลาด"));
    }
  } catch (err) {
    console.error("Error submitting dispatch:", err);
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + err.message);
  }
}
// ดักจับกรณีผู้ใช้ปิดแท็บหรือปิดหน้าเว็บกะทันหัน เพื่อปลดล็อคคืนระบบ
window.addEventListener("beforeunload", () => {
  if (currentLockedOrderId) {
    const currentFullName = localStorage.getItem("fullname") || localStorage.getItem("name") || localStorage.getItem("username") || "ไม่ระบุชื่อ";
    const apiUrl = `http://${window.location.hostname}:3000/api/checker/orders/${currentLockedOrderId}/unlock`;
    
    navigator.sendBeacon(apiUrl, JSON.stringify({ checkerName: currentFullName }));
  }
});