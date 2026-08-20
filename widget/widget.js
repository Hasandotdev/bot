(function () {
  try {
  function getScriptBase() {
    try {
      let src = '';
      if (document.currentScript && document.currentScript.src) {
        src = document.currentScript.src;
      } else {
        const scripts = document.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
          if (scripts[i].src && scripts[i].src.indexOf('/widget/widget.js') !== -1) {
            src = scripts[i].src;
            break;
          }
        }
      }
      return src.replace(/\/widget\/widget\.js.*$/, '');
    } catch (e) { /* ignore */ }
    return '';
  }

  const CONFIG = {
    apiUrl: window.PRISMATIC_API_URL || getScriptBase() || 'http://localhost:3001',
    tenantId: window.PRISMATIC_TENANT_ID || '',
    company: window.PRISMATIC_COMPANY || {
      name: 'Lead Chatbot',
      welcome: 'Lead Chatbot',
      phone: '+92 307 8881432',
      email: 'info@prismatic-technologies.com',
      locations: 'Pakistan, Saudi Arabia, USA',
    },
  };

  const BASE_URL = CONFIG.apiUrl;
  const COMPANY = CONFIG.company;
  let TENANT_ID = CONFIG.tenantId || 'prismatic';
  const STYLES_LOADED = 'prismatic-css-loaded';

  function renderCompanyInfo() {
    const widgetEl = document.getElementById('prismatic-chat-widget');
    if (!widgetEl) return;
    const header = widgetEl.querySelector('#prismatic-chat-header');
    const span = header ? header.querySelector('span') : null;
    if (header && span) {
      span.textContent = COMPANY.name;
      let logoEl = span.querySelector('.prismatic-logo');
      if (COMPANY.logo) {
        if (!logoEl) {
          logoEl = document.createElement('img');
          logoEl.className = 'prismatic-logo';
          logoEl.alt = '';
        }
        logoEl.src = COMPANY.logo;
        span.insertBefore(logoEl, span.firstChild);
      }
    }
    const nameEl = document.getElementById('prismatic-contact-name');
    if (nameEl) nameEl.textContent = COMPANY.name;
    const phoneLink = document.querySelector('#prismatic-contact-card a[href^="tel:"]');
    if (phoneLink) { phoneLink.href = 'tel:' + COMPANY.phone; phoneLink.textContent = 'Phone: ' + COMPANY.phone; }
    const emailLink = document.querySelector('#prismatic-contact-card a[href^="mailto:"]');
    if (emailLink) { emailLink.href = 'mailto:' + COMPANY.email; emailLink.textContent = 'Email: ' + COMPANY.email; }
    const rows = document.querySelectorAll('#prismatic-contact-card .prismatic-contact-row');
    if (rows[2]) rows[2].textContent = 'Locations: ' + COMPANY.locations;
    const welcome = document.querySelector('#prismatic-chat-messages .prismatic-msg.bot');
    if (welcome) {
      welcome.textContent = `Hello 👋 Welcome to ${COMPANY.welcome}. How can I help you today?`;
    }
  }

  function applyTheme(config) {
    if (config.colors && config.colors.primary) {
      document.documentElement.style.setProperty('--prismatic-primary', config.colors.primary);
    }
    if (config.logo) COMPANY.logo = config.logo;
    renderCompanyInfo();
  }

  async function applyConfig() {
    try {
      if (!CONFIG.tenantId) {
        try {
          const res = await fetch(BASE_URL + '/api/chat/resolve?domain=' + encodeURIComponent(window.location.hostname));
          const data = await res.json();
          if (data && data.tenantId) TENANT_ID = data.tenantId;
        } catch (e) {
          // Keep the default tenant.
        }
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(BASE_URL + '/api/chat/config/' + encodeURIComponent(TENANT_ID), { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (!data || !data.name) return;
      if (data.name) { COMPANY.name = data.name; COMPANY.welcome = data.welcome || data.name; }
      if (data.phone) COMPANY.phone = data.phone;
      if (data.email) COMPANY.email = data.email;
      if (data.locations) COMPANY.locations = data.locations;
      applyTheme(data);
    } catch (e) {
      // Never break the widget; keep defaults.
    }
  }

  function loadCSS() {
    if (document.getElementById(STYLES_LOADED)) return;
    const link = document.createElement('link');
    link.id = STYLES_LOADED;
    link.rel = 'stylesheet';
    link.href = BASE_URL + '/widget/widget.css';
    document.head.appendChild(link);
  }

  function createWidget() {
    if (document.getElementById('prismatic-chat-widget')) return;

    const btn = document.createElement('button');
    btn.id = 'prismatic-chat-btn';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>';
    document.body.appendChild(btn);

    const widget = document.createElement('div');
    widget.id = 'prismatic-chat-widget';
    widget.innerHTML = `
      <div id="prismatic-chat-header">
        <span>${COMPANY.name}</span>
        <div class="prismatic-header-actions">
          <button id="prismatic-clear-chat" title="Clear chat">Clear</button>
          <button id="prismatic-contact-toggle" title="Company contact info">Contact</button>
          <button id="prismatic-chat-close">&times;</button>
        </div>
      </div>
      <div id="prismatic-contact-card" class="prismatic-contact-card">
        <div class="prismatic-contact-name">${COMPANY.name}</div>
        <a class="prismatic-contact-row" href="tel:${COMPANY.phone}">Phone: ${COMPANY.phone}</a>
        <a class="prismatic-contact-row" href="mailto:${COMPANY.email}">Email: ${COMPANY.email}</a>
        <div class="prismatic-contact-row">Locations: ${COMPANY.locations}</div>
      </div>
      <div id="prismatic-lead-form">
        <div class="prismatic-lead-title">Welcome 👋</div>
        <p class="prismatic-lead-sub">Share your details to start chatting</p>
        <input id="prismatic-lead-name" type="text" placeholder="Full Name" autocomplete="name">
        <input id="prismatic-lead-email" type="email" placeholder="Email Address" autocomplete="email">
        <input id="prismatic-lead-phone" type="tel" placeholder="Phone Number" autocomplete="tel">
        <input id="prismatic-lead-company" type="text" placeholder="Company (optional)" autocomplete="organization">
        <div id="prismatic-lead-error" class="prismatic-lead-error"></div>
        <button id="prismatic-lead-start">Start Chat</button>
      </div>
      <div id="prismatic-chat-messages">
        <div class="prismatic-msg bot">Hello 👋 Welcome to ${COMPANY.welcome}. How can I help you today?</div>
      </div>
      <div id="prismatic-chat-input-area">
        <input id="prismatic-chat-input" type="text" placeholder="Type a message..." autocomplete="off">
        <button id="prismatic-chat-send">Send</button>
      </div>
    `;
    document.body.appendChild(widget);

    const leadForm = document.getElementById('prismatic-lead-form');
    const messagesEl = document.getElementById('prismatic-chat-messages');
    const inputEl = document.getElementById('prismatic-chat-input');
    const sendEl = document.getElementById('prismatic-chat-send');
    const closeEl = document.getElementById('prismatic-chat-close');
    const contactToggle = document.getElementById('prismatic-contact-toggle');
    const contactCard = document.getElementById('prismatic-contact-card');
    const clearBtn = document.getElementById('prismatic-clear-chat');
    const leadNameEl = document.getElementById('prismatic-lead-name');
    const leadEmailEl = document.getElementById('prismatic-lead-email');
    const leadPhoneEl = document.getElementById('prismatic-lead-phone');
    const leadCompanyEl = document.getElementById('prismatic-lead-company');
    const leadErrorEl = document.getElementById('prismatic-lead-error');
    const leadStartBtn = document.getElementById('prismatic-lead-start');

    let lead = null;
    let history = [];
    let isLoading = false;

    function getClientId() {
      try {
        let id = sessionStorage.getItem('prismatic-client-id');
        if (!id) {
          id = (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'client-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
          sessionStorage.setItem('prismatic-client-id', id);
        }
        return id;
      } catch (e) {
        return 'client-' + Date.now();
      }
    }
    const clientId = getClientId();

    contactToggle.addEventListener('click', () => {
      contactCard.classList.toggle('open');
      contactToggle.classList.toggle('active');
    });

    function resetChat() {
      isLoading = false;
      sendEl.disabled = false;
      inputEl.value = '';
      removeTyping();
      messagesEl.querySelectorAll('.prismatic-msg, .prismatic-options').forEach(m => m.remove());
      history = [];
      const firstMsg = document.createElement('div');
      firstMsg.className = 'prismatic-msg bot';
      firstMsg.textContent = lead
        ? `Hello ${lead.name.split(' ')[0]} 👋 Welcome to ${COMPANY.welcome}. How can I help you today?`
        : `Hello 👋 Welcome to ${COMPANY.welcome}. How can I help you today?`;
      messagesEl.appendChild(firstMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    clearBtn.addEventListener('click', () => {
      resetChat();
      inputEl.focus();
    });

    leadStartBtn.addEventListener('click', () => {
      const name = leadNameEl.value.trim();
      const email = leadEmailEl.value.trim();
      const phone = leadPhoneEl.value.trim();
      const company = leadCompanyEl.value.trim();
      const errors = [];
      if (!name) errors.push('name');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('a valid email');
      if (!/^[+]?[\d\s()-]{7,}$/.test(phone)) errors.push('a valid phone number');
      if (errors.length) {
        leadErrorEl.textContent = 'Please enter ' + errors.join(', ');
        return;
      }
      lead = { name, email, phone, company };
      leadForm.style.display = 'none';
      messagesEl.style.display = 'flex';
      document.getElementById('prismatic-chat-input-area').style.display = 'flex';
      const firstMsg = messagesEl.querySelector('.prismatic-msg.bot');
      firstMsg.textContent = `Hello ${name.split(' ')[0]} 👋 Welcome to ${COMPANY.welcome}. How can I help you today?`;
      inputEl.focus();
    });

    leadForm.addEventListener('submit', (e) => { e.preventDefault(); leadStartBtn.click(); });

    [leadNameEl, leadEmailEl, leadPhoneEl, leadCompanyEl].forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          leadStartBtn.click();
        }
      });
    });

    function addMessage(text, type) {
      const div = document.createElement('div');
      div.className = 'prismatic-msg ' + type;
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function addOptions(options) {
      const container = document.createElement('div');
      container.className = 'prismatic-options';
      const selected = new Set();
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'prismatic-option-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          if (selected.has(opt)) {
            selected.delete(opt);
            btn.classList.remove('selected');
          } else {
            selected.add(opt);
            btn.classList.add('selected');
          }
        });
        container.appendChild(btn);
      });
      const doneBtn = document.createElement('button');
      doneBtn.className = 'prismatic-option-done';
      doneBtn.textContent = 'Continue';
      doneBtn.addEventListener('click', () => {
        if (selected.size === 0) return;
        container.querySelectorAll('button').forEach(b => b.disabled = true);
        doneBtn.textContent = 'Sent ✓';
        sendMessage([...selected].join(', '));
      });
      container.appendChild(doneBtn);
      messagesEl.appendChild(container);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showTyping() {
      const div = document.createElement('div');
      div.className = 'prismatic-typing';
      div.id = 'prismatic-typing-indicator';
      div.innerHTML = '<span></span><span></span><span></span>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function removeTyping() {
      const el = document.getElementById('prismatic-typing-indicator');
      if (el) el.remove();
    }

    function addErrorMessage(text, originalMsg) {
      const div = document.createElement('div');
      div.className = 'prismatic-msg bot prismatic-msg-error';
      const p = document.createElement('span');
      p.textContent = text;
      div.appendChild(p);
      const retryBtn = document.createElement('button');
      retryBtn.className = 'prismatic-retry-btn';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', () => {
        div.remove();
        doRequest(originalMsg);
      });
      div.appendChild(retryBtn);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function doRequest(msg) {
      if (isLoading) return;
      isLoading = true;
      sendEl.disabled = true;
      showTyping();

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);
        const res = await fetch(BASE_URL + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, history, lead, clientId, tenantId: TENANT_ID }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await res.json();
        removeTyping();

        const reply = typeof data.reply === 'string' ? data.reply : '';
        if (reply) {
          const optionsMatch = reply.match(/##OPTIONS:\s*(.+?)##/);
          if (optionsMatch) {
            const text = reply.replace(/##OPTIONS:\s*.+?##/, '').trim();
            if (text) {
              addMessage(text, 'bot');
              history.push({ role: 'assistant', content: text });
            }
            const options = optionsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
            addOptions(options);
            const fullReply = text + '\n[Options: ' + options.join(', ') + ']';
            if (!text) history.push({ role: 'assistant', content: fullReply });
          } else {
            addMessage(reply, 'bot');
            history.push({ role: 'assistant', content: reply });
          }
        } else {
          addErrorMessage(data.error || 'Sorry, I had trouble connecting. Please try again.', msg);
        }
      } catch (err) {
        removeTyping();
        addErrorMessage('Sorry, I had trouble connecting. Please try again.', msg);
      } finally {
        isLoading = false;
        sendEl.disabled = false;
        inputEl.focus();
      }
    }

    async function sendMessage(msg) {
      if (!msg) msg = inputEl.value.trim();
      if (!msg || isLoading) return;

      inputEl.value = '';
      addMessage(msg, 'user');
      history.push({ role: 'user', content: msg });
      await doRequest(msg);
    }

    sendEl.addEventListener('click', () => sendMessage());
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    let isOpen = false;
    btn.addEventListener('click', () => {
      isOpen = !isOpen;
      widget.classList.toggle('open', isOpen);
      if (isOpen) inputEl.focus();
    });
    closeEl.addEventListener('click', () => {
      isOpen = false;
      widget.classList.remove('open');
      resetChat();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { loadCSS(); createWidget(); applyConfig(); });
  } else {
    loadCSS();
    createWidget();
    applyConfig();
  }
  } catch (e) {
    console.error('[Lead Chatbot Widget] Error:', e);
  }
})();
