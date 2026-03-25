require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { manager, wppService } = require('./controllers/sessionController');

(async () => {
  try {
    await manager.loadExistingSessions();
    for (const session of manager.sessions.values()) {
      wppService.initSession(session.id);
    }
  } catch (error) {
    console.error('[App] Critical error when loading database sessions:', error);
  }
})();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => res.status(200).json({ message: 'Garimpei Automation Online' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));

app.use('/session', require('./routes/session.routes'));

app.use('/curation', require('./routes/curation.routes'));

//app.use('/niche-groups', require('./routes/nicheGroups.routes'));
//app.use('/dispatch', require('./routes/dispatch.routes'));

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

module.exports = app;