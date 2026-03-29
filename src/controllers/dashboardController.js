const sseService = require('../services/sseService');
const productRepository = require('../repositories/productRepository');
const groupConfigRepository = require('../repositories/groupConfigRepository');
const dispatchConfigRepository = require('../repositories/dispatchConfigRepository');

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
    const activeGroupsCount = await groupConfigRepository.countDispatchGroupsByUserId(userId);
    const dispatchConfigs = await dispatchConfigRepository.getConfigsByUserId(userId);

    const totalAttemptedToday = summary.dispatchedToday + summary.failedToday;
    let successRate = 100;
    if (totalAttemptedToday > 0) {
      successRate = Math.round((summary.dispatchedToday / totalAttemptedToday) * 100);
    }

    let totalDailySlots = 0;

    for (const config of dispatchConfigs) {
      if (config.is_paused) continue;

      const getMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const w1 = getMinutes(config.window_1_end) - getMinutes(config.window_1_start);
      const w2 = getMinutes(config.window_2_end) - getMinutes(config.window_2_start);

      const activeMinutes = (w1 > 0 ? w1 : 0) + (w2 > 0 ? w2 : 0);

      if (config.interval_minutes > 0) {
        totalDailySlots += Math.floor(activeMinutes / config.interval_minutes);
      }
    }

    let queueHealthText = "No active engine";
    let queueStatus = "neutral";

    if (totalDailySlots > 0) {
      const daysRemaining = summary.totalPending / totalDailySlots;
      const hoursRemaining = Math.round(daysRemaining * 24);

      if (hoursRemaining === 0) {
        queueHealthText = "Empty queue! Add products.";
        queueStatus = "critical";
      } else if (hoursRemaining < 24) {
        queueHealthText = `Atenção: Estoque p/ ${hoursRemaining}h`;
        queueStatus = "warning";
      } else {
        queueHealthText = `Saudável: Estoque p/ ${Math.round(daysRemaining)} dias`;
        queueStatus = "good";
      }
    }

    return res.status(200).json({
      ...summary,
      successRate,
      activeGroups: activeGroupsCount,
      queueHealth: {
        text: queueHealthText,
        status: queueStatus,
        dailyCapacity: totalDailySlots
      }
    });

  } catch (error) {
    console.error('[DashboardController] Error fetching summary:', error);
    return res.status(500).json({ error: 'Internal error compiling dashboard data.' });
  }
}

module.exports = {
  streamLiveEvents,
  getSummary
};