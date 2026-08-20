const clientService = require('../services/clientService');

function parseBasic(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  const base64 = authHeader.split(' ')[1];
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  const idx = decoded.indexOf(':');
  if (idx === -1) return null;
  return { username: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
}

async function adminAuth(req, res, next) {
  const creds = parseBasic(req);
  if (!creds) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (clientService.checkSuperCredentials(creds.username, creds.password)) {
    req.auth = { role: 'super', username: creds.username };
    return next();
  }

  try {
    const client = await clientService.checkClientCredentials(creds.username, creds.password);
    if (client) {
      req.auth = { role: 'client', username: creds.username, clientId: client.id };
      return next();
    }
  } catch (err) {
    console.error('[auth] credential check failed:', err.message);
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }

  console.log(`[auth] failed login attempt by "${creds.username}"`);
  return res.status(403).json({ error: 'Invalid credentials' });
}

module.exports = { adminAuth, parseBasic };