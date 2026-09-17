// 1. ดึงรหัสออเดอร์ให้รองรับทั้ง ?id= และ ?order_id=
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get("id") || urlParams.get("order_id");

let uploadedPackingPhotos = [];
let uploadedPaymentSlip = null;
let isTaskCompletedOrCancelled = false;




// ตัวอย่างโค้ดที่แก้ไขให้ดึงชื่อและแผนกได้อย่างแม่นยำขึ้น
document.addEventListener("DOMContentLoaded", () => {
  // 1. ดึงข้อมูลผู้ใช้จาก localStorage (รองรับหลากหลายรูปแบบคีย์ที่ระบบอื่นชอบใช้)
  let userFullName = "ไม่ระบุชื่อ";
  let userDept = "Warehouse";

  // เช็คจากก้อน JSON "user" เดิม
  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  if (loggedInUser.fullname) userFullName = loggedInUser.fullname;
  else if (loggedInUser.name) userFullName = loggedInUser.name;
  else if (loggedInUser.username) userFullName = loggedInUser.username;

  if (loggedInUser.department) userDept = loggedInUser.department;

  // เผื่อระบบของคุณเก็บบันทึกแยก key เดี่ยวๆ (เช่น localStorage.getItem('name'))
  const singleName = localStorage.getItem("name") || localStorage.getItem("fullname") || localStorage.getItem("username");
  const singleDept = localStorage.getItem("department") || localStorage.getItem("dept");

  if (singleName) userFullName = singleName;
  if (singleDept) userDept = singleDept;

  // 2. นำไปแสดงผลลงใน HTML ที่เราเพิ่งสร้างเพิ่ม
  const nameEl = document.getElementById("current-fulfiller-name");
  const deptEl = document.getElementById("current-fulfiller-dept");

  if (nameEl) nameEl.innerText = userFullName;
  if (deptEl) deptEl.innerText = userDept;

  // 3. เรียกใช้งานโหลดข้อมูลออเดอร์ต่อทันที
  loadFulfillData();
});
async function loadFulfillData() {
  if (!orderId) {
    alert("ไม่พบรหัสออเดอร์");
    window.location.href = "order.html";
    return;
  }

  try {
    const response = await fetch(`/api/orders`);
    const orders = await response.json();
    const order = orders.find((o) => o.id == orderId);

    if (!order) {
      alert("ไม่พบข้อมูลออเดอร์นี้ในระบบ");
      return;
    }

    document.getElementById("order-title").innerText =
      `จัดการออเดอร์ #ORD-${order.id}`;
    document.getElementById("order-dept").innerText =
      `แผนก: ${order.department || "-"}`;

    if (order.quotation_image) {
      document.getElementById("quotation-img").src = order.quotation_image;
    }
    if (order.delivery_image) {
      document.getElementById("delivery-img").src = order.delivery_image;
    }

    const checkContainer = document.getElementById("checklist-container");
    checkContainer.innerHTML = "";
    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        checkContainer.innerHTML += `
              <div class="checklist-item">
                <label>
                  <input type="checkbox" class="item-check" data-item-id="${item.id}">
                  <span><b>${item.product_name}</b> (${item.category || "-"})</span>
                </label>
                <span class="item-qty">${item.quantity_taken} ชิ้น</span>
              </div>
            `;
      });
    } else {
      checkContainer.innerHTML =
        '<div style="color: var(--ink-faint); font-size: 13px;">ไม่มีรายการสินค้าในบิลนี้</div>';
    }
  } catch (err) {
    console.error("Error loading fulfill data:", err);
  }
}

function handleVehicleChange() {
  const vehicleSelect = document.getElementById("vehicle-select").value;
  const slipSection = document.getElementById("payment-slip-section");

  if (vehicleSelect === "pickup-self") {
    slipSection.style.display = "block";
  } else {
    slipSection.style.display = "none";
  }
}

function handleSlipUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    uploadedPaymentSlip = { file: file, url: e.target.result };
    document.getElementById("slip-img-preview").src = e.target.result;
    document.getElementById("slip-preview-box").style.display = "flex";
    document.getElementById("slip-add-btn").style.display = "none";
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

