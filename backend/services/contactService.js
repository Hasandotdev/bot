const prisma = require('./db');

async function getAll(clientId) {
  return prisma.contact.findMany({ where: { clientId } });
}

async function getById(clientId, id) {
  return prisma.contact.findFirst({ where: { id, clientId } });
}

async function create(clientId, contact) {
  return prisma.contact.create({
    data: {
      clientId,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
    },
  });
}

async function update(clientId, id, updates) {
  const existing = await getById(clientId, id);
  if (!existing) return null;
  const data = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.email !== undefined) data.email = updates.email;
  if (updates.phone !== undefined) data.phone = updates.phone;
  if (updates.company !== undefined) data.company = updates.company;
  return prisma.contact.update({ where: { id }, data });
}

async function remove(clientId, id) {
  const existing = await getById(clientId, id);
  if (!existing) return false;
  await prisma.contact.delete({ where: { id } });
  return true;
}

// Legacy helper kept for API compatibility. The old JSON model had a
// `keywords` list per contact; that's gone in the DB schema, so matching
// falls back to name/company of each contact.
async function detectStack(clientId, message, history) {
  let q = message.toLowerCase();
  if (history && history.length) {
    const recent = history.slice(-4).map(m => m.content).join(' ');
    q += ' ' + recent.toLowerCase();
  }
  const contacts = await getAll(clientId);
  for (const contact of contacts) {
    for (const field of [contact.name, contact.company]) {
      if (field && q.includes(field.toLowerCase())) return contact;
    }
  }
  return null;
}

module.exports = { getAll, getById, create, update, remove, detectStack };