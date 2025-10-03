const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { getDoctors } = require('../controllers/doctorController');

const router = Router();

// Doctor catalog endpoints.
router.get('/', asyncHandler(getDoctors));

module.exports = router;
