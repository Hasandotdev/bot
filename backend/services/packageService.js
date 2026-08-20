const prisma = require('./db');

async function getAll(clientId) {
  return prisma.package.findMany({ where: { clientId } });
}

async function getById(clientId, id) {
  return prisma.package.findFirst({ where: { id, clientId } });
}

async function create(clientId, pkg) {
  return prisma.package.create({
    data: { clientId, service: pkg.service, packages: pkg.packages || {} },
  });
}

async function update(clientId, id, updates) {
  const existing = await getById(clientId, id);
  if (!existing) return null;
  const data = {};
  if (updates.service !== undefined) data.service = updates.service;
  if (updates.packages !== undefined) data.packages = updates.packages;
  return prisma.package.update({ where: { id }, data });
}

async function remove(clientId, id) {
  const existing = await getById(clientId, id);
  if (!existing) return false;
  await prisma.package.delete({ where: { id } });
  return true;
}

async function forPrompt(clientId) {
  const packages = await getAll(clientId);
  return packages.filter(p => {
    const pkgs = p.packages || {};
    return Object.values(pkgs).some(v => v && (v.price || '').trim());
  });
}

module.exports = { getAll, getById, create, update, remove, forPrompt };