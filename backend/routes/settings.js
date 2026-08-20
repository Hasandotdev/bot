const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');
const emailService = require('../services/emailService');
const { adminAuth } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');

router.use(adminAuth, tenantScope);

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

router.get('/', async (req, res) => {
  res.json(await settingsService.getPublic(req.tenantId));
});

router.put('/', async (req, res) => {
  const { name, company, username, password, confirmPassword, avatar, email, phone, locations, colors, logo, emailNotifications } = req.body;

  if (username !== undefined && username !== null && !String(username).trim()) {
    return res.status(400).json({ error: 'Username cannot be empty' });
  }

  if (email !== undefined && email !== null) {
    const emailRaw = String(email).trim();
    if (emailRaw && !EMAIL_RE.test(emailRaw)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
  }

  if (password) {
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
  }

  if (avatar && avatar.length > 500000) {
    return res.status(400).json({ error: 'Profile picture is too large (max 500KB)' });
  }

  try {
    const settings = await settingsService.update(req.tenantId, { name, company, username, password, avatar, email, phone, locations, colors, logo, emailNotifications });
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/test-email', async (req, res) => {
  try {
    const settings = await settingsService.getPublic(req.tenantId);
    const to = settings.emailNotifications && settings.email ? settings.email : process.env.ADMIN_EMAIL;
    if (!to) {
      return res.status(400).json({ error: 'No recipient email set. Add it in Settings or set ADMIN_EMAIL in .env' });
    }
    if (!emailService.isConfigured()) {
      return res.status(400).json({ error: 'SMTP is not configured. Add SMTP_HOST, SMTP_USER and SMTP_PASS to .env' });
    }
    const result = await emailService.sendTestEmail(to);
    res.json(result);
  } catch (err) {
    console.error('[settings] Test email failed:', err.message);
    res.status(500).json({ error: 'Failed to send test email: ' + err.message });
  }
});

module.exports = router;