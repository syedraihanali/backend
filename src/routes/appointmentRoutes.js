const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authenticateToken = require('../middleware/authenticate');
const {
  getAvailableTimesForPatient,
  bookAppointmentForPatient,
} = require('../controllers/appointmentController');

const router = Router();

// Appointment scheduling endpoints.
router.get('/available-times', authenticateToken, asyncHandler(getAvailableTimesForPatient));
router.post('/book', authenticateToken, asyncHandler(bookAppointmentForPatient));

module.exports = router;
