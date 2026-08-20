const prisma = require('./db');

async function getAll(clientId) {
  return prisma.knowledgeEntry.findMany({ where: { clientId } });
}

async function getById(clientId, id) {
  return prisma.knowledgeEntry.findFirst({ where: { id, clientId } });
}

async function create(clientId, entry) {
  return prisma.knowledgeEntry.create({
    data: { clientId, label: entry.label, topic: entry.topic, content: entry.content },
  });
}

async function update(clientId, id, updates) {
  const existing = await getById(clientId, id);
  if (!existing) return null;
  const data = {};
  if (updates.label !== undefined) data.label = updates.label;
  if (updates.topic !== undefined) data.topic = updates.topic;
  if (updates.content !== undefined) data.content = updates.content;
  return prisma.knowledgeEntry.update({ where: { id }, data });
}

async function remove(clientId, id) {
  const existing = await getById(clientId, id);
  if (!existing) return false;
  await prisma.knowledgeEntry.delete({ where: { id } });
  return true;
}

async function search(clientId, query) {
  return prisma.knowledgeEntry.findMany({
    where: {
      clientId,
      OR: [
        { content: { contains: query, mode: 'insensitive' } },
        { label: { contains: query, mode: 'insensitive' } },
      ],
    },
  });
}

async function replaceAll(clientId, list) {
  await prisma.knowledgeEntry.deleteMany({ where: { clientId } });
  const rows = (list || []).map(e => ({
    clientId,
    label: String(e.label || ''),
    topic: e.topic || null,
    content: String(e.content || ''),
  }));
  if (rows.length) await prisma.knowledgeEntry.createMany({ data: rows });
  return getAll(clientId);
}

module.exports = { getAll, getById, create, update, remove, search, replaceAll };