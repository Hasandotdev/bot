const API_BASE = '';
const CRED_KEY = 'prismatic-admin-credentials';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

applyTheme(localStorage.getItem('prismatic-admin-theme') || 'light');

const storedCreds = (() => {
  try { return JSON.parse(sessionStorage.getItem(CRED_KEY) || 'null'); }
  catch (e) { return null; }
})();

if (storedCreds && storedCreds.role) {
  location.replace('index.html');
}

const form = document.getElementById('login-form');
const userEl = document.getElementById('login-user');
const passEl = document.getElementById('login-pass');
const errorEl = document.getElementById('login-error');
const btn = document.getElementById('btn-login');

document.getElementById('btn-theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('prismatic-admin-theme', next);
  applyTheme(next);
});

document.getElementById('btn-toggle-pass').addEventListener('click', (e) => {
  const show = passEl.type === 'password';
  passEl.type = show ? 'text' : 'password';
  e.currentTarget.textContent = show ? '🙈' : '👁';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = userEl.value.trim();
  const password = passEl.value;
  hideError();

  if (!username || !password) {
    showError('Please enter both username and password.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const res = await fetch(API_BASE + '/api/admin/login', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + btoa(username + ':' + password) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Invalid username or password');
    }
    const data = await res.json();
    sessionStorage.setItem(CRED_KEY, JSON.stringify({
      username,
      password,
      role: data.role,
      clientId: data.clientId || null,
      name: data.name || username,
    }));
    location.replace('index.html');
  } catch (err) {
    passEl.value = '';
    passEl.focus();
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.textContent = '';
  errorEl.hidden = true;
}