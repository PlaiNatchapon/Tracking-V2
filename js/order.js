// ข้อมูลจำลองฐานข้อมูลสินค้าในคลัง
const mockProducts = {
  "PRD-001": { name: "Wireless Ergonomic Mouse", price: 1250, stock: 45 },
  "PRD-002": { name: "Mechanical Keyboard RGB", price: 2890, stock: 8 },
  "PRD-003": { name: "UltraWide Monitor 34\"", price: 14500, stock: 2 },
  "PRD-004": { name: "USB-C Multiport Hub", price: 790, stock: 15 }
};

// ฐานข้อมูลคำสั่งซื้อที่รอคิวอยู่ (จำลองข้อมูลจากฝั่งลูกค้าสั่งเข้ามา)
const incomingOrdersData = {
  "ORD-9921": {
    custName: "คุณสมชาย ใจดี (บริษัท เอสซีจี จำกัด)",
    phone: "089-123-4567",
    address: "123/45 อาคารเอสซีจี ถนนบางซื่อ แขวงบางซื่อ กรุงเทพฯ 10800",
    items: [
      { code: "PRD-003", qty: 1 },
      { code: "PRD-001", qty: 1 }
    ]
  },
  "ORD-9922": {
    custName: "คุณกนกกมล พัฒนากุล",
    phone: "081-987-6543",
    address: "99/8 หมู่ 4 ตำบลสุรนารี อำเภอเมือง จังหวัดนครราชสีมา 30000",
    items: [
      { code: "PRD-002", qty: 1 },
      { code: "PRD-004", qty: 2 }
    ]
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // กำหนดวันที่ปัจจุบัน
  const dateEl = document.getElementById("current-date");
  dateEl.innerText = "วันที่: " + new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  // ปุ่มเพิ่มรายการสินค้าแบบ Manual
  document.getElementById("add-item-btn").addEventListener("click", () => addNewProductRow());

  // ปุ่มยืนยันบันทึกออเดอร์
  document.getElementById("save-order-btn").addEventListener("click", () => {
    const custName = document.getElementById("cust-name").value;
    if (!custName) {
      alert("กรุณาระบุชื่อลูกค้าหรือกดรับออเดอร์จากคิวก่อนครับ");
      return;
    }
    alert("ยืนยันการจัดส่งออเดอร์ของ " + custName + " สำเร็จ!");
  });
});

// ฟังก์ชันหลัก: เมื่อ Admin กดรับออเดอร์จากคิว
window.acceptOrder = function(orderId) {
  const order = incomingOrdersData[orderId];
  if (!order) return;

  // 1. เติมข้อมูลลูกค้าลงในฟอร์ม
  document.getElementById("cust-name").value = order.custName;
  document.getElementById("cust-phone").value = order.phone;
  document.getElementById("shipping-address").value = order.address;
  
  // เปลี่ยนหัวข้อฟอร์มให้รู้ว่ากำลังจัดการออเดอร์ไหนอยู่
  document.getElementById("active-order-title").innerHTML = `<h2>กำลังจัดการคำสั่งซื้อ: <span style="color:var(--brand-2);">${orderId}</span></h2>`;

  // 2. ล้างรายการสินค้าเก่าออก แล้วสร้างรายการใหม่ตามที่ลูกค้านี้สั่งเข้ามาจริง
  const productList = document.getElementById("product-list");
  productList.innerHTML = "";

  order.items.forEach((itemData, index) => {
    addNewProductRow(itemData.code, itemData.qty, index + 1);
  });

  // 3. ลบการ์ดออเดอร์ออกจากคิวรอ
  const cardElement = document.querySelector(`[data-order-id="${orderId}"]`);
  if (cardElement) {
    cardElement.style.transform = "scale(0.9)";
    cardElement.style.opacity = "0";
    setTimeout(() => cardElement.remove(), 250);
  }

  // อัปเดตตัวเลขแจ้งเตือนที่ Sidebar
  updateBadgeCount();
  
  // เลื่อนหน้าจอลงมาที่ฟอร์มรายละเอียดอัตโนมัติ
  document.getElementById("order-detail-container").scrollIntoView({ behavior: 'smooth' });
};

