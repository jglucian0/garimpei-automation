const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const groupConfigController = require('../controllers/groupConfigController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/start', sessionController.startSession);
router.get('/status/:sessionId', sessionController.checkStatus);
router.delete('/:sessionId', sessionController.deleteSession);
router.get('/list', sessionController.listSessions);

router.get('/:sessionId/groups', sessionController.getGroups);
router.post('/:sessionId/groups/config', groupConfigController.registerGroup);

module.exports = router;