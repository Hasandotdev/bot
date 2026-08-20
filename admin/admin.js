const API_BASE = '';
const CRED_KEY = 'prismatic-admin-credentials';
const TENANT_KEY = 'prismatic-active-tenant';
let credentials = (() => {
  try { return JSON.parse(sessionStorage.getItem(CRED_KEY) || 'null'); }
  catch (e) { return null; }
})();

// Old sessions (stored before the multi-tenant update) have no role field.
// Treat them as logged out so the user must log in again with the new flow.
if (credentials && !credentials.role) {
  credentials = null;
  sessionStorage.removeItem(CRED_KEY);
  location.replace('login.html');
}

function isSuper() { return credentials && credentials.role === 'super'; }

function getActiveTenant() {
  if (!credentials) return null;
  if (!isSuper()) return credentials.clientId || 'prismatic';
  return sessionStorage.getItem(TENANT_KEY) || null;
}

// ---------- Theme ----------
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  const sel = document.getElementById('settings-theme');
  if (sel) sel.value = theme;
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('prismatic-admin-theme', current);
  applyTheme(current);
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(localStorage.getItem('prismatic-admin-theme') || 'light');
});
applyTheme(localStorage.getItem('prismatic-admin-theme') || 'light');

function getAuthHeader() {
  if (!credentials) return {};
  return { Authorization: 'Basic ' + btoa(credentials.username + ':' + credentials.password) };
}

async function api(path, options = {}) {
  const res = await fetch(API_BASE + '/api' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': getActiveTenant(), ...getAuthHeader(), ...(options.headers || {}) },
  });
  if (res.status === 401 || res.status === 403) {
    credentials = null;
    sessionStorage.removeItem(CRED_KEY);
    location.replace('login.html');
    throw new Error('Authentication failed');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function showToast(msg, type) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast ' + (type || 'info');
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

function updateAuthUI() {
  if (!credentials) {
    location.replace('login.html');
    return;
  }
  document.getElementById('btn-logout').style.display = 'inline-block';
  document.getElementById('nav-profile').style.display = 'flex';
  const nameEl = document.getElementById('nav-profile-name');
  nameEl.textContent = credentials.name || (isSuper() ? 'Super Admin' : 'Admin');
  const roleBadge = document.getElementById('nav-role');
  if (roleBadge) {
    roleBadge.textContent = isSuper() ? 'Super Admin' : 'Client Admin';
    roleBadge.classList.toggle('role-super', isSuper());
  }
  const clientsTab = document.getElementById('tab-clients-btn');
  if (clientsTab) clientsTab.style.display = isSuper() ? 'block' : 'none';
  const tenantControl = document.getElementById('tenant-control');
  if (tenantControl) tenantControl.style.display = isSuper() ? 'flex' : 'none';
  const tenantSelect = document.getElementById('tenant-switcher');
  if (tenantSelect) tenantSelect.style.display = isSuper() ? '' : 'none';
  document.querySelectorAll('.tenant-tab').forEach(t => {
    // Widget + Scraper are super-admin-only observation tools. Client
    // admins get all their own tenant tabs except those two.
    const visible = isSuper()
      ? (t.dataset.tab === 'widget' || t.dataset.tab === 'scraper')
      : (t.dataset.tab !== 'widget' && t.dataset.tab !== 'scraper');
    t.style.display = visible ? 'block' : 'none';
  });

  if (isSuper()) {
    loadTenantSwitcher();
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    if (clientsTab) clientsTab.classList.add('active');
    document.getElementById('tab-clients').classList.add('active');
    loadClients();
    return;
  }
  loadContacts();
  loadKnowledge();
  loadProducts();
  loadServices();
  loadPackages();
  loadWidget();
  loadChatLogs();
  loadSettings();
}

async function loadTenantSwitcher() {
  try {
    const clients = await api('/clients');
    const sel = document.getElementById('tenant-switcher');
    const current = getActiveTenant();
    sel.innerHTML = clients.map(c => `<option value="${esc(c.id)}">${esc(c.name || c.username)}</option>`).join('') ||
      '<option value="">No clients yet</option>';
    if (current && [...sel.options].some(o => o.value === current)) {
      sel.value = current;
    } else {
      sel.value = '';
      if (current) sessionStorage.removeItem(TENANT_KEY);
    }
    const label = document.getElementById('tenant-label');
    if (label) {
      const active = [...sel.options].find(o => o.value === sel.value);
      label.textContent = sel.value
        ? 'Managing: ' + (active ? active.textContent : '')
        : 'Select a client to manage';
    }
  } catch (e) {
    showToast('Failed to load clients: ' + e.message, 'error');
  }
}

document.getElementById('tenant-switcher').addEventListener('change', (e) => {
  const value = e.target.value;
  if (!value) {
    sessionStorage.removeItem(TENANT_KEY);
  } else {
    sessionStorage.setItem(TENANT_KEY, value);
  }
  loadTenantSwitcher();
  if (value) {
    loadContacts();
    loadKnowledge();
    loadProducts();
    loadServices();
    loadPackages();
    loadChatLogs();
    loadSettings();
    loadWidget();
  }
});

document.getElementById('btn-logout').addEventListener('click', () => {
  credentials = null;
  sessionStorage.removeItem(CRED_KEY);
  updateAuthUI();
});
document.getElementById('btn-theme').addEventListener('click', toggleTheme);
document.getElementById('settings-theme').addEventListener('change', (e) => {
  localStorage.setItem('prismatic-admin-theme', e.target.value);
  applyTheme(e.target.value);
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'chatlogs') loadChatLogs();
    if (tab.dataset.tab === 'widget') loadWidget();
  });
});

