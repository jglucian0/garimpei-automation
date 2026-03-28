const sseService = require('../services/sseService');
const productRepository = require('../repositories/productRepository');

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

async function getSummary(req, res) {
  const userId = req.userId;

  try {
    const summary = await productRepository.getDashboardSummary(userId);
    return res.status(200).json(summary);
  } catch (error) {
    console.error('[DashboardController] Erro ao buscar summary:', error);
    return res.status(500).json({ error: 'Erro interno ao compilar os dados do painel.' });
  }
}

module.exports = {
  streamLiveEvents,
  getSummary
};