const prisma = require('../services/db');

async function main() {
  const oldId = 'prismatic';
  const newId = 'leads-chatbot';

  const old = await prisma.client.findUnique({ where: { id: oldId } });
  if (!old) {
    console.log('No client with id "prismatic" found — nothing to do.');
    return;
  }
  const exists = await prisma.client.findUnique({ where: { id: newId } });
  if (exists) {
    console.log('Client "leads-chatbot" already exists — nothing to do.');
    return;
  }

  const models = ['settings', 'chatLog', 'knowledgeEntry', 'service', 'package', 'product', 'contact'];

  const total = await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: oldId },
      data: { username: oldId + '-old-' + Date.now() },
    });
    await tx.client.create({
      data: {
        id: newId,
        name: old.name,
        company: old.company,
        username: old.username,
        passwordSalt: old.passwordSalt,
        passwordHash: old.passwordHash,
        email: old.email,
        phone: old.phone,
        domains: old.domains,
        createdAt: old.createdAt,
      },
    });
    const moved = {};
    for (const m of models) {
      const r = await tx[m].updateMany({ where: { clientId: oldId }, data: { clientId: newId } });
      if (r.count) moved[m] = r.count;
    }
    await tx.client.delete({ where: { id: oldId } });
    return moved;
  });

  console.log('Re-created client as "leads-chatbot" (credentials preserved).');
  console.log('Child rows moved:', JSON.stringify(total));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});