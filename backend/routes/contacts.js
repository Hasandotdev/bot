const express = require('express');
const router = express.Router();
const contactService = require('../services/contactService');
const { adminAuth } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');

router.use(adminAuth, tenantScope);

router.get('/', async (req, res) => {
  res.json(await contactService.getAll(req.tenantId));
});

router.get('/:id', async (req, res) => {
  const contact = await contactService.getById(req.tenantId, req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

router.post('/', async (req, res) => {
  const contact = await contactService.create(req.tenantId, req.body);
  res.status(201).json(contact);
});

router.put('/:id', async (req, res) => {
  const updated = await contactService.update(req.tenantId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Contact not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const ok = await contactService.remove(req.tenantId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Contact not found' });
  res.json({ ok: true });
});

module.exports = router;