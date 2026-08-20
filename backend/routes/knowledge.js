const express = require('express');
const router = express.Router();
const knowledgeService = require('../services/knowledgeService');
const { adminAuth } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');

router.use(adminAuth, tenantScope);

router.get('/', async (req, res) => {
  const { q } = req.query;
  if (q) return res.json(await knowledgeService.search(req.tenantId, q));
  res.json(await knowledgeService.getAll(req.tenantId));
});

router.get('/:id', async (req, res) => {
  const entry = await knowledgeService.getById(req.tenantId, req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  res.json(entry);
});

router.post('/', async (req, res) => {
  const entry = await knowledgeService.create(req.tenantId, req.body);
  res.status(201).json(entry);
});

router.put('/:id', async (req, res) => {
  const updated = await knowledgeService.update(req.tenantId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Entry not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const ok = await knowledgeService.remove(req.tenantId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Entry not found' });
  res.json({ ok: true });
});

module.exports = router;