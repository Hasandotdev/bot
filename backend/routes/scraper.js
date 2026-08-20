const express = require('express');
const router = express.Router();
const scraperService = require('../services/scraperService');
const { adminAuth } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');

router.use(adminAuth, tenantScope);

router.post('/scrape', async (req, res) => {
  try {
    const targetUrl = req.body.url || process.env.SCRAPE_TARGET_URL || 'https://prismatic-technologies.com';
    const result = await scraperService.scrapeWebsite(targetUrl, req.tenantId);
    res.json(result);
  } catch (err) {
    console.error('[scraper] Error:', err.message);
    res.status(500).json({ error: 'Scraping failed: ' + err.message });
  }
});

module.exports = router;