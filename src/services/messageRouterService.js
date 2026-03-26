const fs = require('fs');
const path = require('path');
const ImageService = require('./imageService');
const manager = require('./sessionSingleton');
const ingestionQueueRepository = require('../repositories/ingestionQueueRepository');
const groupConfigRepository = require('../repositories/groupConfigRepository');

class MessageRouterService {
  constructor() {
    this.validDomains = [
      'meli.la',
      'mercadolivre.com',
      'amazon.com.br',
      'amzn.to',
      'a.co',
      'nike.com.br',
      'centauro.com.br',
      'shopee.com.br',
      'shope.ee'
    ];

    this.uploadPath = path.resolve(__dirname, '../../uploads/offers');
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async routeIncomingMessage(client, message, sessionId) {
    try {
      const sessionConfig = manager.getSession(sessionId);
      if (!sessionConfig || !sessionConfig.userId) {
        console.error(`[Router] ❌ Mensagem ignorada. Sessão ${sessionId} sem dono (userId) atrelado na memória.`);
        return;
      }
      const userId = sessionConfig.userId;

      if (message.fromMe) return;

      if (message.isGroupMsg) {
        const isCollector = await groupConfigRepository.isCollectorGroup(sessionId, message.from);
        if (!isCollector) return;
      } else {
        return;
      }

      const text = (message.caption || message.body || '').trim();
      if (!text) return;

      const urlDetectada = text.match(/https?:\/\/\S+/)?.[0];
      if (!urlDetectada) return;

      const isValidMarketplace = this.validDomains.some(domain => urlDetectada.includes(domain));
      if (!isValidMarketplace) {
        return;
      }

      let finalImagePath = null;

      if (message.isMedia || message.type === 'image') {
        const buffer = await client.decryptFile(message);
        const tempFileName = `temp_${Date.now()}.jpg`;
        const tempFilePath = path.join(this.uploadPath, tempFileName);

        fs.writeFileSync(tempFilePath, buffer);
        finalImagePath = await ImageService.applyWatermark(tempFilePath);
        fs.unlinkSync(tempFilePath);
      }

      await ingestionQueueRepository.enqueue({
        userId: userId,
        sessionId: sessionId,
        chatId: message.from,
        extractedUrl: urlDetectada,
        imagePath: finalImagePath,
        rawText: text
      });

    } catch (error) {
      console.error(`[Router] Error processing received message:`, error.message);
    }
  }
}

module.exports = new MessageRouterService();