function removeSlip() {
  uploadedPaymentSlip = null;
  document.getElementById("slip-img-preview").src = "";
  document.getElementById("slip-preview-box").style.display = "none";
  document.getElementById("slip-add-btn").style.display = "flex";
  document.getElementById("payment-slip-input").value = "";
}

function openImageModal(imgSrc, captionText) {
  if (!imgSrc || imgSrc.includes("placehold.co")) return;
  document.getElementById("modal-zoomed-img").src = imgSrc;
  document.getElementById("modal-image-caption").innerText = captionText;
  document.getElementById("imageModal").style.display = "flex";
}

function closeImageModal() {
  document.getElementById("imageModal").style.display = "none";
}

function handlePhotoUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      uploadedPackingPhotos.push({ file: file, url: e.target.result });
      renderPhotoGrid();
    };
    reader.readAsDataURL(file);
  });
  event.target.value = "";
}

function removePhoto(index) {
  uploadedPackingPhotos.splice(index, 1);
  renderPhotoGrid();
}

function renderPhotoGrid() {
  const gridContainer = document.getElementById("photo-preview-grid");
  let html = `
        <div class="photo-add-card" onclick="document.getElementById('packing-photos-input').click()">
          <i class="fa-solid fa-camera"></i>
          <span>เพิ่มรูปภาพ</span>
        </div>
      `;
  uploadedPackingPhotos.forEach((photo, index) => {
    html += `
          <div class="photo-preview-card">
            <img src="${photo.url}" alt="Packing Photo" onclick="openImageModal('${photo.url}', 'รูปภาพการจัดเตรียมสินค้า รูปที่ ${index + 1}')">
            <button type="button" class="photo-remove-btn" onclick="event.stopPropagation(); removePhoto(${index})">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        `;
  });
  gridContainer.innerHTML = html;
}

function setCustomerPickup() {
  const vehicleSelect = document.getElementById("vehicle-select");
  vehicleSelect.value = "pickup-self";
  handleVehicleChange();

  const commentBox = document.getElementById("work-comment");
  if (!commentBox.value.trim()) {
    commentBox.value = "ลูกค้านัดมารับสินค้าเองที่หน้าร้าน";
  }
  alert(
    "ตั้งค่าเป็น 'ลูกค้ามารับเอง' เรียบร้อยแล้ว กรุณาแนบหลักฐานการชำระเงินด้านล่าง",
  );
}

async function viewOrderDetails() {
  if (!orderId) {
    alert("ไม่พบรหัสออเดอร์สำหรับดูรายละเอียด");
    return;
  }
  try {
    const response = await fetch(`/api/orders`);
    const orders = await response.json();
    const order = orders.find((o) => o.id == orderId);

    if (!order) {
      alert("ไม่พบข้อมูลออเดอร์ในระบบ");
      return;
    }

    document.getElementById("modal-order-id").innerText = order.id;
    document.getElementById("modal-emp-id").innerText =
      order.employee_id || "-";
    document.getElementById("modal-emp-name").innerText =
      order.employee_name || "-";
    document.getElementById("modal-dept").innerText = order.department || "-";
    document.getElementById("modal-comment").innerText =
      order.suggestions || "-";
    document.getElementById("modal-date").innerText = order.created_at || "-";

    const itemsListContainer = document.getElementById("modal-items-list");
    itemsListContainer.innerHTML = "";
    if (order.items && order.items.length > 0) {
      order.items.forEach((item) => {
        itemsListContainer.innerHTML += `<div style="margin-bottom: 4px;">• ${item.product_name} <b>${item.quantity_taken} ชิ้น</b></div>`;
      });
    } else {
      itemsListContainer.innerHTML =
        '<div style="color: var(--ink-faint);">ไม่มีรายการสินค้า</div>';
    }
    document.getElementById("orderDetailModal").style.display = "flex";
  } catch (err) {
    console.error("Error loading order details:", err);
  }
}

function closeModal() {
  document.getElementById("orderDetailModal").style.display = "none";
}

