// Firebase Configuration - Benaa OS
var firebaseConfig = {
  apiKey: "AIzaSyBZksJqpumIeRRw3nQAjFbjQdMecVuI95o",
  authDomain: "benaa-os.firebaseapp.com",
  projectId: "benaa-os",
  storageBucket: "benaa-os.firebasestorage.app",
  messagingSenderId: "933915085114",
  appId: "1:933915085114:web:c8098933f915ab9e06e803"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
var db = firebase.firestore();

// ===== Shared Utility Functions =====
function checkAdminSession() {
  return sessionStorage.getItem('adminSession') === 'true';
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600;
    z-index: 10000; animation: slideUp 0.3s ease;
    background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#0f766e'};
    color: white; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

async function addTimelineEvent(text, type = 'info') {
  await db.collection('timeline').add({
    text,
    type,
    time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function updateBudgetOnApproval(amount) {
  const budgetRef = db.collection('budget').doc('main');
  const doc = await budgetRef.get();
  if (doc.exists) {
    await budgetRef.update({ spent: firebase.firestore.FieldValue.increment(amount) });
  } else {
    await budgetRef.set({ total: 0, spent: amount });
  }
}

if (!document.getElementById('benaa-toast-style')) {
  const style = document.createElement('style');
  style.id = 'benaa-toast-style';
  style.textContent = `@keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }`;
  document.head.appendChild(style);
}


// ===== Benaa OS Shared Helpers (RTL / Saudi Time / Sessions) =====
const BENAA_LOGO_PATH = 'assets/logo.png';
const BENAA_TIME_ZONE = 'Asia/Riyadh';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[\s\-()+]/g, '').replace(/^966/, '0');
}

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BENAA_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function getDateKeyFromDate(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BENAA_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function getDateKeyFromTimestamp(timestamp) {
  if (!timestamp) return '';
  if (typeof timestamp === 'string') {
    // Already a YYYY-MM-DD key or an ISO datetime.
    if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
    const parsed = new Date(timestamp);
    return getDateKeyFromDate(parsed);
  }
  if (timestamp.toDate) return getDateKeyFromDate(timestamp.toDate());
  if (timestamp instanceof Date) return getDateKeyFromDate(timestamp);
  if (typeof timestamp.seconds === 'number') return getDateKeyFromDate(new Date(timestamp.seconds * 1000));
  return '';
}

function formatTimeArabic(dateOrTimestamp) {
  let date = dateOrTimestamp;
  if (dateOrTimestamp && dateOrTimestamp.toDate) date = dateOrTimestamp.toDate();
  if (!(date instanceof Date)) date = dateOrTimestamp ? new Date(dateOrTimestamp) : new Date();
  if (!date || Number.isNaN(date.getTime())) date = new Date();
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: BENAA_TIME_ZONE,
    hour: '2-digit', minute: '2-digit', hour12: true
  }).format(date);
}

function formatDateTimeArabic(timestamp) {
  let date = timestamp;
  if (timestamp && timestamp.toDate) date = timestamp.toDate();
  if (!(date instanceof Date)) date = timestamp ? new Date(timestamp) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: BENAA_TIME_ZONE,
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).format(date);
}

function getMediaDateKey(media) {
  return media && (media.dateKey || getDateKeyFromTimestamp(media.createdAt) || getDateKeyFromTimestamp(media.approvedAt));
}

function isMediaFromSelectedDate(media, dateKey) {
  return !!media && !!dateKey && getMediaDateKey(media) === dateKey;
}

function getCurrentParentSession() {
  try { return JSON.parse(sessionStorage.getItem('parentSession') || 'null'); }
  catch (_) { return null; }
}

function getCurrentParentChild() {
  const session = getCurrentParentSession();
  if (!session) return null;
  const children = Array.isArray(session.children) ? session.children : [];
  const selectedId = session.selectedStudentId || session.studentId;
  return children.find(c => c.id === selectedId) || children[0] || null;
}

function saveCurrentParentChild(studentId) {
  const session = getCurrentParentSession();
  if (!session) return;
  session.selectedStudentId = studentId;
  session.studentId = studentId; // backward compatibility with old parentSession shape
  const child = (session.children || []).find(c => c.id === studentId);
  if (child) session.studentName = child.name;
  sessionStorage.setItem('parentSession', JSON.stringify(session));
}

function sortByCreatedDesc(a, b) {
  const ad = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
  const bd = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
  return bd - ad;
}

function makeParentThreadId(parentPhone, studentId, targetRole, targetId = '') {
  return ['parent', normalizePhone(parentPhone), studentId || 'no-student', targetRole || 'admin', targetId || 'general'].join('_');
}
