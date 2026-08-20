const prisma = require('./db');

// A "service" is one thing the tenant's business sells/offers (e.g.
// "Wedding Photography", "Tax Filing", "Website Development" — whatever
// applies to THAT business). This replaces the old hardcoded, Lead Chatbot-only
// FALLBACK_SERVICES block in chat.js so every tenant gets their own sales
// flow instead of Lead Chatbot's.
//
// Shape of a service entry:
// {
//   id, name, description,
//   qualifyingQuestions: string[],   // asked one at a time to scope the lead
//   engagementQuestions: string[],   // optional, asked after qualifying to build interest
//   features: string[],              // shown if the visitor asks "what's included"
// }

async function getAll(clientId) {
  return prisma.service.findMany({ where: { clientId } });
}

async function getById(clientId, id) {
  return prisma.service.findFirst({ where: { id, clientId } });
}

function normalize(input) {
  const toList = (v) => {
    if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
    if (typeof v === 'string') return v.split('\n').map(x => x.trim()).filter(Boolean);
    return [];
  };
  return {
    name: String(input.name || '').trim(),
    description: String(input.description || '').trim(),
    qualifyingQuestions: toList(input.qualifyingQuestions),
    engagementQuestions: toList(input.engagementQuestions),
    features: toList(input.features),
  };
}

async function create(clientId, entry) {
  return prisma.service.create({
    data: { clientId, ...normalize(entry) },
  });
}

async function update(clientId, id, updates) {
  const existing = await getById(clientId, id);
  if (!existing) return null;
  return prisma.service.update({
    where: { id },
    data: normalize({ ...existing, ...updates }),
  });
}

async function remove(clientId, id) {
  const existing = await getById(clientId, id);
  if (!existing) return false;
  await prisma.service.delete({ where: { id } });
  return true;
}

async function replaceAll(clientId, list) {
  await prisma.service.deleteMany({ where: { clientId } });
  const rows = (list || []).map(s => ({ clientId, ...normalize(s) }));
  if (rows.length) await prisma.service.createMany({ data: rows });
  return getAll(clientId);
}

module.exports = { getAll, getById, create, update, remove, replaceAll };