async function cancelWorkflow() {
  if (confirm("คุณต้องการยกเลิกและคืนงานกลับสู่หน้าคิวออเดอร์หลักหรือไม่?")) {
    isTaskCompletedOrCancelled = true;
    clearHeartbeat();

    try {
      const response = await fetch("/api/orders/cancel-fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const result = await response.json();
      if (!result.success) {
        alert("แจ้งเตือนจากระบบ: " + (result.error || "ไม่สามารถคืนงานได้"));
      }
    } catch (e) {
      console.error("API Error:", e);
    }

    window.location.href = "order.html";
  }
}

// 2. ฟังก์ชันบันทึกงานตัวจริง (รวมการเช็ก checklist, ยานพาหนะ และส่ง API เรียบร้อย)
// ค้นหาฟังก์ชัน saveWorkflow() เดิม แล้วแทนที่ด้วยชุดนี้ครับ
async function saveWorkflow() {
  if (!orderId) {
    alert("ไม่พบรหัสออเดอร์สำหรับบันทึกข้อมูล");
    return;
  }

  const checkboxes = document.querySelectorAll(".item-check");
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);

  if (
    !allChecked &&
    !confirm(
      "ยังมีสินค้าบางรายการที่ยังไม่ได้ติ๊กตรวจสอบ ยืนยันการบันทึกงานใช่หรือไม่?",
    )
  ) {
    return;
  }

  const vehicleSelection = document.getElementById("vehicle-select").value;
  if (!vehicleSelection) {
    alert("กรุณาเลือกรถขนส่งหรือระบุประเภทการรับสินค้าก่อนบันทึกงาน");
    return;
  }

  if (vehicleSelection === "pickup-self" && !uploadedPaymentSlip) {
    alert(
      "กรุณาแนบหลักฐานการชำระเงิน (สลิปโอนเงิน) เนื่องจากเลือกลูกค้ามารับเองที่หน้าร้าน",
    );
    return;
  }

  const workComment = document.getElementById("work-comment").value;

  // [เพิ่มใหม่] ดึงข้อมูลชื่อและแผนกจากหน้าจอที่แสดงอยู่ตอนนี้
  const currentFullname = document.getElementById("current-fulfiller-name")?.innerText || "";
  const currentDept = document.getElementById("current-fulfiller-dept")?.innerText || "";

  try {
    const formData = new FormData();
    formData.append("vehicle_selection", vehicleSelection);
    formData.append("work_comment", workComment);
    formData.append("status", "completed");
    
    // [เพิ่มใหม่] แนบชื่อและแผนกส่งไปกับ Request
    formData.append("fullname", currentFullname !== "กำลังโหลดชื่อ..." ? currentFullname : "");
    formData.append("department", currentDept !== "-" ? currentDept : "");

    uploadedPackingPhotos.forEach((photo) => {
      formData.append("packing_photos", photo.file);
    });

    if (uploadedPaymentSlip) {
      formData.append("payment_slip", uploadedPaymentSlip.file);
    }

    const response = await fetch(`/api/orders/fulfillment/${orderId}`, {
      method: "PUT",
      body: formData,
    });

    const result = await response.json();
    if (response.ok) {
      isTaskCompletedOrCancelled = true;
      clearHeartbeat();
      alert("บันทึกงานเสร็จสิ้นเรียบร้อยแล้ว!");
      window.location.href = "order.html";
    } else {
      alert("เกิดข้อผิดพลาด: " + (result.error || "ไม่สามารถบันทึกได้"));
    }
  } catch (err) {
    console.error("Error saving workflow:", err);
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
  }
}
window.addEventListener("beforeunload", function (e) {
  if (isTaskCompletedOrCancelled) return;
  e.preventDefault();
  e.returnValue = "";
});

const heartbeatInterval = setInterval(() => {
  if (orderId && !isTaskCompletedOrCancelled) {
    const data = JSON.stringify({ order_id: orderId });
    const blob = new Blob([data], { type: "application/json" });
    navigator.sendBeacon("/api/orders/heartbeat", blob);
  }
}, 15000);

function clearHeartbeat() {
  clearInterval(heartbeatInterval);
}

window.addEventListener("DOMContentLoaded", loadFulfillData);
