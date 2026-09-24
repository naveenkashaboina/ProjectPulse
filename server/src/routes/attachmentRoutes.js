const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/:attachmentId', attachmentController.getAttachment);
router.delete('/:attachmentId', attachmentController.deleteAttachment);

module.exports = router;
