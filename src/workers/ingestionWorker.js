const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const ingestionQueueRepository = require('../repositories/ingestionQueueRepository');
const pendingApprovalRepository = require('../repositories/pendingApprovalRepository');
const ImageService = require('../services/imageService');

const { garimpeiApiUrl, garimpeiApiKey } = require('../config/env');
const manager = require('../services/sessionSingleton');

class IngestionWorker {
  constructor() {
    this.isRunning = false;
    this.pollInterval = 5000;
    this.uploadPath = path.resolve(__dirname, '../../uploads/offers');
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
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
          console.error(`[Worker] Error: userId not found for session ${item.session_id}.`);
          await ingestionQueueRepository.updateStatus(currentItemId, 'error');
          continue;
        }

        const cleanUrl = item.extracted_url.replace(/[\r\n\s]+/g, '').replace(/[.,;!?]+$/, '');

        const response = await axios.post(
          `${garimpeiApiUrl}/extract`,
          { userId: userId, url: cleanUrl },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': garimpeiApiKey
            },
            timeout: 60000
          }
        );

        const apiData = response.data;

        if (!apiData.link) {
          throw new Error('[Worker] Error: extracted product, but the API failed to generate the affiliate link.');
        }

        const urlBase = apiData.linkOriginal || cleanUrl;
        const hashProduto = crypto.createHash('md5').update(urlBase).digest('hex');
        let imagemParaSalvar = null;

        if (item.image_path && fs.existsSync(item.image_path)) {
          const nomeArquivoDefinitivo = `oferta_${hashProduto}.jpg`;
          const caminhoDefinitivo = path.join(this.uploadPath, nomeArquivoDefinitivo);

          if (fs.existsSync(caminhoDefinitivo)) {
            fs.unlinkSync(item.image_path);
            imagemParaSalvar = caminhoDefinitivo;
          } else {
            fs.renameSync(item.image_path, caminhoDefinitivo);
            imagemParaSalvar = caminhoDefinitivo;
          }

        } else if (apiData.imagePath) {
          const regexExtratorUrl = /\((https?:\/\/[^\)]+)\)/;
          const matchUrl = apiData.imagePath.match(regexExtratorUrl);
          const scraperImageUrl = matchUrl ? matchUrl[1] : null;

          if (scraperImageUrl) {
            const nomeArquivoScraper = `oferta_scraper_${hashProduto}.jpg`;
            const caminhoDefinitivoScraper = path.join(this.uploadPath, nomeArquivoScraper);

            if (fs.existsSync(caminhoDefinitivoScraper)) {
              imagemParaSalvar = caminhoDefinitivoScraper;
            } else {
              try {
                const imgResponse = await axios.get(scraperImageUrl, { responseType: 'arraybuffer' });
                const tempFilePath = path.join(this.uploadPath, `temp_scraper_${Date.now()}.jpg`);
                fs.writeFileSync(tempFilePath, imgResponse.data);

                const watermarkedPath = await ImageService.applyWatermark(tempFilePath);
                fs.unlinkSync(tempFilePath);
                fs.renameSync(watermarkedPath, caminhoDefinitivoScraper);

                imagemParaSalvar = caminhoDefinitivoScraper;
              } catch (imgError) {
                console.error(`[Worker] Error: failed to process scraper photo:`, imgError.message);
                imagemParaSalvar = null;
              }
            }
          }
        }

        if (!imagemParaSalvar) {
          console.log(`[Worker] Error: product without valid photo (Neither on WhatsApp nor on Scraper). Discarding offer!`);
          await ingestionQueueRepository.deleteItem(currentItemId);
          continue;
        }

        await pendingApprovalRepository.savePendingProduct({
          ...apiData,
          userId: userId,
          session_id: item.session_id,
          source_chat_id: item.chat_id,
          local_image_path: imagemParaSalvar,
          affiliate_link: apiData.link
        });

        await ingestionQueueRepository.deleteItem(currentItemId);

      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.error(`[Worker] garimpei-api-rest offline (${error.address || 'host'}:${error.port || ''}). Pausing for 10s...`);

          if (currentItemId) {
            await ingestionQueueRepository.updateStatus(currentItemId, 'pending').catch(() => { });
          }

          await new Promise(resolve => setTimeout(resolve, 10000));

        } else {
          const errorMessage = error.response?.data?.error || error.message;
          console.error(`[Worker] Error processing item:`, errorMessage);

          if (currentItemId) {
            await ingestionQueueRepository.deleteItem(currentItemId).catch(() => { });
          }

          await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
        }
      }
    }
  }
}

module.exports = new IngestionWorker();