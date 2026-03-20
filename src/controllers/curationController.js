const pendingApprovalRepository = require('../repositories/pendingApprovalRepository');
const productRepository = require('../repositories/productRepository');
const MessageFormatter = require('../utils/messageFormatter');

async function getPendingProducts(req, res) {
  const userId = req.userId;

  try {
    const items = await pendingApprovalRepository.getPendingByUserId(userId);

    const itemsWithPreview = items.map(item => {
      return {
        ...item,
        formattedMessage: MessageFormatter.formatPreview(item)
      };
    });
    return res.status(200).json(itemsWithPreview);
  } catch (error) {
    console.error('[CurationController] Erro ao buscar pendentes:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar produtos pendentes.' });
  }
}

async function rejectProduct(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const deleted = await pendingApprovalRepository.deletePendingItem(id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Produto não encontrado ou você não tem permissão para excluí-lo.' });
    }

    return res.status(200).json({ message: 'Produto rejeitado e removido com sucesso.' });
  } catch (error) {
    console.error('[CurationController] Erro ao rejeitar produto:', error);
    return res.status(500).json({ error: 'Erro interno ao rejeitar o produto.' });
  }
}

async function approveProduct(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pendingItem = await pendingApprovalRepository.getPendingItemById(id, userId);

    if (!pendingItem) {
      return res.status(404).json({ error: 'Produto não encontrado na fila ou sem permissão.' });
    }

    const approvedProduct = await productRepository.approveAndUpsert(pendingItem, userId);

    await pendingApprovalRepository.deletePendingItem(id, userId);

    return res.status(200).json({
      message: 'Produto aprovado e enfileirado para disparo com sucesso!',
      product: approvedProduct
    });

  } catch (error) {
    console.error('[CurationController] Erro ao aprovar produto:', error);
    return res.status(500).json({ error: 'Erro interno ao aprovar o produto.' });
  }
}

module.exports = {
  getPendingProducts,
  rejectProduct,
  approveProduct
};