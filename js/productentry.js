document.addEventListener("DOMContentLoaded", () => {
  // 1. Set Today's Date
  const dateEl = document.getElementById("current-date");
  const today = new Date();
  dateEl.textContent = `DATE: ${today.toLocaleDateString("th-TH")}`;

  // 2. Drag & Drop Image Handlers
  setupImageUploader("dz-main", "input-main-img", "prev-main-img");
  setupImageUploader("dz-sub", "input-sub-img", "prev-sub-img");

  function setupImageUploader(dropzoneId, inputId, previewId) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    dropzone.addEventListener("click", () => input.click());

    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) handleFile(file, dropzone, preview);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        input.files = e.dataTransfer.files;
        handleFile(file, dropzone, preview);
      }
    });
  }

  function handleFile(file, dropzone, preview) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      dropzone.classList.add("has-image");
    };
    reader.readAsDataURL(file);
  }

  // 3. Dynamic Status Indicator Switch
  const statusToggle = document.getElementById("status-toggle");
  const statusText = document.getElementById("status-text");

  statusToggle.addEventListener("change", () => {
    if (statusToggle.checked) {
      statusText.textContent = "พร้อมขาย";
      statusText.className = "status-indicator active";
    } else {
      statusText.textContent = "ระงับขาย";
      statusText.className = "status-indicator";
    }
  });

  // 4. Dynamic Tags Input
  const tagInput = document.getElementById("tag-input");
  const tagsList = document.getElementById("tags-list");
  let tags = ["NEW", "HOT"];

  function renderTags() {
    tagsList.innerHTML = "";
    tags.forEach((tag, index) => {
      const tagEl = document.createElement("div");
      tagEl.className = "tag-item";
      tagEl.innerHTML = `#${tag} <span onclick="removeTag(${index})">&times;</span>`;
      tagsList.appendChild(tagEl);
    });
  }

  window.removeTag = (index) => {
    tags.splice(index, 1);
    renderTags();
  };

  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && tagInput.value.trim() !== "") {
      e.preventDefault();
      const newTag = tagInput.value.trim().toUpperCase();
      if (!tags.includes(newTag)) {
        tags.push(newTag);
        renderTags();
      }
      tagInput.value = "";
    }
  });
  renderTags();

  // 5. Calculations & Stock Badge Logic
  const costInput = document.getElementById("cost-price");
  const priceInput = document.getElementById("selling-price");
  const stockInput = document.getElementById("stock-qty");
  const profitInput = document.getElementById("profit-margin");
  const stockBadge = document.getElementById("stock-badge");

  function calculateLedger() {
    const cost = parseFloat(costInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const stock = parseInt(stockInput.value, 10);

    const profit = price - cost;
    profitInput.value = profit.toFixed(2);

    if (isNaN(stock)) {
      stockBadge.textContent = "ไม่ได้ระบุ";
      stockBadge.className = "stock-badge";
    } else if (stock <= 5) {
      stockBadge.textContent = "สินค้าใกล้หมด";
      stockBadge.className = "stock-badge danger";
    } else if (stock <= 20) {
      stockBadge.textContent = "สต็อกน้อย";
      stockBadge.className = "stock-badge warn";
    } else {
      stockBadge.textContent = "สต็อกปกติ";
      stockBadge.className = "stock-badge ok";
    }
  }

  [costInput, priceInput, stockInput].forEach((element) => {
    element.addEventListener("input", calculateLedger);
  });
});