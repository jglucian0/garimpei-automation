const MessageFormatter = require('../../src/utils/messageFormatter');

describe('MessageFormatter Utility', () => {
  it('must correctly format a complete Mercado Livre product', () => {
    const mockProduct = {
      marketplace: 'ML',
      title: 'Creatina Monohidratada 1kg',
      current_price: 75.90,
      original_price: 100.00,
      discount: '24% OFF',
      free_shipping: true,
      sold_quantity: '+10 mil',
      affiliate_link: 'https://meli.la/123'
    };

    const result = MessageFormatter.formatPreview(mockProduct);

    expect(result).toContain('Creatina Monohidratada 1kg');
    expect(result).toContain('De ~R$ 100,00~');
    expect(result).toContain('*R$ 75,90*');
    expect(result).toContain('FRETE GRÁTIS!');
    expect(result).toContain('24% OFF');
    expect(result).toContain('Achado no Mercado Livre');
    expect(result).toContain('https://meli.la/123');
  });

  it('must format correctly without original price and without free shipping', () => {
    const mockProduct = {
      title: 'Cabo USB-C',
      current_price: 15.50,
      affiliate_link: 'https://amzn.to/abc',
      marketplace: 'AMZ'
    };

    const result = MessageFormatter.formatPreview(mockProduct);

    expect(result).toContain('Por apenas *R$ 15,50*');
    expect(result).not.toContain('De ~');
    expect(result).not.toContain('FRETE GRÁTIS!');
    expect(result).toContain('Achado na Amazon');
  });
});