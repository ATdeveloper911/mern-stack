const express = require('express');
const router = express.Router();
const { sendMessage, getConversation, clearConversation } = require('../controllers/buddyBotController');
const { auth } = require('../middleware/auth');

router.post('/message', auth, sendMessage);
router.get('/conversation', auth, getConversation);
router.delete('/conversation', auth, clearConversation);

module.exports = router;
