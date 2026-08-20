const express = require('express');
const router = express.Router();
const clientService = require('../services/clientService');
const { adminAuth } = require('../middleware/auth');

router.use(adminAuth);

function requireSuper(req, res, next) {
  if (req.auth.role !== 'super') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

router.get('/', requireSuper, async (req, res) => {
  const clients = await clientService.getAll();
  res.json(await Promise.all(clients.map(clientService.publicClient)));
});

router.post('/', requireSuper, async (req, res) => {
  try {
    const client = await clientService.create(req.body);
    res.status(201).json(await clientService.publicClient(client));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireSuper, async (req, res) => {
  try {
    const client = await clientService.update(req.params.id, req.body);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(await clientService.publicClient(client));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireSuper, async (req, res) => {
  const ok = await clientService.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Client not found' });
  res.json({ ok: true });
});

module.exports = router;