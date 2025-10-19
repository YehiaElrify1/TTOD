// === Google Apps Script Web App URL ===
// Replace this URL with your actual deployed Web App URL if needed
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz4q12P3JzcRBnYmtoQumE1GXptvONzCNeufuBmZL5yWZ2rA9q2lf8WqDEd3H57YqoBzA/exec';

// === DOM Elements ===
const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn?.querySelector('.btnText');
const toast = document.getElementById('toast');
const toastInner = document.getElementById('toastInner');

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Initialize AOS animations
if (window.AOS) {
  AOS.init({ once: true, duration: 640, easing: 'ease-out-cubic' });
}

// === Validation Helpers ===

// Validate if the Arabic name contains at least 3 words
function isArabicThreeWords(value) {
  const cleaned = (value || '').trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');
  if (parts.length < 3) return false;
  const ar = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+$/;
  return parts.slice(0, 3).every(p => ar.test(p));
}

// Show or hide an error message
function showError(id, show = true) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? 'block' : 'none';
}

// Mark a field as valid or invalid (for red borders)
function setInvalid(field, invalid) {
  field.setAttribute('aria-invalid', invalid ? 'true' : 'false');
}

// Display a temporary toast message at bottom-left
function showToast(message, isError = false) {
  toast.classList.toggle('error', !!isError);
  toastInner.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3800);
}

// === Send data to Google Sheets via Apps Script ===
async function submitData(payload) {
  const body = new URLSearchParams(payload);
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
    });

    // Handle opaque response (for public web apps)
    if (res.type === 'opaque') return { ok: true };

    if (res.ok) {
      const ct = res.headers.get('Content-Type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json().catch(() => ({ ok: true }));
        if (typeof data.ok === 'string') data.ok = data.ok === 'true';
        return data;
      }
      return { ok: true };
    }

    // If not OK, return error info
    let detail = '';
    try { detail = (await res.text()).slice(0, 200); } catch (_) {}
    return { ok: false, error: `http-${res.status} ${res.statusText} ${detail}`.trim() };

  } catch (err) {
    return { ok: false, error: `network-error: ${err.message}` };
  }
}

// === Form Submission Handler ===
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get form fields
  const fullName = document.getElementById('fullName');
  const studentCode = document.getElementById('studentCode');
  const level = document.getElementById('level');
  const phone = document.getElementById('phone');
  const question = document.getElementById('question');

  // Reset error states
  ['nameError', 'codeError', 'levelError', 'phoneError'].forEach(id => showError(id, false));
  [fullName, studentCode, level, phone].forEach(f => setInvalid(f, false));

  // Manual validation
  let valid = true;

  // Arabic full name check
  if (!isArabicThreeWords(fullName.value)) {
    showError('nameError', true);
    setInvalid(fullName, true);
    valid = false;
  }

  // Student code must be 7 digits
  if (!/^\d{7}$/.test(studentCode.value)) {
    showError('codeError', true);
    setInvalid(studentCode, true);
    valid = false;
  }

  // Level must be selected
  if (!level.value) {
    showError('levelError', true);
    setInvalid(level, true);
    valid = false;
  }

  // Egyptian phone number pattern validation
  if (!/^01[0-2,5]\d{8}$/.test(phone.value)) {
    showError('phoneError', true);
    setInvalid(phone, true);
    valid = false;
  }

  // Optional question validation (limit length)
  const qVal = (question?.value || '').trim();
  if (qVal && qVal.length > 500) {
    showError('questionError', true);
    question.setAttribute('aria-invalid', 'true');
    valid = false;
  }

  // Stop if invalid
  if (!valid) {
    showToast('Please correct the highlighted fields before submitting.', true);
    return;
  }

  // Disable button during submission
  submitBtn.disabled = true;
  if (btnText) btnText.innerHTML = '<span class="spinner"></span> Submitting...';

  // Payload to send
  const payload = {
    fullName: fullName.value.trim(),
    studentCode: studentCode.value.trim(),
    level: level.value,
    phone: phone.value.trim(),
    question: qVal,
  };

  // Submit to Google Apps Script
  const result = await submitData(payload);

  // Handle response
  if (result && result.ok) {
    form.reset();
    showToast('Registration successful! See you at the event.');
  } else {
    const msg = result && result.error ? result.error : 'Submission failed. Please try again later.';
    showToast(msg, true);
  }

  // Re-enable button
  submitBtn.disabled = false;
  if (btnText) btnText.textContent = 'Register Attendance';
});
