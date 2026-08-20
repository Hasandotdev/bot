const crypto = require('crypto');
const prisma = require('./db');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

async function getAll(clientId) {
  let settings = await prisma.settings.findUnique({ where: { clientId } });
  if (!settings) settings = await prisma.settings.create({ data: { clientId } });
  return settings;
}

async function getPublic(clientId) {
  const [client, settings] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.settings.findUnique({ where: { clientId } }),
  ]);
  return {
    name: settings?.name || client?.name || 'Admin',
    company: client?.company || null,
    username: client?.username || null,
    avatar: settings?.avatar || null,
    hasPassword: !!client?.passwordHash,
    email: client?.email || null,
    phone: client?.phone || null,
    locations: settings?.locations || null,
    colors: { primary: settings?.colorsPrimary || '#2563eb' },
    logo: settings?.logo || null,
    emailNotifications: !!settings?.emailNotifications,
  };
}

async function update(clientId, patch) {
  const settingsData = {};
  const clientData = {};

  if (patch.name !== undefined) {
    settingsData.name = patch.name !== null && String(patch.name).trim() ? String(patch.name).trim() : 'Admin';
  }
  if (patch.avatar !== undefined) settingsData.avatar = patch.avatar || null;
  if (patch.locations !== undefined) {
    settingsData.locations = patch.locations !== null && String(patch.locations).trim() ? String(patch.locations).trim() : null;
  }
  if (patch.colors !== undefined) {
    settingsData.colorsPrimary = patch.colors && patch.colors.primary ? String(patch.colors.primary) : '#2563eb';
  }
  if (patch.logo !== undefined) {
    settingsData.logo = patch.logo && String(patch.logo).trim() ? String(patch.logo).trim() : null;
  }
  if (patch.emailNotifications !== undefined) settingsData.emailNotifications = !!patch.emailNotifications;

  if (patch.company !== undefined) {
    clientData.company = patch.company !== null && String(patch.company).trim() ? String(patch.company).trim() : null;
  }
  if (patch.email !== undefined) {
    clientData.email = patch.email !== null && String(patch.email).trim() ? String(patch.email).trim() : null;
  }
  if (patch.phone !== undefined) {
    clientData.phone = patch.phone !== null && String(patch.phone).trim() ? String(patch.phone).trim() : null;
  }
  if (patch.username !== undefined && patch.username !== null && String(patch.username).trim()) {
    clientData.username = String(patch.username).trim();
  }
  if (patch.password) {
    const salt = crypto.randomBytes(16).toString('hex');
    clientData.passwordSalt = salt;
    clientData.passwordHash = hashPassword(patch.password, salt);
  }

  await prisma.settings.upsert({
    where: { clientId },
    update: settingsData,
    create: { clientId, ...settingsData },
  });

  if (Object.keys(clientData).length) {
    try {
      await prisma.client.update({ where: { id: clientId }, data: clientData });
    } catch (err) {
      if (err.code === 'P2002') throw new Error('Username already exists');
      throw err;
    }
  }

  return getPublic(clientId);
}

module.exports = { getAll, getPublic, update };