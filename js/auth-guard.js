const socket = io();

window.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("authToken");
  const username = localStorage.getItem("username");
  const userId = localStorage.getItem("userId");

  if (!token || !username) {
    redirectToLogin();
    return;
  }

  // ลงทะเบียน Socket ของตัวเองกับเซิร์ฟเวอร์
  if (userId) {
    socket.emit("register", userId);
  }

  // ตรวจสอบสถานะผ่าน API
  try {
    const apiUrl = "/api/verify-token";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token,
        username
      })
    });

    const result = await response.json();

    if (!result.valid) {
      alert("บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์หรือเบราว์เซอร์อื่น");
      redirectToLogin();
    }

  } catch (error) {
    console.error("Connection error:", error);
  }
});


// --- ดักฟังคำสั่งจากเซิร์ฟเวอร์แบบ Real-time ---
socket.on("force_logout", (data) => {
  alert(
    data.message ||
    "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์หรือเบราว์เซอร์อื่น"
  );

  redirectToLogin();
});


function redirectToLogin() {
  localStorage.clear();
  window.location.replace("login.html");
}


// ป้องกันการกดย้อนกลับ
if (window.history && window.history.pushState) {

  window.history.replaceState(
    null,
    null,
    window.location.href
  );

  window.addEventListener("popstate", function () {

    const token = localStorage.getItem("authToken");

    if (!token) {
      window.location.replace("login.html");
    } else {
      window.history.replaceState(
        null,
        null,
        window.location.href
      );
    }

  });
}


// ตรวจสอบการเปิดซ้ำหลายแท็บในเครื่องเดียวกัน
const TAB_ID = Math.random()
  .toString(36)
  .substring(2);

localStorage.setItem("active_tab_id", TAB_ID);


// คอยดักฟังว่ามีแท็บอื่นถูกเปิดขึ้นมาใหม่หรือไม่
window.addEventListener("storage", (event) => {

  if (event.key === "active_tab_id") {

    if (event.newValue !== TAB_ID) {

      alert(
        "⚠️ คุณได้เปิดหน้านี้ในแท็บอื่นแล้ว ระบบจะปิดแท็บนี้อัตโนมัติ"
      );

      redirectToLogin();
    }
  }

});


// ดักจับกรณีเบราว์เซอร์ดึงหน้าเว็บเก่าจาก bfcache
window.addEventListener("pageshow", (event) => {

  if (event.persisted) {

    const token = localStorage.getItem("authToken");

    if (!token) {
      window.location.replace("login.html");
    }

  }

});