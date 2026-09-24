const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const { authenticate } = require('../middleware/auth');

// Get invitation details
router.get('/:token', orgController.getInvitation);

// Accept invitation (can be used authenticated or not)
router.post('/:token/accept', async (req, res, next) => {
  // Try to authenticate but don't require it
  try {
    const jwt = require('jsonwebtoken');
    const config = require('../config/env');
    const { User } = require('../models');
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (err) {
    // Not authenticated, that's ok
  }
  next();
}, orgController.acceptInvitation);

module.exports = router;
