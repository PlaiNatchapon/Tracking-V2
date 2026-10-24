
/* ==========================================
   วันที่เอกสารแบบไทย (พ.ศ.)
========================================== */

// เก็บไฟล์สลิปที่เลือก (ไม่บังคับ)
let uploadedPaymentSlip = null;

(function setDocDate() {
    try {
        const el = document.getElementById("docDate");

        if (el) {
            const fmt = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });

            el.textContent = fmt.format(new Date());
        }
    } catch (e) {
        console.error("Error setting document date:", e);
    }
})();


/* ==========================================
   โหลดชื่อผู้ใช้งานและแผนก
========================================== */

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
    if (nameInput) nameInput.value = savedName;

    const deptInput = document.getElementById("departmentName");
    if (deptInput) deptInput.value = savedDept;
});


/* ==========================================
   จัดการรายการสินค้า
========================================== */

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

    if (!list || !firstItem) {
        alert("ไม่พบรายการสินค้าสำหรับคัดลอก");
        return;
    }

    const newItem = firstItem.cloneNode(true);

    const removeButton = newItem.querySelector(".remove-row-btn");
    if (removeButton) removeButton.style.display = "flex";

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

    list.appendChild(newItem);
    updateLineNumbers();
}


/* ==========================================
   แสดงตัวอย่างรูปภาพ
========================================== */

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

            if (label) {
                label.style.display = "none";
            }
        };

        reader.readAsDataURL(input.files[0]);
    }
}


