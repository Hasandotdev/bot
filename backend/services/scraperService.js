const axios = require('axios');
const cheerio = require('cheerio');
const knowledgeService = require('./knowledgeService');
const prisma = require('./db');

const TIMEOUT = 15000;

// ---------- CONTACT EXTRACTION ----------

function cleanPhone(raw) {
  const p = String(raw)
    .replace(/^tel:/i, '')
    .replace(/mailto:.*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!p || /[a-z]/i.test(p)) return null;
  const digits = p.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return p;
}

function extractPhone(text) {
  // Highest confidence first: "phone:", "call us", "contact", "whatsapp" prefixed numbers.
  const prefixed = text.match(/(?:phone|call|contact|whatsapp|tel|mobile|cell)\b[^0-9+]{0,25}?([+]?[\d\s()./_-]{7,25})/gi);
  if (prefixed) {
    for (const m of prefixed) {
      const p = cleanPhone(m.replace(/^[^0-9+]*/, ''));
      if (p) return p;
    }
  }
  // Generic fallback: common international / local formats.
  const m = text.match(/(?<!\d)(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]\d{3,4}[\s.-]\d{3,4}(?!\d)/);
  return m ? cleanPhone(m[0]) : null;
}

function extractEmail(text) {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (!m) return null;
  const email = m[0].toLowerCase();
  if (/\.(png|jpe?g|gif|svg|webp|css|js)$/.test(email)) return null;
  return email;
}

// Pulls phone/email straight from the raw HTML so tel:/mailto: links are
// used first (they're the most reliable source on real websites), then
// falls back to text scanning.
function extractContact(html, text) {
  const $ = cheerio.load(html);
  const contact = { phone: null, email: null };

  $('a[href^="tel:"]').each((_, el) => {
    if (contact.phone) return;
    const label = cleanPhone($(el).text()) || cleanPhone($(el).attr('href'));
    if (label) contact.phone = label;
  });
  $('a[href^="mailto:"]').each((_, el) => {
    if (contact.email) return;
    const e = $(el).attr('href').replace(/^mailto:/i, '').split('?')[0].trim();
    if (e && /@/.test(e)) contact.email = e.toLowerCase();
  });

  if (!contact.phone) contact.phone = extractPhone(text);
  if (!contact.email) contact.email = extractEmail(text);
  return contact;
}

// Persists the discovered contact info so the chatbot (wrap-up message)
// and the widget contact card show the scraped number instead of defaults.
async function saveContact(clientId, contact) {
  if (!contact.phone && !contact.email) return null;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return null;

  const patch = {};
  if (!client.phone && contact.phone) patch.phone = contact.phone;
  if (!client.email && contact.email) patch.email = contact.email;
  if (Object.keys(patch).length) {
    await prisma.client.update({ where: { id: clientId }, data: patch });
  }

  const companyName = client.company || client.name || 'Company Contact';
  const existing = await prisma.contact.findFirst({ where: { clientId, company: companyName } });
  const data = {
    name: client.company || client.name || null,
    company: companyName,
    phone: contact.phone || existing?.phone || null,
    email: contact.email || existing?.email || null,
  };
  if (existing) {
    await prisma.contact.update({ where: { id: existing.id }, data });
  } else {
    await prisma.contact.create({ data: { clientId, ...data } });
  }

  console.log(`[scraper] Contact saved for ${clientId}: ${contact.phone || '-'} / ${contact.email || '-'}`);
  return { phone: contact.phone, email: contact.email };
}

async function scrapePage(url) {
  const { data } = await axios.get(url, { timeout: TIMEOUT });
  const $ = cheerio.load(data);
  $('script, style, nav, footer, header, [role="navigation"]').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text.substring(0, 10000);
}

function extractTopics(text) {
  const lines = text.split(/\.\s+/).filter(l => l.trim().length > 40);
  const topics = [];
  const seen = new Set();

  for (const line of lines) {
    const clean = line.trim();
    if (seen.has(clean)) continue;
    seen.add(clean);

    let stack = null;
    const lower = clean.toLowerCase();
    if (lower.includes('web') || lower.includes('react')) stack = 'React / Web';
    else if (lower.includes('mobile') || lower.includes('flutter')) stack = 'Flutter / Mobile';
    else if (lower.includes('ai') || lower.includes('ml') || lower.includes('machine learning')) stack = 'AI & ML';
    else if (lower.includes('devops') || lower.includes('docker') || lower.includes('cloud')) stack = 'DevOps';
    else if (lower.includes('erp') || lower.includes('enterprise')) stack = 'ERP / Enterprise';

    topics.push({
      id: 'scraped-' + Date.now() + '-' + topics.length,
      label: clean.substring(0, 60) + '...',
      topic: 'scraped',
      content: clean,
      linkedStack: stack,
    });

    if (topics.length >= 20) break;
  }

  return topics;
}

