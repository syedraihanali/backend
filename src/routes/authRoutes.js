const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { signIn, logout } = require('../controllers/authController');

const router = Router();

// Authentication endpoints.
router.post('/signin', asyncHandler(signIn));
router.post('/logout', logout);

module.exports = router;
