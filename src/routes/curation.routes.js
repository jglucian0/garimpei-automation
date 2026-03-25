const express = require('express');
const router = express.Router();
const curationController = require('../controllers/curationController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/pending', curationController.getPendingProducts);
router.get('/approved', curationController.getApprovedProducts);
router.post('/approve/:id', curationController.approveProduct);
router.delete('/reject/:id', curationController.rejectProduct);

module.exports = router;