function tenantScope(req, res, next) {
  const requested = req.headers['x-client-id'] || (req.auth.role === 'client' ? req.auth.clientId : '');
  if (req.auth.role === 'client' && requested !== req.auth.clientId) {
    return res.status(403).json({ error: 'You can only access your own chatbot data' });
  }
  // Super admin never has a tenant of their own: they must explicitly pick
  // a client to view/manage its chatbot data (Widget, Scraper, etc).
  if (req.auth.role === 'super' && !requested) {
    return res.status(403).json({ error: 'Super admin must select a client (x-client-id header)' });
  }
  req.tenantId = requested;
  next();
}

module.exports = { tenantScope };