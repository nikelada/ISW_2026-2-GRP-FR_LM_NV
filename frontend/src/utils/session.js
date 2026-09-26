const SESSION_KEY = 'lumina_session';

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