const KNOWN_SERVICES = [
  { label: 'Website Development', re: /website development|web development|website design|web design|website building/i },
  { label: 'Ecommerce Development', re: /ecommerce development|e-commerce development|online store development|shopify/i },
  { label: 'Mobile App Development', re: /mobile app development|mobile application development|app development|android app|ios app|flutter/i },
  { label: 'Custom Software Development', re: /custom software development|software development|bespoke software/i },
  { label: 'ERP', re: /\berp\b|enterprise resource planning/i },
  { label: 'CRM', re: /\bcrm\b|customer relationship management/i },
  { label: 'LMS', re: /\blms\b|learning management system/i },
  { label: 'POS', re: /\bpos\b|point of sale/i },
  { label: 'HRMS', re: /\bhrms\b|hr management system|human resource management/i },
  { label: 'AI Solutions', re: /ai solutions|ai services|artificial intelligence|chatbot|ai agent|generative ai|machine learning/i },
  { label: 'Digital Marketing', re: /digital marketing|search engine optimization|seo services|google ads|facebook ads|social media marketing/i },
  { label: 'Website Hosting', re: /website hosting|web hosting|hosting services/i },
  { label: 'Domain Services', re: /domain registration|domain name/i },
];

function extractServices(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 10);
  const NOISE = /privacy|terms of|policy|cookie|we partnered|founder|ceo|about us|get in touch|scroll to|skip to|chat with|menu|contact$/i;

  function pickContent(label, fallback) {
    const matches = sentences.filter(s => s.toLowerCase().includes(label.toLowerCase()) && s.length >= 50);
    const match = matches[matches.length - 1] || sentences.find(s => s.toLowerCase().includes(label.toLowerCase()));
    if (match && match.length >= 50 && !NOISE.test(match)) return match.substring(0, 300);
    if (match) {
      const idx = sentences.indexOf(match);
      let combined = match;
      for (let i = idx + 1; i < sentences.length && combined.length < 250; i++) {
        combined += ' ' + sentences[i];
      }
      return combined.substring(0, 300);
    }
    return fallback;
  }

  function isNoiseLabel(label) {
    return label.length > 45 || NOISE.test(label);
  }

  const found = new Map();

  for (const pattern of KNOWN_SERVICES) {
    const match = text.match(pattern.re);
    if (!match) continue;
    const idx = match.index;
    const content = pickContent(pattern.label, text.slice(idx, idx + 300));
    found.set(pattern.label, {
      id: 'svc-' + Date.now() + '-' + found.size,
      label: pattern.label,
      topic: 'services',
      content,
      linkedStack: null,
    });
  }

  // Generic catch-all: "X Development / Solutions / Services" phrases.
  const genericRe = /\b([A-Z][A-Za-z&' -]{2,40})\s+(Development|Solutions|Services|Consultancy)\b/g;
  let g;
  const seenGeneric = new Set();
  while ((g = genericRe.exec(text)) !== null) {
    const label = g[1].trim() + ' ' + g[2];
    if (seenGeneric.has(label)) continue;
    seenGeneric.add(label);
    if (found.has(label) || isNoiseLabel(label)) continue;
    const content = pickContent(label, text.slice(g.index, g.index + 300));
    found.set(label, {
      id: 'svc-' + Date.now() + '-' + found.size,
      label,
      topic: 'services',
      content,
      linkedStack: null,
    });
  }

  return [...found.values()];
}

async function scrapeWebsite(targetUrl, clientId) {
  console.log(`[scraper] Scraping ${targetUrl}...`);
  const text = await scrapePage(targetUrl);

  const links = [];
  const { data } = await axios.get(targetUrl, { timeout: TIMEOUT });
  const $$ = cheerio.load(data);
  $$('a[href]').each((_, el) => {
    let href = $$(el).attr('href');
    if (href && href.startsWith('/') && !href.startsWith('//')) {
      href = new URL(href, targetUrl).href;
      if (href.startsWith(targetUrl) && !links.includes(href)) {
        links.push(href);
      }
    }
  });

  let allText = text;
  const subPages = links.slice(0, 10);
  for (const link of subPages) {
    try {
      const subText = await scrapePage(link);
      allText += '\n' + subText;
    } catch (err) {
      console.log(`[scraper] Skipped ${link}: ${err.message}`);
    }
  }

  const contact = await saveContact(clientId, extractContact(data, allText));

  const newTopics = extractTopics(allText);
  const newServices = extractServices(allText);
  const existing = await knowledgeService.getAll(clientId);
  // Re-scraping replaces the previously scraped services with fresh ones;
  // only generic topics accumulate.
  const keep = existing.filter(e => e.topic !== 'services');
  const merged = [...keep, ...newTopics, ...newServices];
  await prisma.knowledgeEntry.deleteMany({ where: { clientId } });
  const rows = merged.map(e => ({
    clientId,
    label: String(e.label || ''),
    topic: e.topic || null,
    content: String(e.content || ''),
  }));
  if (rows.length) await prisma.knowledgeEntry.createMany({ data: rows });

  console.log(`[scraper] Done. ${newTopics.length} topics, ${newServices.length} services added.`);
  return { entriesAdded: newTopics.length + newServices.length, totalEntries: merged.length, contact };
}

module.exports = { scrapeWebsite, extractContact, extractPhone, extractEmail, cleanPhone };
