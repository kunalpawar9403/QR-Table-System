const STAFF_TOKEN_KEY = 'spice_garden_staff_token';

export function getStaffToken() {
  return localStorage.getItem(STAFF_TOKEN_KEY);
}

export function setStaffToken(token) {
  if (token) {
    localStorage.setItem(STAFF_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(STAFF_TOKEN_KEY);
  }
}

export function clearStaffToken() {
  localStorage.removeItem(STAFF_TOKEN_KEY);
}

export async function verifyStaffPin(pin) {
  const res = await fetch('/api/auth/verify-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: pin.trim() })
  });
  const data = await res.json();
  if (res.ok && data.success && data.token) {
    setStaffToken(data.token);
    return { success: true, token: data.token };
  }
  return { success: false, error: data.error || 'Incorrect Staff PIN' };
}

export async function checkStaffAuth() {
  const token = getStaffToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/auth/check', {
      headers: { 'x-staff-token': token }
    });
    const data = await res.json();
    if (!data.authenticated) {
      clearStaffToken();
      return false;
    }
    return true;
  } catch (e) {
    // If offline or error, return true if token exists
    return true;
  }
}

export async function authFetch(url, options = {}) {
  const token = getStaffToken();
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['x-staff-token'] = token;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    // Session expired or invalid
    clearStaffToken();
    window.dispatchEvent(new CustomEvent('staff:unauthorized'));
  }
  return res;
}
