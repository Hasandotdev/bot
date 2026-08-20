const express = require('express');
const router = express.Router();
const groqService = require('../services/groqService');
const knowledgeService = require('../services/knowledgeService');
const packageService = require('../services/packageService');
const servicesService = require('../services/servicesService');
const chatLogService = require('../services/chatLogService');
const settingsService = require('../services/settingsService');
const clientService = require('../services/clientService');
const contactService = require('../services/contactService');

const DEFAULT_COMPANY = {
  name: 'Lead Chatbot',
  phone: '+92 307 8881432',
  email: 'info@prismatic-technologies.com',
  locations: 'Pakistan, Saudi Arabia, USA',
};

async function tenantCompany(tenantId) {
  const client = await clientService.getById(tenantId);
  const settings = await settingsService.getAll(tenantId);
  const fallback = client ? { name: client.company || client.name, phone: client.phone, email: client.email } : DEFAULT_COMPANY;
  return {
    name: client?.company || client?.name || fallback.name || DEFAULT_COMPANY.name,
    phone: client?.phone || fallback.phone || DEFAULT_COMPANY.phone,
    email: client?.email || fallback.email || DEFAULT_COMPANY.email,
    locations: settings.locations || DEFAULT_COMPANY.locations,
  };
}

// Public widget config: lets the chat widget show the tenant's company
// name, contact details and theme without any credentials.
router.get('/config/:tenantId', async (req, res) => {
  const tenantId = String(req.params.tenantId || '').trim();
  const company = await tenantCompany(tenantId || clientService.DEFAULT_TENANT);
  const settings = await settingsService.getAll(tenantId || clientService.DEFAULT_TENANT);
  res.json({
    name: company.name,
    welcome: company.name,
    phone: company.phone,
    email: company.email,
    locations: company.locations,
    colors: { primary: settings.colorsPrimary || '#2563eb' },
    logo: settings.logo || null,
  });
});

// Public tenant resolution: maps a website hostname to a client's tenant id
// (exact match or any subdomain of a configured domain).
router.get('/resolve', async (req, res) => {
  const domain = String(req.query.domain || '').toLowerCase().trim();
  if (!domain) return res.json({ tenantId: null });
  const clients = await clientService.getAll();
  const match = clients.find(c =>
    (c.domains || []).some(d => d && (domain === d || domain.endsWith('.' + d)))
  );
  if (match) {
    return res.json({ tenantId: match.id, name: match.company || match.name });
  }
  res.json({ tenantId: null });
});

// The knowledge base is dumped raw into the prompt; strip out scraped
// HTML/junk entries that would confuse the model.
async function cleanKnowledge(clientId) {
  const entries = await knowledgeService.getAll(clientId);
  return entries.filter(e =>
    e.content &&
    !e.content.includes('<iframe') &&
    !e.content.includes('googletagmanager') &&
    !e.content.includes('<script')
  );
}

// ---------- SINGLE MODE: one trained assistant, no specialist split ----------

function buildPackagesPrompt(packages) {
  if (!packages.length) return 'No package prices are configured yet. NEVER show any price — always say pricing depends on requirements and offer a free consultation.';
  const lines = packages.map(p => {
    const pkgs = p.packages || {};
    const parts = ['Basic', 'Standard', 'Premium']
      .filter(t => pkgs[t] && (pkgs[t].price || '').trim())
      .map(t => `${t}: ${pkgs[t].price}${pkgs[t].features ? ' — ' + pkgs[t].features : ''}`);
    return `Service: ${p.service}\n  ${parts.join('\n  ')}`;
  });
  return lines.join('\n\n');
}

// Builds the SERVICES section purely from this tenant's configured
// services (services.json, managed in the admin panel or auto-generated
// from their scraped website). No business is hardcoded here — an empty
// list means the tenant hasn't configured/generated services yet, and the
// bot falls back to a generic, KB-grounded assistant (see GENERIC_MODE).
function buildServicesSection(services) {
  if (!services.length) return null;
  const lines = services.map((s, i) => {
    const parts = [`${i + 1}. ${s.name.toUpperCase()}`];
    if (s.description) parts.push(s.description);
    if (s.qualifyingQuestions && s.qualifyingQuestions.length) {
      parts.push('Qualifying questions (ask ONE at a time): ' + s.qualifyingQuestions.join(' | '));
    }
    if (s.engagementQuestions && s.engagementQuestions.length) {
      parts.push('Engagement questions (ask ONE at a time, after qualifying, to build interest): ' + s.engagementQuestions.join(' | '));
    }
    if (s.features && s.features.length) {
      parts.push('Features (mention if the visitor asks what\'s included): ' + s.features.join(', '));
    }
    return parts.join('\n');
  });
  return lines.join('\n\n') + `

IMPORTANT: This is the company's official, complete service list. Qualify the visitor with ONE question at a time from the matching service's qualifying questions. NEVER invent or add services that are not in this list.`;
}

