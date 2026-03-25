const fs = require('fs');
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
    const pendingItem = await pendingApprovalRepository.getPendingItemById(id, userId);

    if (!pendingItem) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    await pendingApprovalRepository.deletePendingItem(id, userId);

    if (pendingItem.local_image_path && fs.existsSync(pendingItem.local_image_path)) {
      fs.unlinkSync(pendingItem.local_image_path);
    }

    return res.status(200).json({ message: 'Product rejected and photo successfully removed.' });
  } catch (error) {
    console.error('[CurationController] Error rejecting product:', error);
    return res.status(500).json({ error: 'Internal error rejecting product.' });
  }
}

async function approveProduct(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pendingItem = await pendingApprovalRepository.getPendingItemById(id, userId);

    if (!pendingItem) {
      return res.status(404).json({ error: 'Product not found in the queue or without permission.' });
    }

    const approvedProduct = await productRepository.approveAndUpsert(pendingItem, userId);

    await pendingApprovalRepository.deletePendingItem(id, userId);

    return res.status(200).json({
      message: 'Product approved and queued for successful shooting!',
      product: approvedProduct
    });

  } catch (error) {
    console.error('[CurationController] Error approving product:', error);
    return res.status(500).json({ error: 'Internal error approving the product.' });
  }
}

async function getApprovedProducts(req, res) {
  const userId = req.userId;

  try {
    const products = await productRepository.getProductsByUserId(userId);

    return res.status(200).json(products);
  } catch (error) {
    console.error('[CurationController] Error listing approved products:', error);
    return res.status(500).json({ error: 'Internal error when searching the trigger list.' });
  }
}

module.exports = {
  getPendingProducts,
  getApprovedProducts,
  rejectProduct,
  approveProduct
};