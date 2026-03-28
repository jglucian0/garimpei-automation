const sseService = require('../services/sseService');

async function streamLiveEvents(req, res) {
  const userId = req.userId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`data: ${JSON.stringify({ event: 'CONNECTED', message: 'Listening to the Firing Motor...' })}\n\n`);

  sseService.addClient(userId, res);
}

module.exports = {
  streamLiveEvents
};