async function buildSystemPrompt(kb, lead, companyName, companyContact, supportContact, clientId) {
  const leadProfile = lead && (lead.name || lead.email || lead.phone || lead.company)
    ? `=== VISITOR DETAILS (already collected by the widget form — NEVER ask for them again) ===
Name: ${lead.name || 'Not provided'}
Email: ${lead.email || 'Not provided'}
Phone: ${lead.phone || 'Not provided'}
Company: ${lead.company || 'Not provided'}
`
    : '';

  const services = await servicesService.getAll(clientId);
  const servicesSection = buildServicesSection(services);
  const menuOptions = services.length ? [...services.map(s => s.name), 'Other'].join(', ') : '';
  const packagesPrompt = buildPackagesPrompt(await packageService.forPrompt(clientId));

  // GENERIC MODE: no services configured for this tenant yet (new client,
  // haven't scraped/generated or manually added services). Give a plain,
  // honest assistant grounded only in the Knowledge Base — never invent a
  // sales script for a business we don't have real content about.
  if (!services.length) {
    return `You are ${companyName}'s AI Assistant, the official AI assistant of ${companyName}.
Your goal is to answer visitor questions about ${companyName} using ONLY the Knowledge Base below, be helpful and friendly, and collect their contact details if they're interested in a service so the team can follow up.

RULES:
- Answer only from the Knowledge Base. If something isn't covered, say you're not sure and offer to have the team follow up — never invent facts, services, or prices.
- Keep messages short: 1-2 sentences, one question at a time.
- NEVER use bullet or numbered lists.
- If asked for pricing and nothing relevant is in the Knowledge Base, say pricing depends on requirements and offer to connect them with the team.
- OFF-TOPIC RULE: only answer questions about ${companyName}. For anything unrelated, politely redirect in one short sentence.
- If the visitor wants to move forward, collect their name, email, and what they're interested in, then let them know the team will follow up. Contact details: ${supportContact}.

${leadProfile}Knowledge Base:
${kb}`;
  }

  return `You are ${companyName} AI Assistant, the official AI assistant of ${companyName}.
Your goal is to help website visitors understand our services, answer their questions, qualify leads, and encourage them to schedule a free consultation.
If pricing depends on requirements, NEVER guess a price. Instead, collect project details and offer to arrange a free consultation.

=== COMPANY INFORMATION ===
Company Name: ${companyName}

=== SERVICES (use these to qualify leads) ===
${servicesSection}

=== GENERAL FAQ ===
Use the Knowledge Base below for any company facts (technologies, policies, NDA, support, timelines, etc). Do not invent facts that aren't in the Knowledge Base or the service descriptions above.

=== PACKAGES & PRICING (show ONLY after requirements are collected) ===
${packagesPrompt}

=== SALES FLOW (follow this order) ===
Step 1 - The welcome message is ALREADY displayed by the chat widget ("Hello [first name] 👋 Welcome to ${companyName}. How can I help you today?"). NEVER greet or welcome the visitor again. If the visitor's first message is just "hi", "hello", or similar, acknowledge briefly in one short sentence and move on.
Step 2 - Do NOT list services at the start of the conversation. Only show the service options menu when the visitor explicitly asks what services you offer, or once a specific service choice is needed. When showing the menu, use this EXACT format: "We offer: ##OPTIONS: ${menuOptions}##". Show the menu ONLY ONCE per conversation. Once the visitor picks or names a service, go straight to Step 3 for it — do NOT re-show the menu.
Step 3 - Identify the service they need and ask ONLY that service's qualifying questions (from SERVICES above), ONE question at a time. For "Other", ask what they need and answer from the Knowledge Base.
Step 4 - FEATURES: if the visitor asks what's included, or once 2-3 qualifying questions are answered, mention the relevant features from that service's feature list in one short sentence — do not use ##OPTIONS## for this unless the service has more than 4 features worth letting them pick from.
Step 5 - If they don't know what they need, say exactly: "No worries. Our team will arrange a free consultation with you shortly. For any questions, contact us at: ${supportContact}."
Step 6 - If pricing is asked before requirements are known, say exactly: "Pricing depends on your requirements. Our team will arrange a free consultation with you shortly. For any questions, contact us at: ${supportContact}."
Step 7 - Continue with the NEXT unanswered qualifying question for their service. Once qualifying questions are done, ask 1-2 of that service's engagement questions to keep the conversation going, then move to Step 8.
Step 8 - PACKAGES: Once the visitor's service and requirements are known, present the packages for THEIR service from PACKAGES & PRICING in this compact format: "Here are our packages:\nBasic — <price>: <features>\nStandard — <price>: <features>\nPremium — <price>: <features>" and recommend Premium. Show this only once.
Step 9 - After showing packages, ask if they'd like to proceed or schedule a free consultation.
Step 10 - WRAP-UP: When the visitor is ending the conversation, send ONE final warm message with the contact details: ${supportContact}. Keep it to one message.

RULES:
- Whenever you offer a free consultation or end the chat, ALWAYS include the support contact (${supportContact}) in that message so the visitor can reach the team directly.
- Pricing: NEVER invent, guess, or estimate a price. ONLY use prices from PACKAGES & PRICING for the visitor's exact service. Otherwise say exactly: "Pricing depends on your requirements. Our team will arrange a free consultation with you shortly."
- Do NOT show package prices before the visitor's service and requirements are known (Step 8).
- NEVER repeat a question already answered earlier in the conversation — check the history first.
- Ask each qualifying question at most ONCE.
- The visitor's Name, Email, Phone, and Company were already collected by the widget form. NEVER ask for them in chat.
- Keep every message SHORT: ONE short sentence, max 12 words, one question per message.
- NEVER use bullet or numbered lists.
- If the visitor asks to talk to a human, reassure them you can help and continue qualifying — the team will follow up about the consultation.
- NEVER bring up a consultation on your own — only when pricing is asked, they're unsure, or they ask for one.
- Never invent prices, timelines, or features not listed above.
- OFF-TOPIC RULE: You ONLY answer questions about ${companyName} and its services. For anything unrelated, politely say so in ONE short sentence and redirect to the sales flow.
- Use ##OPTIONS: ...## only for the service menu (Step 2) and, if needed, a features pick-list.
- "custom", "yes", "ok", "hello" are never service names.
- A visitor CAN ask about several services in one conversation — if they explicitly name another one, switch to it and start its qualifying questions. Do NOT re-show the menu when switching.
- NEVER re-show the "We offer:" menu unless the visitor explicitly asks for the service list again.

${leadProfile}Knowledge Base:
${kb}`;
}

