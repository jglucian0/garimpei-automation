const dispatchConfigRepository = require('../repositories/dispatchConfigRepository');
const groupConfigRepository = require('../repositories/groupConfigRepository');
const productRepository = require('../repositories/productRepository');
const MessageFormatter = require('../utils/messageFormatter');

const WppService = require('../services/wppService');
const manager = require('../services/sessionSingleton');
const wppService = new WppService(manager);

class DispatchWorker {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    this.intervalId = setInterval(() => this.processQueue(), 60000);

    this.processQueue();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('🛑 [DispatchWorker] Trigger Motor stopped.');
    }
  }

  async processQueue() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const activeConfigs = await dispatchConfigRepository.getActiveConfigs();

      for (const config of activeConfigs) {
        if (!this.isTimePermitted(config)) continue;

        const session = manager.getSession(config.session_id);
        if (!session || session.status !== 'connected') {
          continue;
        }

        const groups = await groupConfigRepository.getDispatchGroups(config.session_id, config.niche);
        if (groups.length === 0) continue;

        const product = await productRepository.getNextProductForDispatch(config.user_id, config.niche);
        if (!product) continue;

        const messageText = MessageFormatter.formatPreview(product);

        let successCount = 0;
        for (const groupId of groups) {
          try {
            if (product.local_image_path) {
              await wppService.sendImage(config.session_id, groupId, product.local_image_path, messageText);
            } else {
              await wppService.sendText(config.session_id, groupId, messageText);
            }
            successCount++;
          } catch (sendError) {
            console.error(`[DispatchWorker] Failed to send to group ${groupId}:`, sendError.message);
          }
        }

        if (successCount > 0) {
          await productRepository.markAsDispatched(product.id);
          await dispatchConfigRepository.updateLastExecution(config.id);
        } else {
          const errorData = await productRepository.incrementErrorCount(product.id);

          if (errorData.status === 'failed') {
            console.log(`[DispatchWorker] Produto ${product.id} falhou 3 vezes e foi DESCARTADO da fila de envio.`);
          }
        }
      }

    } catch (error) {
      console.error('[DispatchWorker] Critical trigger engine error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  isTimePermitted(config) {
    const now = new Date();

    if (config.last_execution) {
      const lastExec = new Date(config.last_execution);
      const diffMinutes = (now - lastExec) / (1000 * 60);

      if (diffMinutes < 0) {
        console.log(`[Worker Failsafe] Negative time (${diffMinutes.toFixed(2)} min). Time zone out of sync. Releasing shooting to re-record the right time!`);
        return true;
      }

      if (diffMinutes < config.interval_minutes) {
        return false;
      }
    }

    const currentTimeString = now.toLocaleTimeString('pt-BR', { hour12: false, timeZone: 'America/Sao_Paulo' });

    const inWindow1 = currentTimeString >= config.window_1_start && currentTimeString <= config.window_1_end;

    let inWindow2 = false;
    if (config.window_2_start && config.window_2_end) {
      inWindow2 = currentTimeString >= config.window_2_start && currentTimeString <= config.window_2_end;
    }

    if (!inWindow1 && !inWindow2) {
      return false;
    }

    return true;
  }
}

module.exports = new DispatchWorker();