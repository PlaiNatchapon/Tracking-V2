// Toggle Password Visibility
function togglePassword() {
  const pwdInput = document.getElementById("password");
  const eyeIcon = document.getElementById("eyeIcon");

  if (pwdInput.type === "password") {
    pwdInput.type = "text";
    eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else {
    pwdInput.type = "password";
    eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
}

// Handle Form Submission
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const alertBanner = document.getElementById("alertBanner");
  const alertText = document.getElementById("alertText");
  const submitBtn = document.getElementById("submitBtn");

  alertBanner.classList.remove("show");

  if (!username || !password) {
    alertText.textContent = "กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน";
    alertBanner.classList.add("show");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="10"></circle>
    </svg>
    กำลังเข้าสู่ระบบ...
  `;

  if (!document.getElementById("spinner-style")) {
    const style = document.createElement("style");
    style.id = "spinner-style";
    style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  // ส่งข้อมูลไปที่ Backend จริง
  setTimeout(async () => {
    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("username", username);
        localStorage.setItem("department", result.department);
        localStorage.setItem("userId", result.userId);
        localStorage.setItem("user_id", result.userId);
        localStorage.setItem("fullname", result.fullname);

        // เช็กแผนกเพื่อพาเปลี่ยนหน้าไปยังหน้าที่ถูกต้อง
        if (result.department === "sales") {
          window.location.href = "sales.html";
        } else if (result.department === "admin") {
          window.location.href = "dashboard.html";
        } else if (result.department === "warehouse") {
          window.location.href = "order.html";
        } else if (result.department === "checker") {
          window.location.href = "checker.html";
        } else {
          window.location.href = "index.html"; // หน้าค่าเริ่มต้นถ้าไม่ตรงกับเงื่อนไข
        }
      } else {
        alertText.textContent =
          result.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
        alertBanner.classList.add("show");

        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <span>เข้าสู่ระบบ</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14m-6-6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      }
    } catch (error) {
      alertText.textContent = "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";
      alertBanner.classList.add("show");

      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>เข้าสู่ระบบ</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14m-6-6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
  }, 900);
});
