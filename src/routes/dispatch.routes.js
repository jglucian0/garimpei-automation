const express = require('express');
const router = express.Router();
const dispatchConfigController = require('../controllers/dispatchConfigController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', dispatchConfigController.upsertConfig);
router.get('/', dispatchConfigController.getConfigs);
router.patch('/:id/pause', dispatchConfigController.togglePause);
router.delete('/:id', dispatchConfigController.deleteConfig);

module.exports = router;