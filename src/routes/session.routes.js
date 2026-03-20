const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

router.post('/start', sessionController.startSession);
router.get('/status/:sessionId', sessionController.checkStatus);
router.get('/list', sessionController.listSessions);
router.delete('/:sessionId', sessionController.deleteSession);
router.get('/:sessionId/groups', sessionController.getGroups);

module.exports = router;