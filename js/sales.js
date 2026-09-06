// แสดงวันที่เอกสารแบบไทย (พ.ศ.)
(function setDocDate() {
  try {
    const el = document.getElementById("docDate");
    const fmt = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    el.textContent = fmt.format(new Date());
  } catch (e) {
    /* no-op */
  }
})();

// โหลดชื่อผู้ทำรายการและแผนกจาก localStorage เมื่อเปิดหน้าเว็บ
document.addEventListener("DOMContentLoaded", () => {
  const savedName =
    localStorage.getItem("fullname") ||
    localStorage.getItem("name") ||
    "ผู้ใช้งานระบบ";
  const savedDept =
    localStorage.getItem("department") || localStorage.getItem("dept") || "-";

  const nameInput = document.getElementById("employeeName");
  if (nameInput) nameInput.value = savedName;

  const deptInput = document.getElementById("departmentName");
  if (deptInput) deptInput.value = savedDept;
});

function updateLineNumbers() {
  document.querySelectorAll(".product-item").forEach((row, i) => {
    const label = row.querySelector(".line-no");
    if (label) {
      label.textContent = "รายการ " + String(i + 1).padStart(2, "0");
    }
  });
}

function removeRow(btn) {
  btn.closest(".product-item").remove();
  updateLineNumbers();
}

function cloneRow() {
  const list = document.getElementById("product-list");
  const firstItem = document.querySelector(".product-item");
  const newItem = firstItem.cloneNode(true);

  newItem.querySelector(".remove-row-btn").style.display = "flex";

  const badge = newItem.querySelector(".stock-badge");
  if (badge) {
    badge.className = "stock-badge";
    badge.textContent = "พร้อมส่ง";
  }

  const inputs = newItem.querySelectorAll("input");
  inputs.forEach((input) => {
    input.value = "";
    if (input.classList.contains("p-buy-qty")) {
      input.disabled = false;
      input.value = "1";
      input.style.backgroundColor = "";
      input.style.borderColor = "";
    }
    if (input.classList.contains("p-stock")) input.value = "0";
  });

  list.appendChild(newItem);
  updateLineNumbers();
}

