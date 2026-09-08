      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get("order_id");

      let uploadedPackingPhotos = [];

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
            document.getElementById("quotation-img").src =
              order.quotation_image;
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

      // ฟังก์ชันเปิด Modal ขยายรูปภาพ
      function openImageModal(imgSrc, captionText) {
        if (!imgSrc || imgSrc.includes("placehold.co")) return; // ถ้าไม่มีรูปจริงหรือเป็นภาพ Placeholder ไม่ต้องเปิด
        document.getElementById("modal-zoomed-img").src = imgSrc;
        document.getElementById("modal-image-caption").innerText = captionText;
        document.getElementById("imageModal").style.display = "flex";
      }

      // ฟังก์ชันปิด Modal ขยายรูปภาพ
      function closeImageModal() {
        document.getElementById("imageModal").style.display = "none";
      }

      function handlePhotoUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach((file) => {
          const reader = new FileReader();
          reader.onload = function (e) {
            uploadedPackingPhotos.push({
              file: file,
              url: e.target.result,
            });
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

        const commentBox = document.getElementById("work-comment");
        if (!commentBox.value.trim()) {
          commentBox.value = "ลูกค้านัดมารับสินค้าเองที่หน้าร้าน";
        }

        alert("ตั้งค่าเป็น 'ลูกค้ามารับเอง' เรียบร้อยแล้ว");
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
            order.employee_id || "2";
          document.getElementById("modal-emp-name").innerText =
            order.employee_name || "นายสมชาย ใจดี";
          document.getElementById("modal-dept").innerText =
            order.department || "sales";
          document.getElementById("modal-comment").innerText =
            order.comment || order.suggestion || "ฝากใส่ของลงลัง";
          document.getElementById("modal-date").innerText =
            order.created_at || "7/9/2569 22:14:43";

          const itemsListContainer =
            document.getElementById("modal-items-list");
          itemsListContainer.innerHTML = "";

          if (order.items && order.items.length > 0) {
            order.items.forEach((item) => {
              itemsListContainer.innerHTML += `<div style="margin-bottom: 4px;">• ${item.product_name} <b>${item.quantity_taken} ชิ้น</b></div>`;
            });
          } else {
            itemsListContainer.innerHTML = `
            <div style="margin-bottom: 4px;">• เหล็กฉาก 1.5*1.5 ฟ้า (เหล็กรูปพรรณชุบ) <b>1 ชิ้น</b></div>
            <div>• เหล็กกล่องชุบสังกะสี 1*1 ชมพู (เหล็กรูปพรรณชุบ) <b>3 ชิ้น</b></div>
          `;
          }

          document.getElementById("orderDetailModal").style.display = "flex";
        } catch (err) {
          console.error("Error loading order details:", err);
          document.getElementById("modal-order-id").innerText = orderId;
          document.getElementById("modal-emp-id").innerText = "2";
          document.getElementById("modal-emp-name").innerText = "นายสมชาย ใจดี";
          document.getElementById("modal-dept").innerText = "sales";
          document.getElementById("modal-comment").innerText = "ฝากใส่ของลงลัง";
          document.getElementById("modal-date").innerText = "7/9/2569 22:14:43";

          document.getElementById("modal-items-list").innerHTML = `
          <div style="margin-bottom: 4px;">• เหล็กฉาก 1.5*1.5 ฟ้า (เหล็กรูปพรรณชุบ) <b>1 ชิ้น</b></div>
          <div>• เหล็กกล่องชุบสังกะสี 1*1 ชมพู (เหล็กรูปพรรณชุบ) <b>3 ชิ้น</b></div>
        `;
          document.getElementById("orderDetailModal").style.display = "flex";
        }
      }

      function closeModal() {
        document.getElementById("orderDetailModal").style.display = "none";
      }

      function cancelWorkflow() {
        if (confirm("คุณต้องการยกเลิกและกลับสู่หน้าคิวออเดอร์หลักหรือไม่?")) {
          window.location.href = "order.html";
        }
      }

      function saveWorkflow() {
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

        const vehicle = document.getElementById("vehicle-select").value;
        if (!vehicle) {
          alert("กรุณาเลือกรถขนส่งหรือระบุประเภทการรับสินค้าก่อนบันทึกงาน");
          return;
        }

        alert("บันทึกข้อมูลการจัดงานเรียบร้อยแล้ว!");
        window.location.href = "order.html";
      }

      window.addEventListener("DOMContentLoaded", loadFulfillData);