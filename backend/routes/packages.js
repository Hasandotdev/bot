const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService');
const { adminAuth } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');

router.use(adminAuth, tenantScope);

router.get('/', async (req, res) => {
  res.json(await packageService.getAll(req.tenantId));
});

router.get('/:id', async (req, res) => {
  const pkg = await packageService.getById(req.tenantId, req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  res.json(pkg);
});

router.post('/', async (req, res) => {
  const pkg = await packageService.create(req.tenantId, req.body);
  res.status(201).json(pkg);
});

router.put('/:id', async (req, res) => {
  const updated = await packageService.update(req.tenantId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Package not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const ok = await packageService.remove(req.tenantId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Package not found' });
  res.json({ ok: true });
});

module.exports = router;