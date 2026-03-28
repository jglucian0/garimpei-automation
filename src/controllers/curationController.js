const fs = require('fs');
const pendingApprovalRepository = require('../repositories/pendingApprovalRepository');
const productRepository = require('../repositories/productRepository');
const MessageFormatter = require('../utils/messageFormatter');
const ImageService = require('../services/imageService');
const dispatchConfigRepository = require('../repositories/dispatchConfigRepository');
const groupConfigRepository = require('../repositories/groupConfigRepository');
const WppService = require('../services/wppService');
const manager = require('../services/sessionSingleton');
const wppService = new WppService(manager);

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

async function getDispatchHistory(req, res) {
  const userId = req.userId;

  try {
    const history = await productRepository.getDispatchedHistory(userId);
    return res.status(200).json(history);
  } catch (error) {
    console.error('[CurationController] Error listing history:', error);
    return res.status(500).json({ error: 'Internal error when searching for shot history.' });
  }
}

async function getMetrics(req, res) {
  const userId = req.userId;
  try {
    const metrics = await productRepository.getQueueMetrics(userId);
    return res.status(200).json(metrics);
  } catch (error) {
    console.error('[CurationController] Error fetching metrics:', error);
    return res.status(500).json({ error: 'Internal error when fetching metrics from the queue.' });
  }
}

async function sendNow(req, res) {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const product = await productRepository.getProductById(id, userId);
    if (!product || product.status !== 'pending_dispatch') {
      return res.status(404).json({ error: 'Product not found in the shipping queue.' });
    }

    const configs = await dispatchConfigRepository.getConfigsByUserId(userId);
    const config = configs.find(c => c.niche === product.niche);

    if (!config) {
      return res.status(400).json({ error: `No active trigger settings for niche '${product.niche}'.` });
    }

    const sessionId = config.session_id;
    const session = manager.getSession(sessionId);

    if (!session || session.status !== 'connected') {
      return res.status(400).json({ error: 'The WhatsApp responsible for this niche is disconnected.' });
    }

    const groups = await groupConfigRepository.getDispatchGroups(sessionId, product.niche);
    if (groups.length === 0) {
      return res.status(400).json({ error: 'No sending groups configured for this niche.' });
    }

    const messageText = MessageFormatter.formatPreview(product);
    let successCount = 0;

    for (const groupId of groups) {
      try {
        if (product.local_image_path) {
          await wppService.sendImage(sessionId, groupId, product.local_image_path, messageText);
        } else {
          await wppService.sendText(sessionId, groupId, messageText);
        }
        successCount++;
      } catch (sendError) {
        console.error(`[SendNow] Erro no grupo ${groupId}:`, sendError.message);
      }
    }

    if (successCount > 0) {
      await productRepository.markAsDispatched(product.id);

      await dispatchConfigRepository.updateLastExecution(config.id);

      return res.status(200).json({ message: 'Lightning shot successful!' });
    } else {
      await productRepository.incrementErrorCount(product.id);
      return res.status(500).json({ error: 'Failed to send the message. The error has been accounted for.' });
    }

  } catch (error) {
    console.error('[CurationController] Error in Send Now:', error);
    return res.status(500).json({ error: 'Internal error in lightning trigger.' });
  }
}

module.exports = {
  getPendingProducts,
  updatePendingProduct,
  rejectProduct,
  approveProduct,
  getApprovedProducts,
  updateApprovedProduct,
  deleteApprovedProduct,
  getDispatchHistory,
  getMetrics,
  sendNow
};