function previewImg(input, imgId, labelId) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const output = document.getElementById(imgId);
      const label = document.getElementById(labelId);
      if (output) {
        output.src = e.target.result;
        output.style.display = "block";
      }
      if (label) label.style.display = "none";
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ==========================================
// ระบบค้นหาสินค้าอัตโนมัติ (Autocomplete)
// ==========================================
let searchTimeout;
function searchProduct(inputElement) {
  const row = inputElement.closest(".product-item");
  const term = inputElement.value.trim();

  closeAllLists();

  if (!term || term.length < 1) return;

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const response = await fetch(
        `/api/products/search?q=${encodeURIComponent(term)}`,
      );
      if (!response.ok) throw new Error("Network response was not ok");
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

  // 🟢 ขยายความกว้างให้กว้างขึ้นกว่าช่อง input เดิม (min-width: 380px) เพื่อไม่ให้แคบเกินไป
  listContainer.style.cssText = `
    position: absolute; 
    top: 100%; 
    left: 0; 
    width: 100%; 
    min-width: 380px;
    background: white;
    border: 1px solid #cbd5e1; 
    z-index: 9999; 
    max-height: 250px; 
    overflow-y: auto;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); 
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
      transition: background 0.2s;
    `;
    item.innerHTML = `<b>${p.product_code}</b> - ${p.product_name} <span style="color:#64748b; float:right; font-size: 12px;">(คงเหลือ: ${p.stock_remaining})</span>`;

    item.onmouseover = () => (item.style.backgroundColor = "#f8fafc");
    item.onmouseout = () => (item.style.backgroundColor = "white");

    item.addEventListener("click", () => {
      // เติมข้อมูลลงในฟอร์ม
      row.querySelector(".p-code").value = p.product_code || "";
      row.querySelector(".p-name").value = p.product_name || "";
      row.querySelector(".p-category").value = p.category_brand || "";
      row.querySelector(".p-desc").value = p.details || "";
      row.querySelector(".p-cost").value = p.cost_price || 0;
      row.querySelector(".p-sale").value = p.selling_price || 0;
      row.querySelector(".p-stock").value = p.stock_remaining || 0;

      // 🟢 ตรวจสอบสต็อก: ถ้าสินค้าหมด (stock_remaining <= 0) ให้ล็อกช่องจำนวนเป็นสีแดงและห้ามกรอก
      const buyQtyInput = row.querySelector(".p-buy-qty");
      if (buyQtyInput) {
        if (p.stock_remaining <= 0) {
          buyQtyInput.value = "0";
          buyQtyInput.disabled = true;
          buyQtyInput.style.backgroundColor = "#fee2e2"; // แดงอ่อน
          buyQtyInput.style.borderColor = "#ef4444"; // กรอบแดง
          buyQtyInput.title = "สินค้าหมดสต็อก ไม่สามารถระบุจำนวนได้";
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
  const items = document.getElementsByClassName("autocomplete-items");
  while (items.length > 0) {
    items[0].parentNode.removeChild(items[0]);
  }
}

document.addEventListener("click", function (e) {
  if (!e.target.closest(".form-group")) {
    closeAllLists();
  }
});

function checkStock(input) {
  const row = input.closest(".product-item");
  const stockQty = parseInt(row.querySelector(".p-stock").value) || 0;
  const buyQty = parseInt(input.value) || 0;

  if (buyQty > stockQty) {
    alert("❌ จำนวนที่ระบุเกินสต็อกที่มี! (คงเหลือ: " + stockQty + ")");
    input.value = stockQty;
  }
}

function saveOrder() {
  const quoImg = document.getElementById("prevQuo");
  const delImg = document.getElementById("prevDel");
  const allItems = document.querySelectorAll(".product-item");

  const currentDepartment = document.getElementById("departmentName").value;
  const employeeName = document.getElementById("employeeName").value;
  const suggestions =
    document.getElementById("additionalSuggestions")?.value || "";

  if (!quoImg.src || quoImg.style.display === "none") {
    alert("⚠️ กรุณาแนบรูปภาพ 'ใบเสนอราคา' ก่อนทำการบันทึก");
    quoImg.parentElement.scrollIntoView({ behavior: "smooth" });
    return;
  }

  const orderData = {
    employee_name: employeeName,
    department: currentDepartment,
    suggestions: suggestions,
    quo_image: quoImg.src,
    del_image: delImg.style.display === "block" ? delImg.src : null,
    items: [],
  };

  let stockErrorMsg = "";

  allItems.forEach((row, index) => {
    const code = row.querySelector(".p-code")?.value || "";
    const name = row.querySelector(".p-name")?.value || "";
    const category = row.querySelector(".p-category")?.value || "";
    const description = row.querySelector(".p-desc")?.value || "";
    const costPrice = row.querySelector(".p-cost")?.value || 0;
    const salePrice = row.querySelector(".p-sale")?.value || 0;

    const stockRemain = parseInt(row.querySelector(".p-stock")?.value) || 0;
    const qtyToBuy = parseInt(row.querySelector(".p-buy-qty")?.value) || 0;

    if (code && qtyToBuy > 0) {
      if (stockRemain <= 0) {
        stockErrorMsg += `❌ สินค้า "${name}" (${code}) สินค้าหมดแล้ว\n`;
      } else if (qtyToBuy > stockRemain) {
        stockErrorMsg += `❌ สินค้า "${name}" (${code}) ของไม่พอขาย! (ต้องการ ${qtyToBuy}, มี ${stockRemain})\n`;
      }

      orderData.items.push({
        item_no: index + 1,
        product_code: code,
        product_name: name,
        category: category,
        description: description,
        cost_price: parseFloat(costPrice) || 0,
        selling_price: parseFloat(salePrice) || 0,
        stock_at_time: stockRemain,
        quantity_taken: qtyToBuy,
      });
    }
  });

  if (stockErrorMsg) {
    alert(stockErrorMsg);
    return;
  }

  if (orderData.items.length === 0) {
    alert("⚠️ กรุณาเลือกสินค้าและระบุจำนวนอย่างน้อย 1 รายการ");
    return;
  }

  console.log("พร้อมส่งข้อมูล Order:", orderData);
  alert("✅ ตรวจสอบข้อมูลสำเร็จ พร้อมบันทึก!");
}

function handleLogout() {
  localStorage.clear();
  window.location.replace("login.html");
  if (window.history && window.history.pushState) {
    window.history.replaceState(null, null, "login.html");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const userId =
    localStorage.getItem("user_id") || localStorage.getItem("userId");

  if (!userId) {
    console.warn("ไม่พบรหัสผู้ใช้ (user_id) กรุณาล็อกอินใหม่");
    return;
  }

  try {
    const response = await fetch(
      `http://192.168.1.35:3000/api/user-profile/${userId}`,
    );
    if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้ได้");

    const userData = await response.json();

    // 🟢 ดึงฟิลด์ fullname ตามฐานข้อมูลจริงของคุณ
    const fullName = userData.fullname || "ผู้ใช้งานระบบ";
    const department = userData.department || "-";

    const nameInput = document.getElementById("employeeName");
    if (nameInput) nameInput.value = fullName;

    const deptInput = document.getElementById("departmentName");
    if (deptInput) deptInput.value = department;
  } catch (err) {
    console.error("Error loading user info from DB:", err);
  }
});


// ฟังก์ชันแปลงไฟล์รูปภาพเป็น Base64
const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

async function saveOrder() {
    try {
        const userId = localStorage.getItem("user_id") || localStorage.getItem("userId");
        const employeeName = document.getElementById("employeeName").value;
        const department = document.getElementById("departmentName").value;
        const suggestions = document.getElementById("additionalSuggestions").value;

        // ตรวจสอบไฟล์ใบเสนอราคา
        const fileQuoInput = document.getElementById("fileQuo");
        if (!fileQuoInput.files || fileQuoInput.files.length === 0) {
            alert("กรุณาแนบไฟล์ใบเสนอราคาก่อนบันทึก");
            return;
        }

        const quotationImage = await convertFileToBase64(fileQuoInput.files[0]);
        
        let deliveryImage = null;
        const fileDelInput = document.getElementById("fileDel");
        if (fileDelInput.files && fileDelInput.files.length > 0) {
            deliveryImage = await convertFileToBase64(fileDelInput.files[0]);
        }

        // วนลูปดึงข้อมูลรายการสินค้า
        const productItems = document.querySelectorAll(".product-item");
        const items = [];

        for (let row of productItems) {
            const code = row.querySelector(".p-code").value.trim();
            const name = row.querySelector(".p-name").value.trim();
            const buyQty = parseInt(row.querySelector(".p-buy-qty").value) || 0;
            const stock = parseInt(row.querySelector(".p-stock").value) || 0;

            if (!code || !name) {
                alert("กรุณากรอกรหัสและชื่อสินค้าให้ครบถ้วนทุกรายการ");
                return;
            }

            if (buyQty > stock) {
                alert(`สินค้า ${name} (รหัส: ${code}) มีจำนวนคงเหลือไม่พอ (เหลือ ${stock} ชิ้น)`);
                return;
            }

            if (buyQty <= 0) {
                alert(`กรุณาระบุจำนวนสินค้า ${name} ให้มากกว่า 0`);
                return;
            }

            items.push({
                code: code,
                name: name,
                category: row.querySelector(".p-category").value || "-",
                description: row.querySelector(".p-desc").value || "",
                cost: parseFloat(row.querySelector(".p-cost").value) || 0,
                sale: parseFloat(row.querySelector(".p-sale").value) || 0,
                stock: stock,
                buyQty: buyQty
            });
        }

        if (items.length === 0) {
            alert("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
            return;
        }

        const payload = {
            employeeId: userId,
            employeeName: employeeName,
            department: department,
            quotationImage: quotationImage,
            deliveryImage: deliveryImage,
            suggestions: suggestions,
            items: items
        };

        // ส่งข้อมูลไปที่ Backend ผ่าน Relative Path
        const response = await fetch("/api/products/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert("บันทึกคำสั่งซื้อและตัดสต็อกสำเร็จเรียบร้อย!");
            location.reload();
        } else {
            alert("เกิดข้อผิดพลาด: " + (result.message || "ไม่สามารถบันทึกได้"));
        }

    } catch (err) {
        console.error("Save Order Error:", err);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
}