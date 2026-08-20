const emailService = require('./emailService');

const QUIET_SECONDS = Number(process.env.CHAT_EMAIL_QUIET_SECONDS) || 45;
const timers = new Map();

function timerKey(clientId, sessionId) {
  return `${clientId}::${sessionId}`;
}

function onActivity(clientId, session) {
  if (!session || !session.clientId) return;
  const key = timerKey(clientId, session.clientId);
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    timers.delete(key);
    try {
      const result = await emailService.sendChatEmail(clientId, session);
      if (result.sent) {
        console.log(`[email] chat email sent to ${result.to} (${clientId}/${session.clientId})`);
      } else if (result.skipped) {
        console.log(`[email] skipped (${result.skipped}) for ${clientId}/${session.clientId}`);
      }
    } catch (err) {
      console.error('[email] Failed to send chat email:', err.message);
    }
  }, QUIET_SECONDS * 1000);
  timers.set(key, timer);
}

function flushAll() {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }
  timers.clear();
}

module.exports = { onActivity, flushAll };