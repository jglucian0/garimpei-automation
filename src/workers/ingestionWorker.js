const axios = require('axios');
const ingestionQueueRepository = require('../repositories/ingestionQueueRepository');
const pendingApprovalRepository = require('../repositories/pendingApprovalRepository');

const { garimpeiApiUrl, garimpeiApiKey } = require('../config/env');
const manager = require('../services/sessionSingleton');

class IngestionWorker {
  constructor() {
    this.isRunning = false;
    this.pollInterval = 5000;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🤖 [Ingestion Worker] Iniciado. Aguardando links para processar...');
    this.loop();
  }

  async loop() {
    while (this.isRunning) {
      let currentItemId = null;
      try {
        const item = await ingestionQueueRepository.getNextAndLock();

        if (!item) {
          await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
          continue;
        }

        currentItemId = item.id;

        const sessionConfig = manager.getSession(item.session_id);
        const userId = sessionConfig ? sessionConfig.userId : null;

        if (!userId) {
          console.error(`[Worker] ❌ Erro: userId não encontrado para a sessão ${item.session_id}.`);
          await ingestionQueueRepository.updateStatus(currentItemId, 'error');
          continue;
        }

        const cleanUrl = item.extracted_url.replace(/[\r\n\s]+/g, '').replace(/[.,;!?]+$/, '');

        console.log(`[Worker] Processando item ID: ${currentItemId} | URL Limpa: ${cleanUrl}`);

        const response = await axios.post(
          `${garimpeiApiUrl}/extract`,
          {
            userId: userId,
            url: cleanUrl
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': garimpeiApiKey
            },
            timeout: 60000
          }
        );

        const apiData = response.data;

        await pendingApprovalRepository.savePendingProduct({
          ...apiData,
          session_id: item.session_id,
          source_chat_id: item.chat_id,
          local_image_path: item.image_path
        });

        await ingestionQueueRepository.updateStatus(currentItemId, 'done');
        console.log(`[Worker] ✅ Item ID: ${currentItemId} salvo com sucesso no banco de aprovação!`);

      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message;
        console.error(`[Worker] ❌ Erro ao processar item:`, errorMessage);

        if (currentItemId) {
          await ingestionQueueRepository.updateStatus(currentItemId, 'error').catch(() => { });
        }
      }
    }
  }
}

module.exports = new IngestionWorker();