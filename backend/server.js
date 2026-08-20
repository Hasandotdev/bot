require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const clientService = require('./services/clientService');
const { parseBasic } = require('./middleware/auth');

const chatRoutes = require('./routes/chat');
const chatLogRoutes = require('./routes/chatLog');
const contactRoutes = require('./routes/contacts');
const knowledgeRoutes = require('./routes/knowledge');
const scraperRoutes = require('./routes/scraper');
const productRoutes = require('./routes/products');
const packageRoutes = require('./routes/packages');
const settingsRoutes = require('./routes/settings');
const clientRoutes = require('./routes/clients');
const servicesRoutes = require('./routes/services');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));

// Never cache admin/widget files so browser always gets the latest version
function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

app.use((req, res, next) => {
  console.log(`[req] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

app.post('/api/admin/login', async (req, res) => {
  const creds = parseBasic(req);
  if (!creds) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (clientService.checkSuperCredentials(creds.username, creds.password)) {
    console.log(`[login] SUPER ADMIN "${creds.username}" logged in`);
    return res.json({ role: 'super', name: 'Super Admin', username: creds.username });
  }

  const client = await clientService.checkClientCredentials(creds.username, creds.password);
  if (client) {
    console.log(`[login] client "${creds.username}" logged in (${client.id})`);
    return res.json({ role: 'client', clientId: client.id, name: client.name, username: creds.username });
  }

  console.log(`[login] failed attempt by "${creds.username}"`);
  return res.status(403).json({ error: 'Invalid username or password' });
});

app.get('/api/admin/login', (req, res) => res.status(405).json({ error: 'Use POST to authenticate' }));

app.use('/api/chat', chatRoutes);
app.use('/api/chatlogs', chatLogRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/admin', scraperRoutes);
app.use('/api/products', productRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/services', servicesRoutes);

app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), { setHeaders: noStore }));
app.use('/widget', express.static(path.join(__dirname, '..', 'widget'), { setHeaders: noStore }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'embed.html'));
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test.html'));
});

app.get('/preview-client', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'preview-client.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b' });
});

// Global error handlers to prevent server crashes
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

app.listen(PORT, () => {
  console.log(`Leads Chatbot running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Admin:  http://localhost:${PORT}/admin`);
  console.log(`Widget: http://localhost:${PORT}/widget/widget.js`);
});