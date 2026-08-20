const nodemailer = require('nodemailer');
const settingsService = require('./settingsService');
const clientService = require('./clientService');

const EMAIL_TEMPLATE = (session) => {
  const lead = session.lead || {};
  const messages = (session.messages || [])
    .map(m => {
      const time = m.time ? new Date(m.time).toLocaleString() : '';
      const role = m.role === 'user' ? 'Visitor' : 'Bot';
      const color = m.role === 'user' ? '#dbeafe' : '#f1f5f9';
      const align = m.role === 'user' ? 'right' : 'left';
      const bubbleMargin = m.role === 'user' ? '0 0 0 auto' : '0';
      return `
        <tr>
          <td style="padding:4px 0;">
            <div style="max-width:80%;margin-${align === 'right' ? 'left' : 'right'}:auto;background:${color};border-radius:10px;padding:10px 14px;text-align:${align};">
              <div style="font-size:12px;color:#64748b;margin-bottom:4px;">${role} · ${time}</div>
              <div style="font-size:13px;color:#0f172a;white-space:pre-wrap;">${escapeHtml(m.content)}</div>
            </div>
          </td>
        </tr>`;
    })
    .join('');

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <div style="background:#1e293b;color:#ffffff;padding:20px 24px;">
        <div style="font-size:18px;font-weight:bold;">Leads Chatbot — New Conversation</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${escapeHtml(new Date(session.lastActive || Date.now()).toLocaleString())}</div>
      </div>
      <div style="padding:24px;">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
          <div style="font-size:13px;font-weight:bold;color:#1e40af;margin-bottom:10px;">Visitor Details</div>
          <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;">
            <tr><td style="padding:3px 0;color:#64748b;width:90px;">Name</td><td>${escapeHtml(lead.name || '—')}</td></tr>
            <tr><td style="padding:3px 0;color:#64748b;">Email</td><td><a href="mailto:${escapeAttr(lead.email || '')}" style="color:#2563eb;">${escapeHtml(lead.email || '—')}</a></td></tr>
            <tr><td style="padding:3px 0;color:#64748b;">Phone</td><td>${escapeHtml(lead.phone || '—')}</td></tr>
            <tr><td style="padding:3px 0;color:#64748b;">Company</td><td>${escapeHtml(lead.company || '—')}</td></tr>
            <tr><td style="padding:3px 0;color:#64748b;">Messages</td><td>${(session.messages || []).length}</td></tr>
          </table>
        </div>
        <div style="font-size:13px;font-weight:bold;color:#0f172a;margin-bottom:10px;">Conversation</div>
        <table style="width:100%;border-collapse:collapse;">${messages}</table>
        <p style="font-size:11px;color:#94a3b8;margin-top:16px;">Session ID: ${escapeHtml(session.clientId)} · Sent by Leads Chatbot</p>
      </div>
    </div>
  </div>`;
};

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function getRecipient(clientId) {
  const settings = await settingsService.getPublic(clientId);
  if (settings.emailNotifications && settings.email) return settings.email;
  if (clientId && clientId !== clientService.DEFAULT_TENANT) {
    // Registered clients only receive their own chats. Never leak their
    // transcripts into the provider's (ADMIN_EMAIL) inbox.
    const client = await clientService.getById(clientId);
    if (client && client.emailNotifications && client.email) return client.email;
    return null;
  }
  return process.env.ADMIN_EMAIL || null;
}

async function sendChatEmail(clientId, session) {
  const to = await getRecipient(clientId);
  if (!to) return { skipped: 'no-recipient' };
  if (!isConfigured()) return { skipped: 'smtp-not-configured' };
  const lead = session.lead || {};
  const subject = lead.name || lead.email
    ? `New chat — ${lead.name || lead.email}`
    : 'New chat — Leads Chatbot visitor';
  const info = await getTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html: EMAIL_TEMPLATE(session),
  });
  return { sent: true, messageId: info.messageId, to };
}

async function sendTestEmail(to) {
  if (!isConfigured()) return { skipped: 'smtp-not-configured' };
  const info = await getTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: to || process.env.ADMIN_EMAIL,
    subject: 'Leads Chatbot — Test email',
    html: '<div style="font-family:Arial;padding:24px;"><h2 style="color:#1e293b;">Test email ✅</h2><p style="color:#334155;">Email notifications are working. You will receive an email whenever a visitor has a chat conversation.</p></div>',
  });
  return { sent: true, messageId: info.messageId, to: to || process.env.ADMIN_EMAIL };
}

module.exports = { sendChatEmail, sendTestEmail, isConfigured, getRecipient, EMAIL_TEMPLATE };