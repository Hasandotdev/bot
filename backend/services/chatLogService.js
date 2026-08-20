const prisma = require('./db');
const notificationService = require('./notificationService');

function toSession(rows) {
  const lead = {};
  for (const r of rows) {
    if (r.leadName) lead.name = r.leadName;
    if (r.leadEmail) lead.email = r.leadEmail;
    if (r.leadPhone) lead.phone = r.leadPhone;
    if (r.leadCompany) lead.company = r.leadCompany;
  }
  const messages = rows.map(r => ({
    role: r.role,
    content: r.content,
    time: new Date(r.createdAt).getTime(),
  }));
  return {
    clientId: rows[0].visitorId,
    lead,
    createdAt: new Date(rows[0].createdAt).getTime(),
    lastActive: new Date(rows[rows.length - 1].createdAt).getTime(),
    messageCount: messages.length,
    preview: messages[messages.length - 1]?.content || '',
    messages,
  };
}

async function appendMessage(clientId, visitorId, lead, role, content) {
  if (!visitorId || !content || !content.trim()) return null;
  await prisma.chatLog.create({
    data: {
      clientId,
      visitorId: visitorId || 'anonymous',
      role,
      content,
      leadName: lead?.name || null,
      leadEmail: lead?.email || null,
      leadPhone: lead?.phone || null,
      leadCompany: lead?.company || null,
    },
  });
  const session = await getById(clientId, visitorId);
  if (session) notificationService.onActivity(clientId, session);
  return session;
}

async function getAll(clientId) {
  const rows = await prisma.chatLog.findMany({ where: { clientId }, orderBy: { createdAt: 'asc' } });
  const byVisitor = new Map();
  for (const r of rows) {
    if (!byVisitor.has(r.visitorId)) byVisitor.set(r.visitorId, []);
    byVisitor.get(r.visitorId).push(r);
  }
  return [...byVisitor.values()]
    .map(toSession)
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
}

async function getById(clientId, visitorId) {
  const rows = await prisma.chatLog.findMany({
    where: { clientId, visitorId },
    orderBy: { createdAt: 'asc' },
  });
  if (!rows.length) return null;
  return toSession(rows);
}

async function remove(clientId, visitorId) {
  const { count } = await prisma.chatLog.deleteMany({ where: { clientId, visitorId } });
  return count > 0;
}

module.exports = { appendMessage, getAll, getById, remove };