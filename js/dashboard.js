document.addEventListener("DOMContentLoaded", () => {
  // 1. Live Datetime Monitoring
  const datetimeEl = document.getElementById("current-datetime");
  function updateTime() {
    const now = new Date();
    datetimeEl.textContent = `LIVE: ${now.toLocaleDateString("th-TH")} ${now.toLocaleTimeString("th-TH")}`;
  }
  setInterval(updateTime, 1000);
  updateTime();

  // 2. Custom Canvas Bar Chart (Native 2D Context)
  const canvas = document.getElementById("analyticsChart");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    
    // Make resolution crisp for high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.parentElement.clientWidth * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);

    const labels = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
    const dataCreate = [120, 150, 210, 180, 240, 310, 270];
    const dataUpdate = [30, 45, 60, 40, 50, 80, 65];

    const width = canvas.parentElement.clientWidth;
    const height = 180;
    const padding = 30;
    const barWidth = 14;
    const gap = (width - padding * 2) / labels.length;

    // Draw Grid & Axes
    ctx.strokeStyle = "#e2e5ee";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Render Bars & Labels
    labels.forEach((label, i) => {
      const x = padding + i * gap + gap / 4;
      
      // Calculate heights relative to max value (350)
      const hCreate = (dataCreate[i] / 350) * (height - padding * 2);
      const hUpdate = (dataUpdate[i] / 350) * (height - padding * 2);

      // Create Bar (Brand Blue)
      ctx.fillStyle = "#2e57c9";
      ctx.fillRect(x, height - padding - hCreate, barWidth, hCreate);

      // Update Bar (Warn Orange)
      ctx.fillStyle = "#a8630a";
      ctx.fillRect(x + barWidth + 4, height - padding - hUpdate, barWidth, hUpdate);

      // Label Text
      ctx.fillStyle = "#9aa0b1";
      ctx.font = "11px 'IBM Plex Sans Thai', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x + barWidth, height - 8);
    });
  }

  // 3. Dynamic Filter & Search for Audit Logs
  const searchInput = document.getElementById("log-search");
  const actionFilter = document.getElementById("log-filter-action");
  const logItems = document.querySelectorAll(".log-item");

  function filterLogs() {
    const query = searchInput.value.toLowerCase();
    const action = actionFilter.value;

    logItems.forEach((item) => {
      const text = item.textContent.toLowerCase();
      const itemAction = item.getAttribute("data-action");

      const matchesSearch = text.includes(query);
      const matchesAction = action === "ALL" || itemAction === action;

      if (matchesSearch && matchesAction) {
        item.style.display = "grid";
      } else {
        item.style.display = "none";
      }
    });
  }

  searchInput.addEventListener("input", filterLogs);
  actionFilter.addEventListener("change", filterLogs);
});