/* ==========================================
   ค้นหาสินค้าอัตโนมัติ (Autocomplete)
========================================== */

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
                `/api/products/search?q=${encodeURIComponent(term)}`
            );

            if (!response.ok) {
                throw new Error("Network response was not ok");
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
        min-width: 380px;
        background: white;
        border: 1px solid #cbd5e1;
        z-index: 9999;
        max-height: 250px;
        overflow-y: auto;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
                    0 4px 6px -4px rgba(0, 0, 0, 0.1);
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

        // ใช้ textContent เพื่อไม่ให้ชื่อสินค้าถูกตีความเป็น HTML
        const name = document.createElement("b");
        name.textContent = p.product_code || "";

        item.appendChild(name);
        item.appendChild(
            document.createTextNode(" - " + (p.product_name || ""))
        );

        const stockLabel = document.createElement("span");
        stockLabel.style.cssText =
            "color:#64748b; float:right; font-size:12px;";
        stockLabel.textContent = `(คงเหลือ: ${p.stock_remaining})`;

        item.appendChild(stockLabel);

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

            if (buyQtyInput) {
                if (p.stock_remaining <= 0) {
                    buyQtyInput.value = "0";
                    buyQtyInput.disabled = true;
                    buyQtyInput.style.backgroundColor = "#fee2e2";
                    buyQtyInput.style.borderColor = "#ef4444";
                    buyQtyInput.title =
                        "สินค้าหมดสต็อก ไม่สามารถระบุจำนวนได้";
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


/* ==========================================
   ตรวจสอบสต็อก
========================================== */

function checkStock(input) {
    const row = input.closest(".product-item");
    const stockQty = parseInt(row.querySelector(".p-stock").value) || 0;
    const buyQty = parseInt(input.value) || 0;

    if (buyQty > stockQty) {
        alert("❌ จำนวนที่ระบุเกินสต็อกที่มี! (คงเหลือ: " + stockQty + ")");
        input.value = stockQty;
    }
}


/* ==========================================
   โหลดข้อมูลผู้ใช้งานจากฐานข้อมูล
========================================== */

document.addEventListener("DOMContentLoaded", async () => {
    const userId =
        localStorage.getItem("user_id") ||
        localStorage.getItem("userId");

    if (!userId) {
        console.warn("ไม่พบรหัสผู้ใช้ (user_id) กรุณาล็อกอินใหม่");
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
        if (nameInput) nameInput.value = fullName;

        const deptInput = document.getElementById("departmentName");
        if (deptInput) deptInput.value = department;
    } catch (err) {
        console.error("Error loading user info from DB:", err);
    }
});


/* ==========================================
   แปลงไฟล์รูปภาพเป็น Base64
========================================== */

const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};


/* ==========================================
   บันทึกคำสั่งซื้อ + สลิป (ไม่บังคับ)
========================================== */

async function saveOrder() {
    try {
        const userId =
            localStorage.getItem("user_id") ||
            localStorage.getItem("userId");

        const employeeName =
            document.getElementById("employeeName").value;

        const department =
            document.getElementById("departmentName").value;

        const suggestions =
            document.getElementById("additionalSuggestions")?.value || "";

        // ตรวจสอบใบเสนอราคา
        const fileQuoInput = document.getElementById("fileQuo");

        if (!fileQuoInput.files || fileQuoInput.files.length === 0) {
            alert("กรุณาแนบไฟล์ใบเสนอราคาก่อนบันทึก");
            return;
        }

        const quotationImage =
            await convertFileToBase64(fileQuoInput.files[0]);

        // รูปจัดส่ง (ไม่บังคับ)
        let deliveryImage = null;

        const fileDelInput = document.getElementById("fileDel");

        if (fileDelInput.files && fileDelInput.files.length > 0) {
            deliveryImage =
                await convertFileToBase64(fileDelInput.files[0]);
        }

        // รวบรวมรายการสินค้า
        const productItems = document.querySelectorAll(".product-item");
        const items = [];

        for (const row of productItems) {
            const code = row.querySelector(".p-code").value.trim();
            const name = row.querySelector(".p-name").value.trim();
            const buyQty =
                parseInt(row.querySelector(".p-buy-qty").value) || 0;
            const stock =
                parseInt(row.querySelector(".p-stock").value) || 0;

            // ข้ามแถวที่ยังไม่ได้เลือกสินค้าเลย
            if (!code && !name) {
                continue;
            }

            if (!code || !name) {
                alert("กรุณากรอกรหัสและชื่อสินค้าให้ครบถ้วนทุกรายการ");
                return;
            }

            if (stock <= 0) {
                alert(`สินค้า ${name} (รหัส: ${code}) หมดสต็อก`);
                return;
            }

            if (buyQty > stock) {
                alert(
                    `สินค้า ${name} (รหัส: ${code}) มีจำนวนคงเหลือไม่พอ (เหลือ ${stock} ชิ้น)`
                );
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

        // ==========================================
        // ส่งข้อมูลด้วย FormData ให้ตรงกับ Bsales.js
        // ==========================================
        const formData = new FormData();

        formData.append("payload", JSON.stringify(payload));

        // แนบสลิปเมื่อเลือกไฟล์เท่านั้น
        if (uploadedPaymentSlip) {
            formData.append("payment_slip", uploadedPaymentSlip);
        }

        const response = await fetch("/api/products/orders", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert("บันทึกคำสั่งซื้อและตัดสต็อกสำเร็จเรียบร้อย!");
            location.reload();
        } else {
            alert(
                "เกิดข้อผิดพลาด: " +
                (result.message || "ไม่สามารถบันทึกได้")
            );
        }
    } catch (err) {
        console.error("Save Order Error:", err);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
}


/* ==========================================
   อัปโหลดสลิปและแสดงตัวอย่าง
========================================== */

function handleSlipUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        event.target.value = "";
        return;
    }

    uploadedPaymentSlip = file;

    const reader = new FileReader();

    reader.onload = function (e) {
        const preview = document.getElementById("slip-img-preview");
        const previewBox = document.getElementById("slip-preview-box");
        const addButton = document.getElementById("slip-add-btn");

        if (preview) preview.src = e.target.result;
        if (previewBox) previewBox.style.display = "flex";
        if (addButton) addButton.style.display = "none";
    };

    reader.readAsDataURL(file);
}


/* ==========================================
   ลบสลิปที่เลือก
========================================== */

function removeSlip() {
    uploadedPaymentSlip = null;

    const preview = document.getElementById("slip-img-preview");
    const previewBox = document.getElementById("slip-preview-box");
    const addButton = document.getElementById("slip-add-btn");
    const fileInput = document.getElementById("payment-slip-input");

    if (preview) preview.src = "";
    if (previewBox) previewBox.style.display = "none";
    if (addButton) addButton.style.display = "flex";
    if (fileInput) fileInput.value = "";
}


/* ==========================================
   ออกจากระบบ
========================================== */

function handleLogout() {
    localStorage.clear();
    window.location.replace("login.html");

    if (window.history && window.history.pushState) {
        window.history.replaceState(null, null, "login.html");
    }
}
