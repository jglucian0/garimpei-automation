const groupConfigRepository = require('../repositories/groupConfigRepository');
const manager = require('../services/sessionSingleton');

async function registerGroup(req, res) {
  const { sessionId } = req.params;
  const userId = req.userId;

  const { groupId, groupName, role = 'coletor', niche = 'sem nicho' } = req.body;

  if (!groupId || !groupName) {
    return res.status(400).json({ error: 'groupId and groupName are required.' });
  }

  try {
    const sessionConfig = manager.getSession(sessionId);

    if (!sessionConfig || sessionConfig.userId !== userId) {
      return res.status(403).json({ error: 'Invalid session or access denied.' });
    }

    await groupConfigRepository.registerGroup(userId, sessionId, groupId, groupName, role, niche);

    return res.status(200).json({
      success: true,
      message: `Group '${groupName}' configured as '${role}' successfully!`
    });

  } catch (error) {
    console.error('[GroupConfigController] Error registering group:', error);
    return res.status(500).json({ error: 'Internal error saving the configuration.' });
  }
}

module.exports = { registerGroup };