router.post('/', async (req, res) => {
  try {
    const { message, history, lead, clientId, tenantId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Resolve the tenant (which client's chatbot this is). Unknown tenant
    // ids fall back to the default prismatic chatbot.
    const requestedTenant = String(tenantId || '').trim();
    const client = await clientService.getById(requestedTenant);
    const scope = client ? client.id : clientService.DEFAULT_TENANT;
    const company = await tenantCompany(scope);
    const companyName = company.name;
    const companyContact = `Phone: ${company.phone}, Email: ${company.email}`;

    // Support contact from the admin's Contacts table (Stack-to-Contact
    // Mapping), matched to the conversation when possible. Falls back to the
    // company contact from the client record/settings.
    const contacts = await contactService.getAll(scope);
    let supportContact = companyContact;
    if (contacts.length) {
      const matched = await contactService.detectStack(scope, message, history);
      const c = matched || contacts[0];
      if (c) {
        const parts = [];
        if (c.name) parts.push(c.name);
        if (c.phone) parts.push('Phone: ' + c.phone);
        if (c.email) parts.push('Email: ' + c.email);
        supportContact = parts.join(', ');
      }
    }

    const kb = await cleanKnowledge(scope);
    const systemPrompt = await buildSystemPrompt(kb, lead, companyName, companyContact, supportContact, scope);

    // Never forward malformed history to the model — a single entry with a
    // missing/undefined content makes Groq reject the whole request.
const cleanHistory = (history || [])
  .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0)
  .map(m => ({ role: m.role, content: m.content }))
  .slice(-30);

// Detect when the visitor picks a service (from the menu or by name) and
// force the model to start qualifying for it instead of re-showing the menu.
// Case A: the menu was just shown (##OPTIONS in last assistant message) and
// the visitor's reply matches one of the options -> menu selection.
// Case B: the visitor explicitly asks about a service (e.g. "tell me about
// your CRM", "I want a mobile app") mid-conversation.
// Both are built from THIS tenant's configured services (servicesService),
// not a hardcoded list, so this works for any business.
const tenantServices = await servicesService.getAll(scope);
const OPTIONS_LABELS = [...tenantServices.map(s => s.name), 'Other'];

// Keyword match: the full service name, plus each significant word in it
// (>3 chars, so "AI Consulting" also matches on "consulting"). Good enough
// without requiring admins to configure keywords by hand.
const SERVICE_KEYWORDS = tenantServices.map(s => {
  const name = s.name.toLowerCase();
  const words = name.split(/\s+/).filter(w => w.length > 3);
  return [s.name, [...new Set([name, ...words])]];
});

function detectService(message) {
  const msg = ' ' + message.toLowerCase().trim() + ' ';
  for (const [name, keywords] of SERVICE_KEYWORDS) {
    if (keywords.some(k => msg.includes(k))) return name;
  }
  return null;
}

function isExplicitServiceRequest(message) {
  return /(i want|i need|i am looking for|interested in|what about|tell me about|do you (do|provide|offer|build)|do you have|pricing for|cost of|quote for|requirements for|price for|how much for)/i.test(message);
}

function detectMenuSelection(message, history) {
  const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
  if (!lastAssistant || !lastAssistant.content.includes('##OPTIONS')) return null;
  const msg = message.trim().toLowerCase();
  return OPTIONS_LABELS.find(label => label.toLowerCase() === msg) || null;
}

let selectedService = detectMenuSelection(message, cleanHistory);
if (!selectedService && isExplicitServiceRequest(message)) {
  selectedService = detectService(message);
}

let userMessage = message;
if (selectedService) {
  if (selectedService === 'Other') {
    userMessage += `\n\n(SYSTEM: The visitor selected "Other". Ask what they need in one short question and answer from the Knowledge Base. Do NOT list services or show the "We offer:" menu.)`;
  } else {
    userMessage += `\n\n(SYSTEM: The visitor just selected the service "${selectedService}". Begin Step 3 for that service: acknowledge briefly and ask ITS first qualifying question, ONE question only. Do NOT list services, do NOT show the "We offer:" menu, do NOT repeat anything already asked in the history.)`;
  }
}

const messages = [
  ...cleanHistory,
  { role: 'user', content: userMessage },
];

    let reply = await groqService.generateReply(systemPrompt, messages);

    // Enforce one question per message: if the model bundled several
    // questions, keep only the first. The ##OPTIONS## block (service menu /
    // feature selection) is detached first so it can't disable the truncation,
    // then re-attached only when the kept question is the features question.
    let optionsBlock = '';
    const optionsMatch = reply.match(/##OPTIONS:[\s\S]+?##/);
    if (optionsMatch) {
      optionsBlock = optionsMatch[0];
      reply = reply.replace(optionsMatch[0], '').trim();
    }
    const qIndexes = [...reply.matchAll(/\?/g)].map(m => m.index);
    if (qIndexes.length > 1) {
      reply = reply.slice(0, qIndexes[0] + 1).trim();
    }
    if (optionsBlock && (qIndexes.length <= 1) && (/we offer/i.test(reply) || /features/i.test(reply))) {
      reply = (reply + ' ' + optionsBlock).trim();
    }

    const baseDelay = 2000 + Math.random() * 3000;
    const lengthFactor = Math.min(reply.length / 100, 3);
    const totalDelay = baseDelay + (lengthFactor * 1000);
    await new Promise(r => setTimeout(r, totalDelay));

    // Persist the conversation client-wise so it can be reviewed in the admin
    // panel even when visitors submit fake emails or don't finish the form.
    try {
      await chatLogService.appendMessage(scope, clientId, lead, 'user', message);
      await chatLogService.appendMessage(scope, clientId, lead, 'assistant', reply);
    } catch (err) {
      console.error('[chat] Failed to log conversation:', err.message);
    }

    res.json({ reply });
  } catch (err) {
    console.error('[chat] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate reply' });
  }
});

module.exports = router;
