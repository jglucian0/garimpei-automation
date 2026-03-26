const fs = require('fs');
const pendingApprovalRepository = require('../repositories/pendingApprovalRepository');
const productRepository = require('../repositories/productRepository');
const MessageFormatter = require('../utils/messageFormatter');
const ImageService = require('../services/imageService');

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
    console.error('[CurationController] Error fetching pending items:', error);
    return res.status(500).json({ error: 'Internal error when searching for pending products.' });
  }
}

async function updatePendingProduct(req, res) {
  const { id } = req.params;
  const userId = req.userId;
  const updateData = req.body;

  try {
    if (req.file) {
      const oldProduct = await pendingApprovalRepository.getPendingItemById(id, userId);
      if (oldProduct && oldProduct.local_image_path && fs.existsSync(oldProduct.local_image_path)) {
        fs.unlinkSync(oldProduct.local_image_path);
      }

      const tempPath = req.file.path;
      const finalImagePath = await ImageService.applyWatermark(tempPath);
      fs.unlinkSync(tempPath);

      updateData.local_image_path = finalImagePath;
    }

    const updatedProduct = await pendingApprovalRepository.updatePendingItem(id, userId, updateData);

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Pending product not found.' });
    }

    return res.status(200).json({ message: 'Pending product updated!', product: updatedProduct });
  } catch (error) {
    console.error('[CurationController] Error editing pending:', error);
    return res.status(500).json({ error: 'Internal error while editing.' });
  }
}

async function rejectProduct(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const pendingItem = await pendingApprovalRepository.getPendingItemById(id, userId);

    if (!pendingItem) {
      return res.status(404).json({ error: 'Product not found.' });
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
  const { niche } = req.body;

  try {
    const pendingItem = await pendingApprovalRepository.getPendingItemById(id, userId);

    if (!pendingItem) {
      return res.status(404).json({ error: 'Product not found in the queue or without permission.' });
    }

    pendingItem.niche = niche || 'geral';

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

async function updateApprovedProduct(req, res) {
  const { id } = req.params;
  const userId = req.userId;
  const updateData = req.body;

  try {
    if (req.file) {

      const oldProduct = await productRepository.getProductById(id, userId);
      if (oldProduct && oldProduct.local_image_path && fs.existsSync(oldProduct.local_image_path)) {
        fs.unlinkSync(oldProduct.local_image_path);
      }

      const tempPath = req.file.path;
      const finalImagePath = await ImageService.applyWatermark(tempPath);

      fs.unlinkSync(tempPath);

      updateData.local_image_path = finalImagePath;
    }

    const updatedProduct = await productRepository.updateProduct(id, userId, updateData);

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found or you do not have permission.' });
    }

    return res.status(200).json({
      message: 'Product updated successfully!',
      product: updatedProduct
    });
  } catch (error) {
    console.error('[CurationController] Error updating product:', error);
    return res.status(500).json({ error: 'Internal error when updating product.' });
  }
}

async function deleteApprovedProduct(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const deletedProduct = await productRepository.deleteProduct(id, userId);

    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found or you do not have permission.' });
    }

    if (deletedProduct.local_image_path && fs.existsSync(deletedProduct.local_image_path)) {
      fs.unlinkSync(deletedProduct.local_image_path);
      console.log(`[Curated] Final product excluded. Image deleted: ${deletedProduct.local_image_path}`);
    }

    return res.status(200).json({ success: true, message: 'Product definitively removed from the firing queue.' });
  } catch (error) {
    console.error('[CurationController] Error deleting product:', error);
    return res.status(500).json({ error: 'Internal error when deleting product.' });
  }
}

module.exports = {
  getPendingProducts,
  updatePendingProduct,
  rejectProduct,
  approveProduct,
  getApprovedProducts,
  updateApprovedProduct,
  deleteApprovedProduct
};