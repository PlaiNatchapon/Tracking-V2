
"use strict";

// ==========================================
// 1. แสดงวันที่เอกสารแบบไทย (พ.ศ.)
// ==========================================
(function setDocDate() {
  try {
    const el = document.getElementById("docDate");

    if (!el) return;

    const fmt = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    el.textContent = fmt.format(new Date());
  } catch (e) {
    console.error("ไม่สามารถแสดงวันที่เอกสารได้:", e);
  }
})();

// ==========================================
// 2. โหลดชื่อผู้ทำรายการและแผนก
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const savedName =
    localStorage.getItem("fullname") ||
    localStorage.getItem("name") ||
    "ผู้ใช้งานระบบ";

  const savedDept =
    localStorage.getItem("department") ||
    localStorage.getItem("dept") ||
    "-";

  const nameInput = document.getElementById("employeeName");
  const deptInput = document.getElementById("departmentName");

  if (nameInput) nameInput.value = savedName;
  if (deptInput) deptInput.value = savedDept;
});

// ==========================================
// 3. จัดการรายการสินค้า
// ==========================================
function updateLineNumbers() {
  document.querySelectorAll(".product-item").forEach((row, i) => {
    const label = row.querySelector(".line-no");

    if (label) {
      label.textContent = "รายการ " + String(i + 1).padStart(2, "0");
    }
  });
}

function removeRow(btn) {
  const rows = document.querySelectorAll(".product-item");

  if (rows.length <= 1) {
    alert("ต้องมีรายการสินค้าอย่างน้อย 1 รายการ");
    return;
  }

  const row = btn.closest(".product-item");

  if (row) {
    row.remove();
    updateLineNumbers();
  }
}

function cloneRow() {
  const list = document.getElementById("product-list");
  const firstItem = document.querySelector(".product-item");

  if (!list || !firstItem) {
    alert("ไม่พบส่วนรายการสินค้า");
    return;
  }

  const newItem = firstItem.cloneNode(true);

  const removeButton = newItem.querySelector(".remove-row-btn");

  if (removeButton) {
    removeButton.style.display = "flex";
  }

  const badge = newItem.querySelector(".stock-badge");

  if (badge) {
    badge.className = "stock-badge";
    badge.textContent = "พร้อมส่ง";
  }

  newItem.querySelectorAll("input").forEach((input) => {
    input.value = "";

    if (input.classList.contains("p-buy-qty")) {
      input.disabled = false;
      input.value = "1";
      input.style.backgroundColor = "";
      input.style.borderColor = "";
      input.title = "";
    }

    if (input.classList.contains("p-stock")) {
      input.value = "0";
    }
  });

  newItem.querySelectorAll(".autocomplete-items").forEach((el) => {
    el.remove();
  });

  list.appendChild(newItem);
  updateLineNumbers();
}

// ==========================================
// 4. แสดงตัวอย่างรูปภาพเอกสาร
// ใช้ได้กับ fileQuo, fileDel และ paymentSlip
// ==========================================
function previewImg(input, imgId, labelId) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];

  if (!file.type.startsWith("image/")) {
    alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
    input.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 10 MB");
    input.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const output = document.getElementById(imgId);
    const label = document.getElementById(labelId);

    if (output) {
      output.src = e.target.result;
      output.style.display = "block";
    }

    if (label) {
      label.style.display = "none";
    }
  };

  reader.onerror = function () {
    alert("ไม่สามารถอ่านไฟล์รูปภาพได้");
  };

  reader.readAsDataURL(file);
}

// ==========================================
// 5. ระบบค้นหาสินค้าอัตโนมัติ
// ==========================================
let searchTimeout;

function searchProduct(inputElement) {
  const row = inputElement.closest(".product-item");
  const term = inputElement.value.trim();

  closeAllLists();

  if (!term) return;

  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(async () => {
    try {
      const response = await fetch(
        `/api/products/search?q=${encodeURIComponent(term)}`
      );

      if (!response.ok) {
        throw new Error("ไม่สามารถค้นหาสินค้าได้");
      }

      const products = await response.json();

      if (products.length > 0) {
        showAutocompleteList(row, products);
      }
    } catch (err) {
      console.error("Error searching product:", err);
    }
  }, 300);
}