async function loadClients() {
  try {
    const clients = await api('/clients');
    const tbody = document.querySelector('#clients-table tbody');
    tbody.innerHTML = clients.map(c => `
      <tr>
        <td><code style="font-size:11px">${esc(c.id)}</code></td>
        <td>${esc(c.name)}</td>
        <td>${esc(c.company || '—')}</td>
        <td>${esc(c.username)}</td>
        <td>${c.stats?.chatCount || 0}</td>
        <td><strong>${c.stats?.chatCountThisMonth || 0}</strong></td>
        <td>${c.stats?.messagesThisMonth || 0}</td>
        <td>${c.stats?.contactCount || 0}</td>
        <td>${esc(formatTime(c.createdAt))}</td>
        <td class="actions">
          <button class="btn-secondary btn-small" onclick="editClient('${esc(c.id)}')">Edit</button>
          <button class="btn-danger btn-small" onclick="deleteClient('${esc(c.id)}')">Del</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    showToast('Failed to load clients: ' + e.message, 'error');
  }
}

function openClientForm(data) {
  document.getElementById('client-id').value = data?.id || '';
  document.getElementById('client-name').value = data?.name || '';
  document.getElementById('client-company').value = data?.company || '';
  document.getElementById('client-username').value = data?.username || '';
  document.getElementById('client-email').value = data?.email || '';
  document.getElementById('client-phone').value = data?.phone || '';
  document.getElementById('client-domains').value = (data?.domains || []).join(', ');
  document.getElementById('client-password').value = '';
  document.getElementById('client-modal-title').textContent = data ? 'Edit Client' : 'Add Client';
  document.getElementById('client-modal').classList.add('open');
}

async function editClient(id) {
  try {
    const clients = await api('/clients');
    const c = clients.find(x => x.id === id);
    if (c) openClientForm(c);
  } catch (e) {
    showToast('Failed to load client: ' + e.message, 'error');
  }
}

async function deleteClient(id) {
  if (!confirm('Delete this client and ALL its chatbot data? This cannot be undone.')) return;
  try {
    await api('/clients/' + id, { method: 'DELETE' });
    showToast('Client deleted', 'success');
    if (getActiveTenant() === id) {
      sessionStorage.removeItem(TENANT_KEY);
      loadTenantSwitcher();
    }
    loadClients();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

async function saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('client-id').value;
  const data = {
    name: document.getElementById('client-name').value,
    company: document.getElementById('client-company').value,
    username: document.getElementById('client-username').value,
    email: document.getElementById('client-email').value,
    phone: document.getElementById('client-phone').value,
    domains: document.getElementById('client-domains').value,
    password: document.getElementById('client-password').value,
  };
  if (!id && !data.password) {
    showToast('Password is required for a new client', 'error');
    return;
  }
  try {
    if (id) {
      await api('/clients/' + id, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Client updated', 'success');
    } else {
      await api('/clients', { method: 'POST', body: JSON.stringify(data) });
      showToast('Client added', 'success');
    }
    closeModal('client-modal');
    loadClients();
    loadTenantSwitcher();
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
}

async function loadContacts() {
  try {
    const contacts = await api('/contacts');
    const tbody = document.querySelector('#contacts-table tbody');
    tbody.innerHTML = contacts.map(c => `
      <tr>
        <td>${esc(c.stack)}</td>
        <td>${esc(c.name || '—')}</td>
        <td>${esc(c.email || '—')}</td>
        <td>${esc(c.phone || '—')}</td>
        <td>${esc((c.keywords || []).join(', '))}</td>
        <td class="actions">
          <button class="btn-secondary btn-small" onclick="editContact('${c.id}')">Edit</button>
          <button class="btn-danger btn-small" onclick="deleteContact('${c.id}')">Del</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    showToast('Failed to load contacts: ' + e.message, 'error');
  }
}

function openContactForm(data) {
  document.getElementById('contact-id').value = data?.id || '';
  document.getElementById('contact-stack').value = data?.stack || '';
  document.getElementById('contact-name').value = data?.name || '';
  document.getElementById('contact-email').value = data?.email || '';
  document.getElementById('contact-phone').value = data?.phone || '';
  document.getElementById('contact-keywords').value = (data?.keywords || []).join(', ');
  document.getElementById('contact-modal-title').textContent = data ? 'Edit Contact' : 'Add Contact';
  document.getElementById('contact-modal').classList.add('open');
}

async function editContact(id) {
  try {
    const contacts = await api('/contacts');
    const c = contacts.find(x => x.id === id);
    if (c) openContactForm(c);
  } catch (e) {
    showToast('Failed to load contact: ' + e.message, 'error');
  }
}

async function deleteContact(id) {
  if (!confirm('Delete this contact?')) return;
  try {
    await api('/contacts/' + id, { method: 'DELETE' });
    showToast('Contact deleted', 'success');
    loadContacts();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

async function saveContact(e) {
  e.preventDefault();
  const id = document.getElementById('contact-id').value;
  const data = {
    stack: document.getElementById('contact-stack').value,
    name: document.getElementById('contact-name').value,
    email: document.getElementById('contact-email').value,
    phone: document.getElementById('contact-phone').value,
    keywords: document.getElementById('contact-keywords').value.split(',').map(s => s.trim()).filter(Boolean),
  };
  try {
    if (id) {
      await api('/contacts/' + id, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Contact updated', 'success');
    } else {
      await api('/contacts', { method: 'POST', body: JSON.stringify(data) });
      showToast('Contact added', 'success');
    }
    closeModal('contact-modal');
    loadContacts();
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
}

async function loadKnowledge() {
  try {
    const entries = await api('/knowledge');
    const tbody = document.querySelector('#knowledge-table tbody');
    tbody.innerHTML = entries.map(e => `
      <tr>
        <td>${esc(e.label)}</td>
        <td>${esc(e.topic)}</td>
        <td style="max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.content.substring(0, 100))}${e.content.length > 100 ? '...' : ''}</td>
        <td>${esc(e.linkedStack || '—')}</td>
        <td class="actions">
          <button class="btn-secondary btn-small" onclick="editKb('${e.id}')">Edit</button>
          <button class="btn-danger btn-small" onclick="deleteKb('${e.id}')">Del</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    showToast('Failed to load knowledge: ' + e.message, 'error');
  }
}

function openKbForm(data) {
  document.getElementById('kb-id').value = data?.id || '';
  document.getElementById('kb-label').value = data?.label || '';
  document.getElementById('kb-topic').value = data?.topic || '';
  document.getElementById('kb-content').value = data?.content || '';
  document.getElementById('kb-stack').value = data?.linkedStack || '';
  document.getElementById('kb-modal-title').textContent = data ? 'Edit Knowledge Entry' : 'Add Knowledge Entry';
  document.getElementById('kb-modal').classList.add('open');
}

async function editKb(id) {
  try {
    const entries = await api('/knowledge');
    const e = entries.find(x => x.id === id);
    if (e) openKbForm(e);
  } catch (e) {
    showToast('Failed to load entry: ' + e.message, 'error');
  }
}

async function deleteKb(id) {
  if (!confirm('Delete this entry?')) return;
  try {
    await api('/knowledge/' + id, { method: 'DELETE' });
    showToast('Entry deleted', 'success');
    loadKnowledge();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

async function saveKb(e) {
  e.preventDefault();
  const id = document.getElementById('kb-id').value;
  const data = {
    label: document.getElementById('kb-label').value,
    topic: document.getElementById('kb-topic').value,
    content: document.getElementById('kb-content').value,
    linkedStack: document.getElementById('kb-stack').value || null,
  };
  try {
    if (id) {
      await api('/knowledge/' + id, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Entry updated', 'success');
    } else {
      await api('/knowledge', { method: 'POST', body: JSON.stringify(data) });
      showToast('Entry added', 'success');
    }
    closeModal('kb-modal');
    loadKnowledge();
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
}

async function loadProducts() {
  try {
    const products = await api('/products');
    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${esc(p.name)}</td>
        <td>${esc(p.stack || '—')}</td>
        <td>${esc(p.category || '—')}</td>
        <td>${esc(p.priceRange || '—')}</td>
        <td style="max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((p.description || '').substring(0, 80))}${(p.description || '').length > 80 ? '...' : ''}</td>
        <td class="actions">
          <button class="btn-secondary btn-small" onclick="editProduct('${p.id}')">Edit</button>
          <button class="btn-danger btn-small" onclick="deleteProduct('${p.id}')">Del</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    showToast('Failed to load products: ' + e.message, 'error');
  }
}

function openProductForm(data) {
  document.getElementById('product-id').value = data?.id || '';
  document.getElementById('product-name').value = data?.name || '';
  document.getElementById('product-stack').value = data?.stack || '';
  document.getElementById('product-category').value = data?.category || 'development';
  document.getElementById('product-price').value = data?.priceRange || '';
  document.getElementById('product-desc').value = data?.description || '';
  document.getElementById('product-modal-title').textContent = data ? 'Edit Product' : 'Add Product';
  document.getElementById('product-modal').classList.add('open');
}

async function editProduct(id) {
  try {
    const products = await api('/products');
    const p = products.find(x => x.id === id);
    if (p) openProductForm(p);
  } catch (e) {
    showToast('Failed to load product: ' + e.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await api('/products/' + id, { method: 'DELETE' });
    showToast('Product deleted', 'success');
    loadProducts();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const data = {
    name: document.getElementById('product-name').value,
    stack: document.getElementById('product-stack').value,
    category: document.getElementById('product-category').value,
    priceRange: document.getElementById('product-price').value,
    description: document.getElementById('product-desc').value,
  };
  try {
    if (id) {
      await api('/products/' + id, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Product updated', 'success');
    } else {
      await api('/products', { method: 'POST', body: JSON.stringify(data) });
      showToast('Product added', 'success');
    }
    closeModal('product-modal');
    loadProducts();
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
}

async function loadServices() {
  try {
    const services = await api('/services');
    const tbody = document.querySelector('#services-table tbody');
    tbody.innerHTML = services.map(s => `
      <tr>
        <td>${esc(s.name)}</td>
        <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.description || '—')}</td>
        <td>${(s.qualifyingQuestions || []).length}</td>
        <td>${(s.features || []).length}</td>
        <td class="actions">
          <button class="btn-secondary btn-small" onclick="editService('${s.id}')">Edit</button>
          <button class="btn-danger btn-small" onclick="deleteService('${s.id}')">Del</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="cell-muted">No services yet — add one or generate from the Knowledge Base.</td></tr>';
  } catch (e) {
    showToast('Failed to load services: ' + e.message, 'error');
  }
}

function openServiceForm(data) {
  document.getElementById('service-id').value = data?.id || '';
  document.getElementById('service-name').value = data?.name || '';
  document.getElementById('service-desc').value = data?.description || '';
  document.getElementById('service-qquestions').value = (data?.qualifyingQuestions || []).join('\n');
  document.getElementById('service-equestions').value = (data?.engagementQuestions || []).join('\n');
  document.getElementById('service-features').value = (data?.features || []).join('\n');
  document.getElementById('service-modal-title').textContent = data ? 'Edit Service' : 'Add Service';
  document.getElementById('service-modal').classList.add('open');
}

async function editService(id) {
  try {
    const s = await api('/services/' + id);
    openServiceForm(s);
  } catch (e) {
    showToast('Failed to load service: ' + e.message, 'error');
  }
}

async function deleteService(id) {
  if (!confirm('Delete this service? The bot will stop qualifying leads for it.')) return;
  try {
    await api('/services/' + id, { method: 'DELETE' });
    showToast('Service deleted', 'success');
    loadServices();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

async function saveService(e) {
  e.preventDefault();
  const id = document.getElementById('service-id').value;
  const data = {
    name: document.getElementById('service-name').value,
    description: document.getElementById('service-desc').value,
    qualifyingQuestions: document.getElementById('service-qquestions').value,
    engagementQuestions: document.getElementById('service-equestions').value,
    features: document.getElementById('service-features').value,
  };
  try {
    if (id) {
      await api('/services/' + id, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Service updated', 'success');
    } else {
      await api('/services', { method: 'POST', body: JSON.stringify(data) });
      showToast('Service added', 'success');
    }
    closeModal('service-modal');
    loadServices();
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
}

async function triggerGenerateServices() {
  const btn = document.getElementById('btn-generate-services');
  const result = document.getElementById('generate-services-result');
  if (!confirm('This will replace your current service list with services drafted from the scraped Knowledge Base. Continue?')) return;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  result.style.display = 'none';
  try {
    const data = await api('/services/generate', { method: 'POST' });
    showToast(`Generated ${data.count} service(s) — review and edit below`, 'success');
    loadServices();
  } catch (e) {
    result.style.display = 'block';
    result.textContent = 'Failed: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate from Knowledge Base';
  }
}

async function loadPackages() {
  try {
    const packages = await api('/packages');
    const tbody = document.querySelector('#packages-table tbody');
    tbody.innerHTML = packages.map(p => {
      const pkgs = p.packages || {};
      const cell = (t) => {
        const v = pkgs[t];
        if (!v || !(v.price || '').trim()) return '<span class="cell-muted">—</span>';
        return `<div>${esc(v.price)}</div><div class="cell-muted cell-clip">${esc(v.features || '')}</div>`;
      };
      return `
        <tr>
          <td>${esc(p.service)}</td>
          <td>${cell('Basic')}</td>
          <td>${cell('Standard')}</td>
          <td>${cell('Premium')}</td>
          <td class="actions">
            <button class="btn-secondary btn-small" onclick="editPackage('${p.id}')">Edit</button>
            <button class="btn-danger btn-small" onclick="deletePackage('${p.id}')">Del</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    showToast('Failed to load packages: ' + e.message, 'error');
  }
}

function openPackageForm(data) {
  const pkgs = data?.packages || {};
  document.getElementById('package-id').value = data?.id || '';
  document.getElementById('package-service').value = data?.service || '';
  document.getElementById('pkg-basic-price').value = pkgs.Basic?.price || '';
  document.getElementById('pkg-basic-features').value = pkgs.Basic?.features || '';
  document.getElementById('pkg-premium-price').value = pkgs.Premium?.price || '';
  document.getElementById('pkg-premium-features').value = pkgs.Premium?.features || '';
  document.getElementById('pkg-standard-price').value = pkgs.Standard?.price || '';
  document.getElementById('pkg-standard-features').value = pkgs.Standard?.features || '';
  document.getElementById('package-modal-title').textContent = data ? 'Edit Service Package' : 'Add Service Package';
  document.getElementById('package-modal').classList.add('open');
}

async function editPackage(id) {
  try {
    const packages = await api('/packages');
    const p = packages.find(x => x.id === id);
    if (p) openPackageForm(p);
  } catch (e) {
    showToast('Failed to load package: ' + e.message, 'error');
  }
}

async function deletePackage(id) {
  if (!confirm('Delete this service package?')) return;
  try {
    await api('/packages/' + id, { method: 'DELETE' });
    showToast('Package deleted', 'success');
    loadPackages();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

async function savePackage(e) {
  e.preventDefault();
  const id = document.getElementById('package-id').value;
  const data = {
    service: document.getElementById('package-service').value,
    packages: {
      Basic: {
        price: document.getElementById('pkg-basic-price').value,
        features: document.getElementById('pkg-basic-features').value,
      },
      Standard: {
        price: document.getElementById('pkg-standard-price').value,
        features: document.getElementById('pkg-standard-features').value,
      },
      Premium: {
        price: document.getElementById('pkg-premium-price').value,
        features: document.getElementById('pkg-premium-features').value,
      },
    },
  };
  try {
    if (id) {
      await api('/packages/' + id, { method: 'PUT', body: JSON.stringify(data) });
      showToast('Package updated', 'success');
    } else {
      await api('/packages', { method: 'POST', body: JSON.stringify(data) });
      showToast('Package added', 'success');
    }
    closeModal('package-modal');
    loadPackages();
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
  }
}

async function triggerScrape() {
  const btn = document.getElementById('btn-scrape');
  const result = document.getElementById('scrape-result');
  if (!getActiveTenant()) {
    result.innerHTML = `<strong>Error:</strong> Select a client from the switcher above first.`;
    result.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Scraping...';
  result.style.display = 'none';
  try {
    const data = await api('/admin/scrape', {
      method: 'POST',
      body: JSON.stringify({ url: document.getElementById('scrape-url').value }),
    });
    const contactLine = data.contact && (data.contact.phone || data.contact.email)
      ? `<br>Contact found: ${data.contact.phone || '—'} / ${data.contact.email || '—'} (saved so the chatbot can share it)`
      : '';
    result.innerHTML = `<strong>Done!</strong> ${data.entriesAdded} new entries added. Total: ${data.totalEntries} entries.${contactLine}`;
    result.style.display = 'block';
    loadKnowledge();
    loadContacts();
  } catch (e) {
    result.innerHTML = `<strong>Error:</strong> ${e.message}`;
    result.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Scrape';
  }
}

function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function clientLabel(s) {
  const lead = s.lead || {};
  return lead.name || lead.email || lead.phone || s.clientId.slice(0, 8);
}

async function loadWidget() {
  const tenantId = getActiveTenant();
  document.getElementById('widget-tenant-id').textContent = tenantId || '—';
  const origin = window.location.origin;
  const codeEl = document.getElementById('widget-embed-code');
  if (!tenantId && isSuper()) {
    codeEl.value = 'Select a client from the switcher above to see their embed code.';
    return;
  }
  codeEl.value = tenantId
    ? `<script>\n  window.PRISMATIC_TENANT_ID = '${tenantId}';\n<\/script>\n<script src="${origin}/widget/widget.js"><\/script>`
    : '';
}

async function copyWidgetCode() {
  const code = document.getElementById('widget-embed-code').value;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    showToast('Embed code copied', 'success');
  } catch (e) {
    const ta = document.getElementById('widget-embed-code');
    ta.select();
    document.execCommand('copy');
    showToast('Embed code copied', 'success');
  }
}

async function loadChatLogs() {
  try {
    const sessions = await api('/chatlogs');
    const tbody = document.querySelector('#chatlogs-table tbody');
    tbody.innerHTML = sessions.map(s => `
      <tr>
        <td><code style="font-size:11px">${esc(s.clientId.slice(0, 13))}…</code></td>
        <td>${esc(s.lead?.name || '—')}</td>
        <td>${esc(s.lead?.email || '—')}</td>
        <td>${esc(s.lead?.phone || '—')}</td>
        <td>${s.messageCount}</td>
        <td>${esc(formatTime(s.lastActive))}</td>
        <td style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.preview || '')}</td>
        <td class="actions">
          <button class="btn-secondary btn-small" onclick="viewChat('${s.clientId}')">View</button>
          <button class="btn-danger btn-small" onclick="deleteChat('${s.clientId}')">Del</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    showToast('Failed to load chat logs: ' + e.message, 'error');
  }
}

async function viewChat(clientId) {
  try {
    const session = await api('/chatlogs/' + clientId);
    const lead = session.lead || {};
    document.getElementById('chatlog-detail-title').textContent =
      `Chat — ${clientLabel(session)}${lead.email ? ' (' + lead.email + ')' : ''}`;
    const msgsEl = document.getElementById('chatlog-messages');
    msgsEl.innerHTML = session.messages.map(m => `
      <div class="chatlog-msg ${m.role === 'user' ? 'user' : 'bot'}">
        <div class="chatlog-bubble">${esc(m.content)}</div>
        <div class="chatlog-time">${esc(formatTime(m.time))}</div>
      </div>
    `).join('');
    document.getElementById('chatlog-list').style.display = 'none';
    document.getElementById('chatlog-detail').style.display = 'block';
    msgsEl.scrollTop = msgsEl.scrollHeight;
  } catch (e) {
    showToast('Failed to load chat: ' + e.message, 'error');
  }
}

function backToChatLogs() {
  document.getElementById('chatlog-detail').style.display = 'none';
  document.getElementById('chatlog-list').style.display = 'block';
}

async function deleteChat(clientId) {
  if (!confirm('Delete this chat session?')) return;
  try {
    await api('/chatlogs/' + clientId, { method: 'DELETE' });
    showToast('Chat deleted', 'success');
    loadChatLogs();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

let settingsAvatar = null;
let settingsLogo = null;

function renderLogo(logo) {
  const preview = document.getElementById('settings-logo-preview');
  const removeBtn = document.getElementById('btn-remove-logo');
  if (logo) {
    preview.style.display = 'block';
    preview.style.backgroundImage = `url("${logo}")`;
    removeBtn.style.display = 'inline-block';
  } else {
    preview.style.display = 'none';
    preview.style.backgroundImage = 'none';
    removeBtn.style.display = 'none';
  }
}

function onLogoFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 500000) {
    showToast('Logo is too large (max 500KB)', 'error');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    settingsLogo = e.target.result;
    renderLogo(settingsLogo);
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  settingsLogo = null;
  document.getElementById('settings-logo-file').value = '';
  renderLogo(null);
}

function renderAvatar(avatar, name, container) {
  const nameEl = container ? null : document.getElementById('nav-profile-name');
  if (nameEl) nameEl.textContent = name || 'Admin';
  const el = container || document.getElementById('nav-avatar');
  if (!el) return;
  if (avatar) {
    el.style.backgroundImage = `url("${avatar}")`;
    el.textContent = '';
  } else {
    el.style.backgroundImage = 'none';
    el.textContent = (name || 'A').charAt(0).toUpperCase();
  }
}

async function loadSettings() {
  try {
    const s = await api('/settings');
    document.getElementById('settings-name').value = s.name || '';
    document.getElementById('settings-company').value = s.company || '';
    document.getElementById('settings-username').value = s.username || '';
    document.getElementById('settings-password').value = '';
    document.getElementById('settings-confirm').value = '';
    document.getElementById('settings-email').value = s.email || '';
    document.getElementById('settings-phone').value = s.phone || '';
    document.getElementById('settings-locations').value = s.locations || '';
    document.getElementById('settings-color').value = (s.colors && s.colors.primary) || '#2563eb';
    settingsLogo = s.logo || null;
    renderLogo(settingsLogo);
    document.getElementById('settings-email-notify').checked = !!s.emailNotifications;
    settingsAvatar = s.avatar || null;
    renderAvatar(settingsAvatar, s.name, document.getElementById('settings-avatar-preview'));
    renderAvatar(settingsAvatar, s.name);
  } catch (e) {
    showToast('Failed to load settings: ' + e.message, 'error');
  }
}

async function sendTestEmail() {
  const btn = document.getElementById('btn-test-email');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  try {
    await api('/settings/test-email', { method: 'POST' });
    showToast('Test email sent. Check the recipient inbox.', 'success');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Test Email';
  }
}

function onAvatarFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 500000) {
    showToast('Profile picture is too large (max 500KB)', 'error');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    settingsAvatar = e.target.result;
    renderAvatar(settingsAvatar, document.getElementById('settings-name').value, document.getElementById('settings-avatar-preview'));
  };
  reader.readAsDataURL(file);
}

function removeAvatar() {
  settingsAvatar = null;
  const fileInput = document.getElementById('settings-avatar-file');
  fileInput.value = '';
  renderAvatar(null, document.getElementById('settings-name').value, document.getElementById('settings-avatar-preview'));
}

async function saveSettings(e) {
  e.preventDefault();
  const name = document.getElementById('settings-name').value.trim();
  const company = document.getElementById('settings-company').value.trim();
  const username = document.getElementById('settings-username').value.trim();
  const password = document.getElementById('settings-password').value;
  const confirmPassword = document.getElementById('settings-confirm').value;
  const email = document.getElementById('settings-email').value.trim();
  const phone = document.getElementById('settings-phone').value.trim();
  const locations = document.getElementById('settings-locations').value.trim();
  const primaryColor = document.getElementById('settings-color').value;
  const emailNotifications = document.getElementById('settings-email-notify').checked;
  try {
    await api('/settings', {
      method: 'PUT',
      body: JSON.stringify({ name, company, username, password, confirmPassword, avatar: settingsAvatar, email, phone, locations, colors: { primary: primaryColor }, logo: settingsLogo, emailNotifications }),
    });
    if (password) {
      showToast('Settings saved. Please log in again with the new password.', 'success');
      credentials = null;
      sessionStorage.removeItem(CRED_KEY);
      updateAuthUI();
    } else {
      showToast('Settings saved', 'success');
      loadSettings();
    }
  } catch (err) {
    showToast('Failed to save settings: ' + err.message, 'error');
  }
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
window.onclick = function(e) {
  if (e.target.classList.contains('modal')) e.target.classList.remove('open');
};

updateAuthUI();
