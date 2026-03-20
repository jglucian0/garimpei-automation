const request = require('supertest');
const express = require('express');
const curationRoutes = require('../../src/routes/curation.routes');

jest.mock('../../src/config/env', () => ({
  garimpeiApiKey: 'chave_secreta_teste'
}));

jest.mock('../../src/repositories/pendingApprovalRepository', () => ({
  getPendingByUserId: jest.fn(),
  deletePendingItem: jest.fn(),
  getPendingItemById: jest.fn()
}));
jest.mock('../../src/repositories/productRepository', () => ({
  approveAndUpsert: jest.fn()
}));

const pendingApprovalRepository = require('../../src/repositories/pendingApprovalRepository');

const app = express();
app.use(express.json());
app.use('/curation', curationRoutes);

describe('Curation API Endpoints', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Segurança (Auth Middleware)', () => {
    it('deve retornar 401 se a API Key não for enviada', async () => {
      const response = await request(app)
        .get('/curation/pending')
        .set('x-user-id', 'user_123');

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/Acesso negado/);
    });

    it('deve retornar 400 se o x-user-id não for enviado', async () => {
      const response = await request(app)
        .get('/curation/pending')
        .set('x-api-key', 'chave_secreta_teste');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /curation/pending', () => {
    it('deve retornar a lista de produtos pendentes do usuário com sucesso', async () => {
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
    it('deve retornar 200 ao rejeitar um produto com sucesso', async () => {
      pendingApprovalRepository.deletePendingItem.mockResolvedValue(true);

      const response = await request(app)
        .delete('/curation/reject/1')
        .set('x-api-key', 'chave_secreta_teste')
        .set('x-user-id', 'user_123');

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/removido com sucesso/);
    });
  });
});