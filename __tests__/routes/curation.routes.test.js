const request = require('supertest');
const express = require('express');
const curationRoutes = require('../../src/routes/curation.routes');

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn()
}));

jest.mock('../../src/config/env', () => ({
  garimpeiApiKey: 'chave_secreta_teste'
}));

jest.mock('../../src/repositories/pendingApprovalRepository', () => ({
  getPendingByUserId: jest.fn(),
  deletePendingItem: jest.fn(),
  getPendingItemById: jest.fn()
}));

jest.mock('../../src/repositories/productRepository', () => ({
  approveAndUpsert: jest.fn(),
  getProductsByUserId: jest.fn()
}));

const pendingApprovalRepository = require('../../src/repositories/pendingApprovalRepository');
const productRepository = require('../../src/repositories/productRepository');

const app = express();
app.use(express.json());
app.use('/curation', curationRoutes);

describe('Curation API Endpoints', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Segurança (Auth Middleware)', () => {
    it('should return 401 if API Key is not sent', async () => {
      const response = await request(app)
        .get('/curation/pending')
        .set('x-user-id', 'user_123');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch("Access denied. Invalid API key.");
    });

    it('should return 400 if x-user-id is not sent', async () => {
      const response = await request(app)
        .get('/curation/pending')
        .set('x-api-key', 'chave_secreta_teste');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch("Access denied. x-user-id header is required.");
    });
  });

  describe('GET /curation/pending', () => {
    it("must return the user's pending products list successfully", async () => {
      pendingApprovalRepository.getPendingByUserId.mockResolvedValue([
        { id: 1, title: 'Produto Teste', current_price: 10.00 }
      ]);

      const response = await request(app)
        .get('/curation/pending')
        .set('x-api-key', 'chave_secreta_teste')
        .set('x-user-id', 'user_123');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].title).toBe('Produto Teste');
      expect(response.body[0]).toHaveProperty('formattedMessage');
    });
  });

  describe('DELETE /curation/reject/:id', () => {
    it('should return 200 when successfully rejecting a product and cleaning up the image', async () => {
      pendingApprovalRepository.getPendingItemById.mockResolvedValue({
        id: 1,
        local_image_path: '/fake/path/oferta_123.jpg'
      });
      pendingApprovalRepository.deletePendingItem.mockResolvedValue(true);

      const response = await request(app)
        .delete('/curation/reject/1')
        .set('x-api-key', 'chave_secreta_teste')
        .set('x-user-id', 'user_123');

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch("Product rejected and photo successfully removed.");
    });

    it('should return 404 if product is not found', async () => {
      pendingApprovalRepository.getPendingItemById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/curation/reject/99')
        .set('x-api-key', 'chave_secreta_teste')
        .set('x-user-id', 'user_123');

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/Produto não encontrado/);
    });
  });

  describe('POST /curation/approve/:id', () => {
    it('should return 200 and approve product, moving it to products table with a niche', async () => {
      pendingApprovalRepository.getPendingItemById.mockResolvedValue({
        id: 1,
        title: 'Produto Teste'
      });
      productRepository.approveAndUpsert.mockResolvedValue({
        id: 10,
        title: 'Produto Teste',
        niche: 'academia'
      });

      const response = await request(app)
        .post('/curation/approve/1')
        .set('x-api-key', 'chave_secreta_teste')
        .set('x-user-id', 'user_123')
        .send({ niche: 'academia' });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch("Product approved and queued for successful shooting!");
      expect(response.body.product.niche).toBe('academia');
    });
  });

  describe('GET /curation/approved', () => {
    it('should return 200 and list approved products for dispatch', async () => {
      productRepository.getProductsByUserId.mockResolvedValue([
        { id: 10, title: 'Produto Teste Aprovado', status: 'pending_dispatch' }
      ]);

      const response = await request(app)
        .get('/curation/approved')
        .set('x-api-key', 'chave_secreta_teste')
        .set('x-user-id', 'user_123');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].title).toBe('Produto Teste Aprovado');
      expect(response.body[0].status).toBe('pending_dispatch');
    });
  });

});