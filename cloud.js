// Google Drive Upload via Apps Script
const UPLOAD_URL = "https://script.google.com/macros/s/AKfycby1eeLoqHXtOSVc55FCvrBIPv_4RyW0VWFPf4afaTIMJqVoJOgGJHn5z8-2WGIvIAjO-Q/exec";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadFileToDrive(file, meta = {}) {
  if (!file) throw new Error("لم يتم اختيار ملف");

  const base64 = await fileToBase64(file);
  const payload = {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileData: base64,
    ...meta
  };

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  let result;
  try {
    result = await res.json();
  } catch (error) {
    throw new Error("تعذر قراءة رد خدمة الرفع. تأكد من إعداد Google Apps Script كـ Web App.");
  }

  if (!res.ok || !result.success) {
    throw new Error(result.message || "فشل رفع الملف إلى Google Drive");
  }

  const fileId = result.fileId || "";
  const directUrl = result.url || "";
  const thumbnailUrl = fileId
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
    : directUrl;
  const previewUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : directUrl;

  return { url: thumbnailUrl, previewUrl, fileId };
}

function showSkeleton(container, count = 3) {
  if (!container) return;
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton-card"><div class="skeleton-line w-60"></div><div class="skeleton-line w-40"></div><div class="skeleton-line w-80"></div></div>`;
  }
  container.innerHTML = html;
}

function showEmptyState(container, icon, message) {
  if (!container) return;
  container.innerHTML = `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${message}</p></div>`;
}
