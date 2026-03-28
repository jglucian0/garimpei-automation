const dispatchConfigRepository = require('../repositories/dispatchConfigRepository');

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

class DispatchConfigController {

  async upsertConfig(req, res) {
    const userId = req.userId;
    const {
      sessionId, niche, intervalMinutes,
      window1Start, window1End,
      window2Start, window2End,
      isPaused
    } = req.body;

    if (!sessionId || !niche || !window1Start || !window1End) {
      return res.status(400).json({ error: 'sessionId, niche, window1Start e window1End são obrigatórios.' });
    }

    if (intervalMinutes !== undefined && intervalMinutes < 2) {
      return res.status(400).json({ error: 'O intervalo mínimo de disparo deve ser de 2 minutos para evitar bloqueios por SPAM.' });
    }

    if (!timeRegex.test(window1Start) || !timeRegex.test(window1End)) {
      return res.status(400).json({ error: 'Formato de hora inválido na Janela 1. Use HH:MM (ex: 08:30).' });
    }
    if ((window2Start && !timeRegex.test(window2Start)) || (window2End && !timeRegex.test(window2End))) {
      return res.status(400).json({ error: 'Formato de hora inválido na Janela 2. Use HH:MM.' });
    }

    try {
      const config = await dispatchConfigRepository.upsertConfig({
        userId, sessionId, niche,
        intervalMinutes: intervalMinutes || 2,
        window1Start, window1End,
        window2Start, window2End,
        isPaused
      });

      return res.status(200).json({
        message: 'Configuração de disparo salva com sucesso!',
        config
      });
    } catch (error) {
      console.error('[DispatchConfigController] Erro ao salvar config:', error);
      return res.status(500).json({ error: 'Erro interno ao salvar a configuração de disparo.' });
    }
  }

  async getConfigs(req, res) {
    const userId = req.userId;
    try {
      const configs = await dispatchConfigRepository.getConfigsByUserId(userId);
      return res.status(200).json(configs);
    } catch (error) {
      console.error('[DispatchConfigController] Erro ao buscar configs:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar as configurações.' });
    }
  }

  async deleteConfig(req, res) {
    const { id } = req.params;
    const userId = req.userId;

    try {
      const deleted = await dispatchConfigRepository.deleteConfig(id, userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Configuração não encontrada ou sem permissão.' });
      }
      return res.status(200).json({ message: 'Configuração de disparo removida com sucesso.' });
    } catch (error) {
      console.error('[DispatchConfigController] Erro ao deletar config:', error);
      return res.status(500).json({ error: 'Erro interno ao remover configuração.' });
    }
  }

  async togglePause(req, res) {
    const { id } = req.params;
    const { isPaused } = req.body;
    const userId = req.userId;

    if (typeof isPaused !== 'boolean') {
      return res.status(400).json({ error: 'O campo isPaused deve ser um booleano (true/false).' });
    }

    try {
      const updatedConfig = await dispatchConfigRepository.togglePause(id, userId, isPaused);
      if (!updatedConfig) {
        return res.status(404).json({ error: 'Configuração não encontrada.' });
      }

      const statusMsg = isPaused ? 'Pausado' : 'Retomado';
      return res.status(200).json({
        message: `Motor de disparo ${statusMsg} com sucesso para este nicho!`,
        config: updatedConfig
      });
    } catch (error) {
      console.error('[DispatchConfigController] Erro ao pausar config:', error);
      return res.status(500).json({ error: 'Erro interno ao alterar status da configuração.' });
    }
  }
}

module.exports = new DispatchConfigController();