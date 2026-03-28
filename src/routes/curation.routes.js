const express = require('express');
const router = express.Router();
const curationController = require('../controllers/curationController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.use(authMiddleware);

router.get('/pending', curationController.getPendingProducts);
router.put('/pending/:id', upload.single('image'), curationController.updatePendingProduct);

router.get('/approved', curationController.getApprovedProducts);
router.post('/approve/:id', curationController.approveProduct);
router.put('/approved/:id', upload.single('image'), curationController.updateApprovedProduct);
router.delete('/approved/:id', curationController.deleteApprovedProduct);

router.delete('/reject/:id', curationController.rejectProduct);

router.get('/history', curationController.getDispatchHistory);

module.exports = router;