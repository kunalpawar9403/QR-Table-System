const STAFF_TOKEN_KEY = 'tablemint_staff_token';
const USER_DATA_KEY = 'tablemint_auth_user';

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

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_DATA_KEY);
  }
}

export function clearStaffToken() {
  localStorage.removeItem(STAFF_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
}

export function logoutStaff() {
  clearStaffToken();
  window.dispatchEvent(new CustomEvent('staff:unauthorized'));
}

export async function signInWithCredentials(email, password) {
  try {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setStaffToken(data.token);
      if (data.user) setCurrentUser(data.user);
      return { success: true, token: data.token, user: data.user, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to sign in. Please verify your credentials.' };
  } catch {
    return { success: false, error: 'Network error connecting to server. Please try again.' };
  }
}

export async function signUpWithCredentials({ name, email, password, restaurantName, role }) {
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
        restaurantName: (restaurantName || 'TableMint').trim(),
        role: role || 'admin'
      })
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setStaffToken(data.token);
      if (data.user) setCurrentUser(data.user);
      return { success: true, token: data.token, user: data.user, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to create account.' };
  } catch {
    return { success: false, error: 'Network error connecting to server. Please try again.' };
  }
}

export async function checkStaffAuth() {
  const token = getStaffToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'x-staff-token': token }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        if (data.user) setCurrentUser(data.user);
        return true;
      }
    }
    clearStaffToken();
    return false;
  } catch {
    // If network temporarily drops, return true if user session is cached
    return Boolean(token);
  }
}

export async function authFetch(url, options = {}) {
  const token = getStaffToken();
  const currentUser = getCurrentUser();
  const headers = { ...options.headers };
  if (token) {
    headers['x-staff-token'] = token;
  }
  if (currentUser && (currentUser.restaurantSlug || currentUser.restaurantName)) {
    headers['x-restaurant-slug'] = currentUser.restaurantSlug || currentUser.restaurantName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearStaffToken();
    window.dispatchEvent(new CustomEvent('staff:unauthorized'));
  }
  return res;
}

export async function updateUserProfile({ name, restaurantName }) {
  try {
    const res = await authFetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, restaurantName })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.token) setStaffToken(data.token);
      if (data.user) setCurrentUser(data.user);
      return { success: true, user: data.user, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to update profile' };
  } catch {
    return { success: false, error: 'Connection error while updating profile.' };
  }
}

export async function changeUserPassword({ currentPassword, newPassword }) {
  try {
    const res = await authFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to update password.' };
  } catch {
    return { success: false, error: 'Connection error while updating password.' };
  }
}
