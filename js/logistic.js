let accumulatedGoodsFiles = []; // ตัวแปรเก็บไฟล์รูปภาพหลักฐานหน้างานหลายรูป

function handleLogout() {
  localStorage.clear();
  window.location.replace("login.html");
  if (window.history && window.history.pushState) {
    window.history.replaceState(null, null, "login.html");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 โหลดหน้า Logistic สำเร็จ กำลังดึงรายการออเดอร์จากตาราง order_checks...");
  fetchLogisticOrders();

  // เชื่อมต่อ Real-time ด้วย Socket.io
  if (typeof io !== "undefined") {
    const socket = io(`http://${window.location.hostname}:3000`);
    socket.on("orderUpdated", () => {
      console.log("🔄 ได้รับข้อมูลอัปเดตจากระบบ กำลังรีเฟรชรายการ...");
      fetchLogisticOrders();
    });
  }
});

// ฟังก์ชันดึงรายการออเดอร์จากตาราง order_checks มาแสดงให้ฝ่ายจัดส่ง
async function fetchLogisticOrders() {
  try {
    const response = await fetch(`http://${window.location.hostname}:3000/api/logistic/orders`);
    if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลออเดอร์ได้");

    const orders = await response.json();
    console.log("📦 ข้อมูลออเดอร์จาก order_checks:", orders);

    const orderListEl = document.getElementById("order-list");
    if (!orderListEl) return;

    if (orders.length === 0) {
      orderListEl.innerHTML = `<p style="text-align: center; color: #6b7280; padding: 40px 0;">ไม่มีรายการออเดอร์ที่ผ่านการตรวจเช็คในขณะนี้</p>`;
      return;
    }

    orderListEl.innerHTML = orders.map(order => `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="margin: 0 0 8px 0; color: #111827; font-size: 16px;">ออเดอร์ #${order.id}</h4>
          <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">ผู้ตรวจสอบ/แพ็ค: ${order.checker_name || 'ไม่ระบุ'}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">หมายเหตุเดิม: ${order.work_comment || 'ไม่มี'}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">วันที่สร้างออเดอร์: ${new Date(order.created_at).toLocaleString('th-TH')}</p>
        </div>
        <button onclick='openLogisticModal(${JSON.stringify(order)})' style="background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px;">
          รับงานจัดส่ง / บันทึกหน้างาน
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error fetching logistic orders:", err);
  }
}

// ฟังก์ชันเปิด Modal บันทึกผลหน้างาน
function openLogisticModal(order) {
  accumulatedGoodsFiles = [];

  let modalBg = document.getElementById("logisticModal");
  if (!modalBg) {
    modalBg = document.createElement("div");
    modalBg.id = "logisticModal";
    modalBg.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; backdrop-filter: blur(3px);";
    document.body.appendChild(modalBg);
  }

  const currentFullName = localStorage.getItem("fullname") || localStorage.getItem("name") || localStorage.getItem("username") || "ไม่ระบุชื่อ";
  const currentUserDept = localStorage.getItem("department") || "Logistic / Delivery";

  const now = new Date();
  const currentTime = now.toTimeString().substring(0, 5);

  modalBg.innerHTML = `
    <div style="background: white; padding: 28px; border-radius: 12px; width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.15); font-family: 'Kanit', sans-serif;">
      <h3 style="margin-top: 0; color: #111827; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span>บันทึกผลการจัดส่งหน้างาน</span>
        <span style="font-size: 13px; font-weight: normal; color: #2563eb; background: #eff6ff; padding: 2px 10px; border-radius: 6px;">ออเดอร์ #${order.id}</span>
      </h3>
      
      <div style="font-size: 14px; color: #374151; line-height: 1.6; margin: 15px 0;">
        <div style="background: #f9fafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
          <p style="margin: 4px 0;"><strong>ผู้จัดส่ง:</strong> <span style="color: #111827; font-weight: 600;">${currentFullName}</span></p>
          <p style="margin: 4px 0;"><strong>แผนก:</strong> <span id="departmentInput" style="color: #4b5563; font-weight: 500;" data-value="${currentUserDept}">${currentUserDept}</span></p>
        </div>

        <!-- เวลาถึงหน้างาน -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 6px; font-size: 13px;">เวลาถึงหน้างาน</label>
          <input type="time" id="arrivalTimeInput" value="${currentTime}" style="width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background: #fff;">
        </div>

        <!-- เวลาออกหน้างาน -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 6px; font-size: 13px;">เวลาออกหน้างาน</label>
          <input type="time" id="departureTimeInput" value="${currentTime}" style="width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background: #fff;">
        </div>

        <!-- ช่องเลือกรูปภาพหลักฐานหน้างาน (หลายรูป) -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 6px; font-size: 13px;">ภาพหลักฐานหน้างาน (เลือกสะสมได้หลายรูป)</label>
          <div style="border: 1px solid #d1d5db; border-radius: 6px; padding: 14px; background: #fafafa;">
            <input type="file" id="goodsPhotos" multiple accept="image/*" style="display: none;" onchange="previewGoodsPhotos(this)">
            <label for="goodsPhotos" style="display: inline-flex; align-items: center; gap: 6px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
              เลือกรูปภาพหลักฐานเพิ่ม
            </label>
            <span id="goodsPhotosStatus" style="font-size: 13px; color: #6b7280; margin-left: 10px;">ยังไม่ได้เลือกไฟล์</span>
            <div id="goodsPhotosPreview" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;"></div>
          </div>
        </div>

        <!-- หมายเหตุเพิ่มเติม -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 6px; font-size: 13px;">หมายเหตุเพิ่มเติมหน้างาน (ถ้ามี)</label>
          <input type="text" id="workCommentInput" placeholder="ระบุหมายเหตุ เช่น ส่งมอบเรียบร้อย..." style="width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; background: #fff;">
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        <button onclick="document.getElementById('logisticModal').remove();" style="background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">
          ยกเลิก
        </button>
        <button onclick="submitLogisticOrder(event, ${order.id})" style="background: #2563eb; color: white; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 13px;">
          บันทึกผลการจัดส่ง
        </button>
      </div>
    </div>
  `;
  modalBg.style.display = "flex";
}

// ฟังก์ชันพรีวิวรูปภาพหลักฐานหน้างานสะสม
function previewGoodsPhotos(input) {
  if (input.files) {
    Array.from(input.files).forEach(file => {
      accumulatedGoodsFiles.push(file);
    });

    const statusEl = document.getElementById("goodsPhotosStatus");
    if (statusEl) statusEl.innerText = `เลือกแล้ว ${accumulatedGoodsFiles.length} รูป`;

    const previewContainer = document.getElementById("goodsPhotosPreview");
    if (previewContainer) {
      previewContainer.innerHTML = "";
      accumulatedGoodsFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const wrapper = document.createElement("div");
          wrapper.style.cssText = "position: relative; width: 60px; height: 60px; border-radius: 4px; overflow: hidden; border: 1px solid #ddd;";
          wrapper.innerHTML = `
            <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
            <button type="button" onclick="removeGoodsPhoto(${index})" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
          `;
          previewContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
      });
    }
  }
}

function removeGoodsPhoto(index) {
  accumulatedGoodsFiles.splice(index, 1);
  const statusEl = document.getElementById("goodsPhotosStatus");
  if (statusEl) statusEl.innerText = accumulatedGoodsFiles.length > 0 ? `เลือกแล้ว ${accumulatedGoodsFiles.length} รูป` : "ยังไม่ได้เลือกไฟล์";
  
  const previewContainer = document.getElementById("goodsPhotosPreview");
  if (previewContainer) {
    previewContainer.innerHTML = "";
    accumulatedGoodsFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "position: relative; width: 60px; height: 60px; border-radius: 4px; overflow: hidden; border: 1px solid #ddd;";
        wrapper.innerHTML = `
          <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" onclick="removeGoodsPhoto(${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
        `;
        previewContainer.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    });
  }
}

// ฟังก์ชันส่งข้อมูลการจัดส่งไปยัง Backend
async function submitLogisticOrder(event, orderId) {
  if (event) event.preventDefault();

  const checkerName = localStorage.getItem("fullname") || localStorage.getItem("name") || localStorage.getItem("username") || "ไม่ระบุชื่อ";
  const department = document.getElementById("departmentInput")?.getAttribute("data-value") || "Logistic";
  const arrivalTime = document.getElementById("arrivalTimeInput")?.value || "";
  const departureTime = document.getElementById("departureTimeInput")?.value || "";
  const workComment = document.getElementById("workCommentInput")?.value || "";

  const formData = new FormData();
  formData.append("order_id", orderId);
  formData.append("checker_name", checkerName);
  formData.append("department", department);
  formData.append("arrival_time", arrivalTime);
  formData.append("departure_time", departureTime);
  formData.append("work_comment", workComment);

  if (accumulatedGoodsFiles.length > 0) {
    accumulatedGoodsFiles.forEach(file => {
      formData.append("goods_photos", file);
    });
  }

  try {
    const response = await fetch(`http://${window.location.hostname}:3000/api/logistic/submit`, {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    if (response.ok && result.success) {
      alert("✅ บันทึกข้อมูลการจัดส่งสำเร็จ!");
      document.getElementById("logisticModal")?.remove();
      fetchLogisticOrders();
    } else {
      alert("❌ บันทึกไม่สำเร็จ: " + (result.error || "เกิดข้อผิดพลาด"));
    }
  } catch (err) {
    console.error("Error submitting logistic order:", err);
    alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
  }
}