function showAutocompleteList(row, products) {
  const activeInput =
    row.querySelector(".p-code") ||
    row.querySelector(".p-name") ||
    row.querySelector("input");

  closeAllLists();

  const listContainer = document.createElement("div");
  listContainer.className = "autocomplete-items";

  listContainer.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    min-width: 300px;
    background: white;
    border: 1px solid #cbd5e1;
    z-index: 9999;
    max-height: 250px;
    overflow-y: auto;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    margin-top: 4px;
  `;

  products.forEach((p) => {
    const item = document.createElement("div");

    item.style.cssText = `
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13.5px;
      color: #1e293b;
    `;

    // ใช้ textContent ป้องกันข้อมูลสินค้าถูกแปลเป็น HTML
    const title = document.createElement("div");
    const code = document.createElement("b");

    code.textContent = p.product_code || "";
    title.appendChild(code);
    title.appendChild(
      document.createTextNode(" - " + (p.product_name || ""))
    );

    const stockText = document.createElement("span");

    stockText.style.cssText =
      "color:#64748b; float:right; font-size:12px;";

    stockText.textContent =
      "(คงเหลือ: " + (p.stock_remaining ?? 0) + ")";

    item.appendChild(title);
    item.appendChild(stockText);

    item.onmouseover = () => {
      item.style.backgroundColor = "#f8fafc";
    };

    item.onmouseout = () => {
      item.style.backgroundColor = "white";
    };

    item.addEventListener("click", () => {
      row.querySelector(".p-code").value = p.product_code || "";
      row.querySelector(".p-name").value = p.product_name || "";
      row.querySelector(".p-category").value = p.category_brand || "";
      row.querySelector(".p-desc").value = p.details || "";
      row.querySelector(".p-cost").value = p.cost_price || 0;
      row.querySelector(".p-sale").value = p.selling_price || 0;
      row.querySelector(".p-stock").value = p.stock_remaining || 0;

      const buyQtyInput = row.querySelector(".p-buy-qty");
      const stock = Number(p.stock_remaining) || 0;

      if (buyQtyInput) {
        if (stock <= 0) {
          buyQtyInput.value = "0";
          buyQtyInput.disabled = true;
          buyQtyInput.style.backgroundColor = "#fee2e2";
          buyQtyInput.style.borderColor = "#ef4444";
          buyQtyInput.title = "สินค้าหมดสต็อก";
        } else {
          buyQtyInput.disabled = false;
          buyQtyInput.value = "1";
          buyQtyInput.style.backgroundColor = "";
          buyQtyInput.style.borderColor = "";
          buyQtyInput.title = "";
        }
      }

      closeAllLists();
    });

    listContainer.appendChild(item);
  });

  const formGroup = activeInput.closest(".form-group");

  if (formGroup) {
    formGroup.style.position = "relative";
    formGroup.appendChild(listContainer);
  }
}

function closeAllLists() {
  document.querySelectorAll(".autocomplete-items").forEach((item) => {
    item.remove();
  });
}

document.addEventListener("click", function (e) {
  if (!e.target.closest(".form-group")) {
    closeAllLists();
  }
});

// ==========================================
// 6. ตรวจสอบจำนวนสต็อก
// ==========================================
function checkStock(input) {
  const row = input.closest(".product-item");

  if (!row) return;

  const stockQty =
    parseInt(row.querySelector(".p-stock")?.value, 10) || 0;

  const buyQty = parseInt(input.value, 10) || 0;

  if (buyQty > stockQty) {
    alert("จำนวนที่ระบุเกินสต็อกที่มี! คงเหลือ: " + stockQty);
    input.value = stockQty;
  }
}

// ==========================================
// 7. แปลงไฟล์รูปภาพเป็น Base64
// ใช้สำหรับใบเสนอราคาและใบส่งสินค้า
// ==========================================
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปภาพไม่สำเร็จ"));
  });
}

// ==========================================
// 8. บันทึกคำสั่งซื้อ
// รองรับสลิปชื่อ payment_slip
// ==========================================
let isSavingOrder = false;

async function saveOrder() {
  if (isSavingOrder) return;

  const saveButton = document.querySelector(".btn-save");

  try {
    isSavingOrder = true;

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.dataset.originalText = saveButton.textContent;
      saveButton.textContent = "กำลังบันทึก...";
    }

    const userId =
      localStorage.getItem("user_id") ||
      localStorage.getItem("userId");

    if (!userId) {
      alert("ไม่พบรหัสผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    const employeeName =
      document.getElementById("employeeName")?.value || "";

    const department =
      document.getElementById("departmentName")?.value || "";

    const suggestions =
      document.getElementById("additionalSuggestions")?.value || "";

    // ใบเสนอราคาเป็นเอกสารบังคับ
    const fileQuoInput = document.getElementById("fileQuo");

    if (!fileQuoInput?.files?.length) {
      alert("กรุณาแนบไฟล์ใบเสนอราคาก่อนบันทึก");
      return;
    }

    const quotationImage = await convertFileToBase64(
      fileQuoInput.files[0]
    );

    // ใบส่งสินค้าเป็นเอกสารไม่บังคับ
    let deliveryImage = null;

    const fileDelInput = document.getElementById("fileDel");

    if (fileDelInput?.files?.length) {
      deliveryImage = await convertFileToBase64(
        fileDelInput.files[0]
      );
    }

    // ตรวจสอบรายการสินค้า
    const productItems =
      document.querySelectorAll(".product-item");

    const items = [];

    for (const row of productItems) {
      const code =
        row.querySelector(".p-code")?.value.trim() || "";

      const name =
        row.querySelector(".p-name")?.value.trim() || "";

      const buyQty =
        parseInt(row.querySelector(".p-buy-qty")?.value, 10) || 0;

      const stock =
        parseInt(row.querySelector(".p-stock")?.value, 10) || 0;

      if (!code || !name) {
        alert("กรุณากรอกรหัสและชื่อสินค้าให้ครบถ้วนทุกรายการ");
        return;
      }

      if (stock <= 0) {
        alert(`สินค้า ${name} ไม่มีสินค้าในสต็อก`);
        return;
      }

      if (buyQty <= 0) {
        alert(`กรุณาระบุจำนวนสินค้า ${name} ให้มากกว่า 0`);
        return;
      }

      if (buyQty > stock) {
        alert(
          `สินค้า ${name} (รหัส: ${code}) มีจำนวนคงเหลือไม่พอ (เหลือ ${stock} ชิ้น)`
        );
        return;
      }

      // รักษาชื่อฟิลด์ตาม payload เดิม
      items.push({
        code,
        name,
        category:
          row.querySelector(".p-category")?.value || "-",
        description:
          row.querySelector(".p-desc")?.value || "",
        cost:
          parseFloat(row.querySelector(".p-cost")?.value) || 0,
        sale:
          parseFloat(row.querySelector(".p-sale")?.value) || 0,
        stock,
        buyQty
      });
    }

    if (items.length === 0) {
      alert("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    // ข้อมูลออเดอร์
    const payload = {
      employeeId: userId,
      employeeName,
      department,
      quotationImage,
      deliveryImage,
      suggestions,
      items
    };

    // ส่งข้อมูลเป็น multipart/form-data
    const formData = new FormData();

    formData.append("payload", JSON.stringify(payload));

    // สลิปเป็นเอกสารไม่บังคับ
    const slipInput = document.getElementById("paymentSlip");

    if (slipInput?.files?.length) {
      const slipFile = slipInput.files[0];

      if (!slipFile.type.startsWith("image/")) {
        alert("กรุณาเลือกไฟล์สลิปเป็นรูปภาพเท่านั้น");
        return;
      }

      if (slipFile.size > 10 * 1024 * 1024) {
        alert("ไฟล์สลิปต้องมีขนาดไม่เกิน 10 MB");
        return;
      }

      formData.append("payment_slip", slipFile);
    }

    const response = await fetch("/api/products/orders", {
      method: "POST",
      body: formData
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        "เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง กรุณาตรวจสอบ Backend"
      );
    }

    if (!response.ok || !result.success) {
      alert(
        "เกิดข้อผิดพลาด: " +
        (result.message || "ไม่สามารถบันทึกคำสั่งซื้อได้")
      );
      return;
    }

    alert(
      result.message ||
      "บันทึกคำสั่งซื้อสำเร็จ"
    );

    location.reload();

  } catch (err) {
    console.error("Save Order Error:", err);

    alert(
      "เกิดข้อผิดพลาด: " +
      (err.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้")
    );
  } finally {
    isSavingOrder = false;

    if (saveButton) {
      saveButton.disabled = false;

      if (saveButton.dataset.originalText) {
        saveButton.textContent = saveButton.dataset.originalText;
      }
    }
  }
}

// ==========================================
// 9. ออกจากระบบ
// ==========================================
function handleLogout() {
  localStorage.clear();
  window.location.replace("login.html");

  if (window.history && window.history.pushState) {
    window.history.replaceState(null, null, "login.html");
  }
}

// ==========================================
// 10. โหลดข้อมูลผู้ใช้จาก Backend
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const userId =
    localStorage.getItem("user_id") ||
    localStorage.getItem("userId");

  if (!userId) {
    console.warn("ไม่พบรหัสผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
    return;
  }

  try {
    const response = await fetch(
      `/api/user-profile/${encodeURIComponent(userId)}`
    );

    if (!response.ok) {
      throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");
    }

    const userData = await response.json();

    const fullName = userData.fullname || "ผู้ใช้งานระบบ";
    const department = userData.department || "-";

    const nameInput = document.getElementById("employeeName");
    const deptInput = document.getElementById("departmentName");

    if (nameInput) nameInput.value = fullName;
    if (deptInput) deptInput.value = department;

  } catch (err) {
    console.error("Error loading user info:", err);
  }
});
