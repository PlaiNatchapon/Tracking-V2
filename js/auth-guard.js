const socket = io("http://localhost:3000");

window.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("authToken");
  const username = localStorage.getItem("username");
  const userId = localStorage.getItem("userId"); // แนะนำให้เก็บ userId ตอนล็อกอินเพิ่มไว้ด้วย

  if (!token || !username) {
    redirectToLogin();
    return;
  }

  // ลงทะเบียน Socket ของตัวเองกับเซิร์ฟเวอร์
  if (userId) {
    socket.emit("register", userId);
  }

  // ตรวจสอบสถานะปกติผ่าน API รอบแรกตอนเปิดหน้าเว็บ
  // ✅ แก้ไขเป็นแบบนี้ (ใช้ dynamic host แทนการใส่ไอพีตายตัว)
  try {
    const apiUrl = `http://${window.location.hostname}:3000/api/verify-token`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, username }),
    });
    const result = await response.json();
    if (!result.valid) {
      alert("บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์หรือเบราว์เซอร์อื่น");
      redirectToLogin();
    }
  } catch (error) {
    console.error("Connection error", error);
  }
});

// --- ดักฟังคำสั่งจากเซิร์ฟเวอร์แบบ Real-time ทันทีที่เครื่องอื่นล็อกอินทับ ---
socket.on("force_logout", (data) => {
  alert(data.message || "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์หรือเบราว์เซอร์อื่น");
  redirectToLogin();
});

function redirectToLogin() {
  localStorage.clear();
  window.location.replace("login.html");
}

// ป้องกันการกดย้อนกลับ
if (window.history && window.history.pushState) {
  window.history.replaceState(null, null, window.location.href);
  window.addEventListener("popstate", function () {
    const token = localStorage.getItem("authToken");
    if (!token) {
      window.location.replace("login.html");
    } else {
      window.history.replaceState(null, null, window.location.href);
    }
  });
}

// ตรวจสอบการเปิดซ้ำหลายแท็บในเครื่องเดียวกัน
const TAB_ID = Math.random().toString(36).substring(2); // สร้าง ID ประจำแท็บนี้
localStorage.setItem("active_tab_id", TAB_ID);

// คอยดักฟังว่ามีแท็บอื่นถูกเปิดขึ้นมาใหม่ในเบราว์เซอร์เดียวกันหรือไม่
window.addEventListener("storage", (event) => {
  if (event.key === "active_tab_id") {
    // ถ้าค่า active_tab_id เปลี่ยนไปจาก ID ของแท็บนี้ แปลว่ามีแท็บใหม่ถูกเปิดขึ้นมาทับ
    if (event.newValue !== TAB_ID) {
      alert("⚠️ คุณได้เปิดหน้านี้ในแท็บอื่นแล้ว ระบบจะปิดแท็บนี้อัตโนมัติ");
      // ทำการเคลียร์ข้อมูลหรือเด้งออก
      redirectToLogin();
    }
  }
});

// ดักจับกรณีผู้ใช้กดย้อนกลับแล้วเบราว์เซอร์ดึงหน้าเว็บเก่าจากหน่วยความจำ (bfcache)
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    const token = localStorage.getItem("authToken");
    if (!token) {
      window.location.replace("login.html");
    }
  }
});
