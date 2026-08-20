const crypto = require('crypto');
const prisma = require('./db');

const DEFAULT_TENANT = 'leads-chatbot';

const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'superadmin123';

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

async function getAll() {
  return prisma.client.findMany();
}

async function getById(id) {
  return prisma.client.findUnique({ where: { id } });
}

async function getByUsername(username) {
  return prisma.client.findUnique({ where: { username } });
}

function checkSuperCredentials(username, password) {
  return username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD;
}

async function checkClientCredentials(username, password) {
  const client = await prisma.client.findUnique({ where: { username } });
  if (!client) return null;
  const hash = hashPassword(password, client.passwordSalt);
  return hash === client.passwordHash ? client : null;
}

function normalizeDomains(value) {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list.map(d => String(d).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean);
}

async function create(data) {
  const username = data.username ? String(data.username).trim() : null;
  if (!username) throw new Error('Username is required');
  if (!data.password) throw new Error('Password is required');

  const salt = crypto.randomBytes(16).toString('hex');
  try {
    return await prisma.client.create({
      data: {
        name: String(data.name || username).trim(),
        company: data.company !== undefined && data.company !== null && String(data.company).trim() ? String(data.company).trim() : null,
        username,
        passwordSalt: salt,
        passwordHash: hashPassword(data.password, salt),
        email: data.email !== undefined && data.email !== null && String(data.email).trim() ? String(data.email).trim() : null,
        phone: data.phone !== undefined && data.phone !== null && String(data.phone).trim() ? String(data.phone).trim() : null,
        domains: normalizeDomains(data.domains),
        settings: { create: {} },
      },
    });
  } catch (err) {
    if (err.code === 'P2002') throw new Error('Username already exists');
    throw err;
  }
}

async function update(id, patch) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return null;

  const data = {};
  if (patch.name !== undefined) data.name = String(patch.name).trim() || existing.name;
  if (patch.company !== undefined) {
    data.company = patch.company !== null && String(patch.company).trim() ? String(patch.company).trim() : null;
  }
  if (patch.email !== undefined) {
    data.email = patch.email !== null && String(patch.email).trim() ? String(patch.email).trim() : null;
  }
  if (patch.phone !== undefined) {
    data.phone = patch.phone !== null && String(patch.phone).trim() ? String(patch.phone).trim() : null;
  }
  if (patch.domains !== undefined) data.domains = normalizeDomains(patch.domains);
  if (patch.username !== undefined && patch.username !== null && String(patch.username).trim()) {
    data.username = String(patch.username).trim();
  }
  if (patch.password) {
    const salt = crypto.randomBytes(16).toString('hex');
    data.passwordSalt = salt;
    data.passwordHash = hashPassword(patch.password, salt);
  }

  try {
    return await prisma.client.update({ where: { id }, data });
  } catch (err) {
    if (err.code === 'P2002') throw new Error('Username already exists');
    throw err;
  }
}

async function remove(id) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.client.delete({ where: { id } }); // cascades all tenant data
  return true;
}

async function stats(id) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const logs = await prisma.chatLog.findMany({ where: { clientId: id }, select: { visitorId: true, createdAt: true } });
  const sessions = new Set(logs.map(r => r.visitorId));
  const monthLogs = logs.filter(r => r.createdAt >= monthStart);
  const contactCount = await prisma.contact.count({ where: { clientId: id } });
  return {
    chatCount: sessions.size,
    chatCountThisMonth: new Set(monthLogs.map(r => r.visitorId)).size,
    messagesThisMonth: monthLogs.length,
    contactCount,
  };
}

async function publicClient(c) {
  return {
    id: c.id,
    name: c.name,
    company: c.company,
    username: c.username,
    email: c.email,
    phone: c.phone,
    domains: c.domains || [],
    createdAt: c.createdAt,
    stats: await stats(c.id),
  };
}

module.exports = {
  DEFAULT_TENANT,
  getAll,
  getById,
  getByUsername,
  create,
  update,
  remove,
  stats,
  publicClient,
  checkSuperCredentials,
  checkClientCredentials,
};