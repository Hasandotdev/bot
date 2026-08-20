const express = require('express');
const router = express.Router();
const servicesService = require('../services/servicesService');
const knowledgeService = require('../services/knowledgeService');
const settingsService = require('../services/settingsService');
const groqService = require('../services/groqService');
const { adminAuth } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');

router.use(adminAuth, tenantScope);

router.get('/', async (req, res) => {
  res.json(await servicesService.getAll(req.tenantId));
});

router.get('/:id', async (req, res) => {
  const entry = await servicesService.getById(req.tenantId, req.params.id);
  if (!entry) return res.status(404).json({ error: 'Service not found' });
  res.json(entry);
});

router.post('/', async (req, res) => {
  const entry = await servicesService.create(req.tenantId, req.body);
  res.status(201).json(entry);
});

router.put('/:id', async (req, res) => {
  const updated = await servicesService.update(req.tenantId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Service not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const ok = await servicesService.remove(req.tenantId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Service not found' });
  res.json({ ok: true });
});

// Turns the tenant's scraped knowledge base into a structured services
// config (name, description, qualifying questions, features per service)
// using the LLM. This is what makes onboarding a NEW business fast instead
// of requiring them to type everything by hand. Admin reviews/edits the
// result afterwards — it overwrites services for this tenant.
router.post('/generate', async (req, res) => {
  try {
    const kb = await knowledgeService.getAll(req.tenantId);
    if (!kb.length) {
      return res.status(400).json({ error: 'No knowledge base content yet. Scrape the website first (Scraper tab).' });
    }
    const settings = await settingsService.getPublic(req.tenantId);
    const companyName = settings.company || settings.name || 'this company';

    const kbText = kb
      .map(e => `[${e.topic || 'general'}] ${e.label || ''}\n${(e.content || '').slice(0, 1500)}`)
      .join('\n\n')
      .slice(0, 12000); // keep prompt bounded regardless of KB size

    const systemPrompt = `You are configuring a sales chatbot for a company called "${companyName}". You will be given raw content scraped from their website. Identify the distinct services/products they sell and output ONLY a JSON object (no markdown) with this exact shape:
{
  "services": [
    {
      "name": "short service name",
      "description": "1-3 sentences describing what it includes, written for a system prompt",
      "qualifyingQuestions": ["question 1", "question 2", "..."],
      "engagementQuestions": ["optional follow-up question to build interest", "..."],
      "features": ["feature 1", "feature 2", "..."]
    }
  ]
}
Rules:
- Only include services that are actually evidenced in the content. Do not invent unrelated services.
- qualifyingQuestions should be the questions a salesperson would ask to scope a lead's requirements for THAT specific service (3-6 questions).
- features should be concrete things included in that service/package (3-8 items).
- If the content only describes one product/service, return a single entry.
- Keep names short (2-5 words).`;

    const result = await groqService.generateJSON(systemPrompt, kbText);
    const list = Array.isArray(result.services) ? result.services : [];
    if (!list.length) {
      return res.status(422).json({ error: 'Could not identify any services from the scraped content. Try adding knowledge base entries manually.' });
    }
    const saved = await servicesService.replaceAll(req.tenantId, list);
    res.json({ services: saved, count: saved.length });
  } catch (err) {
    console.error('[services] Generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate services: ' + err.message });
  }
});

module.exports = router;