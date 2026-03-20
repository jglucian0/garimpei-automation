class MessageFormatter {
  static detectStore(marketplace, link) {
    if (marketplace === 'ML') return 'no Mercado Livre';
    if (marketplace === 'AMZ') return 'na Amazon';

    if (!link) return 'na internet';
    if (link.includes('mercadolivre.com') || link.includes('meli.la')) return 'no Mercado Livre';
    if (link.includes('amzn.to')) return 'na Amazon';
    if (link.includes('centauro.com.br')) return 'na Centauro';

    return 'na internet';
  }

  static formatToBRL(value) {
    if (value === null || value === undefined) return null;

    return Number(value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  static formatPreview(product, customs = {}) {
    const data = { ...product, ...customs };

    const tituloBase = data.tituloCustom || data.title || 'Produto sem título';
    const anteTitulo = data.anteTitulo ? `*${data.anteTitulo}*\n\n` : '';
    const titulo = `${anteTitulo}${tituloBase}`;

    const price = data.precoCustom
      ? `R$ ${this.formatToBRL(data.precoCustom)}`
      : `R$ ${this.formatToBRL(data.current_price)}`;

    const oldPrice = data.removerPrecoAntigo || !data.original_price
      ? null
      : `R$ ${this.formatToBRL(data.original_price)}`;

    const emoji = data.semEmoji
      ? { m: '', d: '', s: '', q: '', c: '' }
      : { m: ' 💵', d: '🎟️ ', s: '🚚 ', q: '🔥 ', c: '⚠️ ' };

    const shippingText = data.free_shipping ? `\n\`${emoji.s}FRETE GRÁTIS!\`` : '';
    const discountText = data.discount ? `\n\`${emoji.d}${data.discount}\`` : '';

    const soldQuantity = data.sold_quantity ? `\n\`${emoji.q}${data.sold_quantity}\`` : '';

    const oldPriceText = oldPrice
      ? `De ~${oldPrice}~ | Por *${price}*${emoji.m}`
      : `Por apenas *${price}*${emoji.m}`;

    const extraInfoText = data.extraInfo ? `\n\n\`${data.extraInfo}\`` : '';

    let couponText = '';
    if (data.couponOverride) {
      couponText = `\n\n\`${emoji.c}Cupom: ${data.couponOverride}\``;
    } else if (data.coupon_applied) {
      couponText = `\n\n\`${emoji.c}Cupom já aplicado no link!\``;
    }

    const finalLink = data.affiliate_link;
    const storeName = this.detectStore(data.marketplace, finalLink);

    return `${titulo}

${oldPriceText}${shippingText}${discountText}${soldQuantity}${couponText}${extraInfoText}

Achado ${storeName}:
${finalLink}`;
  }
}

module.exports = MessageFormatter;