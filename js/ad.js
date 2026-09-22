   // เริ่มต้นเรนเดอร์ไอคอน Lucide ทั้งหมด
      lucide.createIcons();

      function switchTab(tabId, buttonElement) {
        document.querySelectorAll(".tab-content").forEach((tab) => {
          tab.classList.remove("active");
        });
        document.querySelectorAll(".nav-item").forEach((btn) => {
          btn.classList.remove("active");
        });

        document.getElementById(tabId).classList.add("active");
        buttonElement.classList.add("active");

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
          document.getElementById("page-heading").textContent =
            headings[tabId].title;
          document.getElementById("page-subheading").textContent =
            headings[tabId].sub;
        }
      }


      function handleLogout() {
  localStorage.clear();
  window.location.replace("login.html");
  if (window.history && window.history.pushState) {
    window.history.replaceState(null, null, "login.html");
  }
}

      function handleUserSubmit(event) {
        event.preventDefault();
        alert("บันทึกผู้ใช้งานใหม่เรียบร้อยแล้ว");
        event.target.reset();
      }

      function handleProductSubmit(event) {
        event.preventDefault();
        alert("เพิ่มสินค้าเข้าคลังเรียบร้อยแล้ว");
        event.target.reset();
      }

      // ฟังก์ชันเปิด Modal แสดงขั้นตอนเชิงลึก (Timeline)
      function openTimelineModal(orderId, operator, vehicle, statusType) {
        document.getElementById("modalOrderTitle").textContent =
          `ติดตามสถานะเชิงลึก: #${orderId}`;
        document.getElementById("modalOrderSub").textContent =
          `ผู้ปฏิบัติงาน: ${operator} | รหัสรถ: ${vehicle}`;

        const timelineContainer = document.getElementById("timelineContent");

        let stepsHtml = "";

        if (statusType === "completed") {
          stepsHtml = `
                    <div class="timeline-item completed">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">1. สร้างออเดอร์เข้าสู่ระบบ</div>
                        <div class="timeline-desc">ระบบบันทึกรายการสั่งซื้อสำเร็จ เตรียมพร้อมจัดสรรงาน</div>
                        <div class="timeline-time">13:30 น.</div>
                    </div>
                    <div class="timeline-item completed">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">2. เลือกและระบุรหัสรถขนส่ง (${vehicle})</div>
                        <div class="timeline-desc">ระบุข้อมูลรถและจัดสรรสายส่งเรียบร้อย</div>
                        <div class="timeline-time">13:45 น.</div>
                    </div>
                    <div class="timeline-item completed">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">3. ตรวจสอบความถูกต้องและสลิปการโอน</div>
                        <div class="timeline-desc">พนักงาน Checker ตรวจสอบรายการและยืนยันความถูกต้องผ่านระบบ</div>
                        <div class="timeline-time">14:05 น.</div>
                    </div>
                    <div class="timeline-item completed">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">4. ปล่อยรถออกเดินทางสำเร็จ</div>
                        <div class="timeline-desc">กระบวนการเสร็จสิ้นสมบูรณ์ รถขนส่งเดินทางออกจากคลังสินค้า</div>
                        <div class="timeline-time">14:25 น.</div>
                    </div>
                `;
        } else if (statusType === "current") {
          stepsHtml = `
                    <div class="timeline-item completed">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">1. สร้างออเดอร์เข้าสู่ระบบ</div>
                        <div class="timeline-desc">ระบบบันทึกรายการสั่งซื้อสำเร็จ</div>
                        <div class="timeline-time">13:30 น.</div>
                    </div>
                    <div class="timeline-item completed">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">2. เลือกและระบุรหัสรถขนส่ง (${vehicle})</div>
                        <div class="timeline-desc">ระบุข้อมูลรถเรียบร้อย</div>
                        <div class="timeline-time">13:50 น.</div>
                    </div>
                    <div class="timeline-item current">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">3. กำลังตรวจสอบรายการสินค้า (กำลังดำเนินการ)</div>
                        <div class="timeline-desc">พนักงานกำลังปฏิบัติงานล็อคตรวจในระบบ Bacc</div>
                        <div class="timeline-time">กำลังดำเนินงาน...</div>
                    </div>
                    <div class="timeline-item pending">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">4. ปล่อยรถออกเดินทาง</div>
                        <div class="timeline-desc">รอการยืนยันเสร็จสิ้นเพื่อปล่อยรถขนส่ง</div>
                        <div class="timeline-time">-</div>
                    </div>
                `;
        } else {
          stepsHtml = `
                    <div class="timeline-item completed">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">1. สร้างออเดอร์เข้าสู่ระบบ</div>
                        <div class="timeline-desc">ระบบบันทึกรายการสั่งซื้อสำเร็จ</div>
                        <div class="timeline-time">13:40 น.</div>
                    </div>
                    <div class="timeline-item current">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">2. รอเลือกและระบุรหัสรถขนส่ง</div>
                        <div class="timeline-desc">ออเดอร์เข้ามาแล้ว อยู่ระหว่างรอดำเนินการเลือกรหัสรถ</div>
                        <div class="timeline-time">รอดำเนินการ...</div>
                    </div>
                    <div class="timeline-item pending">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">3. ตรวจสอบความถูกต้องและสลิป</div>
                        <div class="timeline-desc">-</div>
                        <div class="timeline-time">-</div>
                    </div>
                    <div class="timeline-item pending">
                        <div class="timeline-dot"></div>
                        <div class="timeline-title">4. ปล่อยรถออกเดินทาง</div>
                        <div class="timeline-desc">-</div>
                        <div class="timeline-time">-</div>
                    </div>
                `;
        }

        timelineContainer.innerHTML = stepsHtml;
        document.getElementById("timelineModal").classList.add("active");
        lucide.createIcons();
      }

      // ปิด Modal
      function closeTimelineModal() {
        document.getElementById("timelineModal").classList.remove("active");
      }

      // ฟังก์ชันโหลดข้อมูลจากหลังบ้าน
async function loadDashboardData() {
    try {
        const response = await fetch('/api/orders');
        const result = await response.json();

        if (result.success) {
            const ordersData = result.data;
            const tbody = document.querySelector("#dashboard tbody");
            if (!tbody) return;

            let html = "";
            ordersData.forEach(order => {
                html += `
                    <tr>
                        <td><strong>#${order.id}</strong></td>
                        <td>${order.operator}</td>
                        <td>${order.department}</td>
                        <td>${order.vehicle}</td>
                        <td>
                            <span class="badge ${order.badgeClass}">
                                <i data-lucide="${order.icon}" style="width: 12px"></i>
                                ${order.statusText}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-outline btn-sm" onclick="openTimelineModal('${order.id}', '${order.operator}', '${order.vehicle}', '${order.status}')">
                                <i data-lucide="git-commit" style="width: 14px; height: 14px"></i>
                                <span>ดูขั้นตอน</span>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
            lucide.createIcons();
        }
    } catch (err) {
        console.error("ไม่สามารถเชื่อมต่อ API ได้:", err);
    }
}