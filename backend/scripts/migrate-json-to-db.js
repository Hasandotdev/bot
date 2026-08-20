require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../services/db');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_TENANT = 'prismatic';

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function readTenantJson(dir, name, fallback) {
  return readJson(path.join(dir, name), fallback);
}

function normalizeDomains(value) {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list.map(d => String(d).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean);
}

// Create Client rows for tenants that don't exist yet, using their existing
// credentials so passwords keep working after the migration.
async function ensureClients() {
  // 1. Registered clients from clients.json (keep their existing salt+hash).
  const clients = readJson(path.join(DATA_DIR, 'clients.json'), []);
  for (const c of clients) {
    const existing = await prisma.client.findUnique({ where: { id: c.id } });
    if (existing) continue;
    await prisma.client.create({
      data: {
        id: c.id,
        name: c.name,
        company: c.company,
        username: c.username,
        passwordSalt: c.password?.salt || crypto.randomBytes(16).toString('hex'),
        passwordHash: c.password?.hash || hashPassword(process.env.ADMIN_PASSWORD || 'changeme123', c.password?.salt || ''),
        email: c.email,
        phone: c.phone,
        domains: normalizeDomains(c.domains),
        createdAt: new Date(c.createdAt || Date.now()),
        settings: { create: {} },
      },
    });
    console.log(`[clients] created Client ${c.id} (${c.username}) from clients.json`);
  }

  // 2. Default "prismatic" tenant. Its identity lived in data/settings.json,
  // with the env ADMIN_USERNAME/ADMIN_PASSWORD as the login fallback.
  const settings = readJson(path.join(DATA_DIR, 'settings.json'), {});
  const existing = await prisma.client.findUnique({ where: { id: DEFAULT_TENANT } });
  if (!existing) {
    const username = (settings.username && String(settings.username).trim()) || process.env.ADMIN_USERNAME || 'admin';
    const password = settings.password?.hash
      ? null // keep original salt/hash below
      : process.env.ADMIN_PASSWORD || 'changeme123';
    const salt = settings.password?.salt || crypto.randomBytes(16).toString('hex');
    await prisma.client.create({
      data: {
        id: DEFAULT_TENANT,
        name: settings.name || 'Admin',
        company: settings.company,
        username,
        passwordSalt: salt,
        passwordHash: settings.password?.hash || hashPassword(password, salt),
        email: settings.email,
        phone: settings.phone,
        domains: [],
        settings: { create: {} },
      },
    });
    console.log(`[clients] created Client ${DEFAULT_TENANT} (${username}) from settings.json + env`);
  }

  // The old code also accepted clients.json entries for the prismatic tenant
  // if one existed (it doesn't here), so nothing more to do.
}

async function migrateTenant(tenantId, dir) {
  const read = (name, fallback) => readTenantJson(dir, name, fallback);

  const client = await prisma.client.findUnique({ where: { id: tenantId } });
  if (!client) {
    console.log(`Skipping ${tenantId} — no matching Client row`);
    return;
  }

  const settings = read('settings.json', {});
  if (settings && Object.keys(settings).length) {
    const data = {};
    if (settings.name) data.name = settings.name;
    if (settings.avatar) data.avatar = settings.avatar;
    if (settings.colors?.primary) data.colorsPrimary = settings.colors.primary;
    if (settings.logo) data.logo = settings.logo;
    if (settings.locations) data.locations = settings.locations;
    if (settings.emailNotifications !== undefined) data.emailNotifications = !!settings.emailNotifications;
    await prisma.settings.upsert({
      where: { clientId: tenantId },
      update: data,
      create: { clientId: tenantId, ...data },
    });
  }

  for (const e of read('knowledge.json', [])) {
    await prisma.knowledgeEntry.create({
      data: { clientId: tenantId, label: e.label || '', topic: e.topic || null, content: e.content || '' },
    });
  }
  for (const s of read('services.json', [])) {
    await prisma.service.create({
      data: {
        clientId: tenantId,
        name: s.name || '',
        description: s.description || null,
        qualifyingQuestions: s.qualifyingQuestions || [],
        engagementQuestions: s.engagementQuestions || [],
        features: s.features || [],
      },
    });
  }
  for (const p of read('packages.json', [])) {
    await prisma.package.create({
      data: { clientId: tenantId, service: p.service || '', packages: p.packages || {} },
    });
  }
  for (const p of read('products.json', [])) {
    await prisma.product.create({
      data: {
        clientId: tenantId,
        name: p.name || '',
        stack: p.stack,
        category: p.category,
        priceRange: p.priceRange,
        description: p.description,
      },
    });
  }
  for (const c of read('contacts.json', [])) {
    await prisma.contact.create({
      data: { clientId: tenantId, name: c.name, email: c.email, phone: c.phone, company: c.company },
    });
  }

  const sessions = read('chatlogs.json', []);
  for (const s of sessions) {
    const lead = s.lead || {};
    const messages = s.messages || [];
    for (const m of messages) {
      await prisma.chatLog.create({
        data: {
          clientId: tenantId,
          visitorId: s.clientId || 'anonymous',
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content || '',
          leadName: lead.name,
          leadEmail: lead.email,
          leadPhone: lead.phone,
          leadCompany: lead.company,
          createdAt: new Date(m.time || s.createdAt || Date.now()),
        },
      });
    }
  }
  console.log(`Migrated ${tenantId} (${read('knowledge.json', []).length} kb, ${read('chatlogs.json', []).length} sessions)`);
}

async function main() {
  await ensureClients();

  // Default/prismatic tenant lives directly in data/
  await migrateTenant(DEFAULT_TENANT, DATA_DIR);

  // Per-client tenants live in data/clients/{id}/
  const clientsDir = path.join(DATA_DIR, 'clients');
  if (fs.existsSync(clientsDir)) {
    for (const id of fs.readdirSync(clientsDir)) {
      if (id === 'null') continue; // skip the stray "null" dir
      await migrateTenant(id, path.join(clientsDir, id));
    }
  }
  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});