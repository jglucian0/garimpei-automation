const fs = require('fs');
const path = require('path');
const ImageService = require('./imageService');
const ingestionQueueRepository = require('../repositories/ingestionQueueRepository');

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
      if (message.fromMe) return;

      const text = (message.caption || message.body || '').trim();
      if (!text) return;

      const urlDetectada = text.match(/https?:\/\/\S+/)?.[0];
      if (!urlDetectada) return;

      const isValidMarketplace = this.validDomains.some(domain => urlDetectada.includes(domain));
      if (!isValidMarketplace) {
        console.log(`[Router] Link ignorado (Não é marketplace): ${urlDetectada}`);
        return;
      }

      if (!message.isMedia && message.type !== 'image') {
        console.log(`[Router] Link válido, mas SEM FOTO. Ignorando.`);
        return;
      }

      console.log(`[Router] Produto válido detectado! Baixando mídia...`);

      const buffer = await client.decryptFile(message);
      const tempFileName = `temp_${Date.now()}.jpg`;
      const tempFilePath = path.join(this.uploadPath, tempFileName);

      fs.writeFileSync(tempFilePath, buffer);

      const finalImagePath = await ImageService.applyWatermark(tempFilePath);

      fs.unlinkSync(tempFilePath);

      await ingestionQueueRepository.enqueue({
        sessionId: sessionId,
        chatId: message.from,
        extractedUrl: urlDetectada,
        imagePath: finalImagePath,
        rawText: text
      });

      console.log(`[Router] ✅ Produto enviado para a fila de extração com sucesso!`);

    } catch (error) {
      console.error(`[Router] Erro ao processar mensagem recebida:`, error.message);
    }
  }
}

module.exports = new MessageRouterService();