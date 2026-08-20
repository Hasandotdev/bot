const express = require('express');
const router = express.Router();
const chatLogService = require('../services/chatLogService');
const { adminAuth } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');

router.use(adminAuth, tenantScope);

router.get('/', async (req, res) => {
  res.json(await chatLogService.getAll(req.tenantId));
});

router.get('/:clientId', async (req, res) => {
  const session = await chatLogService.getById(req.tenantId, req.params.clientId);
  if (!session) return res.status(404).json({ error: 'Chat session not found' });
  res.json(session);
});

router.delete('/:clientId', async (req, res) => {
  const ok = await chatLogService.remove(req.tenantId, req.params.clientId);
  if (!ok) return res.status(404).json({ error: 'Chat session not found' });
  res.json({ ok: true });
});

module.exports = router;