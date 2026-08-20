const prisma = require('./db');

async function getAll(clientId) {
  return prisma.product.findMany({ where: { clientId } });
}

async function getById(clientId, id) {
  return prisma.product.findFirst({ where: { id, clientId } });
}

async function create(clientId, product) {
  return prisma.product.create({
    data: {
      clientId,
      name: product.name,
      stack: product.stack,
      category: product.category,
      priceRange: product.priceRange,
      description: product.description,
    },
  });
}

async function update(clientId, id, updates) {
  const existing = await getById(clientId, id);
  if (!existing) return null;
  const data = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.stack !== undefined) data.stack = updates.stack;
  if (updates.category !== undefined) data.category = updates.category;
  if (updates.priceRange !== undefined) data.priceRange = updates.priceRange;
  if (updates.description !== undefined) data.description = updates.description;
  return prisma.product.update({ where: { id }, data });
}

async function remove(clientId, id) {
  const existing = await getById(clientId, id);
  if (!existing) return false;
  await prisma.product.delete({ where: { id } });
  return true;
}

module.exports = { getAll, getById, create, update, remove };