// ฟังก์ชันเพิ่มแถวสินค้า
function addNewProductRow(presetCode = "", presetQty = 1, customIndex = null) {
  const productList = document.getElementById("product-list");
  const itemCount = customIndex || (productList.querySelectorAll(".product-item").length + 1);
  
  const newItem = document.createElement("div");
  newItem.className = "product-item";
  newItem.setAttribute("data-index", itemCount);
  newItem.innerHTML = `
    <div class="remove-row-btn" title="ลบรายการนี้" onclick="this.closest('.product-item').remove()">✕</div>
    <div class="item-head">
      <span class="line-no">ITEM #${itemCount < 10 ? '0' + itemCount : itemCount}</span>
      <span class="stock-badge">รอระบุรหัส</span>
    </div>
    <div class="form-row">
      <div class="form-group col-30">
        <label>รหัสสินค้า</label>
        <input type="text" class="prod-code" value="${presetCode}" placeholder="เช่น PRD-001" autocomplete="off">
      </div>
      <div class="form-group col-70">
        <label>ชื่อสินค้า</label>
        <input type="text" class="prod-name" placeholder="ชื่อสินค้าจะแสดงอัตโนมัติ..." readonly>
      </div>
    </div>
    <div class="ledger-row">
      <div class="form-group qty">
        <label>ราคาต่อหน่วย</label>
        <input type="text" class="prod-price" value="0.00" readonly>
      </div>
      <div class="form-group qty">
        <label>คงเหลือในคลัง</label>
        <input type="text" class="prod-stock" value="0" readonly>
      </div>
      <div class="form-group buy-qty">
        <label>จำนวนที่สั่ง</label>
        <input type="number" class="prod-qty" value="${presetQty}" min="1">
      </div>
      <div class="form-group qty">
        <label>ราคารวม (THB)</label>
        <input type="text" class="prod-total" value="0.00" readonly>
      </div>
    </div>
  `;
  productList.appendChild(newItem);
  attachItemEvents(newItem);

  // ถ้ามีรหัสตั้งต้นมาให้ ทำการ trigger คำนวณทันที
  if (presetCode) {
    const codeInput = newItem.querySelector(".prod-code");
    triggerProductLookup(codeInput);
  }
}

// ผูกอีเวนต์คำนวณและค้นหาในแต่ละแถวสินค้า
function attachItemEvents(itemElement) {
  const codeInput = itemElement.querySelector(".prod-code");
  codeInput.addEventListener("input", () => triggerProductLookup(codeInput));
  
  const qtyInput = itemElement.querySelector(".prod-qty");
  qtyInput.addEventListener("input", () => calculateRowTotal(itemElement));
}

function triggerProductLookup(codeInput) {
  const itemElement = codeInput.closest(".product-item");
  const code = codeInput.value.trim().toUpperCase();
  const product = mockProducts[code];

  const nameInput = itemElement.querySelector(".prod-name");
  const priceInput = itemElement.querySelector(".prod-price");
  const stockInput = itemElement.querySelector(".prod-stock");
  const badgeEl = itemElement.querySelector(".stock-badge");

  if (product) {
    nameInput.value = product.name;
    priceInput.value = product.price.toLocaleString();
    stockInput.value = product.stock;
    
    badgeEl.className = "stock-badge " + (product.stock > 5 ? "ok" : product.stock > 0 ? "warn" : "danger");
    badgeEl.innerText = product.stock > 0 ? `พร้อมส่ง (${product.stock})` : `สินค้าหมด`;
  } else {
    nameInput.value = "";
    priceInput.value = "0.00";
    stockInput.value = "0";
    badgeEl.className = "stock-badge";
    badgeEl.innerText = "ไม่พบรหัส";
  }
  calculateRowTotal(itemElement);
}

function calculateRowTotal(itemElement) {
  const price = parseFloat(itemElement.querySelector(".prod-price").value.replace(/,/g, '')) || 0;
  const qty = parseInt(itemElement.querySelector(".prod-qty").value) || 0;
  const total = price * qty;
  itemElement.querySelector(".prod-total").value = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateBadgeCount() {
  const remainingCards = document.querySelectorAll(".queue-card").length;
  const badge = document.getElementById("incoming-count");
  badge.innerText = remainingCards;
  if (remainingCards === 0) badge.style.display = "none";
}