const express = require('express');
const router = express.Router();
const productService = require('../services/productService');
const { adminAuth } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');

router.use(adminAuth, tenantScope);

router.get('/', async (req, res) => {
  res.json(await productService.getAll(req.tenantId));
});

router.get('/:id', async (req, res) => {
  const product = await productService.getById(req.tenantId, req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/', async (req, res) => {
  const product = await productService.create(req.tenantId, req.body);
  res.status(201).json(product);
});

router.put('/:id', async (req, res) => {
  const updated = await productService.update(req.tenantId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const ok = await productService.remove(req.tenantId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Product not found' });
  res.json({ ok: true });
});

module.exports = router;